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

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEFAULTS, normalizeConfig } from './config.js'
import { createLogger } from './log.js'
import { createStore } from './store.js'
import { createWallpaperLibrary } from './wallpapers.js'

export const name = 'dsh-aether-theme'
export const inject = []

const PKG_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const VERSION = (() => {
  try {
    return JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')).version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
})()
const STARTED_AT = Date.now()
const ROUTE_COUNT = 10

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
    bubbleDecoration: { enabled: false, text: '🎀', image: '', x: 0, y: -2 },
    avatars: { enabled: false, user: '我', agent: 'AI', userImage: '', agentImage: '' },
    regionCss: { enabled: false, global: '', sidebar: '', input: '', bubble: '', topbar: '', titlebar: '', settings: '' },
    panel: { scale: 1.15 },
    meteor: { enabled: false, density: 1, hue: 222, maxDist: 160 },
    userMd: { enabled: true },
    wallpaper: {
      mode: 'none',
      source: 'preset',
      id: '',
      cssPreset: 'aurora',
      fit: 'cover',
      dim: 0.32,
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
      // chromeOpacity = 0 表示「跟随明暗自动」（深色 0.5 / 浅色 0.42）
      chromeOpacity: 0,
      chromeBlur: 14,
    },
    // 分区背景：唯一位置是顶层（旧版本放在 glass 下，客户端读的是顶层，两处对不上）。
    backgrounds: {
      sidebar: { enabled: false, image: '', color: '#22262f', opacity: 0 },
      input: { enabled: false, image: '', color: '#22262f', opacity: 0 },
      bubble: { enabled: false, image: '', color: '#dbe7ff', opacity: 0 },
      topbar: { enabled: false, image: '', color: '#22262f', opacity: 0 },
      titlebar: { enabled: false, image: '', color: '#1b1f27', opacity: 0.6 },
      settings: { enabled: false, image: '', color: '#22262f', opacity: 0.6 },
    },
    pixel: {
      theme: 'cabin',
      nineSlice: 12,
      crt: false,
      scanline: 0.08,
    },
    fx: { density: 60, fishCount: 3, whale: true, glow: true, press: true },
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

let usageCache = { at: 0, value: null }

/** 读本机用量文件（余额挂件的数据源）；缺失/格式不对就返回 null，绝不抛。10s 缓存。 */
function readUsage() {
  if (Date.now() - usageCache.at < 10_000) return usageCache.value
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
  usageCache = { at: Date.now(), value: Object.keys(out).length ? out : null }
  return usageCache.value
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

    // 媒体令牌：<img>/<video> 不能带自定义 header，所以走 query。
    // 但不能把「页面令牌」放进 URL（会进访问日志 / Referer / 历史记录），
    // 这里签发 12 小时时效的 HMAC 签名串，泄露也只在窗口期内有效。
    const mediaSecret = randomBytes(32)
    const MEDIA_TOKEN_TTL = 12 * 60 * 60 * 1000

    function issueMediaToken(ttl = MEDIA_TOKEN_TTL) {
      const exp = Date.now() + ttl
      const sig = createHmac('sha256', mediaSecret).update(`media:${exp}`).digest('hex').slice(0, 32)
      return `${exp.toString(36)}.${sig}`
    }

    function verifyMediaToken(value) {
      try {
        const [expPart, sig] = String(value ?? '').split('.')
        if (!expPart || !sig) return false
        const exp = parseInt(expPart, 36)
        if (!Number.isFinite(exp) || exp < Date.now()) return false
        const expected = createHmac('sha256', mediaSecret).update(`media:${exp}`).digest('hex').slice(0, 32)
        const a = Buffer.from(sig, 'utf8')
        const b = Buffer.from(expected, 'utf8')
        if (a.length !== b.length) return false
        return timingSafeEqual(a, b)
      } catch {
        return false
      }
    }

    function safeEqual(value) {
      try {
        const a = Buffer.from(String(value ?? ''), 'utf8')
        const b = Buffer.from(panelToken, 'utf8')
        if (a.length !== b.length) return false
        return timingSafeEqual(a, b)
      } catch {
        return false
      }
    }

    /**
     * @param {object} req
     * @param {{allowMedia?: boolean}} [options] allowMedia：允许 <img>/<video> 用的媒体令牌
     */
    const authorized = (req, options) => {
      const header = String(req.headers['x-dsh-aether-token'] ?? '')
      if (header && safeEqual(header)) return true
      if (!options?.allowMedia) return false
      const url = new URL(req.url || '/', 'http://127.0.0.1')
      return verifyMediaToken(url.searchParams.get('mt'))
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
        const wallpapers = library.list()
        sendJson(res, 200, {
          ok: true,
          version: VERSION,
          defaultAppearance: defaultAppearance(),
          appearance: saved ?? null,
          wallpapers,
          stats: library.stats(wallpapers),
          mediaToken: issueMediaToken(),
          usage: readUsage(),
          diag: { startedAt: STARTED_AT, lastClientDiag, routes: ROUTE_COUNT, canary: config.canary },
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
        const wallpapers = library.list()
        sendJson(res, 200, { ok: true, wallpapers, stats: library.stats(wallpapers) })
      }))

      disposers.push(mount(`${config.routePrefix}/api/upload`, (req, res) => {
        if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        if (req.method !== 'POST') { sendJson(res, 405, { ok: false }); return }
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        library.upload(req, url.searchParams).then((result) => {
          sendJson(res, result.ok ? 200 : 400, result)
        }).catch((error) => {
          // 必须兜住：否则异常逃逸到宿主请求处理链，且 res 永远不 end()（请求悬挂）
          logger.error(`上传处理失败：${error?.message ?? error}`)
          sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
        })
      }))

      disposers.push(mount(`${config.routePrefix}/api/wallpaper`, (req, res) => {
        // GET = <img>/<video> 取图，允许媒体令牌；DELETE = 管理动作，只认页面令牌
        if (req.method === 'DELETE') {
          if (!authorized(req)) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
          const delUrl = new URL(req.url || '/', 'http://127.0.0.1')
          sendJson(res, 200, library.remove(delUrl.searchParams.get('id') || ''))
          return
        }
        if (!authorized(req, { allowMedia: true })) { sendJson(res, 401, { ok: false, error: 'unauthorized' }); return }
        const url = new URL(req.url || '/', 'http://127.0.0.1')
        library.stream(url.searchParams.get('id') || '', req, res)
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
        // 旧实现有 `!origin && !referer && site === ''` 这条免检分支：
        // 任何"三个头都不带"的请求（curl / 其他本地进程）都能白拿令牌。
        // 现在只认三种：显式同源、本机 Origin/Referer、或 socket 对端就是回环地址。
        const remote = String(req.socket?.remoteAddress ?? '')
        const loopbackSocket = /^(127\.|::1$|::ffff:127\.)/.test(remote)
        const sameOrigin = site === 'same-origin' || isLocal(origin) || isLocal(referer) || loopbackSocket
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
            const text = String(html)
            // 只注入应用入口页：宿主 webServer 可能还服务别的插件页面，
            // 无差别注入等于把页面令牌暴露给所有同源页面。
            if (text.indexOf('__DSH_BOOT__') === -1 && text.indexOf('id="root"') === -1) return html
            const script = '<script>window.__DSH_AETHER_TOKEN__=' + JSON.stringify(panelToken)
              + ';window.__DSH_AETHER_API__=' + JSON.stringify(config.routePrefix) + ';</script>'
            const head = text.indexOf('<head>')
            return head === -1 ? script + text : text.slice(0, head + 6) + script + text.slice(head + 6)
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
    routes: ROUTE_COUNT,
    logs: config.logDir,
    data: config.dataDir,
  })

  return { store, library, config, logger, defaultAppearance }
}

export { DEFAULTS }
