// Host 路由冒烟测试：用 mock webServer 把 10 条路由全部注册起来，
// 然后真的发请求，断言鉴权、媒体令牌、上传失败路径、tapIndex 注入范围。
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { apply } from '../lib/index.js'

function buildHost(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'aether-routes-'))
  const routes = new Map()
  let indexInject = null
  let tapFn = null

  const webServer = {
    register(definition) {
      routes.set(definition.path, definition.handler)
      return () => routes.delete(definition.path)
    },
    tapIndex(fn) {
      tapFn = fn
      return () => { tapFn = null }
    },
  }
  const webCtx = {
    get(name) { return name === 'webServer' ? webServer : undefined },
    effect(callback) { callback(); return () => {} },
    on(name, callback) {
      if (name === 'webserver/index-inject') { indexInject = callback; return () => {} }
      return () => {}
    },
  }
  const ctx = {
    inject(deps, callback) { callback(webCtx) },
    effect(callback) { callback(); return () => {} },
    on() { return () => {} },
  }

  apply(ctx, { dataDir: dir, logDir: join(dir, 'logs'), maxWallpaperMB: 4, ...options })

  return { dir, routes, get token() { return null }, indexInject: () => indexInject, tap: () => tapFn }
}

/** 发一个假请求，收集 status / body。 */
async function call(handler, { method = 'GET', url = '/', headers = {}, body = null, remoteAddress = '127.0.0.1' } = {}) {
  const req = new PassThrough()
  req.method = method
  req.url = url
  req.headers = headers
  req.socket = { remoteAddress }
  const chunks = []
  const res = {
    status: 0,
    headers: {},
    writeHead(status, extra) { this.status = status; Object.assign(this.headers, extra || {}) },
    end(chunk) { if (chunk) chunks.push(Buffer.from(chunk)); this.done = true },
    destroy() { this.done = true },
  }
  const done = new Promise((resolve) => { res.resolve = resolve })
  const originalEnd = res.end.bind(res)
  res.end = (chunk) => { originalEnd(chunk); res.resolve() }
  handler(req, res)
  if (body !== null) req.end(body)
  else if (method === 'POST' || method === 'PUT') req.end()
  await Promise.race([done, new Promise((resolve) => setTimeout(resolve, 800))])
  const text = Buffer.concat(chunks).toString('utf8')
  let json = null
  try { json = JSON.parse(text) } catch { /* 非 JSON */ }
  return { status: res.status, text, json }
}

function flatten(map) {
  const out = {}
  for (const [path, handler] of map) out[path.replace('/dsh-aether', '')] = handler
  return out
}

test('注册 10 条路由 + index-inject 表', () => {
  const host = buildHost()
  const routes = flatten(host.routes)
  assert.equal(host.routes.size, 10, `期望 10 条路由，实际 ${host.routes.size}`)
  for (const path of ['/api/state', '/api/config', '/api/reset', '/api/wallpapers', '/api/upload', '/api/wallpaper', '/api/diag', '/api/diag.json', '/api/bootstrap', '/api/health']) {
    assert.ok(routes[path], `缺少路由 ${path}`)
  }
  const table = []
  host.indexInject()(table)
  const names = table.map((row) => row.name)
  assert.ok(names.includes('__DSH_AETHER_TOKEN__'))
})

test('鉴权：无令牌 401，页面令牌走 header 通过，query 里的页面令牌不再放行', async () => {
  const host = buildHost()
  const routes = flatten(host.routes)
  // 从 /api/health 拿不到 token，直接读 state 响应的 mediaToken 也不含页面令牌；
  // 页面令牌由 store 落盘，读文件拿到。
  const { readFileSync } = await import('node:fs')
  const pageToken = readFileSync(join(host.dir, 'panel-token'), 'utf8').trim()
  assert.equal(pageToken.length, 64)

  const noToken = await call(routes['/api/state'])
  assert.equal(noToken.status, 401)

  const withHeader = await call(routes['/api/state'], { headers: { 'x-dsh-aether-token': pageToken } })
  assert.equal(withHeader.status, 200)
  assert.equal(withHeader.json.ok, true)

  const viaQuery = await call(routes['/api/state'], { url: `/api/state?token=${pageToken}` })
  assert.equal(viaQuery.status, 401, '页面令牌不允许出现在 query 里')
})

test('媒体令牌：可读图，不能做管理动作', async () => {
  const host = buildHost()
  const routes = flatten(host.routes)
  const { readFileSync } = await import('node:fs')
  const pageToken = readFileSync(join(host.dir, 'panel-token'), 'utf8').trim()

  const state = await call(routes['/api/state'], { headers: { 'x-dsh-aether-token': pageToken } })
  const mediaToken = state.json.mediaToken
  assert.ok(mediaToken && mediaToken.includes('.'), 'state 应下发媒体令牌')

  // 不存在的 id → 404（说明已经通过鉴权、进到 stream 了）
  const streamRes = await call(routes['/api/wallpaper'], { url: `/api/wallpaper?id=0123456789abcdef&mt=${mediaToken}` })
  assert.equal(streamRes.status, 404)

  // 同样的媒体令牌不能删东西
  const delRes = await call(routes['/api/wallpaper'], {
    method: 'DELETE',
    url: `/api/wallpaper?id=0123456789abcdef&mt=${mediaToken}`,
    headers: {},
  })
  assert.equal(delRes.status, 401, 'DELETE 只认页面令牌')

  // 伪造签名要被拒
  const forged = mediaToken.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))
  const forgedRes = await call(routes['/api/wallpaper'], { url: `/api/wallpaper?id=0123456789abcdef&mt=${forged}` })
  assert.equal(forgedRes.status, 401)
})

test('bootstrap：非回环 socket 且无同源头 → 403', async () => {
  const host = buildHost()
  const routes = flatten(host.routes)

  const cross = await call(routes['/api/bootstrap'], { remoteAddress: '10.0.0.9' })
  assert.equal(cross.status, 403, '不能靠"什么头都不带"白拿令牌')

  const local = await call(routes['/api/bootstrap'], { remoteAddress: '127.0.0.1' })
  assert.equal(local.status, 200)
  assert.equal(local.json.token.length, 64)

  const sameOrigin = await call(routes['/api/bootstrap'], {
    remoteAddress: '10.0.0.9',
    headers: { 'sec-fetch-site': 'same-origin' },
  })
  assert.equal(sameOrigin.status, 200)
})

test('tapIndex：只注入应用入口页', () => {
  const host = buildHost()
  const tap = host.tap()
  assert.equal(typeof tap, 'function')
  const appHtml = '<html><head></head><body><div id="root"></div></body></html>'
  const otherHtml = '<html><head></head><body>另一个插件的页面</body></html>'
  assert.ok(tap(appHtml).includes('__DSH_AETHER_TOKEN__'))
  assert.equal(tap(otherHtml), otherHtml, '其它页面不能拿到页面令牌')
})

test('上传失败路径：返回值而不是悬挂', async () => {
  const host = buildHost()
  const routes = flatten(host.routes)
  const { readFileSync } = await import('node:fs')
  const pageToken = readFileSync(join(host.dir, 'panel-token'), 'utf8').trim()

  const bad = await call(routes['/api/upload'], {
    method: 'POST',
    url: '/api/upload?name=evil.exe',
    headers: { 'x-dsh-aether-token': pageToken },
  })
  assert.equal(bad.status, 400)
  assert.equal(bad.json.ok, false)

  // 空内容上传：应该 400 且不留下半截文件
  const empty = await call(routes['/api/upload'], {
    method: 'POST',
    url: '/api/upload?name=ok.png',
    headers: { 'x-dsh-aether-token': pageToken },
  })
  assert.equal(empty.status, 400)
  // 等一拍，让 'close' 事件把残留文件删掉
  await new Promise((resolve) => setTimeout(resolve, 120))
  const leftover = readdirSync(join(host.dir, 'wallpapers')).filter((name) => /^[0-9a-f]{16}\./.test(name))
  assert.equal(leftover.length, 0, `不应留下半截文件：${leftover.join(',')}`)
})
