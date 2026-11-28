// 静态检查 React Hooks 纪律：
// 任何含 hook 的函数，必须是"真组件"（通过 h(Foo, ...) 挂载），
// 不能在别的组件渲染期被当普通函数直接调用 —— 那会把 hook 塞进调用者的 hook 链，
// hook 数量随分支变化时 React 直接抛 "Rendered fewer hooks than expected"。
// 用法：node scripts/check-hooks.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..', 'src')
const files = readdirSync(srcDir).filter((n) => /^\d+-.*\.js$/.test(n)).sort()

const HOOK_RE = /\b(react\.use[A-Z]\w*|useAetherTick)\s*\(/
const FUNC_START = /^function\s+([A-Za-z_$][\w$]*)\s*\(/gm

const sources = files.map((name) => ({ name, text: readFileSync(join(srcDir, name), 'utf8') }))
const all = sources.map((s) => s.text).join('\n')

const withHooks = []
for (const { name, text } of sources) {
  const lines = text.split('\n')
  const starts = []
  let m
  FUNC_START.lastIndex = 0
  while ((m = FUNC_START.exec(text))) {
    const line = text.slice(0, m.index).split('\n').length
    starts.push({ fn: m[1], line, index: m.index })
  }
  for (let i = 0; i < starts.length; i += 1) {
    const from = starts[i].line - 1
    const to = i + 1 < starts.length ? starts[i + 1].line - 1 : lines.length
    const body = lines.slice(from, to).join('\n')
    // 只统计"函数自身直接调用"的 hook：嵌套函数里出现的也算（保守，宁可多报）
    if (HOOK_RE.test(body)) withHooks.push({ name, fn: starts[i].fn, line: starts[i].line })
  }
}

const problems = []
for (const item of withHooks) {
  if (/^use[A-Z]/.test(item.fn)) continue
  // 挂载方式①：h(Foo, ...)；方式②：把组件引用原样交给 slots.register(...)，由 React 挂载
  const mounted = new RegExp(`\\b${item.fn}\\b(?!\\s*\\()`).test(all)
  if (!mounted) {
    problems.push(`${item.name}:${item.line} ${item.fn}() 含 hook 但从未用 h() 挂载（渲染期直调 = hook 链错乱）`)
  }
}

if (problems.length) {
  console.log(`Hook 纪律问题 ${problems.length} 条：`)
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
console.log(`Hooks OK — ${withHooks.length} 个含 hook 的函数全部通过 h() 挂载：${withHooks.map((w) => w.fn).join(', ')}`)
