// dsh-aether-theme — 插件入口（Host 侧）。
//
// 职责刻意收窄：客户端负责渲染，Host 只负责「落盘 + 流式 + 诊断」四件事：
//   1. 配置读写（原子写 + 每次写前备份，支撑逐字节回滚）
//   2. 壁纸库（流式上传、Range 流式回放，200MB 视频不进内存）
//   3. 页面令牌注入（window.__DSH_AETHER_TOKEN__，面板接口鉴权）
//   4. 诊断聚合（diag.json：版本、路由、金丝雀结果、日志尾部、用量数据）
//
// 与宿主的所有接触面都带降级：没有 webServer 服务时插件仍能加载，只是面板
// 拿不到数据（客户端会显示「Host 接口未就绪」）。任何内部异常都不外抛。

import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { DEFAULTS, normalizeConfig } from './config.js'
import { createLogger } from './log.js'
import { createStore } from './store.js'
import { createWallpaperLibrary } from './wallpapers.js'

export const name = 'dsh-aether-theme'
export const inject = []

const VERSION = '1.0.37'
const STARTED_AT = Date.now()

/** 默认外观配置：客户端首次启动时用它（同时是「一键恢复默认」的目标）。 */
export function defaultAppearance() {
  return {
    version: 1,
    enabled: true,
    modules: {
      theme: { enabled: true },
      wallpaper: { enabled: true },
      glass: { enabled: true },
      pixel: { enabled: false },
      widget: { enabled: true },
      boot: { enabled: true },
      diag: { enabled: true },
      inputGlow: { enabled: true },
      fx: { enabled: true },
    },
    theme: {
      palette: 'auto',
      accent: '#7aa2ff',
      secondary: '#9d7cff',
      deriveFromWallpaper: true,
      contrastTarget: 7,
      mixMode: 'multiply',
      transitionMs: 420,
      reducedMotion: 'auto',
      strongColor: '#ffe6a3',
      fontFamily: '',
      fontSize: 0,
    },
    bubble: { official: true, color: '#dbe7ff', opacity: 0.62 },
    panel: { scale: 1.15 },
    meteor: { enabled: false, density: 1, hue: 222, maxDist: 160 },
    userMd: { enabled: true },
    wallpaper: {
      mode: 'none',
      source: 'preset',
      id: '',
      cssPreset: 'aurora',
      fit: 'cover',
      dim: 0,
      brightness: 0.85,
      blur: 0,
      rotation: { enabled: false, intervalMin: 30, timeOfDay: [6, 18], categories: [] },
    },
    glass: {
      glassBlur: 0,
      backgroundBlur: 0,
      saturation: 1.15,
      border: 0.14,
      regions: { base: 0, sidebar: 0.55, layers: 0.55, menu: 0.74, input: 0.55, bubble: 0.5 },
      inputFills: ['frosted'],
      inputFillOpacity: 0.55,
      chromeOpacity: 0,
      chromeBlur: 14,
    },
    pixel: {
      theme: 'cabin',
      nineSlice: 12,
      crt: false,
      scanline: 0.08,
    },
    widget: {
      position: 'bottom-right',
      showBalance: true,
      showToday: true,
      showTurn: true,
      warnBelow: 5,
    },
    fx: { density: 60, fishCount: 3, whale: true, glow: true, press: true },
    boot: {
      durationMs: 2200,
      style: 'ripple',
      skipOnReducedMotion: true,
    },
    diag: {
      showOverlay: false,
      canaryStrikes: 40,
    },
  }
}

function sendJson(res, status, payload) {
  try {
    const body = JSON.stringify(payload)
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    try { res.destroy() } catch { /* ignore */ }
  }
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('body too large'))
        try { req.destroy() } catch { /* ignore */ }
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

/** 读本机用量文件（余额挂件的数据源）；缺失/格式不对就返回 null，绝不抛。 */
function readUsage() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  const candidates = ['.dshw-usage.json', '.dshw-turn.json', 'dshmarket/telemetry.json']
  const out = {}
  for (const rel of candidates) {
    const file = join(home, rel)
    try {
      if (!existsSync(file)) continue
      out[rel] = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      /* 单文件坏了不影响其他 */
    }
  }
  return Object.keys(out).length ? out : null
}

export function apply(ctx, rawConfig) {
  const config = normalizeConfig(rawConfig)
  const logger = createLogger({ dir: config.logDir, level: config.logLevel })
  const store = createStore({ dataDir: config.dataDir, logger })
  const library = createWallpaperLibrary({
    dataDir: config.dataDir,
    routePrefix: config.routePrefix,
    logger,
    maxWallpaperMB: config.maxWallpaperMB,
    maxWallpapers: config.maxWallpapers,
  })

  // 最近一次客户端上报的诊断（DOM 锚点、金丝雀计数、渲染耗时）
  let lastClientDiag = null
  let panelToken = ''

  logger.info('插件加载', { version: VERSION, dataDir: config.dataDir, routePrefix: config.routePrefix })

  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.get('webServer')
    if (!webServer || typeof webServer.register !== 'function') {
      logger.warn('webServer 服务不可用：面板接口未挂载，客户端会显示 Host 接口未就绪')
      return
    }
    panelToken = store.token()

    const authorized = (req) => {
      const header = String(req.headers['x-dsh-aether-token'] ?? '')
      // 页面令牌同时接受 query（img/video 标签不能带 header）与 header
      if (header && header === panelToken) return true
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      return url.searchParams.get('token') === panelToken
    }

    const mount = (path, handler) => {
      try {
        return webServer.register({ kind: 'exact', path, handler })
      } catch (error) {
        logger.warn(`路由注册失败：${path}`, { error: String(error?.message ?? error) })
        return null
      }
    }

    webCtx.effect(() => {
      const disposers = []

      disposers.push(mount(`${config.routePrefix}/api/state`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        const saved = store.loadConfig()
        sendJson(res, 200, {
          ok: true,
          version: VERSION,
          defaultAppearance: defaultAppearance(),
          appearance: saved ?? null,
          wallpapers: library.list(),
          stats: library.stats(),
          usage: readUsage(),
          diag: { startedAt: STARTED_AT, lastClientDiag, routes: 8, canary: config.canary },
        })
      }))

      disposers.push(mount(`${config.routePrefix}/api/config`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        if (req.method === 'GET') {
          sendJson(res, 200, { ok: true, appearance: store.loadConfig(), defaultAppearance: defaultAppearance() })
          return
        }
        if (req.method !== 'PUT' && req.method !== 'POST') { sendJson(res, 405, { ok: false }); return }
        readBody(req).then((body) => {
          const next = body?.appearance ?? body
          if (!next || typeof next !== 'object') { sendJson(res, 400, { ok: false, error: 'invalid body' }); return }
          const result = store.saveConfig(next, 'save')
          if (!result.ok) { sendJson(res, 500, result); return }
          sendJson(res, 200, { ok: true, backup: result.backup })
        }).catch((error) => sendJson(res, 400, { ok: false, error: String(error?.message ?? error) }))
      }))

      disposers.push(mount(`${config.routePrefix}/api/reset`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        if (req.method !== 'POST') { sendJson(res, 405, { ok: false }); return }
        const result = store.resetConfig(defaultAppearance())
        sendJson(res, result.ok ? 200 : 500, { ...result, appearance: defaultAppearance() })
      }))

      disposers.push(mount(`${config.routePrefix}/api/wallpapers`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        sendJson(res, 200, { ok: true, wallpapers: library.list(), stats: library.stats() })
      }))

      disposers.push(mount(`${config.routePrefix}/api/upload`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        if (req.method !== 'POST') { sendJson(res, 405, { ok: false }); return }
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        library.upload(req, url.searchParams).then((result) => {
          sendJson(res, result.ok ? 200 : 400, result)
        })
      }))

      disposers.push(mount(`${config.routePrefix}/api/wallpaper`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        const id = url.searchParams.get('id') || ''
        if (req.method === 'DELETE') {
          sendJson(res, 200, library.remove(id))
          return
        }
        library.stream(id, req, res)
      }))

      disposers.push(mount(`${config.routePrefix}/api/diag`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        if (req.method === 'POST') {
          readBody(req, 256 * 1024).then((body) => {
            lastClientDiag = { ...body, at: Date.now() }
            logger.info('客户端诊断上报', { anchors: body?.anchors, strikes: body?.strikes, effects: body?.effects })
            sendJson(res, 200, { ok: true })
          }).catch((error) => sendJson(res, 400, { ok: false, error: String(error?.message ?? error) }))
          return
        }
        sendJson(res, 200, {
          ok: true,
          version: VERSION,
          uptimeMs: Date.now() - STARTED_AT,
          dataDir: config.dataDir,
          logFile: logger.file,
          stats: library.stats(),
          lastClientDiag,
          logs: logger.tail(60),
        })
      }))

      disposers.push(mount(`${config.routePrefix}/api/diag.json`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        const payload = {
          name: 'dsh-aether-theme',
          version: VERSION,
          generatedAt: new Date().toISOString(),
          uptimeMs: Date.now() - STARTED_AT,
          config: { dataDir: config.dataDir, routePrefix: config.routePrefix, maxWallpaperMB: config.maxWallpaperMB, canary: config.canary },
          stats: library.stats(),
          lastClientDiag,
          logs: logger.tail(40),
        }
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'content-disposition': 'attachment; filename="diag.json"',
        })
        res.end(`${JSON.stringify(payload, null, 2)}\n`)
      }))

      // token 自举：页面 HTML 可能被缓存而没有注入令牌；同源请求可换取令牌。
      // 同源判定 = Origin/Referer 是本机 http 地址，或 Sec-Fetch-Site: same-origin。
      disposers.push(mount(`${config.routePrefix}/api/bootstrap`, (req, res) => {
        const origin = String(req.headers.origin || '')
        const referer = String(req.headers.referer || '')
        const site = String(req.headers['sec-fetch-site'] || '')
        const isLocal = (value) => /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\//.test(value)
        const sameOrigin = site === 'same-origin' || isLocal(origin) || isLocal(referer) || (!origin && !referer && site === '')
        if (!sameOrigin) { sendJson(res, 403, { ok: false, error: 'cross-origin denied' }); return }
        logger.info('页面令牌自举', { hasReferer: Boolean(referer) })
        sendJson(res, 200, { ok: true, token: panelToken })
      }))

      disposers.push(mount(`${config.routePrefix}/api/health`, (req, res) => {
        sendJson(res, 200, { ok: true, version: VERSION, token: Boolean(panelToken) })
      }))

      // 页面令牌注入：桌面版走 index-inject 表
      try {
        const off = webCtx.on('webserver/index-inject', (table) => {
          if (Array.isArray(table)) {
            table.push({ kind: 'global', name: '__DSH_AETHER_TOKEN__', value: panelToken })
            table.push({ kind: 'global', name: '__DSH_AETHER_API__', value: config.routePrefix })
          }
        })
        if (typeof off === 'function') disposers.push(off)
      } catch (error) {
        logger.warn(`页面令牌注入失败：${error?.message ?? error}`)
      }

      // tapIndex 兜底：index 被缓存时 index-inject 表可能不生效，在每个 HTML 响应里内联注入。
      try {
        if (typeof webServer.tapIndex === 'function') {
          disposers.push(webCtx.effect(() => webServer.tapIndex((html) => {
            const script = '<script>window.__DSH_AETHER_TOKEN__=' + JSON.stringify(panelToken)
              + ';window.__DSH_AETHER_API__=' + JSON.stringify(config.routePrefix) + ';</script>'
            const head = String(html).indexOf('<head>')
            return head === -1 ? script + String(html) : String(html).slice(0, head + 6) + script + String(html).slice(head + 6)
          })))
        }
      } catch (error) {
        logger.warn(`tapIndex 注入失败：${error?.message ?? error}`)
      }

      return () => {
        for (const dispose of disposers) {
          try { dispose?.() } catch { /* ignore */ }
        }
      }
    })

    logger.info('面板接口已挂载', { prefix: config.routePrefix })
  })

  logger.info('已就绪', {
    version: VERSION,
    routes: 10,
    logs: config.logDir,
    data: config.dataDir,
  })

  return { store, library, config, logger, defaultAppearance }
}

export { DEFAULTS }
