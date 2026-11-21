// dsh-aether-theme — client bundle 构建脚本。
//
// 手写 bundle（宿主 __ModuleLoader__.load 的 factory 格式），源码拆在 src/*.js，
// 按文件名顺序拼接进 factory 函数体：所有模块共享同一作用域，因此不需要
// import/require（除了 react）。这样既能保持可维护的分文件，又满足浏览器端
// 单文件、零打包器依赖的约束。
//
// 用法：node src/build.js

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const srcDir = here

const HEADER = `// dsh-aether-theme — browser client half.
//
// 背景 + 毛玻璃 + 对比度兜底的主题引擎。零布局侵入：不新增/移动/删除宿主的
// DOM 结构，只用「CSS 变量覆盖 + 一个 z-index:-1 的隔离舞台层 + 官方 Slot」。
// 逐字节回滚：任何改动都先落盘备份，面板有「一键恢复默认」。
//
// 代码组织：src/*.js 由 src/build.js 依文件名拼接；模块共享 factory 作用域。
// 所有 visible string 都是 React text child；样式用宿主 --dsw-* token 兜底。
window.__ModuleLoader__.load({
	id: 'dsh-aether-theme',
	factory(require) {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

		var react = require('react');
		if (react && react.default && !react.createElement) react = react.default;
		var h = react.createElement;

		var inject = ['slots', 'locale'];

`

const TAIL = `
		return { inject: inject, apply: apply };
	},
});
`

const parts = readdirSync(srcDir)
  .filter((name) => /^\d+-.*\.js$/.test(name))
  .sort()

const body = parts
  .map((name) => {
    const text = readFileSync(join(srcDir, name), 'utf8')
    return `\t\t// ── ${name} ${'─'.repeat(Math.max(4, 64 - name.length))}\n${indent(text)}`
  })
  .join('\n')

function indent(text) {
  return text
    .split('\n')
    .map((line) => (line.trim() ? `\t\t${line}` : line))
    .join('\n')
}

const out = HEADER + body + TAIL
writeFileSync(join(root, 'client.js'), out, 'utf8')
console.log(`client.js written: ${parts.length} modules, ${(out.length / 1024).toFixed(1)} KiB`)
