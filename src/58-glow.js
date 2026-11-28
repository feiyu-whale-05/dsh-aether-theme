// ── glow / press：参考 dsh-client-ui-aqua 的 spotlight + press ─────────
// spotlight：跟随指针的径向光晕（半径 180px，色 rgba(90,215,255,.17)），
//            画在 body 顶层、pointer-events:none、screen 混合。
// press：悬停主面板/对话框时按指针位置做轻微 3D 倾斜
//        （perspective 800px，最大 0.0175rad ≈ 1°，离开 240ms 内回正）。
// 两者都只写 transform/位置，不改布局；reduced-motion 下都不启动。

var GLOW = { el: null, raf: null, x: 0, y: 0, running: false };
var GLOW_RADIUS = 180;
var GLOW_COLOR = 'rgba(90, 215, 255, 0.17)';

var PRESS = { raf: null, current: null, running: false, timers: new WeakMap(), rect: null, rectPane: null, rectAt: 0 };
var TILT_MAX = 0.0175; // Aqua 原值：≈1°
var TILT_PERSPECTIVE = 800;
var SETTLE_MS = 240;

function ensureGlow() {
	if (GLOW.el && document.body.contains(GLOW.el)) return GLOW.el;
	var el = document.createElement('div');
	el.id = 'dsh-aether-glow';
	el.setAttribute('aria-hidden', 'true');
	el.style.position = 'fixed';
	el.style.left = '0';
	el.style.top = '0';
	el.style.width = (GLOW_RADIUS * 2) + 'px';
	el.style.height = (GLOW_RADIUS * 2) + 'px';
	el.style.borderRadius = '50%';
	el.style.pointerEvents = 'none';
	el.style.zIndex = '2147482100';
	el.style.mixBlendMode = 'screen';
	el.style.opacity = '0';
	el.style.transition = 'opacity .25s ease';
	el.style.background = 'radial-gradient(circle at center, ' + GLOW_COLOR + ' 0%, rgba(90, 215, 255, 0.06) 42%, rgba(90, 215, 255, 0) 70%)';
	el.style.willChange = 'transform';
	document.body.appendChild(el);
	GLOW.el = el;
	return el;
}

function glowApply() {
	GLOW.raf = null;
	if (!GLOW.el) return;
	var half = GLOW_RADIUS;
	GLOW.el.style.transform = 'translate3d(' + (GLOW.x - half) + 'px, ' + (GLOW.y - half) + 'px, 0)';
}

function glowOnMove(event) {
	GLOW.x = event.clientX;
	GLOW.y = event.clientY;
	if (GLOW.el && GLOW.el.style.opacity !== '1') GLOW.el.style.opacity = '1';
	if (GLOW.raf === null) GLOW.raf = requestAnimationFrame(glowApply);
}

function startGlow() {
	if (GLOW.running) return;
	if (!A.cfg || A.canary.disabled) return;
	if (!A.cfg.fx || A.cfg.fx.glow === false) return;
	if (shouldReduceMotion()) return;
	ensureGlow();
	window.addEventListener('pointermove', glowOnMove, { passive: true });
	GLOW.running = true;
}

function stopGlow() {
	GLOW.running = false;
	try { window.removeEventListener('pointermove', glowOnMove); } catch (error) { /* ignore */ }
	if (GLOW.raf !== null) { try { cancelAnimationFrame(GLOW.raf); } catch (error) { /* ignore */ } GLOW.raf = null; }
	if (GLOW.el) {
		try { GLOW.el.remove(); } catch (error) { /* ignore */ }
		GLOW.el = null;
	}
}

// ── press：悬停面板的轻微 3D 倾斜 ────────────────────────────────────
var PRESS_MOTION = { reduce: false, hooked: false };

/** prefers-reduced-motion 只在 change 事件里读一次；每帧新建 MediaQueryList 太贵。 */
function pressMotionReduce() {
	if (!PRESS_MOTION.hooked) {
		PRESS_MOTION.hooked = true;
		try {
			var media = window.matchMedia('(prefers-reduced-motion: reduce)');
			PRESS_MOTION.reduce = Boolean(media.matches);
			if (typeof media.addEventListener === 'function') {
				media.addEventListener('change', function (event) { PRESS_MOTION.reduce = Boolean(event.matches); });
			}
		} catch (error) {
			PRESS_MOTION.reduce = false;
		}
	}
	return PRESS_MOTION.reduce;
}

function pressTiltable(pane) {
	if (!pane) return false;
	if (pressMotionReduce()) return false;
	// Aqua 规则：侧栏里打开 dialog 时不做 tilt
	if (pressIsSidebar(pane) && document.querySelector('[role="dialog"]') !== null) return false;
	return true;
}

// 下压只作用于「聊天输入卡片」和「侧边栏」，全部用 Aqua 的 tilt 参数：
//   · 设置对话框、主面板（设置页/图片预览/插件列表）、消息气泡都不下压
var PRESS_PANE_SELECTOR = [
	'[class*="sidebarCol"]',
	'[data-aether-input-host]',
].join(', ');

/** Aqua 同款：侧栏也做 3D tilt；但侧栏内存在 dialog 时跳过（避免给 fixed 元素建包含块）。 */
function pressIsSidebar(pane) {
	return Boolean(pane && pane.matches && pane.matches('[class*="sidebarCol"]'));
}

function pressSoftDown(pane, on) {
	if (!pane) return;
	try {
		if (on) pane.setAttribute('data-aether-pressed', '1');
		else pane.removeAttribute('data-aether-pressed');
	} catch (error) { /* ignore */ }
}

function pressFindPane(target) {
	if (!target) return null;
	// 先找「内层浮层」：对话框/弹窗通常是 fixed/absolute 的大容器，
	// 优先级高于外层 [data-global-panel]（否则倾斜会落在外层内容区上，视觉上没反应）。
	// 不再做「浮动浮层兜底」：设置对话框/设置页都不该被下压
	if (typeof target.closest !== 'function') return null;
	return target.closest(PRESS_PANE_SELECTOR);
}

function pressNeutral(pane) {
	if (!pane) return;
	pressSoftDown(pane, false);
	try { pane.removeAttribute('data-aether-press-shade'); } catch (error) { /* ignore */ }
	A.pressApplied = null;
	// 侧栏从不写 transform（哪怕只是回正的三维矩阵）：写了就创建 containing block，
	// 侧栏里 position:fixed 的收起按钮会立刻被挤出顶栏。
	if (pressIsSidebar(pane)) return;
	pane.style.transform = 'perspective(' + TILT_PERSPECTIVE + 'px) rotateX(0rad) rotateY(0rad) scale(1)';
	var old = PRESS.timers.get(pane);
	if (old) clearTimeout(old);
	var timer = setTimeout(function () {
		try {
			pane.style.removeProperty('transform');
			pane.style.removeProperty('transform-origin');
		} catch (error) { /* ignore */ }
		PRESS.timers.delete(pane);
	}, SETTLE_MS);
	PRESS.timers.set(pane, timer);
}

function pressApply() {
	PRESS.raf = null;
	var pane = PRESS.current;
	if (!pane || !pressTiltable(pane)) return;
	// 侧栏一律用内阴影：任何 transform 都会创建包含块，把侧栏里 position:fixed 的
	// 收起/展开按钮拉进侧栏坐标系（应固定在顶栏）。视觉按压感由内阴影承担。
	if (pressIsSidebar(pane)) {
		pressSoftDown(pane, true);
		return;
	}
	// rect 缓存：只在"换了 pane"或 6 帧内没取过时重新测量。
	// 旧实现每次 pointermove（高刷鼠标 1000Hz）都 getBoundingClientRect()，强制同步布局。
	var now = Date.now();
	if (PRESS.rectPane !== pane || !PRESS.rect || now - PRESS.rectAt > 500) {
		PRESS.rect = pane.getBoundingClientRect();
		PRESS.rectPane = pane;
		PRESS.rectAt = now;
	}
	var rect = PRESS.rect;
	if (!rect || rect.width === 0 || rect.height === 0) return;
	var rx = ((GLOW.x - rect.left) / rect.width) * 2 - 1;
	var ry = ((GLOW.y - rect.top) / rect.height) * 2 - 1;
	rx = Math.max(-1, Math.min(1, rx));
	ry = Math.max(-1, Math.min(1, ry));
	// 鼠标在左上 → 面板左上翘起；保持 ~1°
	var rotateY = rx * TILT_MAX;
	var rotateX = -ry * TILT_MAX;
	// 旋转原点跟随指针：指针附近不动、四周轻微翘起，像被按下去
	var oxPct = Math.max(0, Math.min(100, ((GLOW.x - rect.left) / rect.width) * 100));
	var oyPct = Math.max(0, Math.min(100, ((GLOW.y - rect.top) / rect.height) * 100));
	pane.style.transformOrigin = oxPct.toFixed(1) + '% ' + oyPct.toFixed(1) + '%';
	// 倾斜 + 轻微缩小（scale）：即使容器几乎占满屏幕，缩小也能立刻看出"压下去了"
	var css = 'perspective(' + TILT_PERSPECTIVE + 'px) rotateX(' + rotateX.toFixed(5) + 'rad) rotateY(' + rotateY.toFixed(5) + 'rad)';
	pane.style.transform = css;
	// 输入框卡片按 Aqua 的纯倾斜处理（不加内阴影）；其余容器补一层阴影保证可见
	if (!pane.hasAttribute('data-aether-input-host') && !pane.getAttribute('data-aether-press-shade')) {
		pane.setAttribute('data-aether-press-shade', '1');
	}
	A.pressApplied = { cls: String(pane.className || '').slice(0, 80), transform: css, at: Date.now() };
}

function pressOnMove(event) {
	if (!PRESS.running) return;
	var target = event.target;
	var pane = pressFindPane(target);
	// 调试信息只在"目标变化"时更新，且 getComputedStyle 100ms 节流。
	// 旧实现鼠标每移动一次就无条件调一次 getComputedStyle —— 强制样式重算。
	if (pane && pane !== PRESS.current) {
		var nowMs = Date.now();
		A.pressDebug = A.pressDebug || {};
		A.pressDebug.tag = pane.tagName ? pane.tagName.toLowerCase() : '?';
		A.pressDebug.cls = String(pane.className || '').slice(0, 120);
		A.pressDebug.role = pane.getAttribute ? (pane.getAttribute('role') || '') : '';
		if (!A.pressDebug.at || nowMs - A.pressDebug.at > 100) {
			A.pressDebug.position = (function () {
				try { return window.getComputedStyle(pane).position; } catch (error) { return ''; }
			})();
			A.pressDebug.at = nowMs;
		}
	}
	if (pane !== PRESS.current) {
		if (PRESS.current) pressNeutral(PRESS.current);
		PRESS.current = pane;
	}
	if (!pane) return;
	GLOW.x = event.clientX;
	GLOW.y = event.clientY;
	if (PRESS.raf === null) PRESS.raf = requestAnimationFrame(pressApply);
}

function pressOnLeave() {
	if (PRESS.current) {
		pressNeutral(PRESS.current);
		PRESS.current = null;
	}
}

function startPress() {
	if (PRESS.running) return;
	if (!A.cfg || A.canary.disabled) return;
	if (!A.cfg.fx || A.cfg.fx.press === false) return;
	if (shouldReduceMotion()) return;
	document.addEventListener('pointermove', pressOnMove, { passive: true });
	document.addEventListener('pointerleave', pressOnLeave, { passive: true });
	window.addEventListener('blur', pressOnLeave, { passive: true });
	PRESS.running = true;
	A.pressRunning = true;
}

function stopPress() {
	PRESS.running = false;
	A.pressRunning = false;
	try { document.removeEventListener('pointermove', pressOnMove); } catch (error) { /* ignore */ }
	try { document.removeEventListener('pointerleave', pressOnLeave); } catch (error) { /* ignore */ }
	try { window.removeEventListener('blur', pressOnLeave); } catch (error) { /* ignore */ }
	pressOnLeave();
	if (PRESS.raf !== null) { try { cancelAnimationFrame(PRESS.raf); } catch (error) { /* ignore */ } PRESS.raf = null; }
}

function syncGlowPress() {
	var on = Boolean(A.cfg && !A.canary.disabled && moduleOn('fx') && !shouldReduceMotion());
	if (!on || !A.cfg.fx || A.cfg.fx.glow === false) stopGlow(); else startGlow();
	if (!on || !A.cfg.fx || A.cfg.fx.press === false) stopPress(); else startPress();
}
