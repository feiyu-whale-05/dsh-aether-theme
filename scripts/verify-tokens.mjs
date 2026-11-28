// 在 node:vm 里加载 client.js，模拟深色主题 + 一个"有消息的会话"DOM，
// 驱动 apply() → applyAppearance()，断言关键 CSS 变量与扫描结果。
//
// 这是本轮审查里"测试基线含错"的修正：旧脚本用 `querySelectorAll = () => []` 的桩，
// 导致所有扫描分支（气泡挂件 / 头像）根本没被执行，等于没测。
// 现在桩会真的返回元素，扫描真正跑通；断言失败即退出码 1。
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const vars = new Map()
const problems = []

function check(name, ok, detail) {
  if (!ok) problems.push(`${name}${detail === undefined ? '' : `（${detail}）`}`)
}

// ── 极简 DOM ──────────────────────────────────────────────────────────────
function makeElement(tag, opts = {}) {
  const node = {
    tagName: String(tag).toUpperCase(),
    className: opts.className || '',
    textContent: opts.textContent || '',
    children: [],
    attributes: { ...(opts.attributes || {}) },
    parentElement: null,
    isConnected: true,
    offsetWidth: opts.width ?? 200,
    offsetHeight: opts.height ?? 32,
    style: {
      setProperty: (k, v) => vars.set(k, v),
      removeProperty: () => {},
      cssText: '',
      position: '',
      transform: '',
      transformOrigin: '',
      _props: {},
    },
    classList: {
      add(name) { node.className = `${node.className} ${name}`.trim() },
      remove() {},
      contains: (name) => String(node.className).split(/\s+/).includes(name),
    },
    setAttribute(k, v) { node.attributes[k] = String(v) },
    removeAttribute(k) { delete node.attributes[k] },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(node.attributes, k) },
    getAttribute(k) { return node.attributes[k] ?? null },
    appendChild(child) { child.parentElement = node; node.children.push(child); return child },
    insertBefore(child) { child.parentElement = node; node.children.unshift(child); return child },
    remove() { node.isConnected = false },
    addEventListener() {},
    removeEventListener() {},
    click() {},
    matches() { return false },
    closest(selector) { return node.selectorIndex?.[selector] ?? null },
    contains() { return false },
    querySelector(selector) { return node.querySelectorAll(selector)[0] ?? null },
    querySelectorAll() { return [] },
    getBoundingClientRect() { return { left: 0, top: 0, width: node.offsetWidth, height: node.offsetHeight } },
    firstElementChild: null,
    childElementCount: 0,
  }
  return node
}

// 会话 DOM：一条用户消息 + 一条 agent 消息 + 状态行
const rootEl = makeElement('div', { attributes: { id: 'root' } })
const sidebarCol = makeElement('div', { className: 'sidebarCol_x1' })
const userRow = makeElement('div', { className: 'userRow_a2' })
const userBubble = makeElement('div', { className: 'bubble', attributes: { 'data-message-bubble': '' } })
const assistantRow = makeElement('div', { className: 'assistantRow_b3' })
const statusButton = makeElement('button', { className: 'hE4tRW_root', textContent: '已完成，用时 3.2s', width: 825, height: 33 })
const statusRow = makeElement('div', { className: 'statusRow_c4', width: 825, height: 33 })
const inputCard = makeElement('div', { className: 'chatCard_d5', width: 640, height: 90 })
const editable = makeElement('div', { attributes: { contenteditable: 'true' } })

statusButton.parentElement = statusRow
statusRow.parentElement = assistantRow
assistantRow.parentElement = rootEl
userBubble.parentElement = userRow
userRow.parentElement = rootEl
editable.parentElement = inputCard
inputCard.parentElement = rootEl
sidebarCol.parentElement = rootEl

// 让 findStatusLine 能"向上找到"状态行
assistantRow.querySelectorAll = (selector) => {
  if (selector === 'button, summary, span, div, p, a') return [statusButton]
  return []
}
statusRow.querySelectorAll = (selector) => {
  if (selector === 'button, summary, span, div, p, a') return [statusButton]
  return []
}
statusButton.querySelectorAll = () => []
// 真实 DOM 里状态行在"内容容器的父级"里，findStatusLine 是从 parentElement 往下找的
rootEl.querySelectorAll = (selector) => {
  if (selector === 'button, summary, span, div, p, a') return [statusButton]
  return []
}

const body = makeElement('body')
if (process.env.DARK !== '0') body.attributes['data-ds-dark-theme'] = ''
const head = makeElement('head')
const documentElement = makeElement('html')
// 刻意不设 data-platform —— dsh web 构建上就没有这个属性。
// 金丝雀若把它当契约锚点，会在这里 80 秒后自我撤离（线上实测踩到过）。
documentElement.attributes['data-platform'] = undefined
delete documentElement.attributes['data-platform']
documentElement.style.setProperty = (k, v) => vars.set(k, v)

const createdStyles = []
function createElement(tag) {
  const node = makeElement(tag)
  if (String(tag).toLowerCase() === 'style') {
    createdStyles.push(node)
    node.textContent = ''
  }
  return node
}

const SELECTOR_TABLE = {
  '[class*="sidebarCol"]': [sidebarCol],
  '[class*="userRow"]': [userRow],
  '[data-message-bubble]': [userBubble],
  '[class*="assistant"]': [assistantRow],
  '[contenteditable="true"]:not(.cm-content)': [editable],
  'button.hE4tRW_root': [statusButton],
  '[data-render-input]': [inputCard],
  '.aeth-avatar-agent': [],
  '.aeth-avatar': [],
  '[data-aether-mask-clear="1"]': [],
  '[role="dialog"]': [],
}

/**
 * 真实代码里传给 querySelectorAll 的常是「逗号拼接的组合选择器」
 * （例如 AVATAR_AGENT_SELECTOR）。桩必须按逗号拆开分别查表，否则一条都匹配不到 ——
 * 旧脚本正是因此让所有扫描分支静默空转。
 */
const ALL_NODES = [rootEl, sidebarCol, userRow, userBubble, assistantRow, statusButton, statusRow, inputCard, editable]

function queryAll(selector) {
  const parts = String(selector).split(',').map((p) => p.trim())
  const out = []
  for (const part of parts) {
    const known = SELECTOR_TABLE[part]
    if (known) {
      for (const node of known) if (!out.includes(node)) out.push(node)
      continue
    }
    // 简易属性选择器：[data-x] / [data-x="v"]
    const attr = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(part)
    if (attr) {
      for (const node of ALL_NODES) {
        const value = node.attributes[attr[1]]
        if (value === undefined) continue
        if (attr[2] !== undefined && value !== attr[2]) continue
        if (!out.includes(node)) out.push(node)
      }
    }
  }
  return out
}

const documentMock = {
  body,
  head,
  documentElement,
  createElement,
  getElementById: (id) => (id === 'root' ? rootEl : null),
  querySelector: (selector) => queryAll(selector)[0] ?? null,
  querySelectorAll: (selector) => queryAll(selector),
  addEventListener() {},
  removeEventListener() {},
}

const react = {
  createElement: () => null,
  useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
  useEffect: () => {},
  useRef: (v) => ({ current: v }),
  Fragment: {},
}

const win = {
  __ModuleLoader__: { load(m) { win.__mod = m } },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame() {},
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id),
  confirm: () => false,
  fetch: () => Promise.reject(new Error('offline')),
  navigator: { language: 'zh-CN' },
  Image: class { set src(_v) { /* 不解码 */ } },
  getComputedStyle: () => ({ getPropertyValue: () => '', position: 'relative' }),
  MutationObserver: class { observe() {} disconnect() {} },
  Blob: class {},
  URL: { createObjectURL: () => '', revokeObjectURL() {} },
  FileReader: class {},
  innerWidth: 1440,
  innerHeight: 900,
  devicePixelRatio: 1,
}

const ctx = vm.createContext({
  window: win,
  document: documentMock,
  require: (id) => (id === 'react' ? react : {}),
  console,
  setTimeout,
  clearTimeout,
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id),
  fetch: win.fetch,
  requestAnimationFrame: win.requestAnimationFrame,
  cancelAnimationFrame() {},
  MutationObserver: win.MutationObserver,
  Image: win.Image,
  URL: win.URL,
  Blob: win.Blob,
  FileReader: win.FileReader,
  getComputedStyle: win.getComputedStyle,
  localStorage: win.localStorage,
  matchMedia: win.matchMedia,
  navigator: win.navigator,
  Math,
  Date,
  JSON,
  Promise,
  Set,
  Map,
  WeakMap,
  Float32Array,
  Buffer: undefined,
})

vm.runInContext(code, ctx, { filename: 'client.js' })
const mod = win.__mod.factory((id) => (id === 'react' ? react : {}))
const fakeCtx = {
  get: (n) => (n === 'locale' ? { language: 'zh' } : undefined),
  slots: { inject: (n, cb) => cb(), register: (d) => d },
  effect: (cb) => { cb(); return () => {} },
  provide() {},
  set() {},
  on: () => () => {},
}
mod.apply(fakeCtx)

await new Promise((resolve) => setTimeout(resolve, 400))

// ── 断言 ─────────────────────────────────────────────────────────────────
const REQUIRED_VARS = [
  '--aether-chrome-fill', '--aether-chrome-blur', '--aether-accent', '--aether-bg-base',
  '--aether-sidebar-fill', '--aether-label-primary', '--aether-label-secondary',
  '--aether-brand-blue', '--aether-code-bg', '--aether-border-l2',
]
for (const key of REQUIRED_VARS) check(`变量 ${key} 应被写入`, Boolean(vars.get(key)), vars.get(key))

// 对比度兜底：深色主题下 label 与底色对比度应 >= 4.5
function parseColor(value) {
  if (!value) return null
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim())
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
  }
  const rgba = /rgba?\(([^)]+)\)/.exec(value)
  if (rgba) {
    const parts = rgba[1].split(',').map((p) => Number(p.trim()))
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
  }
  return null
}
function luminance({ r, g, b }) {
  const channel = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
function contrast(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
const ink = parseColor(vars.get('--aether-label-primary'))
const surface = parseColor(vars.get('--aether-sidebar-fill'))
if (ink && surface) {
  const ratio = contrast(ink, surface)
  check('label 与侧栏底色对比度 >= 4.5', ratio >= 4.5, ratio.toFixed(2))
}

// 样式表结构：能生成 <style>
check('应注入一个 <style> 元素', createdStyles.length >= 1, createdStyles.length)
const cssText = createdStyles[0]?.textContent ?? ''
check('样式表包含变量桥', cssText.includes('--dsw-alias-bg-base'))
check('样式表包含遮罩透明', cssText.includes('--dsw-alias-bg-mask-1'))
check('侧栏不再有 backdrop-filter', !/sidebarCol[^{]*\{[^}]*backdrop-filter/.test(cssText))

// 扫描分支真的跑了：agent 状态行被打上标记
check('头像扫描命中状态行', statusRow.getAttribute('data-aether-status') === '1'
  || statusButton.getAttribute('data-aether-status') === '1',
'statusRow/statusButton 都没有 data-aether-status')

// ── 关闭主题：必须把所有注入的东西拆干净（粒子 / 光晕 / 头像 / 挂件 / 属性） ──
const api = win.__DSH_AETHER_THEME__
check('服务注入 window.__DSH_AETHER_THEME__', Boolean(api))
if (api) {
  const cfg = api.get()
  if (cfg) {
    cfg.enabled = false
    api.apply('verify-disabled')
    await new Promise((resolve) => setTimeout(resolve, 120))
    check('关闭后应移除 html[data-dsh-aether]', !documentElement.hasAttribute('data-dsh-aether'),
      documentElement.getAttribute('data-dsh-aether'))
    check('关闭后应移除 data-chrome-blur', !documentElement.hasAttribute('data-chrome-blur'))
    const leftover = []
    for (const node of [statusRow, statusButton, assistantRow]) {
      const mark = node.getAttribute('data-aether-status')
      if (mark) leftover.push(mark)
    }
    check('关闭后不应残留 data-aether-status 标记', leftover.length === 0, leftover.join(','))
    // 重新打开：属性应回写
    cfg.enabled = true
    api.apply('verify-enabled')
    await new Promise((resolve) => setTimeout(resolve, 120))
    check('重新启用应回写 html[data-dsh-aether]', documentElement.getAttribute('data-dsh-aether') === 'on',
      documentElement.getAttribute('data-dsh-aether'))

    // 「主题引擎」模块开关也必须是真开关（历史上 moduleOn('theme') 没有任何调用点）
    cfg.modules = cfg.modules || {}
    cfg.modules.theme = { enabled: false }
    api.apply('verify-module-theme-off')
    await new Promise((resolve) => setTimeout(resolve, 120))
    check('modules.theme 关掉后也应拆解', !documentElement.hasAttribute('data-dsh-aether'),
      documentElement.getAttribute('data-dsh-aether'))
    cfg.modules.theme = { enabled: true }
    api.apply('verify-module-theme-on')
    await new Promise((resolve) => setTimeout(resolve, 120))
    check('modules.theme 打开后应回写', documentElement.getAttribute('data-dsh-aether') === 'on',
      documentElement.getAttribute('data-dsh-aether'))
  }
}

// ── 金丝雀回归：没有 html[data-platform] 也不该扣分（web 构建的正常现象） ──
await new Promise((resolve) => setTimeout(resolve, 4600))
check('缺 data-platform 时金丝雀不应计 strike', api && api.diag && api.diag().strikes === 0,
  api && api.diag ? api.diag().strikes : 'no api')
check('缺 data-platform 时主题仍应在线', documentElement.getAttribute('data-dsh-aether') === 'on',
  documentElement.getAttribute('data-dsh-aether'))

if (problems.length) {
  console.log(`客户端验证失败 ${problems.length} 条：`)
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
console.log('客户端验证通过 — 变量桥 / 对比度 / 样式结构 / 扫描分支 / 关闭-启用往返 / 金丝雀')
// 金丝雀断言改用了真实的 setInterval，事件循环里还有 idle tick 与 60s 诊断定时器；
// 主动退出，否则脚本跑完会挂住不返回。
process.exit(0)
