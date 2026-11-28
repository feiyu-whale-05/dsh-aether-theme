import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { normalizeConfig } from '../lib/config.js'
import { createStore } from '../lib/store.js'
import { createWallpaperLibrary } from '../lib/wallpapers.js'
import { createLogger } from '../lib/log.js'
import { defaultAppearance } from '../lib/index.js'

test('normalizeConfig 提供默认值并夹取越界', () => {
  const cfg = normalizeConfig(undefined)
  assert.ok(cfg.dataDir.includes('aether-theme'))
  assert.equal(cfg.routePrefix, '/dsh-aether')
  assert.equal(cfg.maxWallpaperMB, 512)
  assert.equal(cfg.canary, true)
  assert.equal(cfg.logLevel, 'info')

  const clamped = normalizeConfig({ maxWallpaperMB: 99999, maxWallpapers: -3, routePrefix: 'no-slash' })
  assert.equal(clamped.maxWallpaperMB, 4096)
  assert.equal(clamped.maxWallpapers, 4)
  assert.equal(clamped.routePrefix, '/dsh-aether')
})

test('store：原子写 + 每次写前备份旧版本', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aether-store-'))
  const logger = createLogger({ dir: join(dir, 'logs'), level: 'error' })
  const store = createStore({ dataDir: dir, logger })
  const first = { version: 1, theme: { accent: '#111111' } }
  const second = { version: 1, theme: { accent: '#222222' } }

  assert.equal(store.token().length, 64)
  assert.equal(store.token(), store.token(), '令牌应落盘复用')

  assert.equal(store.saveConfig(first, 'first').ok, true)
  assert.equal(store.loadConfig().theme.accent, '#111111')
  assert.equal(store.saveConfig(second, 'second').ok, true)
  assert.equal(store.loadConfig().theme.accent, '#222222')

  const backups = readdirSync(dir).filter((name) => name.includes('.bak.json'))
  assert.ok(backups.length >= 1, '至少应有一份备份')
  const backupText = backups.map((name) => readFileSync(join(dir, name), 'utf8')).join('\n')
  assert.ok(backupText.includes('#111111'), '备份里应能找到上一版内容')
})

test('store：reset 会先备份当前版', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aether-reset-'))
  const store = createStore({ dataDir: dir })
  store.saveConfig({ version: 1, enabled: false }, 'custom')
  const result = store.resetConfig(defaultAppearance())
  assert.equal(result.ok, true)
  assert.equal(store.loadConfig().enabled, true)
  const backups = readdirSync(dir).filter((name) => name.includes('.bak.json'))
  assert.ok(backups.length >= 1)
})

test('wallpaper 库：列表/删除/统计', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aether-wall-'))
  const library = createWallpaperLibrary({ dataDir: dir, routePrefix: '/dsh-aether', maxWallpaperMB: 16, maxWallpapers: 4 })
  library.ensureDir()
  // 直接写索引 + 文件，模拟已入库。
  // id 必须是真实的 16 位 hex：索引被篡改时（例如 id/file 里塞 ../）也要挡得住。
  const id = '0123456789abcdef'
  const wallDir = join(dir, 'wallpapers')
  writeFileSync(join(wallDir, `${id}.png`), Buffer.from([1, 2, 3]))
  writeFileSync(join(wallDir, 'index.json'), JSON.stringify({
    items: [{ id, name: 'a.png', file: `${id}.png`, mime: 'image/png', kind: 'image', category: 'custom', size: 3, addedAt: 1 }],
  }))
  const list = library.list()
  assert.equal(list.length, 1)
  // 路由是 kind:'exact'，只有 ?id= 形式能命中；路径段形式必然 404（旧的断言把这个 bug 当成了正确值）
  assert.equal(list[0].url, `/dsh-aether/api/wallpaper?id=${id}`)
  assert.equal(library.stats().images, 1)
  assert.equal(library.remove(id).ok, true)
  assert.equal(library.list().length, 0)
  assert.equal(existsSync(join(wallDir, `${id}.png`)), false)
})

test('wallpaper 库：拒绝越权索引条目与非法 id', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aether-wall-evil-'))
  const library = createWallpaperLibrary({ dataDir: dir, routePrefix: '/dsh-aether' })
  library.ensureDir()
  const wallDir = join(dir, 'wallpapers')
  writeFileSync(join(dir, 'secret.txt'), 'top-secret')
  writeFileSync(join(wallDir, 'index.json'), JSON.stringify({
    items: [
      // 路径穿越：file 指到数据目录外面
      { id: '0123456789abcdef', name: 'x', file: '../../secret.txt', mime: 'text/plain', kind: 'image', size: 10, addedAt: 1 },
      // 非法 id
      { id: 'not-hex', name: 'y', file: 'not-hex.png', mime: 'image/png', kind: 'image', size: 10, addedAt: 2 },
      // 隐藏文件
      { id: 'fedcba9876543210', name: 'z', file: '.env', mime: 'image/png', kind: 'image', size: 10, addedAt: 3 },
    ],
  }))
  assert.equal(library.list().length, 0, '越权条目必须被过滤掉')
  assert.equal(library.remove('0123456789abcdef').ok, true)
  assert.equal(existsSync(join(dir, 'secret.txt')), true, '数据目录外的文件绝不能被删')
})

test('store：内容未变时完全跳过磁盘写', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aether-store-skip-'))
  const store = createStore({ dataDir: dir })
  const first = { version: 1, theme: { accent: '#abcdef' } }
  const second = { version: 1, theme: { accent: '#123456' } }
  store.saveConfig(first, 'first')
  store.saveConfig(second, 'second')
  const backupCount = () => readdirSync(dir).filter((name) => name.includes('.bak.json')).length
  const before = backupCount()
  assert.equal(before, 1, '第一次覆盖应产生一份备份')
  const again = store.saveConfig(second, 'third')
  assert.equal(again.skipped, true, '同一份内容不应重复写盘')
  assert.equal(backupCount(), before, '内容没变不应新增备份')
})

test('defaultAppearance 结构稳定', () => {
  const appearance = defaultAppearance()
  assert.equal(appearance.version, 1)
  assert.equal(appearance.glass.regions.base >= 0, true)
  // boot / widget 已拆成独立插件（dsh-boot-splash-pro / dsh-cost-meter），不再属于本插件
  for (const name of ['theme', 'wallpaper', 'glass', 'pixel', 'diag', 'inputGlow', 'fx']) {
    assert.ok(appearance.modules[name], `模块 ${name} 应存在`)
  }
  assert.equal(appearance.modules.boot, undefined, 'boot 已迁出')
  assert.equal(appearance.modules.widget, undefined, 'widget 已迁出')
  assert.equal(appearance.theme.contrastTarget, 7)
  // 分区背景的唯一位置是顶层（旧版本误放在 glass 下，客户端读顶层就对不上）
  assert.ok(appearance.backgrounds, 'backgrounds 应在顶层')
  assert.equal(appearance.glass.backgrounds, undefined, 'glass 下不应再有 backgrounds')
  for (const key of ['sidebar', 'input', 'bubble', 'topbar', 'titlebar', 'settings']) {
    assert.ok(appearance.backgrounds[key], `分区 ${key} 默认值应存在`)
  }
})
