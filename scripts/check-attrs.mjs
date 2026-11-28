// 检查「CSS 里用到的 data-* 开关属性，JS 里到底有没有写入」。
// 踩过两次：data-chrome-blur / data-glass-blur 只被 removeAttribute、从未 setAttribute，
// 结果两整块 backdrop-filter 规则永远是死的；data-aether-frame 则是标记函数从来没被调用。
// 用法：node scripts/check-attrs.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))
const srcDir = join(here, '..', 'src')

// ── 1) 从 buildStyleText() 里抽出所有用到的 data-* 属性名 ──
const core = readFileSync(join(srcDir, '20-core.js'), 'utf8')
const start = core.indexOf('function buildStyleText()')
const endMark = "\t].join('\\n');"
const end = core.indexOf(endMark, start)
if (start < 0 || end < 0) throw new Error('buildStyleText not found')
const css = runInNewContext(`${core.slice(start, end + endMark.length)}\n}\nbuildStyleText()`, {})

const used = new Map() // attr -> 出处片段
const attrRe = /\[(data-[\w-]+)/g
let m
while ((m = attrRe.exec(css))) {
  if (!used.has(m[1])) used.set(m[1], css.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\n/g, ' '))
}

// ── 2) 扫 JS：setAttribute('data-x' / dataset 赋值 / 模板串 data-x= ──
const files = readdirSync(srcDir).filter((n) => /^\d+-.*\.js$/.test(n))
const written = new Set()
const quoted = []

for (const name of files) {
  const text = readFileSync(join(srcDir, name), 'utf8')
  // 单引号 + 双引号都要认：'data-x' / "data-x"
  for (const re of [/'((?:data)-[\w-]+)'/g, /"((?:data)-[\w-]+)"/g]) {
    let q
    while ((q = re.exec(text))) {
      quoted.push(q[1])
      written.add(q[1])
    }
  }
  // getAttribute('data-x') 这种读取不算"写入"，这里不区分，宁可漏报也不错杀
}

// 宿主自己写的属性（不是本插件注入的），列白名单，避免误报
const HOST_OWNED = new Set([
  'data-global-panel',        // DSH：设置面板容器
  'data-conversation-tabs',   // DSH：会话顶部标签行
  'data-rightbar-col',        // DSH：右侧栏列
  'data-composer-input',      // DSH：输入框
  'data-ds-dark-theme',       // DSH：深色主题标记
  'data-windows-titlebar',    // DSH：Windows 标题栏标记
  'data-platform',            // DSH：平台标记
  'data-message-bubble',      // DSH：消息气泡
  'data-message-role',        // DSH：消息角色
])

// 只保留真正用在选择器里的属性
const MISSING = []
for (const [attr, snippet] of used) {
  if (HOST_OWNED.has(attr)) continue
  if (!written.has(attr)) MISSING.push({ attr, snippet })
}

if (MISSING.length) {
  console.log(`data-* 属性只读不写 ${MISSING.length} 处（对应 CSS 规则永远不会生效）：`)
  for (const item of MISSING) console.log(`  - ${item.attr}   ← 「${item.snippet.trim()}」`)
  process.exit(1)
}
console.log(`data-* 开关属性一致：CSS 用到 ${used.size} 个（${[...used.keys()].join(', ')}），JS 均有写入`)
