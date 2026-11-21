// dsh-aether-theme — 配置与默认值。
//
// 所有字段都可用 profile 的 cordis.patch.yml 按 id 覆盖；未覆盖的走这里。
// 这里只放「Host 侧」参数；主题/壁纸/玻璃这些渲染参数住在 dataDir/config.json，
// 由客户端面板写入（Host 只做原子落盘），所以改外观不需要重启 DSH。

import { homedir } from 'node:os'
import { join } from 'node:path'

export const DEFAULTS = {
  /** 配置/壁纸库根；默认 <DSH_HOME>/aether-theme */
  dataDir: null,
  /** 日志目录：记忆六件套约定 D:\DSH-plugins\log\<插件名>\ */
  logDir: null,
  /** HTTP API 前缀 */
  routePrefix: '/dsh-aether',
  /** 单个壁纸文件上限（MB）；流式落盘，内存占用与文件大小无关 */
  maxWallpaperMB: 512,
  /** 壁纸库最多保留几个文件 */
  maxWallpapers: 40,
  /** 宿主 DOM 契约金丝雀开关 */
  canary: true,
  /** 日志级别 debug | info | warn | error */
  logLevel: 'info',
}

function defaultDataDir() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'aether-theme')
}

function defaultLogDir() {
  return process.platform === 'win32' ? 'D:\\DSH-plugins\\log\\dsh-aether-theme' : join(defaultDataDir(), 'logs')
}

/**
 * 归一化配置。
 * @param {Record<string, unknown> | undefined} raw
 */
export function normalizeConfig(raw) {
  const input = raw && typeof raw === 'object' ? raw : {}
  const dataDir = typeof input.dataDir === 'string' && input.dataDir.trim() ? input.dataDir.trim() : defaultDataDir()
  const logDir = typeof input.logDir === 'string' && input.logDir.trim() ? input.logDir.trim() : defaultLogDir()
  const prefix = typeof input.routePrefix === 'string' && input.routePrefix.startsWith('/')
    ? input.routePrefix.replace(/\/+$/, '')
    : DEFAULTS.routePrefix
  return {
    dataDir,
    logDir,
    routePrefix: prefix,
    maxWallpaperMB: clampNumber(input.maxWallpaperMB, 8, 4096, DEFAULTS.maxWallpaperMB),
    maxWallpapers: clampNumber(input.maxWallpapers, 4, 400, DEFAULTS.maxWallpapers),
    canary: input.canary !== false,
    logLevel: ['debug', 'info', 'warn', 'error'].includes(input.logLevel) ? input.logLevel : DEFAULTS.logLevel,
  }
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
