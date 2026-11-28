// 静态校验 buildStyleText() 产出的 CSS：
// 1) 花括号平衡；2) 普通规则块内部不再嵌规则（CSS Nesting 下永不匹配）；
// 3) 同选择器 + 同自定义属性的重复声明（后写覆盖前写 = "能调但无效"）；
// 4) 本轮审查报告里三个 P0/P1 的回归红线（见 INVARIANTS）。
// 用法：node scripts/check-css.mjs
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'src', '20-core.js'), 'utf8')

const start = src.indexOf('function buildStyleText()')
if (start < 0) throw new Error('buildStyleText not found')
const endMark = "\t].join('\\n');"
const end = src.indexOf(endMark, start)
if (end < 0) throw new Error('buildStyleText tail not found')
const body = src.slice(start, end + endMark.length) + '\n}'

const css = runInNewContext(`${body}\nbuildStyleText()`, {})

// ── 结构检查 ─────────────────────────────────────────────────────────────
const problems = []
let line = 1
const stack = []
let selBuf = ''

for (let i = 0; i < css.length; i += 1) {
  const ch = css[i]
  if (ch === '\n') { line += 1; continue }
  if (ch === '{') {
    const sel = selBuf.trim().split('\n').pop().trim()
    const isAt = /^@/.test(sel)
    const insidePlainRule = stack.length > 0 && stack[stack.length - 1].at === false
    if (insidePlainRule) problems.push(`L${line}: 普通规则内又嵌规则 → "${sel}" 永不匹配`)
    stack.push({ at: isAt })
    selBuf = ''
    continue
  }
  if (ch === '}') {
    if (!stack.length) problems.push(`L${line}: 多余的 }`)
    else stack.pop()
    selBuf = ''
    continue
  }
  if (ch === ';') { selBuf = ''; continue }
  selBuf += ch
}
if (stack.length) problems.push(`花括号不平衡，残留深度 ${stack.length}`)

// ── 重复声明 ─────────────────────────────────────────────────────────────
const rules = []
const seen = new Map()
const ruleRe = /([^{}]+)\{([^{}]*)\}/g
let m
let cursor = 1
let consumed = 0
while ((m = ruleRe.exec(css))) {
  cursor += (css.slice(consumed, m.index).match(/\n/g) || []).length
  consumed = m.index
  const sel = m[1].trim().replace(/\s+/g, ' ')
  const decls = {}
  for (const raw of m[2].split(';')) {
    const idx = raw.indexOf(':')
    if (idx < 0) continue
    decls[raw.slice(0, idx).trim()] = raw.slice(idx + 1).trim()
  }
  rules.push({ sel, decls, line: cursor })
  if (sel.startsWith('@')) continue
  for (const prop of Object.keys(decls)) {
    if (!prop.startsWith('--')) continue
    const key = `${sel}||${prop}`
    if (seen.has(key)) problems.push(`重复声明 ${prop} (${sel}) @ L${seen.get(key)} → L${cursor}`)
    else seen.set(key, cursor)
  }
}

// ── 回归红线 ─────────────────────────────────────────────────────────────
const has = (sel, prop, pattern) => rules.some((r) => r.sel === sel && pattern.test(r.decls[prop] ?? ''))
const anyDecl = (prop) => {
  const out = []
  for (const rule of rules) if (rule.decls[prop] !== undefined) out.push(rule)
  return out
}

const invariants = [
  {
    ok: has('html[data-dsh-aether] body', '--dsw-alias-bg-mask-1', /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/),
    why: '遮罩变量必须在主 body 规则里透明（少一个 } 就会整块失效）',
  },
  {
    ok: anyDecl('--dsw-alias-bg-mask-2').length === 1 && anyDecl('--dsw-alias-bg-mask-3').length === 1,
    why: 'bg-mask-2/3 各只能声明一次',
  },
  {
    ok: anyDecl('--dsw-alias-bg-overlay').length === 1,
    why: '--dsw-alias-bg-overlay 只能声明一次（旧版 3 处重复）',
  },
  {
    ok: has('html[data-dsh-aether] body', '--dsw-specific-sidebar-fill', /--aether-sidebar-bg/),
    why: '侧栏底色必须走 --aether-sidebar-bg（不能被 chrome-fill 后置覆盖）',
  },
  {
    ok: anyDecl('--dsw-specific-sidebar-fill').length === 1,
    why: '--dsw-specific-sidebar-fill 只能声明一次',
  },
  {
    ok: anyDecl('--dsw-specific-sidebar-glass-fill').every((r) => /--aether-sidebar-bg/.test(r.decls['--dsw-specific-sidebar-glass-fill'])),
    why: '--dsw-specific-sidebar-glass-fill 也必须尊重 --aether-sidebar-bg',
  },
  {
    ok: rules.some((r) => r.sel === 'html[data-dsh-aether] [data-aether-input-host]'
      && /--aether-input-bg/.test(r.decls['background-color'] ?? '')),
    why: '输入框底色必须走 --aether-input-bg',
  },
  {
    ok: anyDecl('--dsw-specific-bubble').every((r) => /data-aether-bubble="custom"/.test(r.sel)),
    why: '气泡底色只能在 data-aether-bubble="custom" 时接管（否则深色主题被钉成浅蓝）',
  },
  {
    ok: !rules.some((r) => /sidebarCol/.test(r.sel) && /backdrop-filter/.test(JSON.stringify(r.decls))),
    why: '侧栏严禁 backdrop-filter（会创建包含块，把 fixed 的收起按钮拉进侧栏）',
  },
  {
    ok: !rules.some((r) => /sidebarCol/.test(r.sel) && /(^|;)\s*transform\s*:/.test(`;${JSON.stringify(r.decls)}`)),
    why: '侧栏严禁 transform（同上，包含块问题）',
  },
  {
    ok: rules.some((r) => /\[data-aether-frame\]::before/.test(r.sel)
      && /--aether-topbar-bg|--aether-titlebar-bg/.test(r.decls['background-color'] ?? '')
      && /--aether-topbar-img|--aether-titlebar-img/.test(r.decls['background-image'] ?? '')),
    why: '顶栏 ::before 必须一条规则里同时给底色与背景图（不能拆成两条互相覆盖）',
  },
  {
    ok: rules.filter((r) => /\[data-aether-frame\]::before/.test(r.sel)).length === 1,
    why: '顶栏 ::before 只能有一条规则',
  },
]

for (const item of invariants) if (!item.ok) problems.push('红线：' + item.why)

if (problems.length) {
  console.log(`CSS 问题 ${problems.length} 条：`)
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
console.log(`CSS OK — ${css.length} chars，${rules.length} 条规则 / ${seen.size} 条自定义属性声明，结构 + ${invariants.length} 条红线全部通过`)
