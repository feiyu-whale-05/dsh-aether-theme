// dsh-aether-theme — 文件日志。
//
// 约定（记忆六件套）：日志写到 D:\DSH-plugins\log\<插件名>\，一个插件一个文件夹。
// · 行式人类可读：`ISO LEVEL [aether-theme] message {json}`，记事本直接打开能看。
// · 按大小轮转：超过 maxBytes 改名 app-<时间戳>.log，只留 keep 份。
// · 任何写盘失败都吞掉并降级为只往宿主 logger 打——日志坏了不能拖垮插件。
//
// 性能：写一行日志不该有 3 次同步 syscall。这里内存里维护 size，每写 32 行
// （或首次）才真正 stat 一次；tail() 从文件尾按块倒读，不再 readFileSync 整个 2MB。

import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync,
  readSync, readdirSync, renameSync, statSync, unlinkSync,
} from 'node:fs'
import { join } from 'node:path'

const STAT_EVERY = 32
const TAIL_CHUNK = 16 * 1024

export function createLogger(options) {
  const dir = options.dir
  const name = options.name ?? 'aether-theme'
  const maxBytes = Math.max(64 * 1024, options.maxBytes ?? 2 * 1024 * 1024)
  const keep = Math.max(1, options.keep ?? 5)
  const level = options.level ?? 'info'
  const sink = options.sink
  const file = join(dir, 'app.log')
  const rank = { debug: 10, info: 20, warn: 30, error: 40 }
  const threshold = rank[level] ?? rank.info
  let enabled = true
  let sizeCache = -1
  let writesSinceStat = 0

  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    enabled = false
  }

  function currentSize() {
    if (sizeCache >= 0) return sizeCache
    try {
      sizeCache = existsSync(file) ? statSync(file).size : 0
    } catch {
      sizeCache = 0
    }
    return sizeCache
  }

  function rotate() {
    try {
      if (!existsSync(file)) {
        sizeCache = 0
        return
      }
      if (currentSize() < maxBytes) return
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      renameSync(file, join(dir, `app-${stamp}.log`))
      sizeCache = 0
      const archives = readdirSync(dir)
        .filter((entry) => /^app-\d{4}-\d{2}-\d{2}T.*\.log$/.test(entry))
        .sort()
        .reverse()
      for (const stale of archives.slice(keep)) {
        try {
          unlinkSync(join(dir, stale))
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }

  function write(levelName, message, meta) {
    if (rank[levelName] < threshold) return
    const line = `${new Date().toISOString()} ${levelName.toUpperCase()} [${name}] ${message}${meta === undefined ? '' : ` ${safeJson(meta)}`}`
    try {
      if (enabled) {
        // 每 32 行才 stat 一次：拖滑杆时日志会成串出现，逐行 stat 是纯浪费
        writesSinceStat += 1
        if (sizeCache < 0 || writesSinceStat >= STAT_EVERY) {
          writesSinceStat = 0
          sizeCache = -1
        }
        rotate()
        appendFileSync(file, `${line}\n`, 'utf8')
        if (sizeCache >= 0) sizeCache += Buffer.byteLength(line) + 1
      }
    } catch {
      enabled = false
    }
    try {
      sink?.(line)
    } catch { /* ignore */ }
  }

  /** 从文件尾按块倒读，只取 last N 行；空文件/缺失返回 []。 */
  function tail(limit = 200) {
    const maxLines = Math.max(1, Math.min(2000, limit))
    let fd = null
    try {
      if (!existsSync(file)) return []
      const total = statSync(file).size
      if (total === 0) return []
      fd = openSync(file, 'r')
      let position = total
      let text = ''
      let lines = 0
      const buffer = Buffer.allocUnsafe(TAIL_CHUNK)
      while (position > 0 && lines <= maxLines) {
        const readSize = Math.min(TAIL_CHUNK, position)
        position -= readSize
        const read = readSync(fd, buffer, 0, readSize, position)
        const chunk = buffer.toString('utf8', 0, read)
        text = chunk + text
        lines = countNewlines(text)
      }
      return text.split('\n').filter(Boolean).slice(-maxLines)
    } catch {
      try {
        return readFileSync(file, 'utf8').split('\n').filter(Boolean).slice(-maxLines)
      } catch {
        return []
      }
    } finally {
      if (fd !== null) {
        try { closeSync(fd) } catch { /* ignore */ }
      }
    }
  }

  return {
    file,
    dir,
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
    tail,
  }
}

function countNewlines(text) {
  let count = 0
  let index = -1
  while ((index = text.indexOf('\n', index + 1)) !== -1) count += 1
  return count
}

function safeJson(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return '[unserializable]'
  }
}
