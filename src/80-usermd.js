// ── usermd：用户消息 markdown 自动渲染 ──────────────────────────────────
// 宿主的用户气泡用 UserTextRun 渲染纯文本（引用 chip 除外），不解析 markdown。
// 这里做 DOM 后处理：找到 [data-message-bubble]，把含标记的原文渲染成 .aeth-md
// 并隐藏原文（原文保留，方便回退；原文节点不清空）。
//
// 安全：先 HTML 转义再套规则；链接只允许 http(s)/mailto/相对路径；
// 代码块内容单独转义；不执行任何脚本。

var USER_MD_PATTERN = /(\*\*|__|~~|`|^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|\[[^\]]+\]\([^)]+\))/m;

function escapeHtmlText(text) {
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function safeHref(url) {
	var value = String(url || '').trim();
	if (/^(https?:|mailto:|\/|#)/i.test(value)) return value.replace(/"/g, '%22');
	return '#';
}

/** 极简 markdown → HTML（够用即可：粗体/斜体/删除线/行内码/代码块/标题/列表/链接/段落）。 */
function renderUserMarkdown(text) {
	var source = String(text || '').replace(/\r\n/g, '\n');
	if (!source.trim()) return '';
	var slots = [];
	function stash(html) {
		var token = '\u0000SLOT' + slots.length + '\u0000';
		slots.push(html);
		return token;
	}
	// 1) 围栏代码块先摘出来（内部不再解析）
	source = source.replace(/```([A-Za-z0-9_+-]*)\n([\s\S]*?)```/g, function (match, lang, body) {
		return stash('<pre><code data-lang="' + escapeHtmlText(lang) + '">' + escapeHtmlText(body.replace(/\n$/, '')) + '</code></pre>');
	});
	// 2) 转义
	var escaped = escapeHtmlText(source);
	// 3) 行内代码
	escaped = escaped.replace(/`([^`\n]+)`/g, function (match, code) {
		return '<code>' + escapeHtmlText(code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")) + '</code>';
	});
	// 4) 链接
	escaped = escaped.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, href) {
		return '<a href="' + safeHref(href.replace(/&amp;/g, '&')) + '" target="_blank" rel="noreferrer noopener">' + label + '</a>';
	});
	// 5) 粗体 / 斜体 / 删除线
	escaped = escaped
		.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
		.replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
		.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')
		.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
		.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
	// 6) 分块：标题 / 列表 / 段落
	var lines = escaped.split('\n');
	var html = [];
	var listType = '';
	function closeList() {
		if (listType) { html.push('</' + listType + '>'); listType = ''; }
	}
	for (var i = 0; i < lines.length; i += 1) {
		var line = lines[i];
		var heading = /^(#{1,6})\s+(.*)$/.exec(line);
		var bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
		var ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
		if (heading) {
			closeList();
			var level = Math.min(6, heading[1].length + 2);
			html.push('<h' + level + '>' + heading[2] + '</h' + level + '>');
		} else if (bullet) {
			if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
			html.push('<li>' + bullet[1] + '</li>');
		} else if (ordered) {
			if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
			html.push('<li>' + ordered[1] + '</li>');
		} else if (line.trim() === '') {
			closeList();
		} else {
			closeList();
			html.push('<p>' + line + '</p>');
		}
	}
	closeList();
	var output = html.join('');
	// 7) 把摘出来的代码块放回
	output = output.replace(/\u0000SLOT(\d+)\u0000/g, function (match, index) {
		return slots[Number(index)] || '';
	});
	return output;
}

var userMdObserver = null;
var userMdTimer = null;

function processUserBubble(bubble) {
	try {
		if (!bubble || bubble.dataset.aetherMd === '1') return;
		if (bubble.querySelector('.aeth-md')) { bubble.dataset.aetherMd = '1'; return; }
		var holder = bubble.querySelector('[data-aether-md-source]') || bubble.firstElementChild;
		if (!holder) return;
		var text = holder.textContent || '';
		if (!text.trim() || text.length > 24000) return;
		if (!USER_MD_PATTERN.test(text)) return;
		var html = renderUserMarkdown(text);
		if (!html || html === escapeHtmlText(text)) return;
		var md = document.createElement('div');
		md.className = 'aeth-md';
		md.innerHTML = html;
		holder.style.display = 'none';
		bubble.appendChild(md);
		bubble.dataset.aetherMd = '1';
	} catch (error) {
		pushLog('warn', '用户消息 markdown 渲染失败', { message: String(error && error.message) });
	}
}

function scanUserMarkdown() {
	// 聊天区是异步渲染的：每次 DOM 变化顺手补一次输入框卡片标记
	try { tagInputHosts(); } catch (error) { /* ignore */ }
	if (!A.cfg || !A.cfg.userMd || A.cfg.userMd.enabled !== true) {
		// 关掉时把已渲染的还原
		document.querySelectorAll('[data-message-bubble]').forEach(function (bubble) {
			if (bubble.dataset.aetherMd !== '1') return;
			var md = bubble.querySelector('.aeth-md');
			if (md) { try { md.remove(); } catch (error) { /* ignore */ } }
			var holder = bubble.firstElementChild;
			if (holder) holder.style.display = '';
			delete bubble.dataset.aetherMd;
		});
		return;
	}
	if (A.canary.disabled) return;
	var bubbles = document.querySelectorAll('[data-message-bubble]');
	for (var i = 0; i < bubbles.length; i += 1) processUserBubble(bubbles[i]);
}

function startUserMarkdown() {
	if (userMdObserver) return;
	try {
		userMdObserver = new MutationObserver(function () {
			if (userMdTimer) return;
			userMdTimer = setTimeout(function () {
				userMdTimer = null;
				scanUserMarkdown();
			}, 220);
		});
		userMdObserver.observe(document.body, { childList: true, subtree: true });
	} catch (error) {
		pushLog('warn', '用户 markdown observer 启动失败', { message: String(error && error.message) });
	}
	scanUserMarkdown();
}

function stopUserMarkdown() {
	if (userMdObserver) {
		try { userMdObserver.disconnect(); } catch (error) { /* ignore */ }
		userMdObserver = null;
	}
	if (userMdTimer) { clearTimeout(userMdTimer); userMdTimer = null; }
}
