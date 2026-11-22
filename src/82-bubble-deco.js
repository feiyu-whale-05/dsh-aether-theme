// ── bubble-deco：用户气泡左下角装饰（类似 QQ 的装扮挂件） ─────────────
// 宿主用户气泡容器：<UserMessageBubble data-message-bubble>，只用于用户消息，
// 所以在它内部追加一个绝对定位的小节点即可，不改变原有布局。

var BUBBLE_DECO_SELECTOR = '[data-message-bubble]';

function bubbleDecoConfig() {
	var cfg = A.cfg && A.cfg.bubbleDecoration;
	if (!cfg || cfg.enabled !== true) return null;
	if (!cfg.text && !cfg.image) return null;
	return cfg;
}

function renderBubbleDeco(node, cfg) {
	try {
		if (cfg.image) {
			var url = A.apiBase + '/api/wallpaper?id=' + encodeURIComponent(cfg.image) + (A.token ? '&token=' + encodeURIComponent(A.token) : '');
			if (node.getAttribute('data-deco-image') !== cfg.image) {
				node.setAttribute('data-deco-image', cfg.image);
				node.textContent = '';
				var img = document.createElement('img');
				img.src = url;
				img.alt = '';
				img.draggable = false;
				img.onerror = function () {
					// 图片加载失败时回落到 emoji，避免装饰位置空着
					try {
						img.remove();
						node.textContent = (A.cfg && A.cfg.bubbleDecoration && A.cfg.bubbleDecoration.text) || '🎀';
					} catch (error) { /* ignore */ }
				};
				node.appendChild(img);
			}
		} else {
			if (node.getAttribute('data-deco-image')) {
				node.removeAttribute('data-deco-image');
				node.textContent = '';
			}
			if (node.textContent !== cfg.text) node.textContent = cfg.text;
		}
	} catch (error) { /* ignore */ }
}

/** 给一个用户气泡同步装饰（有则更新、无则插入、关闭则移除）。 */
function syncBubbleDeco(bubble) {
	try {
		if (!bubble) return;
		var cfg = bubbleDecoConfig();
		var existing = null;
		var children = bubble.children;
		for (var i = 0; i < children.length; i += 1) {
			if (children[i].classList && children[i].classList.contains('aeth-bubble-deco')) { existing = children[i]; break; }
		}
		if (!cfg) {
			if (existing) existing.remove();
			return;
		}
		if (existing) { renderBubbleDeco(existing, cfg); return; }
		var position = '';
		try { position = window.getComputedStyle(bubble).position; } catch (error) { position = ''; }
		if (!position || position === 'static') bubble.style.position = 'relative';
		var node = document.createElement('span');
		node.className = 'aeth-bubble-deco';
		node.setAttribute('aria-hidden', 'true');
		renderBubbleDeco(node, cfg);
		bubble.appendChild(node);
	} catch (error) { /* ignore */ }
}

/** 扫描全部用户气泡（聊天区异步渲染，随 usermd 的观察器一起跑）。 */
function scanBubbleDeco() {
	if (!A.cfg || A.canary.disabled) return;
	var bubbles = document.querySelectorAll(BUBBLE_DECO_SELECTOR);
	for (var i = 0; i < bubbles.length; i += 1) syncBubbleDeco(bubbles[i]);
}

/** 清掉所有装饰（关闭开关时调用）。 */
function clearBubbleDeco() {
	try {
		document.querySelectorAll('.aeth-bubble-deco').forEach(function (node) {
			try { node.remove(); } catch (error) { /* ignore */ }
		});
	} catch (error) { /* ignore */ }
}
