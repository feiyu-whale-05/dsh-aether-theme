// dsh-aether-theme — 壁纸库（流式落盘 + Range 流式回放）。
//
// 200MB 的视频壁纸不进内存：上传时 req 直接 pipe 到文件；回放时按 Range
// 分片读，浏览器 <video> 的拖动/循环都不需要整文件读入。
// 元数据 index.json 只记 id/名字/mime/大小/加入时间/分类，不记内容。

import { createWriteStream, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeSync, closeSync } from 'node:fs'
import { createReadStream } from 'node:fs'
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

export function createWallpaperLibrary(options) {
  const dir = join(options.dataDir, 'wallpapers')
  const indexFile = join(dir, 'index.json')
  const logger = options.logger
  const maxWallpaperMB = options.maxWallpaperMB ?? 512
  const maxWallpapers = options.maxWallpapers ?? 40

  function ensureDir() {
    try {
      mkdirSync(dir, { recursive: true })
    } catch (error) {
      logger?.warn(`壁纸目录创建失败：${error?.message ?? error}`)
    }
  }

  function readIndex() {
    try {
      const raw = JSON.parse(readFileSync(indexFile, 'utf8'))
      return Array.isArray(raw?.items) ? raw : { items: [] }
    } catch {
      return { items: [] }
    }
  }

  function writeIndex(index) {
    ensureDir()
    const tmp = join(dir, `index.${process.pid}.tmp`)
    try {
      const fd = openSync(tmp, 'w')
      writeSync(fd, `${JSON.stringify(index, null, 2)}\n`)
      closeSync(fd)
      renameSync(tmp, indexFile)
    } catch (error) {
      logger?.warn(`壁纸索引写入失败：${error?.message ?? error}`)
    }
  }

  function list() {
    const index = readIndex()
    return index.items
      .filter((item) => existsSync(join(dir, item.file)))
      .map((item) => ({ ...item, url: `${options.routePrefix}/api/wallpaper/${item.id}` }))
  }

  function prune() {
    const index = readIndex()
    const sorted = [...index.items].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
    const keep = sorted.slice(0, maxWallpapers)
    const drop = sorted.slice(maxWallpapers)
    for (const item of drop) {
      try { unlinkSync(join(dir, item.file)) } catch { /* ignore */ }
    }
    if (drop.length > 0) {
      writeIndex({ items: keep })
      logger?.info('壁纸库超限，已清理旧文件', { dropped: drop.length })
    }
  }

  /**
   * 流式接收上传：req 是 Node http.IncomingMessage。
   * @returns {Promise<{ ok: boolean, item?: object, error?: string }>}
   */
  function upload(req, query) {
    ensureDir()
    const rawName = String(query.get('name') ?? 'wallpaper.png')
    const ext = extname(rawName).toLowerCase() || '.png'
    const mime = MIME_BY_EXT[ext]
    if (!mime) return Promise.resolve({ ok: false, error: `不支持的格式：${ext}` })
    const category = String(query.get('category') ?? 'custom').slice(0, 24)
    const id = randomBytes(8).toString('hex')
    const file = `${id}${ext}`
    const target = join(dir, file)
    const maxBytes = maxWallpaperMB * 1024 * 1024
    let written = 0
    return new Promise((resolve) => {
      const out = createWriteStream(target)
      let settled = false
      const fail = (error) => {
        if (settled) return
        settled = true
        try { out.destroy() } catch { /* ignore */ }
        try { unlinkSync(target) } catch { /* ignore */ }
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
          try { unlinkSync(target) } catch { /* ignore */ }
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
        resolve({ ok: true, item: { ...item, url: `${options.routePrefix}/api/wallpaper/${id}` } })
      })
      req.pipe(out)
    })
  }

  function remove(id) {
    const index = readIndex()
    const item = index.items.find((entry) => entry.id === id)
    if (!item) return { ok: false, error: 'not found' }
    try { unlinkSync(join(dir, item.file)) } catch { /* ignore */ }
    writeIndex({ items: index.items.filter((entry) => entry.id !== id) })
    logger?.info('壁纸已删除', { id })
    return { ok: true }
  }

  /** 带 Range 的流式回放（video 拖动/循环必需）。 */
  function stream(id, req, res) {
    const item = readIndex().items.find((entry) => entry.id === id)
    if (!item) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: 'not found' }))
      return
    }
    const file = join(dir, item.file)
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

  function stats() {
    const items = list()
    return {
      dir,
      count: items.length,
      totalBytes: items.reduce((sum, item) => sum + (item.size ?? 0), 0),
      images: items.filter((item) => item.kind === 'image').length,
      videos: items.filter((item) => item.kind === 'video').length,
    }
  }

  return { dir, ensureDir, list, upload, remove, stream, stats }
}
