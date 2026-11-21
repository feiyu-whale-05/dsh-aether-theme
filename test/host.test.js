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
  // 直接写索引 + 文件，模拟已入库
  const wallDir = join(dir, 'wallpapers')
  writeFileSync(join(wallDir, 'a.png'), Buffer.from([1, 2, 3]))
  writeFileSync(join(wallDir, 'index.json'), JSON.stringify({
    items: [{ id: 'a', name: 'a.png', file: 'a.png', mime: 'image/png', kind: 'image', category: 'custom', size: 3, addedAt: 1 }],
  }))
  const list = library.list()
  assert.equal(list.length, 1)
  assert.equal(list[0].url, '/dsh-aether/api/wallpaper/a')
  assert.equal(library.stats().images, 1)
  assert.equal(library.remove('a').ok, true)
  assert.equal(library.list().length, 0)
  assert.equal(existsSync(join(wallDir, 'a.png')), false)
})

test('defaultAppearance 结构稳定', () => {
  const appearance = defaultAppearance()
  assert.equal(appearance.version, 1)
  assert.equal(appearance.glass.regions.base > 0, true)
  for (const name of ['theme', 'wallpaper', 'glass', 'pixel', 'widget', 'pet', 'boot', 'diag']) {
    assert.ok(appearance.modules[name], `模块 ${name} 应存在`)
  }
  assert.equal(appearance.theme.contrastTarget, 7)
})
