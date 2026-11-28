// ── meteor：鼠标流星尾缀（纯 DOM + rAF，不依赖 React 生命周期） ─────────
// 之前放在 React 组件的 effect 里，受渲染时机/依赖数组影响经常不落地；
// 现在与 glow/press 同一套模式：applyAppearance 里 syncMeteor() 直接开关，
// 配置满足就创建 canvas，不满足就移除，状态全在模块级。

var METEOR = {
	canvas: null, ctx: null, raf: null, running: false,
	particles: [], pointer: { x: -9999, y: -9999 }, last: { x: -1, y: -1, t: 0 },
	bound: false,
};

function meteorEnabled() {
	if (!A.cfg || !A.cfg.meteor) return false;
	if (A.cfg.meteor.enabled !== true) return false;
	if (shouldReduceMotion()) return false;
	return true;
}

function meteorResize() {
	var canvas = METEOR.canvas;
	if (!canvas) return;
	var dpr = Math.min(2, window.devicePixelRatio || 1);
	canvas.width = Math.round(window.innerWidth * dpr);
	canvas.height = Math.round(window.innerHeight * dpr);
	var ctx = canvas.getContext('2d');
	if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	METEOR.ctx = ctx;
}

function meteorSpawn(x, y, dx, dy) {
	var config = A.cfg && A.cfg.meteor ? A.cfg.meteor : {};
	var density = clamp(config.density === undefined ? 1 : config.density, 0.2, 3);
	var hueBase = clamp(config.hue === undefined ? 222 : config.hue, 0, 360);
	var speed = Math.min(48, Math.sqrt(dx * dx + dy * dy));
	var count = Math.max(2, Math.round((1.2 + speed / 7) * density));
	for (var i = 0; i < count; i += 1) {
		METEOR.particles.push({
			x: x + (Math.random() - 0.5) * 6,
			y: y + (Math.random() - 0.5) * 6,
			vx: -dx * 0.045 + (Math.random() - 0.5) * 1.4,
			vy: -dy * 0.045 + (Math.random() - 0.5) * 1.4 - 0.35,
			life: 1,
			decay: 0.032 + Math.random() * 0.045,
			size: 0.7 + Math.random() * 1.5,
			hue: hueBase + (Math.random() * 70 - 20),
		});
	}
	if (METEOR.particles.length > 240) METEOR.particles.splice(0, METEOR.particles.length - 240);
	// 粒子重新出现：如果循环已停，重新拉起
	if (METEOR.running && METEOR.raf === null) METEOR.raf = requestAnimationFrame(meteorTick);
}

function meteorTick() {
	if (!METEOR.running) { METEOR.raf = null; return; }
	var ctx = METEOR.ctx;
	if (!ctx) { METEOR.raf = null; return; }
	// 空闲停帧：没有粒子时不占 rAF（之前即使静止也每秒空转 60 次）
	if (METEOR.particles.length === 0) {
		ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
		METEOR.raf = null;
		return;
	}
	var w = window.innerWidth;
	var h = window.innerHeight;
	ctx.clearRect(0, 0, w, h);
	ctx.globalCompositeOperation = 'lighter';
	var maxDist = clamp((A.cfg && A.cfg.meteor && A.cfg.meteor.maxDist) || 160, 40, 900);
	var maxDistSq = maxDist * maxDist;
	for (var i = METEOR.particles.length - 1; i >= 0; i -= 1) {
		var p = METEOR.particles[i];
		var ddx = p.x - METEOR.pointer.x;
		var ddy = p.y - METEOR.pointer.y;
		if (ddx * ddx + ddy * ddy > maxDistSq) {
			METEOR.particles.splice(i, 1);
			continue;
		}
		p.x += p.vx;
		p.y += p.vy;
		p.vx *= 0.93;
		p.vy = p.vy * 0.93 + 0.02;
		p.life -= p.decay;
		if (p.life <= 0) {
			METEOR.particles.splice(i, 1);
			continue;
		}
		var alpha = Math.max(0, p.life) * 0.62;
		var gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
		gradient.addColorStop(0, 'hsla(' + p.hue + ', 100%, 76%, ' + alpha + ')');
		gradient.addColorStop(0.45, 'hsla(' + (p.hue + 18) + ', 100%, 64%, ' + (alpha * 0.6) + ')');
		gradient.addColorStop(1, 'hsla(' + (p.hue + 30) + ', 100%, 60%, 0)');
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalCompositeOperation = 'source-over';
	METEOR.raf = requestAnimationFrame(meteorTick);
}

function meteorOnMove(event) {
	var now = performance.now();
	var x = event.clientX;
	var y = event.clientY;
	METEOR.pointer.x = x;
	METEOR.pointer.y = y;
	var dt = now - METEOR.last.t;
	if (METEOR.last.x >= 0 && dt < 320) {
		meteorSpawn(x, y, x - METEOR.last.x, y - METEOR.last.y);
	}
	METEOR.last = { x: x, y: y, t: now };
}

/** 具名 resize 处理函数：匿名函数无法 removeEventListener，会随启停叠加。 */
function meteorOnResize() {
	if (METEOR.running) meteorResize();
}

function startMeteor() {
	if (METEOR.running) return;
	if (!meteorEnabled()) return;
	var canvas = document.createElement('canvas');
	canvas.id = 'dsh-aether-meteor';
	canvas.setAttribute('aria-hidden', 'true');
	canvas.style.position = 'fixed';
	canvas.style.left = '0';
	canvas.style.top = '0';
	canvas.style.width = '100vw';
	canvas.style.height = '100vh';
	canvas.style.zIndex = '2147482999';
	canvas.style.pointerEvents = 'none';
	document.body.appendChild(canvas);
	METEOR.canvas = canvas;
	meteorResize();
	if (!METEOR.bound) {
		METEOR.bound = true;
		window.addEventListener('mousemove', meteorOnMove, { passive: true });
		window.addEventListener('resize', meteorOnResize, { passive: true });
	}
	METEOR.running = true;
	METEOR.raf = requestAnimationFrame(meteorTick);
	pushLog('info', '流星尾缀已启动', { w: canvas.width, h: canvas.height });
}

function stopMeteor() {
	METEOR.running = false;
	if (METEOR.raf !== null) {
		try { cancelAnimationFrame(METEOR.raf); } catch (error) { /* ignore */ }
		METEOR.raf = null;
	}
	if (METEOR.bound) {
		try { window.removeEventListener('mousemove', meteorOnMove); } catch (error) { /* ignore */ }
		// resize 监听必须一起摘掉：旧实现只解 mousemove，反复启停后监听器会叠加
		try { window.removeEventListener('resize', meteorOnResize); } catch (error) { /* ignore */ }
		METEOR.bound = false;
	}
	if (METEOR.canvas) {
		try { METEOR.canvas.remove(); } catch (error) { /* ignore */ }
		METEOR.canvas = null;
	}
	METEOR.ctx = null;
	METEOR.particles = [];
}

function syncMeteor() {
	if (!meteorEnabled()) { stopMeteor(); return; }
	if (!METEOR.running || !METEOR.canvas || !document.body.contains(METEOR.canvas)) {
		stopMeteor();
		startMeteor();
	}
}

// 保留组件（overlay 里不再使用，仅为兼容旧引用）
