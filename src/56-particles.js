// ── critters：背景小鱼 / 气泡 / 浮游点（参考 dsh-client-ui-aqua 的方案） ──
// Aqua 的做法不是 canvas，而是「一个固定的、点击透明的容器 + 若干内联 SVG +
// CSS keyframes 动画」。这里沿用同一套结构（容器 + SVG + CSS 动画），
// 但图形与代码均为本插件自行绘制/编写，不复制上游 AGPL 源码：
//   · 鱼：简笔鱼剪影（身体 + 三角尾），currentColor 着色
//   · 气泡：描边圆环，上升时淡入淡出
//   · 浮游点：小实心圆，透明度呼吸
// 参数风格对齐 Aqua：低透明度（0.22 / 0.55）、蓝灰色（#7ea4df / #a9c6ef）、
// 长时间周期（9~19s）+ 负延迟让画面一开始就是"已经在动"的状态。

var CRITTERS = { host: null, built: 0, markup: '' };

/** 简笔鱼剪影（自己画的路径，viewBox 0 0 24 16，尾巴朝右）。 */
	// DeepSeek 品牌鱼剪影（Figma 提取版，与 dsh-client-ui-aqua 同一图形；品牌素材，MIT 代码许可不覆盖该图形）
var CRITTER_FISH_PATH = 'M22.9168 1.43018C22.6713 1.31018 22.5658 1.53918 22.4223 1.65519C22.3733 1.69269 22.3318 1.74169 22.2903 1.78669C21.9317 2.1697 21.5127 2.42121 20.9657 2.39121C20.1657 2.34621 19.4827 2.59771 18.8787 3.20973C18.7502 2.45521 18.3236 2.0047 17.6746 1.71569C17.3351 1.56568 16.9916 1.41518 16.7536 1.08867C16.5876 0.856163 16.5421 0.597155 16.4591 0.341647C16.4061 0.187643 16.3536 0.0301382 16.1761 0.00363739C15.9836 -0.0263635 15.9081 0.135141 15.8326 0.270145C15.5306 0.822162 15.4136 1.43018 15.4251 2.0462C15.4516 3.43174 16.0366 4.53527 17.1991 5.3203C17.3311 5.4103 17.3651 5.5003 17.3236 5.63181C17.2441 5.90231 17.1501 6.16482 17.0671 6.43533C17.0141 6.60784 16.9351 6.64584 16.7501 6.57033C16.1121 6.30383 15.5611 5.90931 15.074 5.4328C14.2475 4.63328 13.5 3.75075 12.568 3.05973C12.349 2.89822 12.13 2.74822 11.9034 2.60522C10.9524 1.68169 12.028 0.923165 12.277 0.833162C12.5375 0.739159 12.3675 0.41615 11.5259 0.42015C10.6844 0.42365 9.91439 0.705658 8.93286 1.08117C8.78935 1.13767 8.63835 1.17867 8.48384 1.21267C7.59332 1.04367 6.66829 1.00617 5.70226 1.11517C3.88321 1.31768 2.43016 2.1777 1.36213 3.64575C0.0790928 5.4103 -0.222916 7.41536 0.146595 9.50642C0.535106 11.7105 1.66014 13.535 3.38869 14.9616C5.18125 16.4406 7.24581 17.1657 9.60138 17.0266C11.0319 16.9441 12.6245 16.7526 14.421 15.2321C14.874 15.4576 15.3496 15.5476 16.1381 15.6151C16.7456 15.6716 17.3306 15.5851 17.7836 15.4911C18.4931 15.3411 18.4441 14.6841 18.1876 14.5636C16.1081 13.595 16.5646 13.9891 16.1496 13.67C17.2061 12.42 18.8202 10.1979 19.3182 7.17235C19.3672 6.83834 19.4297 6.36783 19.4222 6.09732C19.4182 5.93231 19.4562 5.86831 19.6447 5.84931C20.1657 5.78931 20.6712 5.64681 21.1357 5.3913C22.4833 4.65528 23.0268 3.44624 23.1548 1.9972C23.1738 1.77569 23.1508 1.54668 22.9168 1.43018ZM11.1749 14.4736C9.15936 12.889 8.18184 12.3675 7.77832 12.39C7.40081 12.4125 7.46881 12.8445 7.55182 13.126C7.63882 13.404 7.75182 13.5955 7.91033 13.8396C8.01983 14.0011 8.09533 14.2411 7.80083 14.4216C7.15181 14.8231 6.02327 14.2866 5.97027 14.2601C4.65673 13.4865 3.5587 12.4655 2.78467 11.069C2.03715 9.72493 1.60314 8.28289 1.53164 6.74384C1.51264 6.37233 1.62214 6.24082 1.99215 6.17332C2.47916 6.08332 2.98118 6.06432 3.46769 6.13582C5.52476 6.43633 7.27581 7.35586 8.74385 8.8129C9.58188 9.64243 10.2159 10.634 10.8689 11.6025C11.5634 12.631 12.3105 13.611 13.262 14.4146C13.598 14.6961 13.866 14.9101 14.1225 15.0681C13.349 15.1546 12.058 15.1731 11.1749 14.4746L11.1749 14.4736ZM12.141 8.25988C12.141 8.09488 12.273 7.96338 12.439 7.96338C12.4765 7.96338 12.5105 7.97088 12.541 7.98188C12.5825 7.99688 12.6205 8.01938 12.6505 8.05338C12.7035 8.10588 12.7335 8.18088 12.7335 8.25988C12.7335 8.42489 12.6015 8.55639 12.4355 8.55639C12.2695 8.55639 12.141 8.42489 12.141 8.25988ZM15.1415 9.79893C14.949 9.87793 14.7565 9.94544 14.5715 9.95294C14.2845 9.96794 13.9715 9.85143 13.8015 9.70893C13.5375 9.48742 13.3485 9.36342 13.2695 8.97691C13.2355 8.8119 13.2545 8.55639 13.2845 8.40989C13.3525 8.09438 13.277 7.89187 13.0545 7.70787C12.8735 7.55786 12.643 7.51636 12.39 7.51636C12.2955 7.51636 12.209 7.47486 12.1445 7.44136C12.039 7.38886 11.9519 7.25735 12.035 7.09585C12.0615 7.04335 12.19 6.91584 12.22 6.89334C12.5635 6.69784 12.9595 6.76184 13.326 6.90834C13.6655 7.04735 13.9225 7.30236 14.292 7.66287C14.6695 8.09838 14.7375 8.21838 14.9525 8.54539C15.1225 8.8009 15.277 9.06341 15.3831 9.36392C15.4471 9.55142 15.3641 9.70493 15.1415 9.79893Z';

function critterSvg(kind, viewBox, width, style, body) {
	return '<svg class="aether-critter ' + kind + '" viewBox="' + viewBox + '" width="' + width + '" style="' + style + '" aria-hidden="true">' + body + '</svg>';
}

function critterFish(style, width, leftward) {
	var cls = leftward ? 'fish fish-left' : 'fish';
	return '<svg class="aether-critter ' + cls + '" viewBox="0 0 23.16 17.04" width="' + width + '" style="' + style + '" aria-hidden="true"><path d="' + CRITTER_FISH_PATH + '" fill="currentColor"/></svg>';
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
	// 差异比较：markup 没变就不碰 DOM。
	// 旧实现每次都 innerHTML = markup，等于重建 10 个 SVG 节点并让 CSS 动画从头播放
	// （视觉上是小鱼/气泡位置"跳一下"），而 applyAppearance 在拖滑杆时每帧都会调到这里。
	var markup = crittersMarkup();
	if (markup === CRITTERS.markup && CRITTERS.host.contains(CRITTERS.host.firstElementChild)) return;
	CRITTERS.host.innerHTML = markup;
	CRITTERS.markup = markup;
	CRITTERS.built = CRITTERS.host.childElementCount;
}
