// 静态检查 React Hooks 纪律（两条，都是本项目踩过的坑）：
// ① 任何含 hook 的函数必须是"真组件"（通过 h(Foo, ...) 挂载，或原样交给
//    slots.register 由 React 挂载），不能在别的组件渲染期被当普通函数调用 ——
//    那会把 hook 塞进调用者的 hook 链，hook 数量随分支变化时 React 直接抛
//    "Rendered fewer hooks than expected"。
// ② hook 不能出现在「函数体层的提前 return」之后 —— 条件分支跳过 hook 同样是违规。
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
const problems = []

for (const { name, text } of sources) {
  const lines = text.split('\n')
  const starts = []
  let m
  FUNC_START.lastIndex = 0
  while ((m = FUNC_START.exec(text))) {
    starts.push({ fn: m[1], line: text.slice(0, m.index).split('\n').length })
  }
  for (let i = 0; i < starts.length; i += 1) {
    const from = starts[i].line - 1                       // 函数声明那一行（0-based）
    const to = i + 1 < starts.length ? starts[i + 1].line - 1 : lines.length
    const body = lines.slice(from, to)

    // ── 收集 hook 调用行（记录函数体内的括号深度）──
    let depth = 0
    let sawHook = false
    let lastHookIndex = -1
    let firstTopLevelReturn = -1
    let baseDepth = -1                        // 函数体层级的括号深度
    const nested = []                         // 嵌套函数的 body 深度（用于忽略它们内部的 return）
    const net = (line) => (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length
    for (let k = 0; k < body.length; k += 1) {
      const line = body[k]
      const atStart = depth
      if (k === 0) {
        depth += net(line)                  // 声明行本身会开一个 {
        baseDepth = depth
        continue
      }
      // 顶层 return：只能是我们正在分析的这一层的 return（嵌套函数里的不算）
      if (nested.length === 0 && /^\s*return\b/.test(line) && firstTopLevelReturn === -1) {
        firstTopLevelReturn = k
      }
      if (HOOK_RE.test(line)) {
        sawHook = true
        lastHookIndex = k
      }
      depth += net(line)
      if (/\bfunction\b\s*[\w$]*\s*\(/.test(line) && depth > atStart) nested.push(depth)
      while (nested.length && depth < nested[nested.length - 1]) nested.pop()
    }
    if (!sawHook) continue
    withHooks.push({ name, fn: starts[i].fn, line: starts[i].line })

    // ② 提前 return 之后不能再有 hook
    if (lastHookIndex > -1 && firstTopLevelReturn > -1 && firstTopLevelReturn < lastHookIndex) {
      problems.push(`${name}:${starts[i].line} ${starts[i].fn}() 在提前 return 之后还有 hook（hook 数量会随分支变化）`)
    }

    // ① 含 hook 的函数必须是真组件
    if (/^use[A-Z]/.test(starts[i].fn)) continue
    const mounted = new RegExp(`\\b${starts[i].fn}\\b(?!\\s*\\()`).test(all)
    if (!mounted) {
      problems.push(`${name}:${starts[i].line} ${starts[i].fn}() 含 hook 但从未用 h() 挂载（渲染期直调 = hook 链错乱）`)
    }
  }
}

if (problems.length) {
  console.log(`Hook 纪律问题 ${problems.length} 条：`)
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
console.log(`Hooks OK — ${withHooks.length} 个含 hook 的函数全部通过 h() 挂载，且没有"提前 return 后才调 hook"：${withHooks.map((w) => w.fn).join(', ')}`)
