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

/**
 * 预渲染的粒子 sprite。
 *
 * 旧实现每个粒子每一帧都 `ctx.createRadialGradient()` + 3 次 `addColorStop`，
 * 真实桌面 2560×1393 下指针一移动就是每帧几十次渐变对象分配
 * （软件光栅实测 80 次移动/4 秒 → 3848ms 主线程、9 个 long task）。
 *
 * 现在按 (hue 桶, size 桶) 预渲染成离屏 canvas，绘制时只改 globalAlpha + drawImage。
 * 亮度衰减/色相偏移用三段近似：在同一张 sprite 里叠 3 个同色不同 alpha 的圆。
 */
var METEOR_SPRITE = { cache: Object.create(null), hueBucket: 6 };

function meteorSpriteFor(hue, size) {
	var hueKey = Math.round(hue / METEOR_SPRITE.hueBucket) * METEOR_SPRITE.hueBucket;
	var sizeKey = Math.max(1, Math.round(size));
	var key = hueKey + ':' + sizeKey;
	var hit = METEOR_SPRITE.cache[key];
	if (hit) return hit;

	var radius = sizeKey * 4;
	var px = Math.max(2, Math.ceil(radius * 2));
	var canvas = document.createElement('canvas');
	canvas.width = px;
	canvas.height = px;
	var c = canvas.getContext('2d');
	if (c) {
		var cx = px / 2;
		var cy = px / 2;
		var layers = [
			[radius, 'hsla(' + hueKey + ',100%,76%,1)'],
			[radius * 0.62, 'hsla(' + (hueKey + 18) + ',100%,64%,1)'],
			[radius * 0.30, 'hsla(' + (hueKey + 30) + ',100%,60%,0.9)'],
		];
		c.globalCompositeOperation = 'lighter';
		for (var i = 0; i < layers.length; i += 1) {
			var g = c.createRadialGradient(cx, cy, 0, cx, cy, layers[i][0]);
			g.addColorStop(0, layers[i][1]);
			g.addColorStop(0.55, layers[i][1].replace(/,1\)$/, ',0.45)').replace(/,0\.9\)$/, ',0.4)'));
			g.addColorStop(1, layers[i][1].replace(/,1\)$/, ',0)').replace(/,0\.9\)$/, ',0)'));
			c.fillStyle = g;
			c.beginPath();
			c.arc(cx, cy, layers[i][0], 0, Math.PI * 2);
			c.fill();
		}
	}
	METEOR_SPRITE.cache[key] = canvas;
	return canvas;
}

function meteorTick() {
	if (!METEOR.running) { METEOR.raf = null; return; }
	var ctx = METEOR.ctx;
	if (!ctx) { METEOR.raf = null; return; }
	// 失焦/不可见时不画（指针也不会动，粒子只是淡出占位）
	if (A.idle && A.idle.paused) {
		METEOR.raf = requestAnimationFrame(meteorTick);
		return;
	}
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
		if (alpha <= 0.004) continue;
		// sprite 预渲染 + drawImage：不再每帧分配渐变、不再重新解析颜色
		var sprite = meteorSpriteFor(p.hue, p.size);
		var half = sprite.width / 2;
		ctx.globalAlpha = alpha;
		ctx.drawImage(sprite, p.x - half, p.y - half);
		ctx.globalAlpha = 1;
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
	// 释放预渲染 sprite，避免长时间挂着占显存
	try { METEOR_SPRITE.cache = Object.create(null); } catch (error) { /* ignore */ }
}

function syncMeteor() {
	if (!meteorEnabled()) { stopMeteor(); return; }
	if (!METEOR.running || !METEOR.canvas || !document.body.contains(METEOR.canvas)) {
		stopMeteor();
		startMeteor();
	}
}

// 保留组件（overlay 里不再使用，仅为兼容旧引用）
