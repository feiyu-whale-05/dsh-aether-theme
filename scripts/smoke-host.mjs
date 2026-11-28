// Host 侧烟雾测试：mock webServer，断言 8 条路由全部注册、token 注入生效。
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../lib/index.js'

const dir = mkdtempSync(join(tmpdir(), 'aether-host-'))
const routes = []
let indexInject = null

const webServer = {
  register(definition) {
    routes.push(definition.path)
    return () => {}
  },
  tapIndex() { return () => {} },
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

apply(ctx, { dataDir: dir, logDir: join(dir, 'logs'), maxWallpaperMB: 32 })
console.log('routes:', routes.length, routes.map((r) => r.replace('/dsh-aether', '')).join(' '))
if (routes.length !== 10) throw new Error(`期望 10 条路由，实际 ${routes.length}`)
if (typeof indexInject !== 'function') throw new Error('index-inject 未挂载')
const table = []
indexInject(table)
const names = table.map((row) => row.name)
console.log('index inject:', names.join(', '))
if (!names.includes('__DSH_AETHER_TOKEN__')) throw new Error('缺少页面令牌注入')
console.log('host smoke OK')
