// dsh-aether-theme — 配置持久化。
//
// 「逐字节回滚」的落盘底座：每次写 config 之前把旧版本原样备份成
// config.<时间戳>.bak.json（保留最近 N 份），面板上的「一键恢复默认」走
// restoreDefault()，会先把当前版备份再写默认值。这样任何一次误操作都能
// 在文件层面对上旧字节，而不是靠内存里的撤销栈。

import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeSync, closeSync } from 'node:fs'
import { join } from 'node:path'

const BACKUP_KEEP = 20

export function createStore(options) {
  const dataDir = options.dataDir
  const logger = options.logger
  const configFile = join(dataDir, 'config.json')
  const tokenFile = join(dataDir, 'panel-token')
  let cachedConfig = null

  function ensureDir() {
    try {
      mkdirSync(dataDir, { recursive: true })
      return true
    } catch (error) {
      logger?.warn(`数据目录创建失败：${error?.message ?? error}`)
      return false
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
      const fd = openSync(tokenFile, 'w')
      writeSync(fd, `${fresh}\n`)
      closeSync(fd)
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

  function backupConfig(reason) {
    try {
      if (!existsSync(configFile)) return null
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const target = join(dataDir, `config.${reason}.${stamp}.bak.json`)
      copyFileSync(configFile, target)
      // 只留最近 BACKUP_KEEP 份
      const backups = readdirSync(dataDir)
        .filter((entry) => /^config\..+\.bak\.json$/.test(entry))
        .sort()
      for (const stale of backups.slice(0, Math.max(0, backups.length - BACKUP_KEEP))) {
        try { unlinkSync(join(dataDir, stale)) } catch { /* ignore */ }
      }
      return target
    } catch (error) {
      logger?.warn(`配置备份失败：${error?.message ?? error}`)
      return null
    }
  }

  function saveConfig(next, reason = 'save') {
    ensureDir()
    const backup = backupConfig(reason)
    // 原子写：先写 .tmp 再 rename，断电/崩溃不会留下半个 JSON
    const tmp = join(dataDir, `config.${process.pid}.tmp`)
    try {
      const fd = openSync(tmp, 'w')
      writeSync(fd, `${JSON.stringify(next, null, 2)}\n`)
      closeSync(fd)
      renameSync(tmp, configFile)
      cachedConfig = next
      logger?.info('配置已保存', { reason, bytes: statSync(configFile).size, backup })
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

  return { dataDir, configFile, tokenFile, ensureDir, token, readRaw, loadConfig, saveConfig, resetConfig, backupConfig }
}
