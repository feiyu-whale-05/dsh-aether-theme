// ── critters：背景小鱼 / 气泡 / 浮游点（参考 dsh-client-ui-aqua 的方案） ──
// Aqua 的做法不是 canvas，而是「一个固定的、点击透明的容器 + 若干内联 SVG +
// CSS keyframes 动画」。这里沿用同一套结构（容器 + SVG + CSS 动画），
// 但图形与代码均为本插件自行绘制/编写，不复制上游 AGPL 源码：
//   · 鱼：简笔鱼剪影（身体 + 三角尾），currentColor 着色
//   · 气泡：描边圆环，上升时淡入淡出
//   · 浮游点：小实心圆，透明度呼吸
// 参数风格对齐 Aqua：低透明度（0.22 / 0.55）、蓝灰色（#7ea4df / #a9c6ef）、
// 长时间周期（9~19s）+ 负延迟让画面一开始就是"已经在动"的状态。

var CRITTERS = { host: null, built: 0 };

/** 简笔鱼剪影（自己画的路径，viewBox 0 0 24 16，尾巴朝右）。 */
var CRITTER_FISH_PATH = 'M1.6 8 C1.6 4.2 6 1.6 10.8 1.6 C15.4 1.6 19 4.6 20.2 8 C19 11.4 15.4 14.4 10.8 14.4 C6 14.4 1.6 11.8 1.6 8 Z M20.2 8 L23.4 3.6 L22.2 8 L23.4 12.4 Z';

function critterSvg(kind, viewBox, width, style, body) {
	return '<svg class="aether-critter ' + kind + '" viewBox="' + viewBox + '" width="' + width + '" style="' + style + '" aria-hidden="true">' + body + '</svg>';
}

function critterFish(style, width, leftward) {
	var cls = leftward ? 'fish fish-left' : 'fish';
	return '<svg class="aether-critter ' + cls + '" viewBox="0 0 24 16" width="' + width + '" style="' + style + '" aria-hidden="true"><path d="' + CRITTER_FISH_PATH + '" fill="currentColor"/></svg>';
}

function critterBubble(style, size) {
	return critterSvg('bubble', '0 0 8 8', size, style, '<circle cx="4" cy="4" r="3.1" fill="none" stroke="currentColor" stroke-width="1"/>');
}

function critterPlankton(style, size) {
	return critterSvg('plankton', '0 0 4 4', size || 3, style, '<circle cx="2" cy="2" r="2" fill="currentColor"/>');
}

/** 生成场景标记；密度/鱼数量来自配置。 */
function crittersMarkup() {
	var config = (A.cfg && A.cfg.fx) || {};
	var fishCount = Math.round(clamp(config.fishCount === undefined ? 3 : config.fishCount, 0, 10));
	var planktonCount = Math.round(clamp(config.density === undefined ? 4 : Math.round(config.density / 15), 0, 16));
	var parts = [];
	// 鱼：位置分散在画面中部，时长 9~19s，负延迟错开
	var fishSpots = [
		['top:20%;left:56%;animation-duration:9s', 30, false],
		['top:34%;left:8%;animation-duration:14s;animation-delay:-4s', 20, true],
		['top:62%;left:74%;animation-duration:19s;animation-delay:-9s;opacity:.55', 14, false],
	];
	for (var i = 0; i < fishCount; i += 1) {
		var spot = fishSpots[i % fishSpots.length];
		var extra = i >= fishSpots.length
			? ' animation-duration:' + (11 + i * 3) + 's;animation-delay:-' + (i * 2.5) + 's;top:' + (18 + (i * 17) % 60) + '%;left:' + (12 + (i * 29) % 76) + '%'
			: '';
		parts.push(critterFish(spot[0] + extra, spot[1], spot[2]));
	}
	// 气泡：从底部缓慢升起
	var bubbleSpots = [
		['bottom:8%;left:9%;animation-duration:8s', 7],
		['bottom:5%;left:13%;animation-duration:10s;animation-delay:2.5s', 5],
		['bottom:10%;left:17%;animation-duration:9s;animation-delay:5s', 6],
		['bottom:9%;left:82%;animation-duration:11s;animation-delay:1.5s', 8],
		['bottom:6%;left:87%;animation-duration:8s;animation-delay:4s', 5],
	];
	for (var b = 0; b < bubbleSpots.length; b += 1) {
		parts.push(critterBubble(bubbleSpots[b][0], bubbleSpots[b][1]));
	}
	// 浮游点：缓慢呼吸闪烁
	for (var p = 0; p < planktonCount; p += 1) {
		var top = 10 + (p * 23) % 78;
		var left = 6 + (p * 37) % 88;
		parts.push(critterPlankton('top:' + top + '%;left:' + left + '%;animation-delay:-' + (p * 0.9).toFixed(1) + 's', 3));
	}
	return parts.join('');
}

function crittersHost() {
	if (CRITTERS.host && document.body.contains(CRITTERS.host)) return CRITTERS.host;
	var stage = ensureStage();
	var host = document.createElement('div');
	host.id = 'dsh-aether-critters';
	host.setAttribute('aria-hidden', 'true');
	stage.appendChild(host);
	CRITTERS.host = host;
	return host;
}

function startFx() {
	if (!A.cfg || A.canary.disabled) return;
	if (!moduleOn('fx')) return;
	if (shouldReduceMotion()) return;
	var host = crittersHost();
	host.innerHTML = crittersMarkup();
	CRITTERS.built = host.childElementCount;
	pushLog('info', '海洋小生物已注入', { count: CRITTERS.built });
}

function stopFx() {
	if (CRITTERS.host) {
		try { CRITTERS.host.remove(); } catch (error) { /* ignore */ }
		CRITTERS.host = null;
	}
	CRITTERS.built = 0;
}

/** 配置变化时调用：开关 / 密度 / 鱼数量即时生效。 */
function syncFx() {
	if (!A.cfg || A.canary.disabled || !moduleOn('fx') || shouldReduceMotion()) {
		stopFx();
		return;
	}
	if (!CRITTERS.host || !document.body.contains(CRITTERS.host)) {
		startFx();
		return;
	}
	var host = crittersHost();
	host.innerHTML = crittersMarkup();
	CRITTERS.built = host.childElementCount;
}

function restartFx() {
	stopFx();
	startFx();
}
