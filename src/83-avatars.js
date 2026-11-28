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

var avatarStarted = false;
var avatarTimer = null;

function avatarConfig() {
	var cfg = A.cfg && A.cfg.avatars;
	if (!cfg || cfg.enabled !== true) return null;
	if (!cfg.user && !cfg.agent && !cfg.userImage && !cfg.agentImage) return null;
	return cfg;
}

function avatarUrl(id) {
	return mediaUrl(id);
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

var STATUS_TEXT = /^(已完成|运行中|思考中|生成中|等待中|用时\s*\d)/;

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
				if (el.tagName === 'P' || el.tagName === 'LI' || el.tagName === 'PRE' || el.tagName === 'CODE') continue;
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

/**
 * 每行 → 已算出的宿主节点的缓存。
 * findStatusLine() 要向上 6 层、每层 querySelectorAll 再遍历，O(N²) + 布局抖动；
 * 而宿主节点在会话里几乎不变，只在这个节点脱离文档后才需要重算。
 */
var AVATAR_HOST_CACHE = new WeakMap();
var AVATAR_SEEN = [];

/** 宿主是否还可用：仍在文档里，且头像节点没被 React 重渲染冲掉。 */
function avatarHostAlive(host) {
	try {
		if (!host || !host.isConnected) return false;
		return host.querySelector(':scope > .aeth-avatar-agent') !== null;
	} catch (error) {
		return false;
	}
}

function resolveAgentHost(row) {
	var cached = AVATAR_HOST_CACHE.get(row);
	if (avatarHostAlive(cached)) return cached;
	var status = findStatusLine(row) || row;     // 状态行优先，找不到就退回内容容器
	// 宿主选择：状态行的「行容器」（父级），而不是 span 本身 ——
	// 状态行每秒更新计时文案，React 会重写 span 内容，挂在 span 里的头像会被一起删掉。
	// 父级如果是正常大小的行容器就用它；过大（整轮容器）才退回 span。
	var host = status;
	try {
		var parent = status.parentElement;
		// DevTools 实测：状态行是 button.hE4tRW_root，825×33 —— 宽度上限必须足够大
		if (parent && parent !== row
			&& parent.offsetWidth > 0 && parent.offsetWidth < 1500
			&& parent.offsetHeight > 10 && parent.offsetHeight < 120) {
			host = parent;
		}
	} catch (error) { /* ignore */ }
	AVATAR_HOST_CACHE.set(row, host);
	return host;
}

function scanAvatars() {
	try {
		if (!A.cfg || A.canary.disabled) return;
		var cfg = avatarConfig();
		document.querySelectorAll(AVATAR_USER_SELECTOR).forEach(function (row) { syncAvatar(row, 'user', cfg); });
		var seen = new Set();
		AVATAR_SEEN = [];
		document.querySelectorAll(AVATAR_AGENT_SELECTOR).forEach(function (row) {
			if (row.parentElement && row.parentElement.closest(AVATAR_AGENT_SELECTOR)) return;
			var host = resolveAgentHost(row);
			if (!host || seen.has(host)) return;
			seen.add(host);
			AVATAR_SEEN = Array.from(seen);
			// 只在没标过时才写属性：重复写同一个值也会产生 mutation record，
			// 进而触发自己的 MutationObserver（旧实现空闲时也在 250ms 全量扫描）。
			if (host.getAttribute(STATUS_MARK) !== '1') {
				try { host.setAttribute(STATUS_MARK, '1'); } catch (error) { /* ignore */ }
			}
			syncAvatar(host, 'agent', cfg);
		});
		// 清理：只保留本轮挂上的 host，其余（历史残留 / 挂错位置）全部移除
		var keep = seen;
		document.querySelectorAll('.aeth-avatar-agent').forEach(function (node) {
			var host = node.parentElement;
			if (!host || !keep.has(host)) {
				try { node.remove(); } catch (error) { /* ignore */ }
			}
		});
		if (!cfg) {
			document.querySelectorAll('.aeth-avatar').forEach(function (node) {
				try { node.remove(); } catch (error) { /* ignore */ }
			});
			AVATAR_HOST_CACHE = new WeakMap();
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
		if (avatarStarted) return;
		avatarStarted = true;
		watchDom(scanAvatars);
		scheduleAvatarScan();
	} catch (error) { /* ignore */ }
}

/** 清掉状态行标记：关主题/停用时不能留下 data-aether-status 痕迹。 */
function clearAvatarMarks() {
	try {
		document.querySelectorAll('[' + STATUS_MARK + ']').forEach(function (node) {
			try { node.removeAttribute(STATUS_MARK); } catch (error) { /* ignore */ }
		});
	} catch (error) { /* ignore */ }
	AVATAR_HOST_CACHE = new WeakMap();
	AVATAR_SEEN = [];
}

function stopAvatars() {
	try { unwatchDom(scanAvatars); } catch (error) { /* ignore */ }
	avatarStarted = false;
	if (avatarTimer) { clearTimeout(avatarTimer); avatarTimer = null; }
	try {
		document.querySelectorAll('.aeth-avatar').forEach(function (node) {
			try { node.remove(); } catch (error) { /* ignore */ }
		});
	} catch (error) { /* ignore */ }
	clearAvatarMarks();
}
