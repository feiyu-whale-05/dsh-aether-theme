// ── core：状态、颜色算法、CSS 注入、API、金丝雀 ──────────────────────────
// 关键设计：所有视觉改动都收敛到「CSS 变量 + 一个隔离舞台层」两件事。
// 不改宿主 DOM 结构、不移动节点、不覆盖内联样式，因此任何一步失败都能
// 通过 removeStyle()/removeStage() 瞬间回到原生外观。

var PANEL_ID = 'aether-theme';
var STORAGE_KEY = 'dsh-aether:prefs:v1';
var VERSION = '1.0.51';

var A = {
	ctx: null,
	ready: false,
	host: { ok: false, version: '', wallpapers: [], usage: null, diag: null },
	cfg: null,
	defaults: null,
	styleEl: null,
	stageEl: null,
	layerEls: [],
	scanEl: null,
	canary: { strikes: 0, lost: {}, disabled: false, lastRun: 0, timer: null },
	rotationTimer: null,
	derived: null,
	services: {},
	flags: { reduceMotion: false, dark: true },
	lastDiag: null,
	lastUpload: 0,
	subscribers: [],
	startedAt: Date.now(),
	logs: [],
};

function pushLog(level, message, meta) {
	try {
		A.logs.push({ t: Date.now(), level: level, message: message, meta: meta });
		if (A.logs.length > 120) A.logs.splice(0, A.logs.length - 120);
	} catch (error) { /* ignore */ }
}

// ── 数字/颜色工具 ───────────────────────────────────────────────────────
function clamp(value, min, max) {
	var n = Number(value);
	if (!Number.isFinite(n)) n = min;
	return Math.min(max, Math.max(min, n));
}

function parseColor(input) {
	var text = String(input || '').trim();
	var hex = /^#([0-9a-f]{3,8})$/i.exec(text);
	if (hex) {
		var raw = hex[1];
		if (raw.length === 3 || raw.length === 4) {
			raw = raw.split('').map(function (ch) { return ch + ch; }).join('');
		}
		if (raw.length === 6 || raw.length === 8) {
			return {
				r: parseInt(raw.slice(0, 2), 16),
				g: parseInt(raw.slice(2, 4), 16),
				b: parseInt(raw.slice(4, 6), 16),
				a: raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1,
			};
		}
	}
	var rgb = /^rgba?\(([^)]+)\)$/i.exec(text);
	if (rgb) {
		var parts = rgb[1].split(/[,/\s]+/).filter(Boolean).map(Number);
		if (parts.length >= 3 && parts.every(function (n) { return Number.isFinite(n); })) {
			return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? clamp(parts[3], 0, 1) : 1 };
		}
	}
	return { r: 128, g: 128, b: 128, a: 1 };
}

/** 统一把 hex 字符串 / 残缺对象转成安全颜色对象，杜绝 NaN 传导。 */
function asColor(c) {
	if (typeof c === 'string') return parseColor(c);
	if (!c || !Number.isFinite(c.r) || !Number.isFinite(c.g) || !Number.isFinite(c.b)) {
		return { r: 0, g: 0, b: 0, a: 1 };
	}
	return c;
}

function toHex(c) {
	var r = Math.round(clamp(c.r, 0, 255));
	var g = Math.round(clamp(c.g, 0, 255));
	var b = Math.round(clamp(c.b, 0, 255));
	return '#' + [r, g, b].map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
}

function rgba(c, alpha) {
	var a = alpha === undefined ? (c.a === undefined ? 1 : c.a) : clamp(alpha, 0, 1);
	return 'rgba(' + Math.round(c.r) + ', ' + Math.round(c.g) + ', ' + Math.round(c.b) + ', ' + (Math.round(a * 1000) / 1000) + ')';
}

/** WCAG 2.1 相对亮度。 */
function luminance(input) {
	var c = asColor(input);
	var channels = [c.r, c.g, c.b].map(function (v) {
		var s = clamp(v, 0, 255) / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG 对比度：两色之间 1~21。 */
function contrastRatio(a, b) {
	var la = luminance(a);
	var lb = luminance(b);
	var hi = Math.max(la, lb);
	var lo = Math.min(la, lb);
	return (hi + 0.05) / (lo + 0.05);
}

function mixColor(a, b, amount) {
	var ca = asColor(a);
	var cb = asColor(b);
	var t = clamp(amount, 0, 1);
	return {
		r: ca.r + (cb.r - ca.r) * t,
		g: ca.g + (cb.g - ca.g) * t,
		b: ca.b + (cb.b - ca.b) * t,
		a: (ca.a === undefined ? 1 : ca.a) + ((cb.a === undefined ? 1 : cb.a) - (ca.a === undefined ? 1 : ca.a)) * t,
	};
}

/** 把颜色按 alpha 混合到另一色上（等价于在背景上看到的有效色）。 */
function composite(fg, bg) {
	var f = asColor(fg);
	var alpha = f.a === undefined ? 1 : f.a;
	return mixColor(bg, f, alpha);
}

function shiftColor(input, delta) {
	var c = asColor(input);
	var target = delta >= 0 ? { r: 255, g: 255, b: 255, a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
	return mixColor(c, target, Math.abs(delta));
}

function rotateHue(input, degrees) {
	var c = asColor(input);
	var r = c.r / 255;
	var g = c.g / 255;
	var b = c.b / 255;
	var max = Math.max(r, g, b);
	var min = Math.min(r, g, b);
	var l = (max + min) / 2;
	var s = max === min ? 0 : l < 0.5 ? (max - min) / (max + min) : (max - min) / (2 - max - min);
	var h = 0;
	if (max !== min) {
		var d = max - min;
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
		else if (max === g) h = ((b - r) / d + 2) / 6;
		else h = ((r - g) / d + 4) / 6;
	}
	var hue = (h + degrees / 360 + 1) % 1;
	var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	var p = 2 * l - q;
	function hueTo(channel) {
		if (channel < 0) channel += 1;
		if (channel > 1) channel -= 1;
		if (channel < 1 / 6) return p + (q - p) * 6 * channel;
		if (channel < 1 / 2) return q;
		if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
		return p;
	}
	return {
		r: hueTo(hue + 1 / 3) * 255,
		g: hueTo(hue) * 255,
		b: hueTo(hue - 1 / 3) * 255,
		a: 1,
	};
}

/**
 * WCAG 动态反解：在给定有效背景色上，为目标对比度选一个前景色。
 * 优先保黑/白（原生观感），两者都不达标时取更接近的并标记 needsFallback，
 * 由调用方（ensureContrast）去调整面板不透明度兜底。
 */
function solveForeground(bg, target, prefer) {
	var white = { r: 255, g: 255, b: 255, a: 1 };
	var black = { r: 0, g: 0, b: 0, a: 1 };
	var cw = contrastRatio(bg, white);
	var cb = contrastRatio(bg, black);
	var threshold = target || 7;
	if (prefer === 'dark' && cb >= threshold) return { color: black, ok: true, ratio: cb };
	if (prefer !== 'dark' && cw >= threshold) return { color: white, ok: true, ratio: cw };
	if (cb >= threshold) return { color: black, ok: true, ratio: cb };
	if (cw >= threshold) return { color: white, ok: true, ratio: cw };
	return { color: cw >= cb ? white : black, ok: false, ratio: Math.max(cw, cb) };
}

/**
 * 对比度兜底：面板半透明时，先算「面板叠在壁纸上」的有效色；如果目标对比度
 * 达不到，就把面板不透明度往 1 推，直到达标（最多推到 1）。返回最终 alpha。
 */
function ensureContrast(panelColor, panelAlpha, wallpaperColor, inkColor, target) {
	var alpha = clamp(panelAlpha, 0, 1);
	var wanted = target || 7;
	for (var i = 0; i < 40; i += 1) {
		var effective = composite({ r: panelColor.r, g: panelColor.g, b: panelColor.b, a: alpha }, wallpaperColor);
		if (contrastRatio(effective, inkColor) >= wanted) return alpha;
		if (alpha >= 1) return 1;
		alpha = Math.min(1, alpha + 0.025);
	}
	return 1;
}

/** 最终自检：算出来的文字色如果在底色上看不清（对比度 < 3），强制回退到纯白/纯黑。 */
function finalInk(labelHex, bgColor) {
	var ink = parseColor(labelHex);
	if (contrastRatio(bgColor, ink) >= 3) return labelHex;
	var decision = solveForeground(bgColor, 4.5, luminance(asColor(bgColor)) < 0.5 ? undefined : 'dark');
	return toHex(decision.color);
}

/**
 * 可读强调色：把主色按目标对比度校准到指定底色上。
 * 壁纸取色可能给出很暗/很亮的主色，直接用会在侧栏选中行、光标、图标上「消失」。
 */
function readableOn(accentInput, bgInput, target) {
	var accent = asColor(accentInput);
	var bg = asColor(bgInput);
	var wanted = target || 4.5;
	if (contrastRatio(bg, accent) >= wanted) return toHex(accent);
	var toward = luminance(bg) < 0.5 ? { r: 255, g: 255, b: 255, a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
	var best = accent;
	for (var i = 1; i <= 20; i += 1) {
		var candidate = mixColor(accent, toward, i / 20);
		if (contrastRatio(bg, candidate) >= wanted) return toHex(candidate);
		best = candidate;
	}
	return toHex(best);
}

/** 强调底上的文字色：浅底给深字、深底给白字，保证 ≥ 4.5:1。 */
function inkOn(accentInput, target) {
	var accent = asColor(accentInput);
	var wanted = target || 4.5;
	var black = { r: 11, g: 15, b: 22, a: 1 };
	var white = { r: 255, g: 255, b: 255, a: 1 };
	if (contrastRatio(accent, black) >= wanted) return toHex(black);
	if (contrastRatio(accent, white) >= wanted) return toHex(white);
	return toHex(solveForeground(accent, wanted).color);
}

/** 从壁纸采样平均亮度 + 主色（缩小到 48x48 后按 4bit/通道取众数桶）。 */
function sampleImage(source) {
	return new Promise(function (resolve) {
		var img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = function () {
			try {
				var w = 48;
				var h = Math.max(1, Math.round(48 * (img.naturalHeight || 1) / (img.naturalWidth || 1)));
				var canvas = document.createElement('canvas');
				canvas.width = w;
				canvas.height = h;
				var context = canvas.getContext('2d', { willReadFrequently: true });
				context.drawImage(img, 0, 0, w, h);
				var data = context.getImageData(0, 0, w, h).data;
				var sum = { r: 0, g: 0, b: 0 };
				var buckets = {};
				var pixels = 0;
				for (var i = 0; i < data.length; i += 4) {
					var r = data[i];
					var g = data[i + 1];
					var b = data[i + 2];
					sum.r += r; sum.g += g; sum.b += b;
					pixels += 1;
					var key = (r >> 4) + ',' + (g >> 4) + ',' + (b >> 4);
					var bucket = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
					bucket.n += 1; bucket.r += r; bucket.g += g; bucket.b += b;
				}
				var avg = { r: sum.r / pixels, g: sum.g / pixels, b: sum.b / pixels, a: 1 };
				var best = null;
				Object.keys(buckets).forEach(function (key) {
					var bucket = buckets[key];
					if (!best || bucket.n > best.n) best = bucket;
				});
				var dominant = best
					? { r: best.r / best.n, g: best.g / best.n, b: best.b / best.n, a: 1 }
					: avg;
				resolve({ avg: avg, dominant: dominant, brightness: luminance(avg) });
			} catch (error) {
				resolve(null);
			}
		};
		img.onerror = function () { resolve(null); };
		try {
			img.src = source;
		} catch (error) {
			resolve(null);
		}
	});
}

/** 智能色彩衍生：主色 → 辅助色 + 三档色阶（浅/中/深）。 */
function derivePalette(baseHex) {
	var base = parseColor(baseHex);
	return {
		accent: toHex(base),
		accentSoft: toHex(shiftColor(base, 0.22)),
		accentStrong: toHex(shiftColor(base, -0.18)),
		secondary: toHex(rotateHue(base, 36)),
		tertiary: toHex(rotateHue(base, -28)),
		ink: luminance(base) > 0.45 ? toHex(shiftColor(base, -0.62)) : toHex(shiftColor(base, 0.72)),
	};
}

// ── 主题检测 / 环境 ─────────────────────────────────────────────────────
function isDarkTheme() {
	// 三重判定：宿主三种落点都认，避免「界面是深色、我按浅色算」→ 深底黑字。
	try {
		if (document.body && document.body.hasAttribute('data-ds-dark-theme')) return true;
	} catch (error) { /* 继续 */ }
	try {
		var source = document.documentElement.getAttribute('data-ds-theme-source');
		if (source === 'dark') return true;
		if (source === 'light') return false;
	} catch (error) { /* 继续 */ }
	try {
		var scheme = window.getComputedStyle(document.documentElement).colorScheme || '';
		if (scheme.indexOf('dark') !== -1) return true;
		if (scheme.indexOf('light') !== -1) return false;
	} catch (error) { /* 继续 */ }
	// 宿主还没初始化主题：跟系统走
	try {
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	} catch (error) {
		return true;
	}
}

function prefersReducedMotion() {
	try {
		return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	} catch (error) {
		return false;
	}
}

function shouldReduceMotion() {
	var mode = A.cfg && A.cfg.theme ? A.cfg.theme.reducedMotion : 'auto';
	if (mode === 'always') return true;
	if (mode === 'never') return false;
	return prefersReducedMotion();
}

// ── API ─────────────────────────────────────────────────────────────────
function readToken() {
	try {
		return String(window.__DSH_AETHER_TOKEN__ || '');
	} catch (error) {
		return '';
	}
}

function readApiBase() {
	try {
		var value = String(window.__DSH_AETHER_API__ || '');
		if (value) return value.replace(/\/+$/, '');
	} catch (error) { /* ignore */ }
	return '/dsh-aether';
}

function apiFetch(path, options) {
	var request = options || {};
	var headers = Object.assign({}, request.headers || {});
	if (A.token) headers['x-dsh-aether-token'] = A.token;
	var init = {
		method: request.method || 'GET',
		headers: headers,
		credentials: 'same-origin',
	};
	if (request.body !== undefined) init.body = request.body;
	if (request.signal) init.signal = request.signal;
	var url = A.apiBase + path;
	return fetch(url, init).then(function (response) {
		if (!response.ok) {
			var error = new Error('HTTP ' + response.status);
			error.status = response.status;
			throw error;
		}
		var type = response.headers.get('content-type') || '';
		return type.indexOf('application/json') !== -1 ? response.json() : response.text();
	});
}

/** token 缺失（页面 index 被缓存/插件热加载）时，向同源 bootstrap 端点换取。 */
function ensureToken() {
	var current = readToken();
	if (current) { A.token = current; return Promise.resolve(current); }
	if (A.token) return Promise.resolve(A.token);
	return fetch(A.apiBase + '/api/bootstrap', { credentials: 'same-origin' })
		.then(function (response) {
			if (!response.ok) throw new Error('bootstrap HTTP ' + response.status);
			return response.json();
		})
		.then(function (payload) {
			if (payload && payload.token) {
				A.token = String(payload.token);
				pushLog('info', '页面令牌已自举');
				return A.token;
			}
			throw new Error('no token in bootstrap');
		})
		.catch(function (error) {
			pushLog('warn', 'token 自举失败', { message: String(error && error.message) });
			return '';
		});
}

function loadState(retried) {
	return ensureToken().then(function () {
		return apiFetch('/api/state');
	}).catch(function (error) {
		// token 可能来自旧页面：清掉重试一次（会重新 bootstrap）
		if (!retried && error && (error.status === 401 || error.status === 403)) {
			A.token = '';
			return new Promise(function (resolve) { setTimeout(resolve, 1000); })
				.then(function () { return loadState(true); });
		}
		throw error;
	}).then(function (payload) {
		A.host.ok = true;
		A.host.version = payload.version || VERSION;
		A.host.wallpapers = Array.isArray(payload.wallpapers) ? payload.wallpapers : [];
		A.host.usage = payload.usage || null;
		A.host.diag = payload.diag || null;
		A.defaults = payload.defaultAppearance || null;
		A.cfg = mergeConfig(payload.appearance, payload.defaultAppearance);
		migrateBlurOff(A.cfg);
		return payload;
	}).catch(function (error) {
		A.host.ok = false;
		pushLog('warn', 'state 读取失败', { message: String(error && error.message) });
		if (!A.cfg && A.defaults) A.cfg = mergeConfig(null, A.defaults);
		throw error;
	});
}

/** 一次性迁移：把旧默认的磨砂值（bg 8 / glass 18）归零——host 端可能缓存着旧配置。 */
function migrateBlurOff(cfg) {
	try {
		if (!cfg || typeof cfg !== 'object') return cfg;
		if (!Array.isArray(cfg.migrations)) cfg.migrations = [];
		var dirty = false;
		// v2-defaults：早期默认值（磨砂/遮罩/透明度）一次性归零，尊重用户后续手动修改
		if (cfg.migrations.indexOf('v2-defaults') === -1) {
			cfg.migrations.push('v2-defaults');
			dirty = true;
			if (cfg.glass) {
				if (cfg.glass.backgroundBlur === 8) cfg.glass.backgroundBlur = 0;
				if (cfg.glass.glassBlur === 18) cfg.glass.glassBlur = 0;
				if (cfg.glass.regions) {
					if (cfg.glass.regions.base === 0.52) cfg.glass.regions.base = 0;
					if (cfg.glass.regions.sidebar === 0.44) cfg.glass.regions.sidebar = 0.55;
					if (cfg.glass.regions.layers === 0.5) cfg.glass.regions.layers = 0.55;
					if (cfg.glass.regions.input === 0.58) cfg.glass.regions.input = 0.55;
				}
				if (cfg.glass.inputFillOpacity === 0.6) cfg.glass.inputFillOpacity = 0.55;
				if (cfg.glass.inputFill && !cfg.glass.inputFills) {
					cfg.glass.inputFills = [cfg.glass.inputFill];
					delete cfg.glass.inputFill;
				}
			}
			if (cfg.wallpaper && cfg.wallpaper.dim === 0.32) cfg.wallpaper.dim = 0;
		}
		// v3-aqua-chrome：外壳磨砂对齐 Aqua（blur 14px / 暗度 50%）
		if (cfg.migrations.indexOf('v3-aqua-chrome') === -1) {
			cfg.migrations.push('v3-aqua-chrome');
			dirty = true;
			if (cfg.glass) {
				if (!cfg.glass.chromeBlur || cfg.glass.chromeBlur === 0) cfg.glass.chromeBlur = 14;
				if (cfg.glass.chromeOpacity === 0.55) cfg.glass.chromeOpacity = 0;
			}
		}
		if (dirty) saveConfig('migrate');
	} catch (error) { /* ignore */ }
	return cfg;
}
function mergeConfig(saved, defaults) {
	var base = defaults || defaultConfigFallback();
	var out = JSON.parse(JSON.stringify(base));
	if (!saved || typeof saved !== 'object') return out;
	Object.keys(saved).forEach(function (key) {
		var value = saved[key];
		if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
			out[key] = Object.assign({}, out[key], value);
			// modules/regions 这类两级对象再合并一次，防止旧配置缺字段
			// 旧配置迁移：inputFill 单值 → inputFills 数组
		if (key === 'glass') {
			if (out[key].inputFill) {
				var legacyFill = out[key].inputFill;
				if (!Array.isArray(out[key].inputFills) || !out[key].inputFills.length) out[key].inputFills = [legacyFill];
				delete out[key].inputFill;
			}
			if (typeof out[key].inputFills === 'string') out[key].inputFills = [out[key].inputFills];
			if (!Array.isArray(out[key].inputFills)) out[key].inputFills = ['frosted'];
		}
		Object.keys(out[key]).forEach(function (sub) {
				if (value[sub] && typeof value[sub] === 'object' && out[key][sub] && typeof out[key][sub] === 'object') {
					out[key][sub] = Object.assign({}, out[key][sub], value[sub]);
				}
			});
		} else {
			out[key] = value;
		}
	});
	return out;
}

function defaultConfigFallback() {
	return {
		version: 1,
		enabled: true,
		modules: {
			theme: { enabled: true }, wallpaper: { enabled: true }, glass: { enabled: true },
			pixel: { enabled: false }, widget: { enabled: true },
			boot: { enabled: true }, diag: { enabled: true },
			inputGlow: { enabled: true }, fx: { enabled: true },
		},
		theme: {
			palette: 'auto', accent: '#7aa2ff', secondary: '#9d7cff', deriveFromWallpaper: true,
			contrastTarget: 7, mixMode: 'multiply', transitionMs: 420, reducedMotion: 'auto',
			strongColor: '#ffe6a3', fontFamily: '', fontSize: 0,
		},
		bubble: { official: true, color: '#dbe7ff', opacity: 0.62 },
		panel: { scale: 1.15 },
		meteor: { enabled: false, density: 1, hue: 222, maxDist: 160 },
		userMd: { enabled: true },
		wallpaper: {
			mode: 'none', source: 'preset', id: '', cssPreset: 'aurora', fit: 'cover',
			dim: 0.32, blur: 0,
			rotation: { enabled: false, intervalMin: 30, timeOfDay: [6, 18], categories: [] },
		},
		glass: {
			glassBlur: 0, backgroundBlur: 0, saturation: 1.15, border: 0.14,
			regions: { base: 0, sidebar: 0.55, layers: 0.55, menu: 0.74, input: 0.55, bubble: 0.5 },
			inputFills: ['frosted'], inputFillOpacity: 0.55,
			chromeOpacity: 0, chromeBlur: 14,
		// 分区背景：每个区域可单独设颜色与不透明度；enabled=false 时跟随外壳统一色
		backgrounds: {
			sidebar: { enabled: false, image: '', color: '#22262f', opacity: 0.5 },
			input: { enabled: false, image: '', color: '#22262f', opacity: 0.5 },
			bubble: { enabled: false, image: '', color: '#dbe7ff', opacity: 0.55 },
			topbar: { enabled: false, image: '', color: '#22262f', opacity: 0.5 },
			titlebar: { enabled: false, image: '', color: '#1b1f27', opacity: 0.6 },
			settings: { enabled: false, image: '', color: '#22262f', opacity: 0.6 },
		},
		},
		pixel: { theme: 'cabin', nineSlice: 12, crt: false, scanline: 0.08 },
		widget: { position: 'bottom-right', showBalance: true, showToday: true, showTurn: true, warnBelow: 5 },
		fx: { density: 60, fishCount: 3, whale: true, glow: true, press: true },
		boot: { durationMs: 2200, style: 'ripple', skipOnReducedMotion: true },
		diag: { showOverlay: false, canaryStrikes: 40 },
	};
}

function saveConfig(reason) {
	if (!A.cfg) return Promise.reject(new Error('no config'));
	return apiFetch('/api/config', {
		method: 'PUT',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ appearance: A.cfg }),
	}).then(function (result) {
		A.lastSavedAt = Date.now();
		A.lastSavedOk = true;
		pushLog('info', '配置已保存', { reason: reason || 'save' });
		try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(A.cfg)); } catch (error) { /* 端口变了 localStorage 不可用也没关系 */ }
		return result;
	}).catch(function (error) {
		A.lastSavedAt = Date.now();
		A.lastSavedOk = false;
		// Host 挂了也要能用：localStorage 兜底（同端口内刷新不丢）
		try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(A.cfg)); } catch (ignored) { /* ignore */ }
		pushLog('warn', '配置保存失败（已写 localStorage 兜底）', { message: String(error && error.message) });
		throw error;
	});
}

function resetConfig() {
	return apiFetch('/api/reset', { method: 'POST' }).then(function (payload) {
		A.cfg = mergeConfig(payload.appearance, payload.defaultAppearance || A.defaults);
		try { window.localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
		applyAppearance('reset');
		return payload;
	});
}

function loadLocalCache() {
	try {
		var raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch (error) {
		return null;
	}
}

// ── 舞台层（隔离节点，不改宿主结构） ────────────────────────────────────
/** 遮罩层选择器（设置对话框/图片查看的黑底）：直接删元素而不是改颜色。 */
var MASK_SELECTOR = '[class*="_mask"], [class*="-mask"], [class*="_Mask"], [class*="_scrim"], [class*="_backdrop"]';

function isMaskNode(node) {
	try {
		if (!node || node.nodeType !== 1) return false;
		if (node.id && node.id.indexOf('dsh-aether-') === 0) return false;
		if (node.closest && node.closest('.aeth-root')) return false;
		return node.matches(MASK_SELECTOR);
	} catch (error) {
		return false;
	}
}

/** 立即移除屏幕上已有的遮罩层。 */
function removeMaskLayers() {
	var removed = 0;
	try {
		var nodes = document.querySelectorAll(MASK_SELECTOR);
		for (var i = 0; i < nodes.length; i += 1) {
			var node = nodes[i];
			if (!isMaskNode(node)) continue;
			try { node.remove(); removed += 1; } catch (error) { /* ignore */ }
		}
	} catch (error) { /* ignore */ }
	if (removed > 0) pushLog('info', '已移除遮罩层', { count: removed });
	return removed;
}

/** 持续清理：对话/设置页打开时会重新插入遮罩。 */
function watchMaskLayers() {
	try {
		if (A.maskObserver) return;
		A.maskObserver = new MutationObserver(function (mutations) {
			var hit = false;
			for (var i = 0; i < mutations.length && !hit; i += 1) {
				var added = mutations[i].addedNodes;
				for (var j = 0; j < added.length; j += 1) {
					if (isMaskNode(added[j]) || (added[j].querySelector && added[j].querySelector(MASK_SELECTOR))) { hit = true; break; }
				}
			}
			if (hit) setTimeout(removeMaskLayers, 30);
		});
		A.maskObserver.observe(document.body, { childList: true, subtree: true });
	} catch (error) { /* ignore */ }
}

function ensureStage() {
	if (A.stageEl && document.body.contains(A.stageEl)) return A.stageEl;
	var stage = document.createElement('div');
	stage.id = 'dsh-aether-stage';
	stage.setAttribute('aria-hidden', 'true');
	stage.setAttribute('data-dsh-aether', 'stage');
	// z-index:-1：画在 body 背景之上、普通流内容之下；pointer-events:none 保证不吃点击
	stage.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:transparent;';
	try {
		document.body.insertBefore(stage, document.body.firstChild);
	} catch (error) {
		document.body.appendChild(stage);
	}
	A.stageEl = stage;
	return stage;
}

function removeStage() {
	if (A.stageEl) {
		try { A.stageEl.remove(); } catch (error) { /* ignore */ }
		A.stageEl = null;
	}
	A.layerEls = [];
	if (A.scanEl) {
		try { A.scanEl.remove(); } catch (error) { /* ignore */ }
		A.scanEl = null;
	}
}

// ── 样式注入（只注入一次，之后只改变量） ────────────────────────────────
function buildStyleText() {
	return [
		// 宿主透明化：只改背景相关，不碰布局/尺寸/定位
		'html[data-dsh-aether] { background: #0b0d12; }',
		'html[data-dsh-aether] body { background: transparent !important; }',
		'html[data-dsh-aether] #root { background: transparent !important; }',
				'html[data-dsh-aether] #root > div { isolation: isolate; }',
		// 变量桥：把 js 计算的 --aether-* 映射到宿主 --dsw-* 语义变量
		'html[data-dsh-aether] body {',
		'  --dsw-alias-bg-base: var(--aether-bg-base) !important;',
		'  --dsw-alias-bg-layer-1: var(--aether-bg-layer-1) !important;',
		'  --dsw-alias-bg-layer-2: var(--aether-bg-layer-2) !important;',
		'  --dsw-alias-bg-layer-3: var(--aether-bg-layer-3) !important;',
		'  --dsw-alias-bg-overlay: var(--aether-bg-overlay) !important;',
		'  --dsw-alias-bg-module-platform: var(--aether-bg-module) !important;',
		'  --dsw-alias-bg-multi-select: var(--aether-bg-module) !important;',
		'  --dsw-alias-bg-overlay: var(--aether-bg-overlay) !important;',

		'  --dsw-specific-menu: var(--aether-menu-fill) !important;',
		'  --dsw-specific-input-major: var(--aether-input-fill) !important;',
		'  --dsw-specific-selector: var(--aether-input-fill) !important;',

		'  --dsw-alias-markdown-code-block: var(--aether-code-bg) !important;',
		'  --dsw-alias-markdown-code-block-banner: var(--aether-code-banner) !important;',
		'  --dsw-alias-markdown-inline-code: var(--aether-inline-code) !important;',
		'  --dsw-alias-label-primary: var(--aether-label-primary, #e8eaed) !important;',
		'  --dsw-alias-label-secondary: var(--aether-label-secondary, #c3c7ce) !important;',
		'  --dsw-alias-label-tertiary: var(--aether-label-tertiary, #aeb3bc) !important;',
		'  --dsw-alias-label-caption: var(--aether-label-caption, #9aa0aa) !important;',
		'  --dsw-alias-label-dimmed: var(--aether-label-dimmed, #7d838d) !important;',
		// 设置页 / 图片放大查看的灰色来自宿主遮罩与浮层底色，统一透明（透出壁纸）
		'html[data-dsh-aether] body {',
		'  --dsw-alias-bg-mask-1: rgba(0, 0, 0, 0) !important;',
		'  --dsw-alias-bg-mask-2: rgba(0, 0, 0, 0) !important;',
		'  --dsw-alias-bg-mask-3: rgba(0, 0, 0, 0) !important;',
		'  --dsw-alias-bg-mask-photo: rgba(0, 0, 0, 0) !important;',
		'  --dsw-alias-bg-mask-drop: rgba(255, 255, 255, 0) !important;',
		'  --dsw-alias-bg-overlay: rgba(20, 22, 27, 0) !important;',
		'  --dsw-alias-bg-module-platform: rgba(20, 22, 27, 0) !important;',
		'}',
		'  --dsw-alias-border-l1: var(--aether-border-l1) !important;',
		'  --dsw-alias-border-l2: var(--aether-border-l2) !important;',
		'  --dsw-alias-border-l3: var(--aether-border-l3) !important;',
		'  --dsw-alias-border-l4: var(--aether-border-l4) !important;',
		'  --dsw-alias-brand-primary: var(--aether-accent) !important;',
		'  --dsw-alias-button-primary-fill: var(--aether-brand-blue) !important;',
		'  --dsw-alias-button-primary-hover: var(--aether-brand-blue-hover) !important;',
		'  --dsw-alias-link: var(--aether-brand-blue) !important;',
		'  --dsw-specific-sidebar-nav-item-active-accent: var(--aether-brand-blue) !important;',
		'  --dsw-focus-ring-color: var(--aether-brand-blue) !important;',
		'  --dsw-alias-state-business-primary: var(--aether-brand-blue) !important;',
		'  --dsw-alias-state-business-secondary: var(--aether-brand-blue) !important;',
		'}',
		// 用户气泡：默认官方样式；只有 data-aether-bubble="custom" 时才接管
		'html[data-dsh-aether][data-aether-bubble="custom"] body {',
		'  --dsw-specific-bubble: var(--aether-bubble-fill) !important;',
		'  --dsw-specific-bubble-highlight: var(--aether-bubble-highlight) !important;',
		'}',
		// 浅色分支兜底：变量缺失时也不出现「白底白字」
		'html[data-dsh-aether] body:not([data-ds-dark-theme]) {',
		'  --dsw-alias-label-primary: var(--aether-label-primary, #1a1c22) !important;',
		'  --dsw-alias-label-secondary: var(--aether-label-secondary, #3b3f47) !important;',
		'  --dsw-alias-label-tertiary: var(--aether-label-tertiary, #4d525b) !important;',
		'  --dsw-alias-label-caption: var(--aether-label-caption, #5d636d) !important;',
		'}',
		// 面板玻璃：只对有明确语义的容器做 backdrop-filter（不改结构/位置）
		'html[data-dsh-aether][data-glass-blur="on"] [role="dialog"],',
		'html[data-dsh-aether][data-glass-blur="on"] [role="menu"] {',
		'  backdrop-filter: blur(var(--aether-glass-blur, 0px)) saturate(var(--aether-saturation, 1.15));',
		'}',
		// 外壳统一：顶栏 / 侧栏 / 输入框卡片共用同一套「暗度 + 磨砂」
		// 默认磨砂 0（纯半透明），调高时三处一起变磨砂。
		// 只有显式打开磨砂（chromeBlur > 0）时才加 backdrop-filter；
		// 否则悬空属性会创建 containing block，破坏侧栏里 fixed 按钮的定位。
		// 三处外壳统一磨砂：侧栏列 / 顶栏 header / 输入框卡片，同一 blur 值（Aqua 默认 14px）
		'html[data-dsh-aether][data-chrome-blur="on"] [data-aether-frame],',
		'html[data-dsh-aether][data-chrome-blur="on"] [class*="sidebarCol"],',
		'html[data-dsh-aether][data-chrome-blur="on"] [data-aether-input-host] {',
		'  backdrop-filter: blur(var(--aether-chrome-blur, 14px)) saturate(1.4) !important;',
		'}',
		// 侧栏里出现 dialog 时撤掉磨砂（避免给 fixed 元素建包含块，Aqua 同款处理）
		'html[data-dsh-aether] [class*="sidebarCol"]:has([role="dialog"]) { backdrop-filter: none !important; }',
		// ── 分区背景（每块可单独覆盖；未启用时回落到外壳统一色/透明） ──
		'html[data-dsh-aether] body {',
		'  --dsw-specific-sidebar-fill: var(--aether-sidebar-bg, var(--aether-chrome-fill)) !important;',
		'  --dsw-specific-sidebar-glass-fill: var(--aether-sidebar-bg, var(--aether-chrome-fill)) !important;',
		'}',
		'html[data-windows-titlebar][data-dsh-aether] [data-aether-frame]::before {',
		'  background: linear-gradient(rgba(0, 0, 0, var(--aether-titlebar-extra, .08)), rgba(0, 0, 0, var(--aether-titlebar-extra, .08))), var(--aether-titlebar-bg, var(--aether-chrome-fill)) !important;',
		'}',
		'html[data-dsh-aether] header { background-color: var(--aether-topbar-bg, transparent) !important; }',
		'html[data-dsh-aether] [data-aether-input-host] { background-color: var(--aether-input-bg, var(--aether-chrome-fill)) !important; }',
		'html[data-dsh-aether] [data-global-panel] { background-color: var(--aether-settings-bg, transparent) !important; }',
		'html[data-dsh-aether] body { --dsw-specific-bubble: var(--aether-bubble-bg, var(--dsw-specific-bubble-default, #dbe7ff8a)) !important; }',
		// 分区背景图（在底色之上平铺/裁切）
		'html[data-dsh-aether] [class*="sidebarCol"] {',
		'  background-image: var(--aether-sidebar-img, none) !important;',
		'  background-size: cover; background-position: center; background-repeat: no-repeat;',
		'}',
		'html[data-dsh-aether] [data-aether-input-host] {',
		'  background-image: var(--aether-input-img, none) !important;',
		'  background-size: cover; background-position: center; background-repeat: no-repeat;',
		'}',
		'html[data-dsh-aether] header {',
		'  background-image: var(--aether-topbar-img, none) !important;',
		'  background-size: cover; background-position: center; background-repeat: no-repeat;',
		'}',
		'html[data-dsh-aether][data-windows-titlebar] [data-aether-frame]::before {',
		'  background-image: var(--aether-titlebar-img, none) !important;',
		'  background-size: cover; background-position: center; background-repeat: no-repeat;',
		'}',
		'html[data-dsh-aether] [data-global-panel] {',
		'  background-image: var(--aether-settings-img, none) !important;',
		'  background-size: cover; background-position: center; background-repeat: no-repeat;',
		'}',
		'html[data-dsh-aether] body {',
		'  --dsw-specific-bubble-image: var(--aether-bubble-img, none);',
		'}',
		// 输入框卡片底色统一到外壳变量（侧栏与顶栏由宿主的 frame/sidebar-fill 变量控制，
		// 不再强行覆盖它们自身的背景，避免盖住侧栏里的折叠按钮等控件）
		// 设置/图片查看的遮罩层用的是硬编码 #00000080（不是 CSS 变量），
		// 通过 CSS Modules 的 _mask 类名直接清掉底色。
		'html[data-dsh-aether] [class*="_mask"],',
		'html[data-dsh-aether] [class*="-mask"],',
		'html[data-dsh-aether] [class*="_Mask"],',
		'html[data-dsh-aether] [class*="_scrim"],',
		'html[data-dsh-aether] [class*="_backdrop"] {',
		'  background-color: rgba(0, 0, 0, 0) !important;',
		'}',
		'html[data-dsh-aether] [data-aether-input-host] {',
		'  background-color: var(--aether-chrome-fill) !important;',
		'}',
		// Windows 标题栏（「应用/编辑」那行）：
		// 侧栏 = frame + sidebarCol 两层半透明（≈0.75），标题栏只有 frame 一层（0.5）会显得浅。
		// 这里恢复 ::before 的一层，并额外叠 --aether-titlebar-extra（默认 0.08）的暗色，
		// 让标题栏与侧栏同档、略深一点点。
		'html[data-windows-titlebar][data-dsh-aether] [data-aether-frame]::before {',
		'  background: linear-gradient(rgba(0, 0, 0, var(--aether-titlebar-extra, .08)), rgba(0, 0, 0, var(--aether-titlebar-extra, .08))), var(--aether-chrome-fill) !important;',
		'}',
		// 顶栏（Windows 标题栏带「应用/编辑」那行）：frame 背景已由 sidebar-fill 控制，
		// 这里把 sidebar-fill 直接绑到同一个 chrome 变量
		'html[data-dsh-aether] body {',
		'  --dsw-specific-sidebar-fill: var(--aether-chrome-fill) !important;',
		'  --dsw-specific-sidebar-glass-fill: var(--aether-chrome-fill) !important;',
		'}',
		// 壁纸层：双缓冲淡入淡出（防闪烁）
		'#dsh-aether-stage > .aether-wall { position:absolute; inset:0; z-index:1; opacity:0; transition:opacity var(--aether-transition, 420ms) ease; will-change:opacity; }',
		'#dsh-aether-stage > .aether-wall.is-on { opacity:1; }',
		'#dsh-aether-stage > .aether-wall > img, #dsh-aether-stage > .aether-wall > video { width:100%; height:100%; display:block; object-fit:cover; }',
		'#dsh-aether-stage > .aether-wall > img, #dsh-aether-stage > .aether-wall > video, #dsh-aether-stage > .aether-wall > .aether-css { filter: brightness(var(--aether-wall-brightness, 0.85)); }',
		'#dsh-aether-stage > .aether-veil { position:absolute; inset:0; z-index:2; background: var(--aether-veil); pointer-events:none; mix-blend-mode: var(--aether-content-blend, normal); }',
		// 纯 CSS 预设背景
		'#dsh-aether-stage .aether-css { position:absolute; inset:0; }',
		'#dsh-aether-stage .aether-css.aurora { background: radial-gradient(120% 90% at 15% 10%, #2b3a67 0%, transparent 55%), radial-gradient(100% 80% at 85% 20%, #5b3a7e 0%, transparent 60%), radial-gradient(120% 100% at 50% 100%, #12343b 0%, transparent 65%), linear-gradient(160deg, #0b1020 0%, #101a2e 50%, #0a0f18 100%); animation: aether-drift 28s ease-in-out infinite alternate; }',
		'#dsh-aether-stage .aether-css.mesh { background-color: #0e1220; background-image: radial-gradient(at 20% 25%, #3b5bdb55 0, transparent 50%), radial-gradient(at 78% 15%, #9d7cff4d 0, transparent 50%), radial-gradient(at 60% 80%, #4ed6c033 0, transparent 55%), radial-gradient(at 12% 85%, #ff9f4340 0, transparent 50%); animation: aether-drift 24s ease-in-out infinite alternate; }',
		'#dsh-aether-stage .aether-css.ocean { background: linear-gradient(180deg, #06121f 0%, #0a2233 45%, #0d3742 75%, #123f45 100%); animation: aether-tide 18s ease-in-out infinite alternate; }',
		'#dsh-aether-stage .aether-css.ember { background: radial-gradient(90% 70% at 50% 110%, #7a2a12 0%, transparent 60%), radial-gradient(70% 60% at 20% 20%, #3a1c2e 0%, transparent 60%), linear-gradient(160deg, #120a10 0%, #1d0f14 100%); animation: aether-drift 32s ease-in-out infinite alternate; }',
		'#dsh-aether-stage .aether-css.sakura { background: radial-gradient(100% 80% at 70% 15%, #f6d5e0aa 0%, transparent 55%), radial-gradient(90% 80% at 15% 70%, #cfe3f5aa 0%, transparent 60%), linear-gradient(160deg, #f7f2f6 0%, #eef1f7 100%); }',
		'#dsh-aether-stage .aether-css.stars { background-color: #05070e; background-image: radial-gradient(1.6px 1.6px at 12% 18%, #ffffffcc 50%, transparent 51%), radial-gradient(1.4px 1.4px at 38% 62%, #ffffffaa 50%, transparent 51%), radial-gradient(1.8px 1.8px at 66% 28%, #bcd4ffcc 50%, transparent 51%), radial-gradient(1.3px 1.3px at 82% 74%, #ffffff99 50%, transparent 51%), radial-gradient(1.5px 1.5px at 24% 86%, #d9e6ffbb 50%, transparent 51%), radial-gradient(1.2px 1.2px at 54% 8%, #ffffff88 50%, transparent 51%), linear-gradient(160deg, #05070e 0%, #0a1024 100%); animation: aether-twinkle 9s ease-in-out infinite alternate; }',
		'#dsh-aether-stage .aether-css.paper { background: #f6f2e9; background-image: radial-gradient(#00000008 1px, transparent 1px); background-size: 5px 5px; }',
		'@keyframes aether-drift { from { transform: scale(1.06) translate3d(-1.5%, -1%, 0); } to { transform: scale(1.12) translate3d(1.5%, 1.5%, 0); } }',
		'@keyframes aether-tide { from { transform: scale(1.08) translate3d(0, 1.2%, 0); } to { transform: scale(1.14) translate3d(0, -1.2%, 0); } }',
		'@keyframes aether-twinkle { from { opacity: .82; transform: scale(1.04); } to { opacity: 1; transform: scale(1.1); } }',
		// 像素风（9-slice 边框 + CRT）
		'html[data-dsh-aether-pixel] [role="dialog"],',
		'html[data-dsh-aether-pixel] [data-rightbar-col],',
		'html[data-dsh-aether-pixel] [data-global-panel] {',
		'  border-style: solid;',
		'  border-image-source: var(--aether-pixel-frame);',
		'  border-image-slice: 3 fill;',
		'  border-image-width: var(--aether-pixel-slice, 12px);',
		'  border-image-repeat: stretch;',
		'}',
		'html[data-dsh-aether-pixel] body { image-rendering: pixelated; }',
		'html[data-dsh-aether] code { color: var(--aether-code-fg); }',
		'html[data-dsh-aether] textarea { border-color: var(--aether-input-border, var(--aether-border-l2)) !important; }',
		'html[data-dsh-aether] input, html[data-dsh-aether] textarea, html[data-dsh-aether] [contenteditable="true"], html[data-dsh-aether] [data-composer-input] { caret-color: var(--aether-caret) !important; }',
		'#dsh-aether-scan { position:fixed; inset:0; z-index:2147483000; pointer-events:none; background: repeating-linear-gradient(180deg, rgba(0,0,0,var(--aether-scanline, .08)) 0px, rgba(0,0,0,var(--aether-scanline, .08)) 1px, transparent 1px, transparent 3px); mix-blend-mode: multiply; }',
		// 插件自己的面板/设置页样式（前缀 .aeth-，与宿主隔离）
		// 模型输出里的 **重点**：亮黄偏白（不动插件自己的面板）
		'html[data-dsh-aether] strong { color: var(--aether-strong, #ffe6a3) !important; font-weight: 650; }',
		'html[data-dsh-aether] .aeth-root strong { color: inherit !important; font-weight: 600; }',
		// 文心式渐变边框（data-aether-input="wenxin"）：
		// · 边框挂在「外层卡片」（直接包含 contenteditable 的那层 div），不画在内层输入区上
		// · 只有输入状态（:focus-within）才显示，失焦即隐藏
		// · 渐变沿边框流动（背景位移动画），节奏参考文心输入框
		'html[data-dsh-aether][data-aether-input="wenxin"] [contenteditable="true"]:not(.cm-content) {',
		'  border: none !important;',
		'  background: transparent !important;',
		'  border-radius: 0 !important;',
		'  box-shadow: none !important;',
		'}',
		// 外层卡片：定位容器；边框由 ::after 独立图层绘制（opacity 才能做淡入淡出）
		'html[data-dsh-aether][data-aether-input="wenxin"] [data-aether-input-host] {',
		'  position: relative !important;',
		'}',
		'html[data-dsh-aether][data-aether-input="wenxin"] [data-aether-input-host]::after {',
		'  content: "" !important;',
		'  position: absolute !important;',
		'  inset: 0 !important;',
		'  border-radius: inherit !important;',
		'  padding: 1.5px !important;',
		'  background: linear-gradient(100deg, var(--aether-wenxin-a, #3d7dfe), var(--aether-wenxin-b, #6a59fe), #c08bff, var(--aether-wenxin-c, #9142ff), var(--aether-wenxin-b, #6a59fe), var(--aether-wenxin-a, #3d7dfe)) !important;',
		'  background-size: 220% 100% !important;',
		'  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0) !important;',
		'  -webkit-mask-composite: xor !important;',
		'  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0) !important;',
		'  mask-composite: exclude !important;',
		'  opacity: 0 !important;',
		'  transition: opacity .38s ease !important;',
		'  pointer-events: none !important;',
		'  z-index: 3 !important;',
		'}',
		'html[data-dsh-aether][data-aether-input="wenxin"] [data-aether-input-host]:focus-within::after {',
		'  opacity: 1 !important;',
		'  animation: aether-border-flow var(--aether-border-speed, 2.4s) linear infinite,',
		'             aether-border-hue 9s ease-in-out infinite;',
		'}',
		'html[data-dsh-aether][data-aether-input="wenxin"] [data-aether-input-host]:focus-within {',
		'  animation: aether-border-glow 3.2s ease-in-out infinite;',
		'}',
		'@keyframes aether-border-flow {',
		'  from { background-position: 0% 50%; }',
		'  to { background-position: 220% 50%; }',
		'}',
		'@keyframes aether-border-hue {',
		'  0%, 100% { filter: hue-rotate(0deg) saturate(1); }',
		'  33% { filter: hue-rotate(-26deg) saturate(1.15); }',
		'  66% { filter: hue-rotate(22deg) saturate(1.1); }',
		'}',
		'@keyframes aether-border-glow {',
		'  0%, 100% { box-shadow: 0 0 0 2px rgba(106, 89, 254, .16), 0 0 16px rgba(106, 89, 254, .10) !important; }',
		'  50% { box-shadow: 0 0 0 3px rgba(106, 89, 254, .30), 0 0 26px rgba(106, 89, 254, .20) !important; }',
		'}',
		// 面板/设置页内容放大 + 按钮文字色
		'html[data-dsh-aether] .aeth-root { padding: 16px 22px 28px; max-width: min(1320px, 94vw); width: 100%; margin: 0 auto; box-sizing: border-box; color: var(--dsw-alias-label-primary, #e8eaed); }',
				// 面板内滚动：宿主 main 容器是定高 + overflow:hidden，内容超出就看不到了
		'html[data-dsh-aether] .aeth-root[data-aeth-surface="panel"] {',
		'  zoom: var(--aether-panel-scale, 1.15);',
		'  height: 100%;',
		'  max-height: 100%;',
		'  overflow-y: auto;',
		'  overflow-x: hidden;',
		'  overscroll-behavior: contain;',
		'  scrollbar-gutter: stable;',
		'  box-sizing: border-box;',
		'}',
		'html[data-dsh-aether] .aeth-root[data-aeth-surface="panel"]::-webkit-scrollbar { width: 10px; }',
		'html[data-dsh-aether] .aeth-root[data-aeth-surface="panel"]::-webkit-scrollbar-thumb { background: var(--dsw-alias-scrollbar-bg-l2, rgba(255,255,255,.18)); border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }',
		'html[data-dsh-aether] .aeth-root[data-aeth-surface="panel"]::-webkit-scrollbar-thumb:hover { background: var(--dsw-alias-scrollbar-hover-l2, rgba(255,255,255,.28)); background-clip: content-box; }',
		'.aeth-root .aeth-btn { color: var(--dsw-alias-label-primary, #e8eaed) !important; }',
		'.aeth-root .aeth-btn.primary { color: #0b0f16 !important; font-weight: 600; }',
		'.aeth-root .aeth-btn.danger { color: var(--dsw-alias-state-error-primary, #e06c75) !important; }',
		'.aeth-root .aeth-chip { color: var(--dsw-alias-label-secondary, #c3c7ce) !important; }',
		'.aeth-root .aeth-chip.on { color: #0b0f16 !important; }',
		'.aeth-root .aeth-tab { color: var(--dsw-alias-label-secondary, #c3c7ce) !important; }',
		'.aeth-root .aeth-tab.on { color: var(--dsw-alias-label-primary, #e8eaed) !important; }',
		// 用户消息 markdown 渲染层
		'.aeth-md { display: block; white-space: normal; word-break: break-word; }',
		'.aeth-md p { margin: 0 0 .5em; }',
		'.aeth-md p:last-child { margin-bottom: 0; }',
		'.aeth-md code { padding: .1em .35em; border-radius: 4px; background: var(--dsw-alias-markdown-inline-code, rgba(255,255,255,.12)); font-family: var(--dsw-font-mono, monospace); font-size: .92em; }',
		'.aeth-md pre { padding: 10px 12px; border-radius: 8px; background: var(--aether-code-bg, rgba(0,0,0,.42)); overflow: auto; margin: .4em 0; }',
		'.aeth-md pre code { background: transparent; padding: 0; }',
		'.aeth-md ul, .aeth-md ol { margin: .3em 0; padding-left: 1.4em; }',
		'.aeth-md a { color: var(--aether-brand-blue, #7aa2ff); text-decoration: underline; text-underline-offset: 2px; }',
		'.aeth-md del { opacity: .7; }',
		// 流星尾缀画布
		'#dsh-aether-meteor { position: fixed; inset: 0; z-index: 2147482999; pointer-events: none; }',
		// 海洋小生物（参考 dsh-client-ui-aqua 的 SVG + CSS 动画方案）
		'#dsh-aether-critters { position:absolute; inset:0; z-index:3; overflow:hidden; pointer-events:none; }',
		// 粒子鲸鱼（canvas，居中，mix-blend-mode 让它像背景里的光）
		'#dsh-aether-whale { position:absolute; z-index:2; transform:translate(-50%,-50%); pointer-events:none; mix-blend-mode:screen; opacity:.92; }',
		'html[data-dsh-aether] body:not([data-ds-dark-theme]) #dsh-aether-whale { mix-blend-mode:multiply; }',
		'#dsh-aether-whale canvas { width:100%; height:100%; display:block; }',
		// 侧栏下压：内阴影（不创建 containing block，不影响 fixed 按钮）
				// 下压内阴影（3D 倾斜是主效果，这层保证任何容器都看得出"压下去"）
		'html[data-dsh-aether] [data-aether-press-shade="1"] {',
		'  box-shadow: inset 0 0 90px rgba(0, 0, 0, .30), inset 0 1px 0 rgba(255, 255, 255, .06) !important;',
		'  transition: box-shadow .16s ease, transform .16s ease;',
		'}',
'html[data-dsh-aether] [data-aether-pressed="1"] {',
		'  box-shadow: inset 0 0 90px rgba(0, 0, 0, .30) !important;',
		'  background-color: color-mix(in srgb, var(--aether-chrome-fill, rgba(34,38,47,.5)) 88%, #000) !important;',
		'  transition: box-shadow .18s ease;',
		'}',
		'#dsh-aether-critters svg { position:absolute; display:block; }',
		'.aether-critter.fish { color:#9cc0f2; opacity:.42; animation: aether-fish-swim 12s ease-in-out infinite; will-change:transform; filter: drop-shadow(0 0 6px rgba(124,170,240,.35)); }',
		'.aether-critter.fish.fish-left { animation-name: aether-fish-swim-left; animation-duration:16s; }',
		'.aether-critter.bubble { color:#bcd6f7; opacity:0; animation: aether-bubble-rise 9s ease-in infinite; }',
		'.aether-critter.plankton { color:#a9c6ef; animation: aether-plankton 5s ease-in-out infinite; filter: drop-shadow(0 0 5px rgba(140,185,255,.5)); }',
		'@keyframes aether-fish-swim {',
		'  0% { transform: translate(0,0) rotate(-5deg); }',
		'  30% { transform: translate(40px,-15px) rotate(4deg); }',
		'  70% { transform: translate(52px,-18px) rotate(3deg); }',
		'  100% { transform: translate(0,0) rotate(-5deg); }',
		'}',
		'@keyframes aether-fish-swim-left {',
		'  0% { transform: translate(0,0) scaleX(-1) rotate(-5deg); }',
		'  30% { transform: translate(-34px,-12px) scaleX(-1) rotate(4deg); }',
		'  70% { transform: translate(-44px,-15px) scaleX(-1) rotate(3deg); }',
		'  100% { transform: translate(0,0) scaleX(-1) rotate(-5deg); }',
		'}',
		'@keyframes aether-bubble-rise {',
		'  0% { opacity:0; transform: translate(0,0); }',
		'  10% { opacity:.62; }',
		'  100% { opacity:0; transform: translate(8px,-150px); }',
		'}',
		'@keyframes aether-plankton {',
		'  0%, 100% { opacity:.16; }',
		'  50% { opacity:.55; }',
		'}',
		'.aeth-head { display:flex; gap:10px; align-items:baseline; margin-bottom: 12px; flex-wrap: wrap; }',
		'.aeth-title { font-size: 16px; font-weight: 600; }',
		'.aeth-sub { color: var(--dsw-alias-label-caption, #8b95a3); font-size: 12px; }',
		'.aeth-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px; }',
		'.aeth-tab { padding:5px 12px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12)); background:transparent; color:var(--dsw-alias-label-secondary,#b6bec9); cursor:pointer; font-size:12px; }',
		'.aeth-tab.on { color: var(--dsw-alias-label-primary,#fff); border-color: var(--aether-accent,#7aa2ff); background: color-mix(in srgb, var(--aether-accent,#7aa2ff) 16%, transparent); }',
		'.aeth-card { border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.1)); border-radius:14px; padding:14px 16px; margin-bottom:12px; background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.03)); }',
		'.aeth-card h3 { margin:0 0 10px; font-size:13px; font-weight:600; }',
		'.aeth-row { display:flex; align-items:center; gap:10px; margin:8px 0; flex-wrap:wrap; }',
		'.aeth-row > label { min-width:150px; font-size:12px; color: var(--dsw-alias-label-secondary,#b6bec9); }',
		'.aeth-row .aeth-grow { flex:1 1 220px; min-width:180px; }',
		'.aeth-input, .aeth-select, .aeth-range { background: var(--dsw-specific-input-major, rgba(255,255,255,.06)); color: inherit; border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14)); border-radius:8px; padding:6px 9px; font-size:12px; }',
		'.aeth-input:focus, .aeth-select:focus { outline:2px solid var(--aether-accent,#7aa2ff); outline-offset:1px; }',
		'.aeth-range { padding:0; accent-color: var(--aether-accent,#7aa2ff); }',
		'.aeth-btn { padding:6px 12px; border-radius:8px; border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14)); background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.06)); color: inherit; cursor:pointer; font-size:12px; }',
		'.aeth-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.1)); }',
		'.aeth-btn.primary { background: var(--aether-accent,#7aa2ff); border-color: transparent; color:#0b0f16; font-weight:600; }',
		'.aeth-btn.danger { color: var(--dsw-alias-state-error-primary,#e06c75); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary,#e06c75) 40%, transparent); }',
		'.aeth-chips { display:flex; gap:6px; flex-wrap:wrap; }',
		'.aeth-chip { padding:4px 10px; border-radius:999px; border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12)); background:transparent; color:var(--dsw-alias-label-secondary,#b6bec9); cursor:pointer; font-size:12px; }',
		'.aeth-chip.on { color:#0b0f16; background: var(--aether-accent,#7aa2ff); border-color:transparent; }',
		'.aeth-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap:10px; }',
		'.aeth-wall { position:relative; border-radius:10px; overflow:hidden; border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.12)); aspect-ratio: 16/10; background:#0b0d12; cursor:pointer; }',
		'.aeth-wall img, .aeth-wall video { width:100%; height:100%; object-fit:cover; display:block; }',
		'.aeth-wall .aeth-badge { position:absolute; left:6px; bottom:6px; font-size:10px; padding:2px 7px; border-radius:999px; background:rgba(0,0,0,.6); color:#fff; }',
		'.aeth-wall .aeth-x { position:absolute; right:4px; top:4px; width:20px; height:20px; border-radius:50%; border:none; background:rgba(0,0,0,.55); color:#fff; cursor:pointer; line-height:20px; font-size:12px; }',
		'.aeth-wall.on { outline:2px solid var(--aether-accent,#7aa2ff); }',
		'.aeth-note { font-size:11px; color: var(--dsw-alias-label-caption,#8b95a3); line-height:1.6; }',
		'.aeth-kv { display:grid; grid-template-columns: 130px 1fr; gap:4px 10px; font-size:12px; }',
		'.aeth-kv b { font-weight:500; color: var(--dsw-alias-label-caption,#8b95a3); }',
		'.aeth-kv span { word-break:break-all; }',
		'.aeth-ok { color: var(--dsw-alias-state-success-primary,#4ed6a0); }',
		'.aeth-bad { color: var(--dsw-alias-state-error-primary,#e06c75); }',
		'.aeth-swatches { display:flex; gap:8px; align-items:center; }',
		'.aeth-swatch { width:26px; height:26px; border-radius:8px; border:1px solid rgba(255,255,255,.18); }',
		'.aeth-section-title { font-size:13px; font-weight:600; margin: 18px 0 8px; }',
		// 桌宠 / 挂件 / 开屏（固定定位，全部 pointer-events 可控）
		'.aeth-pet { position:fixed; z-index:2147482000; cursor:pointer; user-select:none; transition: transform .2s ease; filter: drop-shadow(0 8px 18px rgba(0,0,0,.35)); }',
		'.aeth-pet:active { transform: scale(.94); }',
		'.aeth-pet .eye { transition: transform .12s ease-out; }',
		'.aeth-widget { position:fixed; z-index:2147482000; display:flex; gap:10px; align-items:center; padding:8px 12px; border-radius:14px; border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.14)); background: var(--dsw-specific-menu, rgba(24,26,32,.86)); backdrop-filter: blur(14px) saturate(1.2); color: var(--dsw-alias-label-primary,#e8eaed); font-size:12px; box-shadow: 0 10px 28px rgba(0,0,0,.28); }',
		'.aeth-widget b { font-size:14px; font-weight:600; }',
		'.aeth-widget .aeth-warn { color: var(--dsw-alias-state-warn-primary,#f5a623); }',
		'.aeth-boot { position:fixed; inset:0; z-index:2147483001; display:grid; place-items:center; background:#07090f; animation: aether-boot-out var(--aether-boot-dur, 2200ms) cubic-bezier(.4,0,.2,1) forwards; }',
		'.aeth-boot .aeth-boot-mark { width:86px; height:86px; border-radius:50%; border:3px solid transparent; border-top-color:#7aa2ff; border-right-color:#9d7cff; animation: aether-spin 1.1s linear infinite; }',
		'.aeth-boot .aeth-boot-text { margin-top:16px; font-size:12px; letter-spacing:.28em; color:#aab6d6; }',
		'@keyframes aether-spin { to { transform: rotate(360deg); } }',
		'@keyframes aether-boot-out { 0% { opacity:1 } 62% { opacity:1 } 100% { opacity:0; visibility:hidden } }',
		'.aeth-diag-overlay { position:fixed; right:14px; top:14px; z-index:2147482500; width:290px; border-radius:12px; border:1px solid var(--dsw-alias-border-l2, rgba(255,255,255,.16)); background: var(--dsw-specific-menu, rgba(18,20,26,.94)); color: var(--dsw-alias-label-primary,#e8eaed); font-size:11px; padding:10px 12px; box-shadow: 0 14px 34px rgba(0,0,0,.4); }',
		'.aeth-diag-overlay .aeth-diag-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-weight:600; }',
		'@media (prefers-reduced-motion: reduce) {',
		'  html[data-dsh-aether][data-aether-input="wenxin"] [data-aether-input-host]:focus-within { animation: none !important; }',
		'  html[data-dsh-aether][data-aether-input="wenxin"] [data-aether-input-host]::after { transition-duration: 0ms !important; animation: none !important; }',
		'  #dsh-aether-stage > .aether-wall { transition-duration: 0ms; }',
		'  #dsh-aether-stage .aether-css { animation: none !important; }',
		'  .aether-critter { animation: none !important; }',
		'  .aether-critter.bubble { opacity: 0 !important; }',
		'  .aeth-boot .aeth-boot-mark { animation: none; border-color:#7aa2ff; }',
		'  .aeth-boot { animation-duration: 260ms; }',
		'}',
	].join('\n');
}

/**
 * 找出聊天输入框的「外层卡片」并打标记（宿主类名是哈希，不能用类名锚定）。
 * 从 contenteditable 向上最多 4 层，命中第一个有非透明背景 / 类名像 card 的祖先。
 * 只会新增一个 data 属性，不改结构、不动布局。
 */
function tagInputHosts() {
	try {
		var inputs = document.querySelectorAll('[contenteditable="true"]:not(.cm-content)');
		for (var i = 0; i < inputs.length; i += 1) {
			var element = inputs[i];
			if (element.closest('.aeth-root')) continue;
			var parent = element.parentElement;
			var depth = 0;
			while (parent && depth < 4) {
				var style = null;
				try { style = window.getComputedStyle(parent); } catch (error) { style = null; }
				var bg = style ? String(style.backgroundColor || '') : '';
				var opaque = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
				var cls = String(parent.className || '');
				var looksCard = /card|input-?box|composer|inputbar/i.test(cls);
				if (opaque || looksCard) {
					if (parent.getAttribute('data-aether-input-host') !== '1') {
						parent.setAttribute('data-aether-input-host', '1');
					}
					break;
				}
				parent = parent.parentElement;
				depth += 1;
			}
		}
	} catch (error) { /* ignore */ }
}

function clearInputHosts() {
	try {
		document.querySelectorAll('[data-aether-input-host]').forEach(function (node) {
			node.removeAttribute('data-aether-input-host');
		});
	} catch (error) { /* ignore */ }
}

function ensureStyle() {
	if (A.styleEl && document.head.contains(A.styleEl)) return A.styleEl;
	var style = document.createElement('style');
	style.id = 'dsh-aether-style';
	style.textContent = buildStyleText();
	document.head.appendChild(style);
	A.styleEl = style;
	return style;
}

function removeStyle() {
	if (A.styleEl) {
		try { A.styleEl.remove(); } catch (error) { /* ignore */ }
		A.styleEl = null;
	}
}

function setVar(name, value) {
	try {
		document.documentElement.style.setProperty(name, value);
	} catch (error) { /* ignore */ }
}

function clearVar(name) {
	try {
		document.documentElement.style.removeProperty(name);
	} catch (error) { /* ignore */ }
}

// ── 金丝雀：先健康过一轮才武装 ──────────────────────────────────────────
// 每秒 reconcile 一次，连续 N 次（默认 40 ≈ 10 秒）关键锚点全丢，就判定宿主
// DOM 契约已不在：撤掉自己注入的 CSS 与 DOM，交还官方原生布局，绝不硬撑。
function canaryAnchors() {
	var anchors = {
		root: Boolean(document.getElementById('root')),
		body: Boolean(document.body),
		platform: Boolean(document.querySelector('html[data-platform]')),
	};
	return anchors;
}

function canaryTick() {
	if (A.canary.disabled) return;
	var anchors = canaryAnchors();
	var lost = {
		root: !anchors.root,
		body: !anchors.body,
		platform: !anchors.platform,
	};
	A.canary.lost = lost;
	var allLost = !anchors.root && !anchors.body && !anchors.platform;
	if (allLost) {
		A.canary.strikes += 1;
	} else {
		A.canary.strikes = 0;
	}
	var limit = A.cfg && A.cfg.diag ? (A.cfg.diag.canaryStrikes || 40) : 40;
	if (A.canary.strikes >= limit) safeExit();
	if (A.canary.strikes > 0) pushLog('warn', '金丝雀计数', { strikes: A.canary.strikes, lost: lost });
}

function safeExit() {
	if (A.canary.disabled) return;
	A.canary.disabled = true;
	pushLog('error', '宿主 DOM 契约漂移：撤离注入，交还原生布局', { strikes: A.canary.strikes });
	try { removeStyle(); } catch (error) { /* ignore */ }
	try { removeStage(); } catch (error) { /* ignore */ }
	try {
		document.documentElement.removeAttribute('data-dsh-aether');
		document.documentElement.removeAttribute('data-dsh-aether-pixel');
		clearInputHosts();
	} catch (error) { /* ignore */ }
	notify();
	if (A.canary.timer) {
		try { clearInterval(A.canary.timer); } catch (error) { /* ignore */ }
		A.canary.timer = null;
	}
	reportDiag('safe-exit');
}

function startCanary() {
	if (A.canary.timer) return;
	A.canary.timer = setInterval(canaryTick, 1000);
	if (A.canary.timer && typeof A.canary.timer.unref === 'function') A.canary.timer.unref();
}

// ── 诊断上报 ─────────────────────────────────────────────────────────────
function collectDiag() {
	var anchors = canaryAnchors();
	var tokens = {};
	try {
		var style = window.getComputedStyle(document.body);
		['--dsw-alias-bg-base', '--dsw-alias-label-primary', '--dsw-specific-sidebar-fill', '--aether-accent'].forEach(function (name) {
			tokens[name] = style.getPropertyValue(name).trim();
		});
	} catch (error) { /* ignore */ }
	return {
		version: VERSION,
		at: Date.now(),
		uptimeMs: Date.now() - A.startedAt,
		theme: { dark: isDarkTheme(), reduceMotion: shouldReduceMotion(), platform: (document.documentElement.getAttribute('data-platform') || '') },
		anchors: anchors,
		strikes: A.canary.strikes,
		config: A.cfg ? { mode: A.cfg.wallpaper && A.cfg.wallpaper.mode, modules: A.cfg.modules } : null,
		tokens: tokens,
		host: { ok: A.host.ok, version: A.host.version },
		effects: {
			stage: Boolean(A.stageEl && document.body.contains(A.stageEl)),
			critters: typeof CRITTERS !== 'undefined' ? CRITTERS.built : null,
			whaleParticles: typeof WHALE !== 'undefined' ? WHALE.particles.length : null,
			whaleRunning: typeof WHALE !== 'undefined' ? WHALE.running : null,
			meteorMounted: typeof METEOR !== 'undefined' ? METEOR.running : null,
			meteorCanvas: typeof METEOR !== 'undefined' ? Boolean(METEOR.canvas) : null,
			meteorEnabled: typeof meteorEnabled === 'function' ? meteorEnabled() : null,
			meteorParticles: typeof METEOR !== 'undefined' ? METEOR.particles.length : null,
			meteorSize: typeof METEOR !== 'undefined' && METEOR.canvas ? (METEOR.canvas.width + 'x' + METEOR.canvas.height) : null,
			pressRunning: Boolean(A.pressRunning),
			pressTarget: A.pressDebug || null,
			pressApplied: A.pressApplied || null,
			glow: Boolean(A.cfg && A.cfg.fx && A.cfg.fx.glow !== false),
			fxModule: moduleOn('fx'),
		},
		errors: A.logs.filter(function (entry) { return entry.level === 'error' || entry.level === 'warn'; }).slice(-10),
	};
}

function reportDiag(reason) {
	var payload = collectDiag();
	payload.reason = reason || 'periodic';
	A.lastDiag = payload;
	notify();
	try {
		apiFetch('/api/diag', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
		}).catch(function () { /* Host 不在线就算了，面板里仍能看到本地诊断 */ });
	} catch (error) { /* ignore */ }
	return payload;
}

// ── 订阅（面板/挂件及时刷新） ────────────────────────────────────────────
function subscribe(fn) {
	A.subscribers.push(fn);
	return function () {
		var index = A.subscribers.indexOf(fn);
		if (index !== -1) A.subscribers.splice(index, 1);
	};
}

function notify() {
	A.subscribers.slice().forEach(function (fn) {
		try { fn(); } catch (error) { /* 单个订阅者出错不影响其他 */ }
	});
}

function moduleOn(name) {
	try {
		return Boolean(A.cfg && A.cfg.enabled !== false && A.cfg.modules && A.cfg.modules[name] && A.cfg.modules[name].enabled);
	} catch (error) {
		return false;
	}
}
