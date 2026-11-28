// dsh-aether-theme — 壁纸库（流式落盘 + Range 流式回放）。
//
// 200MB 的视频壁纸不进内存：上传时 req 直接 pipe 到文件；回放时按 Range
// 分片读，浏览器 <video> 的拖动/循环都不需要整文件读入。
// 元数据 index.json 只记 id/名字/mime/大小/加入时间/分类，不记内容。

import {
  closeSync, createReadStream, createWriteStream, existsSync, mkdirSync,
  openSync, readFileSync, renameSync, statSync, unlinkSync, writeSync, readdirSync,
} from 'node:fs'
import { basename, extname, join } from 'node:path'
import { randomBytes } from 'node:crypto'

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
}

/** 壁纸 id 固定是 16 位 hex（randomBytes(8)）。校验它可以挡住被篡改的索引里的路径穿越。 */
const ID_RE = /^[0-9a-f]{16}$/

export function createWallpaperLibrary(options) {
  const dir = join(options.dataDir, 'wallpapers')
  const indexFile = join(dir, 'index.json')
  const logger = options.logger
  const maxWallpaperMB = options.maxWallpaperMB ?? 512
  const maxWallpapers = options.maxWallpapers ?? 40

  // 索引进程内缓存：/api/state 每次刷新都要 list()，而每次 list() 都要读盘 + JSON 解析
  let indexCache = null
  let indexCacheAt = 0

  function ensureDir() {
    try {
      mkdirSync(dir, { recursive: true })
      return true
    } catch (error) {
      logger?.warn(`壁纸目录创建失败：${error?.message ?? error}`)
      return false
    }
  }

  /** 索引里的 file 字段只允许是「本目录下的文件名」，挡住 ../.. 之类的路径穿越。 */
  function safeFile(item) {
    const name = basename(String(item?.file ?? ''))
    if (!name || name !== String(item?.file ?? '') || name.startsWith('.')) return null
    if (!/^[0-9a-f]{16}\.[a-z0-9]{2,5}$/i.test(name)) return null
    return join(dir, name)
  }

  function readIndex() {
    if (indexCache) return indexCache
    try {
      const raw = JSON.parse(readFileSync(indexFile, 'utf8'))
      indexCache = Array.isArray(raw?.items) ? raw : { items: [] }
    } catch {
      indexCache = { items: [] }
    }
    indexCacheAt = Date.now()
    return indexCache
  }

  function writeIndex(index) {
    ensureDir()
    const tmp = join(dir, `index.${process.pid}.tmp`)
    let fd = null
    try {
      fd = openSync(tmp, 'w')
      writeSync(fd, `${JSON.stringify(index, null, 2)}\n`)
    } catch (error) {
      logger?.warn(`壁纸索引写入失败：${error?.message ?? error}`)
      try { if (existsSync(tmp)) unlinkSync(tmp) } catch { /* ignore */ }
      indexCache = null
      return
    } finally {
      if (fd !== null) {
        try { closeSync(fd) } catch (error) { logger?.warn(`关闭索引句柄失败：${error?.message ?? error}`) }
      }
    }
    try {
      renameSync(tmp, indexFile)
    } catch (error) {
      logger?.warn(`壁纸索引替换失败：${error?.message ?? error}`)
      try { if (existsSync(tmp)) unlinkSync(tmp) } catch { /* ignore */ }
    }
    // 写入即失效缓存（next read 重新读盘）
    indexCache = null
  }

  /** 索引条目的回放 URL：统一用 query 形式（路由是 kind:'exact'，路径段形式必然 404）。 */
  function itemUrl(id) {
    return `${options.routePrefix}/api/wallpaper?id=${encodeURIComponent(id)}`
  }

  function list() {
    const index = readIndex()
    const out = []
    for (const item of index.items) {
      if (!ID_RE.test(String(item?.id ?? ''))) continue
      const file = safeFile(item)
      if (!file || !existsSync(file)) continue
      out.push({ ...item, url: itemUrl(item.id) })
    }
    return out
  }

  function prune() {
    const index = readIndex()
    const sorted = [...index.items].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
    const keep = sorted.slice(0, maxWallpapers)
    const drop = sorted.slice(maxWallpapers)
    for (const item of drop) {
      const file = safeFile(item)
      if (file) { try { unlinkSync(file) } catch { /* ignore */ } }
    }
    if (drop.length > 0) {
      writeIndex({ items: keep })
      logger?.info('壁纸库超限，已清理旧文件', { dropped: drop.length })
    }
  }

  /**
   * 流式接收上传：req 是 Node http.IncomingMessage。
   * 关键：`createWriteStream()` 可能在**同步**阶段抛错（磁盘不可写、目录被删）。
   * 旧实现把它放在 Promise 构造器里但没包 try/catch，异常会逃逸到宿主请求处理链，
   * 而 Promise 永远不会 settle → 请求悬挂。这里统一转成 reject 结果。
   * @returns {Promise<{ ok: boolean, item?: object, error?: string }>}
   */
  function upload(req, query) {
    let target = null
    try {
      ensureDir()
      const rawName = String(query.get('name') ?? 'wallpaper.png')
      const ext = extname(rawName).toLowerCase() || '.png'
      const mime = MIME_BY_EXT[ext]
      if (!mime) return Promise.resolve({ ok: false, error: `不支持的格式：${ext}` })
      const category = String(query.get('category') ?? 'custom').slice(0, 24)
      const id = randomBytes(8).toString('hex')
      const file = `${id}${ext}`
      target = join(dir, file)
      const maxBytes = maxWallpaperMB * 1024 * 1024
      let written = 0
      return new Promise((resolve) => {
        const out = createWriteStream(target)
        let settled = false
        const cleanup = () => {
          // Windows 上 drain 完成后句柄才真正释放；必须等 'close' 再 unlink，
          // 否则 unlinkSync 恒 EBUSY/EPERM 且被 catch 吞掉 → 半截文件永久残留。
          out.once('close', () => { try { unlinkSync(target) } catch { /* ignore */ } })
          try { out.destroy() } catch { /* ignore */ }
        }
        const fail = (error) => {
          if (settled) return
          settled = true
          cleanup()
          resolve({ ok: false, error })
        }
        req.on('data', (chunk) => {
          written += chunk.length
          if (written > maxBytes) {
            fail(`文件超过上限 ${maxWallpaperMB}MB`)
            try { req.destroy() } catch { /* ignore */ }
          }
        })
        req.on('aborted', () => fail('上传中断'))
        req.on('error', (error) => fail(String(error?.message ?? error)))
        out.on('error', (error) => fail(`写盘失败：${error?.message ?? error}`))
        out.on('finish', () => {
          if (settled) return
          settled = true
          if (written === 0) {
            out.once('close', () => { try { unlinkSync(target) } catch { /* ignore */ } })
            resolve({ ok: false, error: '空文件' })
            return
          }
          const item = {
            id,
            name: basename(rawName).slice(0, 120),
            file,
            mime,
            kind: mime.startsWith('video/') ? 'video' : 'image',
            category,
            size: written,
            addedAt: Date.now(),
          }
          const index = readIndex()
          index.items.push(item)
          writeIndex(index)
          prune()
          logger?.info('壁纸已入库', { id, kind: item.kind, size: written, category })
          resolve({ ok: true, item: { ...item, url: itemUrl(id) } })
        })
        try {
          req.pipe(out)
        } catch (error) {
          fail(`接收失败：${error?.message ?? error}`)
        }
      })
    } catch (error) {
      // 同步阶段抛错（createWriteStream / ensureDir）也要变成可预期的返回值
      logger?.warn(`上传初始化失败：${error?.message ?? error}`)
      if (target) { try { unlinkSync(target) } catch { /* ignore */ } }
      return Promise.resolve({ ok: false, error: `上传初始化失败：${error?.message ?? error}` })
    }
  }

  function remove(id) {
    const index = readIndex()
    const item = index.items.find((entry) => entry.id === id)
    if (!item) return { ok: false, error: 'not found' }
    const file = safeFile(item)
    if (file) { try { unlinkSync(file) } catch { /* ignore */ } }
    writeIndex({ items: index.items.filter((entry) => entry.id !== id) })
    logger?.info('壁纸已删除', { id })
    return { ok: true }
  }

  /** 带 Range 的流式回放（video 拖动/循环必需）。 */
  function stream(id, req, res) {
    const item = ID_RE.test(String(id ?? ''))
      ? readIndex().items.find((entry) => entry.id === id)
      : null
    const file = item ? safeFile(item) : null
    if (!item || !file) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'not found' }))
      return
    }
    let size = 0
    try {
      size = statSync(file).size
    } catch {
      res.writeHead(404)
      res.end()
      return
    }
    const headers = {
      'content-type': item.mime,
      'cache-control': 'public, max-age=86400',
      'accept-ranges': 'bytes',
    }
    const range = String(req.headers.range ?? '')
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (match) {
      const start = match[1] ? Number(match[1]) : 0
      const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
      if (!Number.isFinite(start) || start > end || start >= size) {
        res.writeHead(416, { ...headers, 'content-range': `bytes */${size}` })
        res.end()
        return
      }
      res.writeHead(206, {
        ...headers,
        'content-range': `bytes ${start}-${end}/${size}`,
        'content-length': String(end - start + 1),
      })
      const stream = createReadStream(file, { start, end })
      stream.on('error', () => { try { res.destroy() } catch { /* ignore */ } })
      stream.pipe(res)
      return
    }
    res.writeHead(200, { ...headers, 'content-length': String(size) })
    const stream = createReadStream(file)
    stream.on('error', () => { try { res.destroy() } catch { /* ignore */ } })
    stream.pipe(res)
  }

  /** @param {Array|undefined} items 已经算好的列表；给了就不再重复 list() */
  function stats(items) {
    // 复用同一次索引读取（旧实现又调了一次 list()，等于再读一次盘 + N 次 existsSync）
    const list2 = items ?? list()
    return {
      dir,
      count: list2.length,
      totalBytes: list2.reduce((sum, item) => sum + (item.size ?? 0), 0),
      images: list2.filter((item) => item.kind === 'image').length,
      videos: list2.filter((item) => item.kind === 'video').length,
    }
  }

  /** 诊断/面板用：目录里有多少不在索引中的孤儿文件（上传失败残留）。 */
  function orphans() {
    try {
      const known = new Set(readIndex().items.map((item) => String(item.file ?? '')))
      return readdirSync(dir).filter((name) => ID_RE.test(name.split('.')[0]) && !known.has(name))
    } catch {
      return []
    }
  }

  return { dir, ensureDir, list, upload, remove, stream, stats, orphans, itemUrl }
}
