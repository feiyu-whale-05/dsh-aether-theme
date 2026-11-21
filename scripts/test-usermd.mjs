// 用户 markdown 渲染器单元测试（从 src/80-usermd.js 抽取纯函数执行）。
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
const code = readFileSync(new URL('../src/80-usermd.js', import.meta.url), 'utf8')
const ctx = vm.createContext({ console })
vm.runInContext(code, ctx, { filename: 'usermd.js' })
const { renderUserMarkdown } = ctx
const cases = [
  ['**重点**', '<strong>重点</strong>'],
  ['普通文本', '<p>普通文本</p>'],
  ['`code` 与 **粗**', '<code>code</code>'],
  ['- a\n- b', '<ul>'],
  ['# 标题', '<h3>标题</h3>'],
  ['[官网](https://example.com)', '<a href="https://example.com"'],
  ['[坏链](javascript:alert(1))', 'href="#"'],
  ['~~删~~', '<del>删</del>'],
  ['<script>alert(1)</script>', '&lt;script&gt;'],
]
let fail = 0
for (const [input, expect] of cases) {
  const out = renderUserMarkdown(input)
  const ok = out.includes(expect)
  if (!ok) { fail++; console.log('FAIL', JSON.stringify(input), '->', out.slice(0, 120)) }
}
const fence = renderUserMarkdown('```js\nconst a = 1 < 2\n```')
if (!fence.includes('<pre><code data-lang="js">') || !fence.includes('1 &lt; 2')) { fail++; console.log('FAIL fence ->', fence) }
console.log(fail === 0 ? 'usermd tests OK' : `usermd ${fail} failures`)
process.exit(fail === 0 ? 0 : 1)
