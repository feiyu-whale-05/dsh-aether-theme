// 版本一致性检查：客户端 bundle 里的 VERSION 常量必须等于 package.json 的 version。
// Host 侧 lib/index.js 直接读 package.json，所以只需要盯客户端这一份。
// 用法：node scripts/check-version.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const pkgVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const srcDir = join(root, 'src')
const files = readdirSync(srcDir).filter((n) => /^\d+-.*\.js$/.test(n)).sort()

const problems = []
for (const name of files) {
  const text = readFileSync(join(srcDir, name), 'utf8')
  const match = /var VERSION = '([^']+)'/.exec(text)
  if (!match) continue
  if (match[1] !== pkgVersion) problems.push(`${name}: VERSION='${match[1]}' ≠ package.json '${pkgVersion}'`)
}

// client.js 由 src 拼出来，顺带核对构建产物不是旧的
const client = readFileSync(join(root, 'client.js'), 'utf8')
const built = /var VERSION = '([^']+)'/.exec(client)
if (!built) problems.push('client.js: 找不到 VERSION 常量')
else if (built[1] !== pkgVersion) problems.push(`client.js: VERSION='${built[1]}' ≠ package.json '${pkgVersion}'（忘了 build？）`)

const lib = readFileSync(join(root, 'lib', 'index.js'), 'utf8')
if (lib.includes("const VERSION = '")) problems.push('lib/index.js: VERSION 不应硬编码，应从 package.json 读')

if (problems.length) {
  console.log('版本不一致：')
  for (const p of problems) console.log('  - ' + p)
  process.exit(1)
}
console.log(`版本一致 — v${pkgVersion}（src / client.js / package.json；host 读 package.json）`)
