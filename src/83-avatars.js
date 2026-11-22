// ── avatars：消息头像（用户 + agent） ─────────────────────────────────
// DSH 默认没有头像，这里在消息行两侧注入圆形头像节点：
//   · 用户消息行：MessageItem.module.css 的 userRow → 右侧
//   · agent 消息：找 AI 内容容器（assistant / markdown 等类名特征）→ 左侧
// 造型与气泡挂件一样纯 DOM，不参与 React 渲染。

var AVATAR_USER_SELECTOR = '[class*="userRow"]';
var AVATAR_AGENT_SELECTOR = [
	'[class*="assistantRow"]',
	'[class*="assistant"]',
	'[class*="markdown"]',
].join(', ');
/** 状态行标记：只有带这个属性的元素才允许承载 agent 头像。 */
var STATUS_MARK = 'data-aether-status';

var avatarObserver = null;
var avatarTimer = null;

function avatarConfig() {
	var cfg = A.cfg && A.cfg.avatars;
	if (!cfg || cfg.enabled !== true) return null;
	if (!cfg.user && !cfg.agent && !cfg.userImage && !cfg.agentImage) return null;
	return cfg;
}

function avatarUrl(id) {
	return A.apiBase + '/api/wallpaper?id=' + encodeURIComponent(id) + (A.token ? '&token=' + encodeURIComponent(A.token) : '');
}

function renderAvatar(node, cfg, side) {
	try {
		var image = side === 'user' ? cfg.userImage : cfg.agentImage;
		var text = side === 'user' ? (cfg.user || '我') : (cfg.agent || 'AI');
		if (image) {
			if (node.getAttribute('data-avatar-img') !== image) {
				node.setAttribute('data-avatar-img', image);
				node.textContent = '';
				var img = document.createElement('img');
				img.src = avatarUrl(image);
				img.alt = '';
				img.draggable = false;
				img.onerror = function () {
					try { img.remove(); node.textContent = text.slice(0, 2); } catch (error) { /* ignore */ }
				};
				node.appendChild(img);
			}
		} else {
			if (node.getAttribute('data-avatar-img')) {
				node.removeAttribute('data-avatar-img');
				node.textContent = '';
			}
			if (node.textContent !== text.slice(0, 2)) node.textContent = text.slice(0, 2);
		}
	} catch (error) { /* ignore */ }
}

function findAvatarHost(row) {
	try {
		// 行容器里：用户头像挂右侧，agent 头像挂左侧
		return row;
	} catch (error) {
		return null;
	}
}

function syncAvatar(row, side, cfg) {
	try {
		if (!row) return;
		var existing = row.querySelector(':scope > .aeth-avatar');
		if (!cfg) {
			if (existing) existing.remove();
			return;
		}
		if (existing) {
			renderAvatar(existing, cfg, side);
			return;
		}
		var position = '';
		try { position = window.getComputedStyle(row).position; } catch (error) { position = ''; }
		if (!position || position === 'static') row.style.position = 'relative';
		var node = document.createElement('span');
		node.className = 'aeth-avatar aeth-avatar-' + side;
		node.setAttribute('aria-hidden', 'true');
		renderAvatar(node, cfg, side);
		row.appendChild(node);
	} catch (error) { /* ignore */ }
}

var STATUS_TEXT = /(完成|运行|思考|用时|耗时|已用|\d+\s*秒|\d+\s*分)/;

/** 在内容容器的祖先范围内找「已完成，用时…」那一行元素。 */
function findStatusLine(row) {
	try {
		// 状态行可能是 button/summary（带折叠箭头），把候选标签放开，向上找 6 层
		var scope = row.parentElement;
		for (var depth = 0; scope && depth < 6; depth += 1) {
			var nodes = scope.querySelectorAll('button, summary, span, div, p, a');
			for (var i = 0; i < nodes.length; i += 1) {
				var el = nodes[i];
				if (el.querySelector && el.querySelector('.aeth-avatar')) continue;
				if (el.children && el.children.length > 6) continue;
				var text = (el.textContent || '').trim();
				if (!text || text.length > 60) continue;
				if (!STATUS_TEXT.test(text)) continue;
				// 取命中里「最深」的那个（文本最接近行本身，避免命中整块 turn）
				var deeper = el.querySelector('button, summary, span, div, p, a');
				var candidate = el;
				while (deeper && deeper.textContent && deeper.textContent.trim().length === text.length
					&& STATUS_TEXT.test(deeper.textContent) && deeper.children.length <= 6) {
					candidate = deeper;
					deeper = deeper.querySelector('button, summary, span, div, p, a');
				}
				return candidate;
			}
			scope = scope.parentElement;
		}
	} catch (error) { /* ignore */ }
	return null;
}

function scanAvatars() {
	try {
		if (!A.cfg || A.canary.disabled) return;
		var cfg = avatarConfig();
		document.querySelectorAll(AVATAR_USER_SELECTOR).forEach(function (row) { syncAvatar(row, 'user', cfg); });
		var seenStatus = [];
		document.querySelectorAll(AVATAR_AGENT_SELECTOR).forEach(function (row) {
			if (row.parentElement && row.parentElement.closest(AVATAR_AGENT_SELECTOR)) return;
			var status = findStatusLine(row) || row;     // 状态行优先，找不到就退回内容容器
			if (seenStatus.indexOf(status) !== -1) return;
			seenStatus.push(status);
			try { status.setAttribute(STATUS_MARK, '1'); } catch (error) { /* ignore */ }
			syncAvatar(status, 'agent', cfg);
		});
		// 清理：任何不在状态行里的 agent 头像（包括历史残留 / 正文块上的）
		document.querySelectorAll('.aeth-avatar-agent').forEach(function (node) {
			var host = node.parentElement;
			if (!host || !host.hasAttribute(STATUS_MARK)) {
				try { node.remove(); } catch (error) { /* ignore */ }
			}
		});
		if (!cfg) {
			document.querySelectorAll('.aeth-avatar').forEach(function (node) {
				try { node.remove(); } catch (error) { /* ignore */ }
			});
		}
	} catch (error) { /* ignore */ }
}

function scheduleAvatarScan() {
	if (avatarTimer) return;
	avatarTimer = setTimeout(function () {
		avatarTimer = null;
		scanAvatars();
	}, 140);
}

function startAvatars() {
	try {
		if (avatarObserver || !document.body) return;
		avatarObserver = new MutationObserver(scheduleAvatarScan);
		avatarObserver.observe(document.body, { childList: true, subtree: true });
		scheduleAvatarScan();
	} catch (error) { /* ignore */ }
}

function stopAvatars() {
	try { if (avatarObserver) avatarObserver.disconnect(); } catch (error) { /* ignore */ }
	avatarObserver = null;
	if (avatarTimer) { clearTimeout(avatarTimer); avatarTimer = null; }
	try {
		document.querySelectorAll('.aeth-avatar').forEach(function (node) {
			try { node.remove(); } catch (error) { /* ignore */ }
		});
	} catch (error) { /* ignore */ }
}
