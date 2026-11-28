// ── whale：粒子鲸鱼（参考 dsh-client-ui-aqua 的 mountWhale 算法） ──────
// 算法要点（与上游一致，代码独立实现）：
//   1) 把品牌鱼剪影画到 60×60 的离屏网格，亮度 > .2 且邻域有亮点的像素 → 一个粒子
//   2) 每个粒子带「边缘权重 edge」与球面初速 (sx, sy, sz)，入场时从球面聚合到鱼形
//   3) 渲染用 lighter 叠加的小方块；左侧主光源 (LIGHT_X, LIGHT_Y) 按距离衰减着色
//   4) 整体呼吸（.15*sin(.4t)），尾部按 x 位置做正弦摆动
//   5) 鼠标靠近时把粒子推开（半径 4.9、强度 .8、带旋转扰动）
//   6) 30fps 节流；prefers-reduced-motion 只画一帧静态

var WHALE = {
	holder: null, canvas: null, ctx: null, raf: null, last: 0, startedAt: 0,
	particles: [], width: 0, height: 0, dpr: 1, scale: 1, running: false,
	mouse: { x: 0, y: 0 }, disposed: false, dark: true, sizePx: 0,
	// 颜色缓存：把 (r,g,b,alpha) 各量化到 8/8/8/16 档，最多 8192 条定长字符串。
	// Canvas 的 fillStyle 赋"同一个字符串"几乎零成本，而每帧拼 'rgba(...)' 字符串
	// 再让它重新解析颜色是 Canvas 里最贵的操作之一（26fps × ~3000 粒子 ≈ 9.4 万次/秒）。
	styleCache: [],
};

var WHALE_GRID = 60;
var WHALE_UNIT = 0.18;
var WHALE_WORLD_H = 36 * Math.tan((50 * Math.PI) / 360); // ≈16.79
var WHALE_LIGHT_X = 4.5;
var WHALE_LIGHT_Y = 5.5;
var WHALE_LIGHT_RANGE = 14;
var WHALE_SHADE_MIN = 0.2;
var WHALE_SHADE_MAX = 0.4 * 2.79;
var WHALE_FOLLOW_X = 1.05;
var WHALE_MOUSE_RADIUS = 4.9;
var WHALE_MOUSE_STRENGTH = 0.8;
var WHALE_MOUSE_DISTORT = 5;
var WHALE_LOOSE = 1;
var WHALE_FPS = 26;   // 30 → 26：肉眼几乎无差，绘制开销降 13%

function whaleSmoothstep(a, b, t) {
	var x = Math.min(1, Math.max(0, (t - a) / (b - a)));
	return x * x * (3 - 2 * x);
}

function whaleHash(n) {
	var s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
}

/** 用品牌鱼路径生成 SVG 图片，再采样成粒子点集。 */
function whaleBuildParticles() {
	var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 23.16 17.04" width="' + WHALE_GRID + '" height="' + WHALE_GRID + '"><path d="' + CRITTER_FISH_PATH + '" fill="#ffffff"/></svg>';
	var img = new Image();
	img.onload = function () {
		try {
			var off = document.createElement('canvas');
			off.width = WHALE_GRID;
			off.height = WHALE_GRID;
			var octx = off.getContext('2d');
			if (!octx) return;
			octx.fillStyle = '#000';
			octx.fillRect(0, 0, WHALE_GRID, WHALE_GRID);
			var fit = Math.min(WHALE_GRID / img.width, WHALE_GRID / img.height);
			var w = img.width * fit;
			var h = img.height * fit;
			octx.drawImage(img, (WHALE_GRID - w) / 2, (WHALE_GRID - h) / 2, w, h);
			var data = octx.getImageData(0, 0, WHALE_GRID, WHALE_GRID).data;
			var lum = new Float32Array(WHALE_GRID * WHALE_GRID);
			for (var i = 0; i < WHALE_GRID * WHALE_GRID; i += 1) {
				lum[i] = (0.299 * data[4 * i] + 0.587 * data[4 * i + 1] + 0.114 * data[4 * i + 2]) / 255;
			}
			function brightNeighbor(x, y) {
				for (var dy = -2; dy <= 2; dy += 1) {
					for (var dx = -2; dx <= 2; dx += 1) {
						if (dx === 0 && dy === 0) continue;
						var nx = x + dx;
						var ny = y + dy;
						if (nx < 0 || ny < 0 || nx >= WHALE_GRID || ny >= WHALE_GRID) continue;
						if (lum[ny * WHALE_GRID + nx] > 0.2) return true;
					}
				}
				return false;
			}
			WHALE.particles = [];
			for (var e = 0; e < WHALE_GRID; e += 1) {
				for (var n = 0; n < WHALE_GRID; n += 1) {
					var a = lum[e * WHALE_GRID + n];
					if (a <= 0.2 || !brightNeighbor(n, e)) continue;
					var x = (n - WHALE_GRID / 2) * WHALE_UNIT;
					var y = (WHALE_GRID / 2 - e) * WHALE_UNIT;
					var edge = 0;
					for (var ddy = -1; ddy <= 1; ddy += 1) {
						for (var ddx = -1; ddx <= 1; ddx += 1) {
							if (ddx === 0 && ddy === 0) continue;
							var nnx = n + ddx;
							var nny = e + ddy;
							if (nnx < 0 || nny < 0 || nnx >= WHALE_GRID || nny >= WHALE_GRID || lum[nny * WHALE_GRID + nnx] <= 0.2) edge += 1;
						}
					}
					var phi = Math.random() * Math.PI * 2;
					var theta = Math.acos(2 * Math.random() - 1);
					var rad = 3 * (0.4 + 0.6 * Math.random());
					var index = WHALE.particles.length;
					WHALE.particles.push({
						x: x, y: y, opacity: a, edge: edge / 8,
						sx: Math.sin(theta) * Math.cos(phi) * rad,
						sy: Math.sin(theta) * Math.sin(phi) * rad,
						sz: Math.cos(theta) * rad * 0.5,
						// 预计算：每帧只做乘法/加法，不再调用 whaleHash（各含一次 Math.sin）
						h1: whaleHash(index),
						h2: whaleHash(index * 1.37 + 7),
						ph53: index * 0.53,
						ph71: index * 0.71,
						ph37: index * 0.37,
					});
				}
			}
			pushLog('info', '粒子鲸鱼采样完成', { particles: WHALE.particles.length });
			whaleDraw(1, 0);
		} catch (error) {
			pushLog('warn', '粒子鲸鱼采样失败', { message: String(error && error.message) });
		}
	};
	img.onerror = function () {
		pushLog('warn', '粒子鲸鱼 SVG 解码失败');
	};
	img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function whaleResize() {
	if (!WHALE.holder || !WHALE.canvas) return;
	var rect = WHALE.holder.getBoundingClientRect();
	WHALE.width = Math.max(1, rect.width);
	WHALE.height = Math.max(1, rect.height);
	WHALE.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
	WHALE.canvas.width = Math.max(1, Math.round(WHALE.width * WHALE.dpr));
	WHALE.canvas.height = Math.max(1, Math.round(WHALE.height * WHALE.dpr));
	WHALE.scale = WHALE.height / WHALE_WORLD_H;
}

function whaleDraw(assembly, time) {
	var ctx = WHALE.ctx;
	if (!ctx || !WHALE.canvas) return;
	if (WHALE.width === 0 || WHALE.height === 0) whaleResize();
	ctx.setTransform(WHALE.dpr, 0, 0, WHALE.dpr, 0, 0);
	ctx.clearRect(0, 0, WHALE.width, WHALE.height);
	ctx.globalCompositeOperation = 'lighter';
	var targetX = WHALE.mouse.x;
	var lightX = WHALE_LIGHT_X + targetX * WHALE_FOLLOW_X;
	var lightY = WHALE_LIGHT_Y;
	var size = Math.max(1.1, 0.06 * WHALE.scale * WHALE.dpr);
	var breathe = 0.15 * Math.sin(0.4 * time);
	var darkMode = WHALE.dark;
	for (var i = 0; i < WHALE.particles.length; i += 1) {
		var p = WHALE.particles[i];
		var loose = WHALE_LOOSE * (0.25 + 0.75 * p.edge) * assembly;
		var px = p.x + p.h1 * 0.05 * loose;
		var py = p.y + p.h2 * 0.05 * loose;
		px += Math.sin(time * 0.5 + p.ph53) * 0.06 * loose;
		py += Math.cos(time * 0.42 + p.ph71) * 0.06 * loose;
		var tail = whaleSmoothstep(0.5, 4.5, p.x) * WHALE_LOOSE * assembly;
		py += Math.sin(time * 1.1 - p.x * 0.7) * 0.1 * tail;
		px += Math.cos(time * 0.9 - p.x * 0.55) * 0.06 * tail;
		px = p.sx + (px - p.sx) * assembly;
		py = p.sy + (py - p.sy) * assembly;
		if (assembly > 0.8) {
			var mouseEffect = (assembly - 0.8) * 5;
			var mx = px - targetX;
			var my = py - WHALE.mouse.y;
			var dist = Math.sqrt(mx * mx + my * my);
			if (dist < WHALE_MOUSE_RADIUS && dist > 0.001) {
				var t = 1 - dist / WHALE_MOUSE_RADIUS;
				var force = t * t * t * mouseEffect * WHALE_MOUSE_STRENGTH;
				var angle = Math.sin(p.ph37 + time * 0.5) * WHALE_MOUSE_DISTORT;
				var ca = Math.cos(angle);
				var sa = Math.sin(angle);
				var ux = mx / dist;
				var uy = my / dist;
				var rx = ux * ca - uy * sa;
				var ry = ux * sa + uy * ca;
				px += rx * force * 2;
				py += ry * force * 2;
			}
		}
		var ldx = px - lightX;
		var ldy = py - lightY;
		var lit = Math.min(1, Math.max(0, 1 - Math.sqrt(ldx * ldx + ldy * ldy) / WHALE_LIGHT_RANGE));
		var vLight = WHALE_SHADE_MIN + WHALE_SHADE_MAX * lit * lit;
		var glow = whaleSmoothstep(8, 0, Math.sqrt(px * px + py * py)) * 0.3 * assembly;
		var baseAlpha = 0.45 + 0.3 * assembly;
		var shimmer = Math.sin(time * 1.5 + px * 5 + py * 3) * 0.1 + 0.9;
		var alpha = p.opacity * (baseAlpha + glow) * shimmer * Math.min(vLight, 1);
		var br = darkMode ? 0.75 : 0.42;
		var bg = darkMode ? 0.8 : 0.44;
		var bb = darkMode ? 0.9 : 0.47;
		var r = Math.min(255, Math.round((br * assembly + glow * 0.2) * vLight * 255));
		var g = Math.min(255, Math.round((bg * assembly + glow * 0.3) * vLight * 255));
		var b = Math.min(255, Math.round((bb * assembly + glow * 0.5) * vLight * 255));
		if (alpha <= 0.004) continue;
		// 量化取缓存：颜色分量 8 档（步长 32）+ alpha 16 档，1~2px 粒子上不可分辨
		var rq = (r >> 5) & 7;
		var gq = (g >> 5) & 7;
		var bq = (b >> 5) & 7;
		var aq = alpha >= 1 ? 15 : (alpha * 15) | 0;
		var index = ((((rq << 3) | gq) << 3 | bq) << 4) | aq;
		var style = WHALE.styleCache[index];
		if (style === undefined) {
			style = 'rgba(' + ((rq << 5) + 16) + ',' + ((gq << 5) + 16) + ',' + ((bq << 5) + 16) + ',' + (((aq + 0.5) / 15).toFixed(3)) + ')';
			WHALE.styleCache[index] = style;
		}
		ctx.fillStyle = style;
		var sx = WHALE.width / 2 + px * WHALE.scale - size / 2;
		var sy = WHALE.height / 2 - (py + breathe) * WHALE.scale - size / 2;
		ctx.fillRect(sx, sy, size, size);
	}
	ctx.globalCompositeOperation = 'source-over';
}

function whaleStep(now) {
	if (!WHALE.running || WHALE.disposed) return;
	if (now - WHALE.last < 1000 / WHALE_FPS) {
		WHALE.raf = requestAnimationFrame(whaleStep);
		return;
	}
	WHALE.last = now - ((now - WHALE.last) % (1000 / WHALE_FPS));
	var elapsed = (now - WHALE.startedAt) / 1000;
	var assembly = Math.min(1, Math.max(0, (elapsed - 0.3) / 2.5));
	whaleDraw(assembly, elapsed);
	WHALE.raf = requestAnimationFrame(whaleStep);
}

function whaleHost() {
	if (WHALE.holder && document.body.contains(WHALE.holder)) return WHALE.holder;
	var stage = ensureStage();
	var holder = document.createElement('div');
	holder.id = 'dsh-aether-whale';
	holder.setAttribute('aria-hidden', 'true');
	var canvas = document.createElement('canvas');
	holder.appendChild(canvas);
	stage.appendChild(holder);
	WHALE.holder = holder;
	WHALE.canvas = canvas;
	WHALE.ctx = canvas.getContext('2d');
	WHALE.dark = isDarkTheme();
	// 尺寸：视口短边 0.76 与主列 0.8 取小，夹在 220~660
	var size = Math.round(Math.max(220, Math.min(660, window.innerHeight * 0.76, window.innerWidth * 0.8)));
	holder.style.width = size + 'px';
	holder.style.height = size + 'px';
	holder.style.left = Math.round(window.innerWidth / 2) + 'px';
	holder.style.top = Math.round(window.innerHeight / 2) + 'px';
	return holder;
}

function whaleStart() {
	if (WHALE.running) return;
	if (!A.cfg || A.canary.disabled) return;
	if (!moduleOn('fx')) return;
	if (!A.cfg.fx || A.cfg.fx.whale === false) return;
	whaleHost();
	whaleResize();
	WHALE.disposed = false;
	WHALE.startedAt = performance.now();
	WHALE.last = 0;
	var reduced = shouldReduceMotion();
	if (reduced) {
		whaleBuildParticles();
		// reduced-motion：静态一帧（等图片解码后由 build 内部画）
		WHALE.running = true;
		return;
	}
	whaleBuildParticles();
	if (!WHALE.startedAt) WHALE.startedAt = performance.now();
	if (typeof WHALE.resizeBound !== 'boolean') {
		WHALE.resizeBound = true;
		window.addEventListener('resize', function () {
			if (!WHALE.running) return;
			whaleResize();
		}, { passive: true });
		window.addEventListener('pointermove', function (event) {
			if (!WHALE.running || !WHALE.holder) return;
			var rect = WHALE.holder.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return;
			WHALE.mouse.x = ((event.clientX - rect.left) / rect.width * 2 - 1) * WHALE.scale;
			WHALE.mouse.y = -(((event.clientY - rect.top) / rect.height * 2 - 1)) * WHALE.scale;
		}, { passive: true });
	}
	WHALE.running = true;
	WHALE.startedAt = performance.now();
	WHALE.raf = requestAnimationFrame(whaleStep);
	pushLog('info', '粒子鲸鱼已启动', { particles: WHALE.particles.length });
}

function whaleStop() {
	WHALE.running = false;
	if (WHALE.raf !== null) {
		try { cancelAnimationFrame(WHALE.raf); } catch (error) { /* ignore */ }
		WHALE.raf = null;
	}
	if (WHALE.holder) {
		try { WHALE.holder.remove(); } catch (error) { /* ignore */ }
		WHALE.holder = null;
	}
	WHALE.canvas = null;
	WHALE.ctx = null;
	WHALE.particles = [];
}

/** 当前是否在「已有对话」的对话页：首页（新对话）没有任何消息气泡。 */
function hasConversationView() {
	try {
		if (document.querySelectorAll('[data-message-bubble]').length > 0) return true;
		if (document.querySelectorAll('[class*="userRow"]').length > 0) return true;
		if (document.querySelectorAll('[class*="assistant"]').length > 0) return true;
	} catch (error) { /* ignore */ }
	return false;
}

function syncWhale() {
	if (!A.cfg || A.canary.disabled || !moduleOn('fx') || (A.cfg.fx && A.cfg.fx.whale === false)) {
		whaleStop();
		return;
	}
	// 新对话（空白首页）交给官方 5.7s 鲸鱼跃出动画，插件鲸鱼只在已有对话的页面出现
	if (!hasConversationView()) {
		if (WHALE.running) whaleStop();
		return;
	}
	if (!WHALE.running || !WHALE.holder || !document.body.contains(WHALE.holder)) {
		whaleStop();
		whaleStart();
		return;
	}
	whaleResize();
}
