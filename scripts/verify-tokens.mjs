// 在 node:vm 里加载 client.js，模拟深色主题，驱动 applyAppearance，打印关键 CSS 变量。
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const vars = new Map()

function el(tag) {
  return {
    tagName: tag, style: { setProperty: (k, v) => vars.set(k, v), removeProperty: () => {}, cssText: '' },
    classList: { add() {}, remove() {} }, children: [], textContent: '', attributes: {},
    setAttribute(k, v) { this.attributes[k] = String(v) }, removeAttribute(k) { delete this.attributes[k] },
    hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) },
    getAttribute(k) { return this.attributes[k] ?? null }, appendChild(c) { this.children.push(c); return c },
    insertBefore(c) { this.children.unshift(c); return c }, remove() {}, addEventListener() {},
    removeEventListener() {}, querySelector() { return null }, querySelectorAll() { return [] }, click() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 10, height: 10 } },
  }
}
const body = el('body')
if (process.env.DARK !== '0') body.attributes['data-ds-dark-theme'] = ''
const head = el('head')
const documentElement = el('html')
documentElement.attributes['data-platform'] = 'win32'
documentElement.style.setProperty = (k, v) => vars.set(k, v)

const documentMock = {
  body, head, documentElement,
  createElement: el, getElementById: () => null,
  querySelector: (s) => (s === 'html[data-platform]' ? documentElement : null),
  querySelectorAll: () => [], addEventListener() {}, removeEventListener() {},
}
const react = { createElement: () => null, useState: (v) => [typeof v === 'function' ? v() : v, () => {}], useEffect: () => {}, useRef: (v) => ({ current: v }), Fragment: {} }
const win = {
  __ModuleLoader__: { load(m) { win.__mod = m } },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  addEventListener() {}, removeEventListener() {}, requestAnimationFrame: (f) => setTimeout(f, 0),
  cancelAnimationFrame() {}, setInterval: () => 0, clearInterval() {}, confirm: () => false,
  fetch: () => Promise.reject(new Error('offline')), navigator: { language: 'zh-CN' },
  Image: class { set src(v) {} }, getComputedStyle: () => ({ getPropertyValue: () => '' }),
  MutationObserver: class { observe() {} disconnect() {} }, Blob: class {}, URL: { createObjectURL: () => '', revokeObjectURL() {} },
  FileReader: class {},
}
const ctx = vm.createContext({
  window: win, document: documentMock, require: (id) => (id === 'react' ? react : {}),
  console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  fetch: win.fetch, requestAnimationFrame: win.requestAnimationFrame, cancelAnimationFrame() {},
  MutationObserver: win.MutationObserver, Image: win.Image, URL: win.URL, Blob: win.Blob,
  FileReader: win.FileReader, getComputedStyle: win.getComputedStyle,
  localStorage: win.localStorage, matchMedia: win.matchMedia, navigator: win.navigator,
})
vm.runInContext(code, ctx, { filename: 'client.js' })
const mod = win.__mod.factory((id) => (id === 'react' ? react : {}))
const fakeCtx = {
  get: (n) => (n === 'locale' ? { language: 'zh' } : undefined),
  slots: { inject: (n, cb) => cb(), register: (d) => d },
  effect: (cb) => { cb(); return () => {} }, provide() {}, set() {}, on: () => () => {},
}
mod.apply(fakeCtx)

await new Promise((r) => setTimeout(r, 300))
const keys = ['--aether-brand-blue', '--aether-brand-blue-ink', '--aether-brand-blue-hover', '--aether-accent-readable', '--aether-accent-ink', '--aether-caret', '--aether-label-primary', '--aether-label-secondary', '--aether-label-tertiary', '--aether-label-caption', '--aether-bg-base', '--aether-sidebar-fill', '--aether-accent', '--aether-code-bg', '--aether-code-fg', '--aether-glass-blur', '--aether-bg-blur']
for (const k of keys) console.log(k.padEnd(30), vars.get(k) ?? '(unset)')
const dark = ['--aether-label-primary', '--aether-label-secondary'].every((k) => {
  const v = vars.get(k) || ''
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(v) ? null : /^#([0-9a-f]{6})$/i.exec(v.trim())
  return m
})
console.log('label vars hex-check:', dark)
