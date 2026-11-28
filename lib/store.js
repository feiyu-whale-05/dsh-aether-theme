// dsh-aether-theme — 配置持久化。
//
// 「逐字节回滚」的落盘底座：写 config 之前把旧版本原样备份成
// config.<reason>.<时间戳>.bak.json（保留最近 N 份），面板上的「一键恢复默认」走
// restoreDefault()，会先把当前版备份再写默认值。这样任何一次误操作都能
// 在文件层面对上旧字节，而不是靠内存里的撤销栈。
//
// 性能取舍（拖滑杆曾导致每帧一次全量复制 + 目录扫描）：
//   1) 内容与磁盘一致 → 直接跳过，不写、不备份、不扫目录；
//   2) 备份内容与最新一份备份完全相同 → 跳过，避免同秒互相覆盖 + 无意义复制；
//   3) 备份文件名带毫秒并做冲突自增，同一毫秒多次保存也不会互相覆盖；
//   4) 原子写用 try/finally 保证 fd 一定关闭，并在 rename 前 fsync。

import { createHash, randomBytes } from 'node:crypto'
import {
  closeSync, copyFileSync, existsSync, fsyncSync, mkdirSync, openSync,
  readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeSync,
} from 'node:fs'
import { join } from 'node:path'

const BACKUP_KEEP = 20

function sha256(text) {
  return createHash('sha256').update(text).digest('hex')
}

export function createStore(options) {
  const dataDir = options.dataDir
  const logger = options.logger
  const configFile = join(dataDir, 'config.json')
  const tokenFile = join(dataDir, 'panel-token')
  let cachedConfig = null
  let lastBackupHash = null

  function ensureDir() {
    try {
      mkdirSync(dataDir, { recursive: true })
      return true
    } catch (error) {
      logger?.warn(`数据目录创建失败：${error?.message ?? error}`)
      return false
    }
  }

  function writeFileAtomic(target, text) {
    const tmp = `${target}.${process.pid}.tmp`
    let fd = null
    try {
      fd = openSync(tmp, 'w')
      writeSync(fd, text)
      try { fsyncSync(fd) } catch { /* 某些文件系统不支持 fsync，忽略 */ }
    } catch (error) {
      try { if (existsSync(tmp)) unlinkSync(tmp) } catch { /* ignore */ }
      throw error
    } finally {
      // fd 必须无条件关闭：旧实现没有 finally，写入抛错时 fd 永久泄漏。
      // Windows 上句柄未关时 rename 会 EBUSY，所以 rename 一定放在 finally 之后。
      if (fd !== null) {
        try { closeSync(fd) } catch (error) { logger?.warn(`关闭写句柄失败：${error?.message ?? error}`) }
      }
    }
    try {
      renameSync(tmp, target)
    } catch (error) {
      try { if (existsSync(tmp)) unlinkSync(tmp) } catch { /* ignore */ }
      throw error
    }
  }

  function token() {
    ensureDir()
    try {
      const existing = readFileSync(tokenFile, 'utf8').trim()
      if (/^[0-9a-f]{64}$/.test(existing)) return existing
    } catch { /* 首次运行 */ }
    const fresh = randomBytes(32).toString('hex')
    try {
      writeFileAtomic(tokenFile, `${fresh}\n`)
    } catch (error) {
      logger?.warn(`面板令牌落盘失败：${error?.message ?? error}`)
    }
    return fresh
  }

  function readRaw() {
    try {
      return JSON.parse(readFileSync(configFile, 'utf8'))
    } catch {
      return null
    }
  }

  function readRawText() {
    try {
      return readFileSync(configFile, 'utf8')
    } catch {
      return null
    }
  }

  function pruneBackups() {
    try {
      const backups = readdirSync(dataDir)
        .filter((entry) => /^config\..+\.bak\.json$/.test(entry))
        .sort()
      for (const stale of backups.slice(0, Math.max(0, backups.length - BACKUP_KEEP))) {
        try { unlinkSync(join(dataDir, stale)) } catch { /* ignore */ }
      }
    } catch (error) {
      logger?.warn(`配置备份清理失败：${error?.message ?? error}`)
    }
  }

  function backupConfig(reason) {
    try {
      if (!existsSync(configFile)) return null
      const current = readRawText()
      if (current == null) return null
      // 内容与最新备份相同 → 不再复制（同一次拖动的多个中间值只留第一份）
      const hash = sha256(current)
      if (hash === lastBackupHash) return null
      // 毫秒时间戳 + 冲突自增：同一毫秒多次保存不会互相覆盖
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      let target = join(dataDir, `config.${reason}.${stamp}.bak.json`)
      let seq = 1
      while (existsSync(target)) {
        target = join(dataDir, `config.${reason}.${stamp}-${seq}.bak.json`)
        seq += 1
        if (seq > 999) break
      }
      copyFileSync(configFile, target)
      lastBackupHash = hash
      pruneBackups()
      return target
    } catch (error) {
      logger?.warn(`配置备份失败：${error?.message ?? error}`)
      return null
    }
  }

  function saveConfig(next, reason = 'save') {
    ensureDir()
    const text = `${JSON.stringify(next, null, 2)}\n`
    // 内容没变就完全不动磁盘（拖滑杆 / 反复点同一个开关时的绝大多数情况）
    const currentText = readRawText()
    if (currentText === text) {
      cachedConfig = next
      return { ok: true, backup: null, skipped: true }
    }
    const backup = backupConfig(reason)
    try {
      writeFileAtomic(configFile, text)
      cachedConfig = next
      logger?.info('配置已保存', { reason, bytes: text.length, backup })
      return { ok: true, backup }
    } catch (error) {
      logger?.error(`配置写入失败：${error?.message ?? error}`)
      return { ok: false, error: String(error?.message ?? error) }
    }
  }

  function loadConfig() {
    if (cachedConfig) return cachedConfig
    const raw = readRaw()
    cachedConfig = raw && typeof raw === 'object' ? raw : null
    return cachedConfig
  }

  function resetConfig(defaultConfig) {
    return saveConfig(defaultConfig, 'reset')
  }

  function stats() {
    let bytes = 0
    try { bytes = statSync(configFile).size } catch { bytes = 0 }
    return { configFile, bytes }
  }

  return { dataDir, configFile, tokenFile, ensureDir, token, readRaw, loadConfig, saveConfig, resetConfig, backupConfig, stats }
}
