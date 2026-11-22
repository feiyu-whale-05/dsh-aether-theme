// ── glow / press：参考 dsh-client-ui-aqua 的 spotlight + press ─────────
// spotlight：跟随指针的径向光晕（半径 180px，色 rgba(90,215,255,.17)），
//            画在 body 顶层、pointer-events:none、screen 混合。
// press：悬停主面板/对话框时按指针位置做轻微 3D 倾斜
//        （perspective 800px，最大 0.0175rad ≈ 1°，离开 240ms 内回正）。
// 两者都只写 transform/位置，不改布局；reduced-motion 下都不启动。

var GLOW = { el: null, raf: null, x: 0, y: 0, running: false };
var GLOW_RADIUS = 180;
var GLOW_COLOR = 'rgba(90, 215, 255, 0.17)';

var PRESS = { raf: null, current: null, running: false, timers: new WeakMap() };
var TILT_MAX = 0.031;
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
function pressTiltable(pane) {
	if (!pane) return false;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
	return true;
}

var PRESS_PANE_SELECTOR = [
	'[data-global-panel]',
	'[role="dialog"]',
	'[aria-modal="true"]',
	'[data-dsh-surface]',
	'[class*="dialog"]',
	'[class*="Dialog"]',
	'[class*="modal"]',
	'[class*="Modal"]',
	'[class*="sheet"]',
	'[class*="Sheet"]',
	'[class*="overlay"]',
	'[class*="Overlay"]',
	'[class*="sidebarCol"]',
	'[class*="sidebar"]',
].join(', ');

/** 侧栏：不做 3D transform（会给内部 fixed 元素建包含块），用内阴影做下压观感。 */
function pressIsSidebar(pane) {
	return Boolean(pane && pane.matches && pane.matches('[class*="sidebarCol"], [class*="sidebar"]'));
}

function pressSoftDown(pane, on) {
	if (!pane) return;
	try {
		if (on) pane.setAttribute('data-aether-pressed', '1');
		else pane.removeAttribute('data-aether-pressed');
	} catch (error) { /* ignore */ }
}

function pressFindPane(target) {
	if (!target || typeof target.closest !== 'function') return null;
	return target.closest(PRESS_PANE_SELECTOR);
}

function pressNeutral(pane) {
	if (!pane) return;
	pressSoftDown(pane, false);
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
	if (pressIsSidebar(pane)) {
		pressSoftDown(pane, true);
		return;
	}
	var rect = pane.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return;
	var rx = ((GLOW.x - rect.left) / rect.width) * 2 - 1;
	var ry = ((GLOW.y - rect.top) / rect.height) * 2 - 1;
	rx = Math.max(-1, Math.min(1, rx));
	ry = Math.max(-1, Math.min(1, ry));
	// 鼠标在左上 → 面板左上翘起；保持 ~1°
	var rotateY = rx * TILT_MAX;
	var rotateX = -ry * TILT_MAX;
	pane.style.transformOrigin = 'center center';
	pane.style.transform = 'perspective(' + TILT_PERSPECTIVE + 'px) rotateX(' + rotateX.toFixed(5) + 'rad) rotateY(' + rotateY.toFixed(5) + 'rad) scale(1)';
}

function pressOnMove(event) {
	if (!PRESS.running) return;
	var target = event.target;
	var pane = pressFindPane(target);
	if (pane) {
		A.pressDebug = {
			tag: pane.tagName ? pane.tagName.toLowerCase() : '?',
			cls: String(pane.className || '').slice(0, 120),
			role: pane.getAttribute ? (pane.getAttribute('role') || '') : '',
			position: (function () { try { return window.getComputedStyle(pane).position; } catch (error) { return ''; } })(),
		};
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
