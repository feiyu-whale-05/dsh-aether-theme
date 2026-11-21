// dsh-aether-theme — 文件日志。
//
// 约定（记忆六件套）：日志写到 D:\DSH-plugins\log\<插件名>\，一个插件一个文件夹。
// · 行式人类可读：`ISO LEVEL [aether-theme] message {json}`，记事本直接打开能看。
// · 按大小轮转：超过 maxBytes 改名 app-<时间戳>.log，只留 keep 份。
// · 任何写盘失败都吞掉并降级为只往宿主 logger 打——日志坏了不能拖垮插件。

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

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

  try {
    mkdirSync(dir, { recursive: true })
  } catch {
    enabled = false
  }

  function rotate() {
    try {
      if (!existsSync(file)) return
      if (statSync(file).size < maxBytes) return
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      renameSync(file, join(dir, `app-${stamp}.log`))
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
        rotate()
        appendFileSync(file, `${line}\n`, 'utf8')
      }
    } catch {
      enabled = false
    }
    try {
      sink?.(line)
    } catch { /* ignore */ }
  }

  return {
    file,
    dir,
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
    tail(limit = 200) {
      try {
        const raw = readFileSync(file, 'utf8')
        return raw.split('\n').filter(Boolean).slice(-limit)
      } catch {
        return []
      }
    },
  }
}

function safeJson(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return '[unserializable]'
  }
}
