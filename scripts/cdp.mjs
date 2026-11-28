// 极简 CDP 驱动：给本插件的端到端实测用。
// 用法：node cdp.mjs <命令> [参数...]
//   launch                          起一个 headless Edge 并连上应用
//   shot   <out.png>                截整页
//   eval   <js表达式>                在页面里执行并打印 JSON 结果
//   click  <selector>               点元素中心（真实鼠标事件）
//   clicktext <文字> [tag]          按可见文字找按钮/链接再点（真实鼠标事件）
//   type   <selector> <text>        聚焦后逐字输入
//   scroll <selector> <deltaY>      在元素上滚动
//   console                         打印收集到的 console / pageerror
//   tabs                            列出目标
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const CDP_PORT = Number(process.env.CDP_PORT || 9444)
const URL_TO_OPEN = process.env.DSH_URL
const DSH_URL = process.env.DSH_URL || ''

async function waitFor(path, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}${path}`)
      if (res.ok) return await res.json()
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('CDP endpoint never came up')
}

export async function connect() {
  const list = await waitFor('/json/list')
  const pages = list.filter((t) => t.type === 'page')
  // 优先挑应用本身那个 target：headless Edge 首启会多开一个"同步浏览数据"的提示页
  const page = pages.find((t) => DSH_URL && t.url.startsWith(DSH_URL.slice(0, 30)))
    || pages.find((t) => /127\.0\.0\.1|localhost/.test(t.url))
    || pages[0]
  if (!page) throw new Error('no page target')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })
  let id = 0
  const pending = new Map()
  const events = []
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(JSON.stringify(msg.error)))
      else resolve(msg.result)
    } else if (msg.method) {
      events.push(msg)
    }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    id += 1
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  // 自动确认 window.confirm / alert：headless 下没人点，默认会当"取消"，测不了「一键恢复默认」这类流程
  ws.addEventListener('message', (ev) => {
    try {
      const msg = JSON.parse(ev.data)
      if (msg.method === 'Page.javascriptDialogOpening') {
        id += 1
        ws.send(JSON.stringify({ id, method: 'Page.handleJavaScriptDialog', params: { accept: true } }))
      }
    } catch { /* ignore */ }
  })
  return { send, events, close: () => ws.close() }
}

/** 在页面里按文字找元素并返回其中心点 */
const FIND_BY_TEXT = (text, tag) => `
(() => {
  const tags = ${JSON.stringify(tag || 'button, a, [role="button"], [role="tab"], [role="treeitem"], li, div, span')};
  const wanted = ${JSON.stringify(text)};
  const nodes = [...document.querySelectorAll(tags)];
  const exact = nodes.filter(n => (n.textContent || '').trim() === wanted);
  const partial = nodes.filter(n => (n.textContent || '').trim().includes(wanted));
  // 取"最内层"的那个（文本完全等于目标且子节点最少）
  const pool = (exact.length ? exact : partial).filter(n => n.getBoundingClientRect().width > 0);
  if (!pool.length) return null;
  pool.sort((a, b) => (a.children.length - b.children.length) || ((a.textContent||'').length - (b.textContent||'').length));
  const el = pool[0];
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
           text: (el.textContent || '').trim().slice(0, 50), tag: el.tagName,
           scrolled: r.top < 0 || r.bottom > innerHeight };
})()`

async function mouseClick(send, x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 })
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 })
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)

  if (cmd === 'launch') {
    const exe = process.env.BROWSER_EXE
    const args = [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-sync',
      '--window-size=1680,1050',
      '--user-data-dir=' + (process.env.BROWSER_PROFILE || './.cdp-profile'),
      URL_TO_OPEN,
    ]
    const child = spawn(exe, args, { detached: true, stdio: 'ignore' })
    child.unref()
    const list = await waitFor('/json/list')
    console.log('launched, targets:', list.map((t) => `${t.type}:${t.url.slice(0, 50)}`).join(' | '))
    return
  }

  const { send, events, close } = await connect()
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  try {
    await send('Emulation.setDeviceMetricsOverride', {
      width: Number(process.env.VW || 1680),
      height: Number(process.env.VH || 1050),
      deviceScaleFactor: 1,
      mobile: false,
    })
  } catch { /* 老版本浏览器可能没有 */ }

  const evalIn = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || JSON.stringify(result.exceptionDetails))
    }
    return result.result.value
  }

  if (cmd === 'shot') {
    const out = rest[0] || 'shot.png'
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, Buffer.from(data, 'base64'))
    console.log('saved', out)
  } else if (cmd === 'eval') {
    console.log(JSON.stringify(await evalIn(rest.join(' ')), null, 2))
  } else if (cmd === 'click') {
    const info = await evalIn(`(() => { const el = document.querySelector(${JSON.stringify(rest[0])}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height, text: (el.textContent||'').trim().slice(0,40) }; })()`)
    if (!info) { console.log('NOT FOUND:', rest[0]); process.exit(2) }
    await mouseClick(send, info.x, info.y)
    console.log(`clicked ${rest[0]} @ ${Math.round(info.x)},${Math.round(info.y)} "${info.text}"`)
  } else if (cmd === 'clicktext') {
    const info = await evalIn(FIND_BY_TEXT(rest[0], rest[1]))
    if (!info) { console.log('NOT FOUND TEXT:', rest[0]); process.exit(2) }
    if (info.scrolled) {
      await evalIn(`(() => { const n = [...document.querySelectorAll('button,a,[role=button],li,div,span')].filter(n => (n.textContent||'').trim() === ${JSON.stringify(rest[0])}); if (n[0]) n[0].scrollIntoView({block:'center'}); return true; })()`)
      await new Promise((r) => setTimeout(r, 250))
      const again = await evalIn(FIND_BY_TEXT(rest[0], rest[1]))
      if (again) Object.assign(info, again)
    }
    await mouseClick(send, info.x, info.y)
    console.log(`clicked "${info.text}" <${info.tag}> @ ${Math.round(info.x)},${Math.round(info.y)} (${Math.round(info.w)}x${Math.round(info.h)})`)
  } else if (cmd === 'clickxy') {
    await mouseClick(send, Number(rest[0]), Number(rest[1]))
    console.log('clicked at', rest[0], rest[1])
  } else if (cmd === 'rowbtn') {
    // 精确点某个 .aeth-row 里的开关（按行标签定位，避免点到别的行）
    const info = await evalIn(`(() => {
      const rows = [...document.querySelectorAll('.aeth-row')];
      const row = rows.find((r) => (r.textContent || '').includes(${JSON.stringify(rest[0])}));
      if (!row) return null;
      const btn = row.querySelector('.aeth-btn, button');
      if (!btn) return null;
      btn.scrollIntoView({ block: 'center' });
      const b = btn.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, before: (btn.textContent || '').trim() };
    })()`)
    if (!info) { console.log('ROW NOT FOUND:', rest[0]); process.exit(2) }
    await new Promise((r) => setTimeout(r, 300))
    const again = await evalIn(`(() => {
      const rows = [...document.querySelectorAll('.aeth-row')];
      const row = rows.find((r) => (r.textContent || '').includes(${JSON.stringify(rest[0])}));
      const btn = row && row.querySelector('.aeth-btn, button');
      if (!btn) return null;
      const b = btn.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    })()`)
    await mouseClick(send, again ? again.x : info.x, again ? again.y : info.y)
    console.log(`rowbutton "${rest[0]}" was "${info.before}" @ ${Math.round(again ? again.x : info.x)},${Math.round(again ? again.y : info.y)}`)
  } else if (cmd === 'type') {
    const selector = rest[0]
    const text = rest.slice(1).join(' ')
    await evalIn(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); return true; })()`)
    for (const ch of text) await send('Input.insertText', { text: ch })
    console.log('typed', text.length, 'chars')
  } else if (cmd === 'scroll') {
    const box = await evalIn(`(() => { const el = document.querySelector(${JSON.stringify(rest[0])}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; })()`)
    if (!box) { console.log('NOT FOUND:', rest[0]); process.exit(2) }
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: box.x, y: box.y, deltaX: 0, deltaY: Number(rest[1] || 300) })
    console.log('scrolled', rest[1] || 300)
  } else if (cmd === 'goto') {
    // 显式导航：headless 首启经常停在 NTP，不能只靠 launch 时传 URL
    const target = rest[0] || process.env.DSH_URL
    await send('Page.navigate', { url: target })
    await new Promise((r) => setTimeout(r, Number(rest[1] || 9000)))
    console.log('navigated to', target.slice(0, 60))
  } else if (cmd === 'reload') {
    // 关掉缓存再硬刷新：插件 client bundle 是按 URL 缓存的，普通刷新拿不到新代码
    try { await send('Network.enable') } catch { /* ignore */ }
    try { await send('Network.setCacheDisabled', { cacheDisabled: true }) } catch { /* ignore */ }
    await send('Page.reload', { ignoreCache: true })
    await new Promise((r) => setTimeout(r, Number(rest[0] || 8000)))
    console.log('reloaded (cache disabled)')
  } else if (cmd === 'console') {
    await new Promise((r) => setTimeout(r, 800))
    const interesting = events.filter((e) => /^(Runtime\.(consoleAPICalled|exceptionThrown)|Log\.entryAdded)$/.test(e.method))
    const seen = new Set()
    for (const e of interesting) {
      let line = ''
      if (e.method === 'Runtime.consoleAPICalled') {
        line = `[console.${e.params.type}] ` + e.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ')
      } else if (e.method === 'Runtime.exceptionThrown') {
        line = '[EXCEPTION] ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)
      } else {
        const { level, text, source } = e.params.entry
        if (level === 'verbose') continue
        line = `[log.${level}/${source}] ${text}`
      }
      if (seen.has(line)) continue
      seen.add(line)
      console.log(line.slice(0, 300))
    }
    console.log(`(raw events: ${events.length})`)
  } else if (cmd === 'tabs') {
    const list = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`).then((r) => r.json())
    for (const t of list) console.log(t.type, t.url.slice(0, 100))
  } else {
    console.log('unknown command', cmd)
  }
  close()
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1) })
