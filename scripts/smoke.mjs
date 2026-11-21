// dsh-aether-theme — client bundle 烟雾测试。
//
// 在 node:vm 里模拟浏览器最小环境（window/document/react），执行 client.js，
// 断言：① factory 返回 { inject, apply }；② apply(ctx) 不抛错；
// ③ 四个官方槽位都注册成功；④ 关键状态（配置/诊断）可读。
//
// 用法：node scripts/smoke.mjs

import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const registered = []
const listeners = []
const storage = new Map()

function makeElement(tag) {
  const element = {
    tagName: String(tag).toUpperCase(),
    style: { setProperty() {}, removeProperty() {}, cssText: '' },
    classList: { add() {}, remove() {} },
    dataset: {},
    attributes: {},
    children: [],
    textContent: '',
    setAttribute(name, value) { this.attributes[name] = String(value) },
    removeAttribute(name) { delete this.attributes[name] },
    getAttribute(name) { return this.attributes[name] ?? null },
    appendChild(child) { this.children.push(child); return child },
    insertBefore(child) { this.children.unshift(child); return child },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null },
    querySelectorAll() { return [] },
    click() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 } },
  }
  return element
}

const body = makeElement('body')
const head = makeElement('head')
const documentElement = makeElement('html')
documentElement.attributes['data-platform'] = 'win32'

const documentMock = {
  body,
  head,
  documentElement,
  createElement: (tag) => makeElement(tag),
  getElementById: () => null,
  querySelector: (selector) => (selector === 'html[data-platform]' ? documentElement : null),
  querySelectorAll: () => [],
  addEventListener() {},
  removeEventListener() {},
  createTextNode: (text) => ({ text }),
}

const reactStub = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useState: (initial) => {
    const value = typeof initial === 'function' ? initial() : initial
    return [value, () => {}]
  },
  useEffect: () => {},
  useRef: (value) => ({ current: value }),
  Fragment: Symbol('Fragment'),
}

const sandboxWindow = {
  __ModuleLoader__: {
    load(mod) {
      sandboxWindow.__mod = mod
    },
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  localStorage: {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval() {},
  confirm: () => false,
  fetch: () => Promise.reject(new Error('offline in sandbox')),
  navigator: { language: 'zh-CN' },
  Image: class ImageMock {
    constructor() {
      this.onload = null
      this.onerror = null
    }
    set src(value) {
      this._src = value
    }
  },
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  MutationObserver: class {
    observe() {}
    disconnect() {}
  },
  Blob: class {},
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  FileReader: class {},
}

const context = vm.createContext({
  window: sandboxWindow,
  document: documentMock,
  navigator: sandboxWindow.navigator,
  react: reactStub,
  require: (id) => {
    if (id === 'react') return reactStub
    throw new Error(`unexpected require: ${id}`)
  },
  console,
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval() {},
  fetch: sandboxWindow.fetch,
  requestAnimationFrame: sandboxWindow.requestAnimationFrame,
  cancelAnimationFrame: sandboxWindow.cancelAnimationFrame,
  MutationObserver: sandboxWindow.MutationObserver,
  Image: sandboxWindow.Image,
  URL: sandboxWindow.URL,
  Blob: sandboxWindow.Blob,
  FileReader: sandboxWindow.FileReader,
  getComputedStyle: sandboxWindow.getComputedStyle,
  localStorage: sandboxWindow.localStorage,
  matchMedia: sandboxWindow.matchMedia,
  navigator: sandboxWindow.navigator,
  document: documentMock,
})

// client.js 里同时用 window.__ModuleLoader__ 和裸 document
vm.runInContext(code, context, { filename: 'client.js' })

const mod = sandboxWindow.__mod
if (!mod) throw new Error('factory 未注册到 __ModuleLoader__')
if (typeof mod.factory !== 'function') throw new Error('mod.factory 不是函数')

const exported = mod.factory((id) => {
  if (id === 'react') return reactStub
  throw new Error(`unexpected require: ${id}`)
})
if (!exported || typeof exported.apply !== 'function') throw new Error('apply 未导出')
if (!Array.isArray(exported.inject) || !exported.inject.includes('slots')) throw new Error('inject 声明缺失')

const ctx = {
  get(name) {
    if (name === 'locale') return { language: 'zh' }
    return undefined
  },
  slots: {
    inject(name, callback) {
      const result = callback()
      if (!result || result.name !== name) throw new Error(`槽位 ${name} 注册返回异常`)
      registered.push(name)
      return () => {}
    },
    register(definition) {
      return definition
    },
  },
  effect(callback) {
    const dispose = callback()
    return () => { if (typeof dispose === 'function') dispose() }
  },
  provide() {},
  set() {},
  on() {
    return () => {}
  },
}

exported.apply(ctx)

console.log('slot registrations:', registered.join(', '))
if (registered.length < 4) throw new Error(`期望至少 4 个槽位，实际 ${registered.length}`)
for (const expected of ['sidebar.panellist', 'main', 'settings.section', 'shell.overlay']) {
  if (!registered.includes(expected)) throw new Error(`缺少槽位注册：${expected}`)
}
console.log('smoke OK')
