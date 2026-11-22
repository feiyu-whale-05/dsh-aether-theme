// dsh-aether-theme — browser client half.
//
// 背景 + 毛玻璃 + 对比度兜底的主题引擎。零布局侵入：不新增/移动/删除宿主的
// DOM 结构，只用「CSS 变量覆盖 + 一个 z-index:-1 的隔离舞台层 + 官方 Slot」。
// 逐字节回滚：任何改动都先落盘备份，面板有「一键恢复默认」。
//
// 代码组织：src/*.js 由 src/build.js 依文件名拼接；模块共享 factory 作用域。
// 所有 visible string 都是 React text child；样式用宿主 --dsw-* token 兜底。
window.__ModuleLoader__.load({
	id: 'dsh-aether-theme',
	factory(require) {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

		var react = require('react');
		if (react && react.default && !react.createElement) react = react.default;
		var h = react.createElement;

		var inject = ['slots', 'locale'];

		// ── 10-locales.js ───────────────────────────────────────────────────
		// ── i18n ────────────────────────────────────────────────────────────────
		// 只放「所有可见字符串」；值可以是函数（用于插值）。语言从 locale 服务读，
		// 读不到时按 navigator.language 兜底，再兜底 zh。

		var I18N = {
			zh: {
				'panel.title': '以太主题',
				'panel.subtitle': '背景 · 毛玻璃 · 对比度兜底',
				'section.appearance': '外观',
				'section.theme': '主题',
				'section.wallpaper': '壁纸',
				'section.glass': '玻璃',
				'section.pixel': '像素',
				'section.modules': '模块',
				'section.pack': '主题包',
				'section.diag': '诊断',
				'title.appearance': '外观',
				'title.wallpaper': '壁纸',
				'title.glass': '玻璃与参数',
				'title.pixel': '像素风',
				'title.modules': '模块开关',
				'title.pack': '主题包导入导出',
				'title.diag': '诊断',
				'action.refresh': '刷新',
				'action.reset': '一键恢复默认',
				'action.resetConfirm': '确定恢复默认？当前配置会先备份到磁盘。',
				'action.resetDone': '已恢复默认（原配置已备份）',
				'action.export': '导出主题包',
				'action.import': '导入主题包',
				'action.apply': '应用',
				'action.upload': '上传壁纸',
				'action.delete': '删除',
				'action.pick': '选用',
				'action.close': '关闭',
				'action.save': '保存',
				'action.rotating': '轮换中',
				'action.stopped': '已停止',
				'state.loading': '加载中…',
				'state.error': '读取失败',
				'state.empty': '还没有内容',
				'state.hostDown': 'Host 接口未就绪',
				'state.hostDownHint': '插件已加载，但面板接口没有挂上。重启 DSH 后重试。',
				'state.disabled': '插件已停用（模块全关或安全退出）',
				'state.saved': '已保存',
				'state.uploading': '上传中…',
				'state.uploadDone': '上传完成',
				'state.uploadFail': '上传失败',
				'label.accent': '主色',
				'label.secondary': '辅助色',
				'label.derive': '从壁纸智能取色',
				'label.contrast': '文字对比度目标',
				'label.mixMode': '混合模式',
				'label.transition': '过渡时长',
				'label.reducedMotion': '减弱动态效果',
				'label.palette': '配色来源',
				'label.mode': '壁纸模式',
				'label.source': '来源',
				'label.fit': '铺满方式',
				'label.dim': '压暗',
				'label.blur': '背景模糊',
				'label.rotation': '自动轮换',
				'label.interval': '轮换间隔（分钟）',
				'label.timeOfDay': '按时间段切换（清晨 / 夜晚）',
				'label.categoryLock': '只在选中的分类里轮换',
				'label.glassBlur': '玻璃模糊（面板）',
				'label.bgBlur': '背景模糊（壁纸）',
				'label.saturation': '饱和度',
				'label.border': '边框强度',
				'label.regions': '区域透明度（6 区独立）',
				'label.inputFill': '输入框填充模式',
				'label.pixelTheme': '像素主题',
				'label.nineSlice': '九宫格（9-slice）边缘',
				'label.crt': 'CRT 扫描线',
				'label.modulesHint': '细粒度模块化：关掉的模块完全不加载、不渲染、不注入。',
				'label.diagHint': '诊断数据来自 Host 与本页探测；可直接导出 diag.json 给客服。',
				'label.version': '版本',
				'label.anchors': '宿主锚点',
				'label.strikes': '金丝雀计数',
				'label.logs': '日志',
				'label.packHint': '主题包是一个 JSON 文件，包含外观参数与引用关系，便于分享和迁移。',
				'label.usage': '用量',
				'label.balance': '余额',
				'label.today': '今日已用',
				'label.turn': '本轮消耗',
				'label.pet': '桌宠',
				'label.boot': '开屏动画',
				'label.widget': '余额挂件',
				'label.category.all': '全部',
				'label.category.nature': '自然',
				'label.category.city': '城市',
				'label.category.space': '星空',
				'label.category.minimal': '极简',
				'label.category.retro': '复古',
				'label.category.custom': '我的上传',
				'mode.none': '无',
				'mode.css': '纯 CSS 动态',
				'mode.image': '图片',
				'mode.video': '视频',
				'input.solid': '实色',
				'input.frosted': '磨砂',
				'input.transparent': '透明',
				'input.tinted': '淡色染',
				'input.bordered': '描边',
				'input.accent': '主色淡染',
				'nav.settings': '以太主题',
				'settings.intro': '在这里统一管理背景、玻璃、对比度与模块。所有改动即时生效，并持久化到本机。',
				'settings.openPanel': '打开左侧面板',
				'diag.copy': '复制诊断 JSON',
				'diag.copied': '已复制',
				'diag.canaryOk': '锚点正常',
				'diag.canaryLost': '锚点丢失',
				'safe.exited': '宿主 DOM 契约漂移，已撤掉注入并交还原生布局',
				'safe.mode': '安全模式',
				'wallpaper.none': '未选壁纸',
				'wallpaper.inUse': '使用中',
				'pet.title': '以太小鲸',
				'boot.title': '以太主题',
				'unit.ms': 'ms',
				'unit.s': '秒',
				'unit.mb': 'MB',
				'unit.min': '分钟',
			},
			en: {
				'panel.title': 'Aether Theme',
				'panel.subtitle': 'Background · Glass · Contrast fallback',
				'section.theme': 'Theme',
				'section.wallpaper': 'Wallpaper',
				'section.glass': 'Glass',
				'section.pixel': 'Pixel',
				'section.modules': 'Modules',
				'section.pack': 'Theme pack',
				'section.diag': 'Diagnostics',
				'title.appearance': 'Appearance',
				'title.wallpaper': 'Wallpaper',
				'title.glass': 'Glass & parameters',
				'title.pixel': 'Pixel style',
				'title.modules': 'Modules',
				'title.pack': 'Theme pack import/export',
				'title.diag': 'Diagnostics',
				'action.refresh': 'Refresh',
				'action.reset': 'Reset to defaults',
				'action.resetConfirm': 'Reset to defaults? The current config is backed up to disk first.',
				'action.resetDone': 'Reset done (previous config backed up)',
				'action.export': 'Export theme pack',
				'action.import': 'Import theme pack',
				'action.apply': 'Apply',
				'action.upload': 'Upload wallpaper',
				'action.delete': 'Delete',
				'action.pick': 'Use',
				'action.close': 'Close',
				'action.save': 'Save',
				'action.rotating': 'Rotating',
				'action.stopped': 'Stopped',
				'state.loading': 'Loading…',
				'state.error': 'Failed',
				'state.empty': 'Nothing here yet',
				'state.hostDown': 'Host API not ready',
				'state.hostDownHint': 'The plugin loaded but its panel API is not mounted. Restart DSH and retry.',
				'state.disabled': 'Plugin idle (all modules off or safe-exited)',
				'state.saved': 'Saved',
				'state.uploading': 'Uploading…',
				'state.uploadDone': 'Uploaded',
				'state.uploadFail': 'Upload failed',
				'label.accent': 'Accent',
				'label.secondary': 'Secondary',
				'label.derive': 'Derive colors from wallpaper',
				'label.contrast': 'Text contrast target',
				'label.mixMode': 'Blend mode',
				'label.transition': 'Transition duration',
				'label.reducedMotion': 'Reduced motion',
				'label.palette': 'Palette source',
				'label.mode': 'Wallpaper mode',
				'label.source': 'Source',
				'label.fit': 'Fit',
				'label.dim': 'Dim',
				'label.blur': 'Background blur',
				'label.rotation': 'Auto rotation',
				'label.interval': 'Interval (minutes)',
				'label.timeOfDay': 'Time-of-day switching (dawn / night)',
				'label.categoryLock': 'Rotate only inside selected categories',
				'label.glassBlur': 'Glass blur (panels)',
				'label.bgBlur': 'Background blur (wallpaper)',
				'label.saturation': 'Saturation',
				'label.border': 'Border strength',
				'label.regions': 'Region opacity (six independent)',
				'label.inputFill': 'Input fill mode',
				'label.pixelTheme': 'Pixel theme',
				'label.nineSlice': '9-slice edges',
				'label.crt': 'CRT scanlines',
				'label.modulesHint': 'Fine-grained modules: a disabled module never loads, renders, or injects.',
				'label.diagHint': 'Diagnostics combine Host data with this page probe; export diag.json for support.',
				'label.version': 'Version',
				'label.anchors': 'Host anchors',
				'label.strikes': 'Canary strikes',
				'label.logs': 'Logs',
				'label.packHint': 'A theme pack is one JSON file with appearance parameters and references.',
				'label.usage': 'Usage',
				'label.balance': 'Balance',
				'label.today': 'Today used',
				'label.turn': 'This turn',
				'label.pet': 'Pet',
				'label.boot': 'Boot splash',
				'label.widget': 'Balance widget',
				'label.category.all': 'All',
				'label.category.nature': 'Nature',
				'label.category.city': 'City',
				'label.category.space': 'Space',
				'label.category.minimal': 'Minimal',
				'label.category.retro': 'Retro',
				'label.category.custom': 'My uploads',
				'mode.none': 'None',
				'mode.css': 'Pure CSS motion',
				'mode.image': 'Image',
				'mode.video': 'Video',
				'input.solid': 'Solid',
				'input.frosted': 'Frosted',
				'input.transparent': 'Transparent',
				'input.tinted': 'Tinted',
				'input.bordered': 'Bordered',
				'input.accent': 'Accent tint',
				'nav.settings': 'Aether Theme',
				'settings.intro': 'Manage background, glass, contrast, and modules here. Changes apply instantly and persist locally.',
				'settings.openPanel': 'Open side panel',
				'diag.copy': 'Copy diagnostics JSON',
				'diag.copied': 'Copied',
				'diag.canaryOk': 'Anchors OK',
				'diag.canaryLost': 'Anchor lost',
				'safe.exited': 'Host DOM contract drifted; injection removed, native layout restored',
				'safe.mode': 'Safe mode',
				'wallpaper.none': 'No wallpaper',
				'wallpaper.inUse': 'In use',
				'pet.title': 'Aether Whale',
				'boot.title': 'Aether Theme',
				'unit.ms': 'ms',
				'unit.s': 's',
				'unit.mb': 'MB',
				'unit.min': 'min',
			},
		};

		var currentLangValue = 'zh';

		function setLangFromService(ctx) {
			try {
				var locale = ctx.get ? ctx.get('locale') : undefined;
				if (locale) {
					var value = typeof locale.language === 'string' ? locale.language
						: typeof locale.current === 'string' ? locale.current
							: typeof locale.locale === 'string' ? locale.locale : '';
					if (value) { currentLangValue = String(value).toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en'; return; }
				}
			} catch (error) { /* 缺 locale 服务不是错误 */ }
			try {
				var nav = typeof navigator !== 'undefined' ? String(navigator.language || '').toLowerCase() : '';
				currentLangValue = nav.indexOf('zh') === 0 ? 'zh' : 'en';
			} catch (error) { /* ignore */ }
		}

		function t(key) {
			var table = I18N[currentLangValue] || I18N.zh;
			var fallback = I18N.zh[key];
			var value = table[key];
			if (value === undefined) value = fallback === undefined ? key : fallback;
			if (typeof value === 'function') return value.apply(null, Array.prototype.slice.call(arguments, 1));
			return value;
		}

		// ── 20-core.js ──────────────────────────────────────────────────────
		// ── core：状态、颜色算法、CSS 注入、API、金丝雀 ──────────────────────────
		// 关键设计：所有视觉改动都收敛到「CSS 变量 + 一个隔离舞台层」两件事。
		// 不改宿主 DOM 结构、不移动节点、不覆盖内联样式，因此任何一步失败都能
		// 通过 removeStyle()/removeStage() 瞬间回到原生外观。

		var PANEL_ID = 'aether-theme';
		var STORAGE_KEY = 'dsh-aether:prefs:v1';
		var VERSION = '1.0.17';

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

		function loadState() {
			return ensureToken().then(function () {
				return apiFetch('/api/state');
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
				// 已经迁移过就不再动用户配置（防止把用户手动调的值又改回去）
				if (cfg.migrations.indexOf('v2-defaults') !== -1) return cfg;
				cfg.migrations.push('v2-defaults');
				if (!cfg.glass) { saveConfig('migrate-marker'); return cfg; }
				var dirty = true;
				if (cfg.glass.backgroundBlur === 8) { cfg.glass.backgroundBlur = 0; dirty = true; }
				if (cfg.glass.glassBlur === 18) { cfg.glass.glassBlur = 0; dirty = true; }
				// 壁纸压暗遮罩：旧默认 0.32 视为「没调过」，归零（去灰罩）
				if (cfg.wallpaper && cfg.wallpaper.dim === 0.32) { cfg.wallpaper.dim = 0; dirty = true; }
				// 对话主区透明化：旧默认 0.52 视为「没调过」，归零（去灰色遮罩）
				if (cfg.glass && cfg.glass.regions && cfg.glass.regions.base === 0.52) { cfg.glass.regions.base = 0; dirty = true; }
				// 顶栏/侧栏/输入框统一底色：旧默认值一次性对齐到 0.55
				if (cfg.glass && cfg.glass.regions) {
					if (cfg.glass.regions.sidebar === 0.44) { cfg.glass.regions.sidebar = 0.55; dirty = true; }
					if (cfg.glass.regions.layers === 0.5) { cfg.glass.regions.layers = 0.55; dirty = true; }
					if (cfg.glass.regions.input === 0.58) { cfg.glass.regions.input = 0.55; dirty = true; }
				}
				if (cfg.glass && cfg.glass.inputFillOpacity === 0.6) { cfg.glass.inputFillOpacity = 0.55; dirty = true; }
				if (dirty) saveConfig('migrate-blur');
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
				meteor: { enabled: false, density: 1, hue: 222 },
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
					chromeOpacity: 0.55, chromeBlur: 0,
				},
				pixel: { theme: 'cabin', nineSlice: 12, crt: false, scanline: 0.08 },
				widget: { position: 'bottom-right', showBalance: true, showToday: true, showTurn: true, warnBelow: 5 },
				fx: { density: 60, fishCount: 4 },
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
				'html[data-dsh-aether] [role="dialog"],',
				'html[data-dsh-aether] [role="menu"] {',
				'  backdrop-filter: blur(var(--aether-glass-blur, 0px)) saturate(var(--aether-saturation, 1.15));',
				'}',
				// 外壳统一：顶栏 / 侧栏 / 输入框卡片共用同一套「暗度 + 磨砂」
				// 默认磨砂 0（纯半透明），调高时三处一起变磨砂。
				'html[data-dsh-aether] [data-global-panel],',
				'html[data-dsh-aether] [data-rightbar-col],',
				'html[data-dsh-aether] [class*="sidebarCol"],',
				'html[data-dsh-aether] [class*="sidebar"],',
				'html[data-dsh-aether] [class*="Sidebar"],',
				'html[data-dsh-aether] [data-aether-input-host] {',
				'  backdrop-filter: blur(var(--aether-chrome-blur, 0px)) !important;',
				'}',
				// 输入框卡片底色与侧栏/顶栏用同一个变量（宿主卡片自带 #14161B99，统一覆盖）
				'html[data-dsh-aether] [data-aether-input-host] {',
				'  background-color: var(--aether-chrome-fill) !important;',
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
				'html[data-dsh-aether] .aeth-root[data-aeth-surface="panel"] { zoom: var(--aether-panel-scale, 1.15); }',
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

		// ── 30-theme.js ─────────────────────────────────────────────────────
		// ── theme：配置 → CSS 变量的唯一投影点 ──────────────────────────────────
		// 所有视觉改动都在这里算完，然后一次性写进 html 上的 --aether-* 变量；
		// 页面里只有一套静态 CSS 规则读这些变量，所以「改配置」= 改几十个变量值，
		// 不重排、不重建节点，切换是连续的（防闪烁）。

		var CSS_WALLPAPERS = {
			aurora: { label: '极光', category: 'nature', avg: '#16233a' },
			mesh: { label: '网格', category: 'minimal', avg: '#111627' },
			ocean: { label: '深海', category: 'nature', avg: '#0a2233' },
			ember: { label: '余烬', category: 'retro', avg: '#1b1014' },
			sakura: { label: '樱雾', category: 'nature', avg: '#efeaf1' },
			stars: { label: '星空', category: 'space', avg: '#070b18' },
			paper: { label: '纸纹', category: 'minimal', avg: '#f3efe6' },
		};

		var WALLPAPER_CATEGORIES = ['nature', 'city', 'space', 'minimal', 'retro', 'custom'];

		var PIXEL_PALETTES = {
			cabin: {
				label: '像素·木屋',
				panel: '#2b1d12',
				panel2: '#3a2718',
				sidebar: '#241810',
				ink: '#f3dfb8',
				inkSoft: '#d9bd8c',
				accent: '#e8b45a',
				border: '#c9a06a',
				border2: '#8a6a42',
				frame: "#2b1d12",
			},
			parchment: {
				label: '像素·羊皮纸',
				panel: '#efe3c8',
				panel2: '#e5d5b2',
				sidebar: '#e9dcbd',
				ink: '#3a2a14',
				inkSoft: '#6b5433',
				accent: '#a86b2d',
				border: '#8a6a42',
				border2: '#b9a17a',
				frame: '#efe3c8',
			},
			warm: {
				label: '像素·暖阳',
				panel: '#f6d9a8',
				panel2: '#f0c98c',
				sidebar: '#f2cf98',
				ink: '#4a2c10',
				inkSoft: '#7a5228',
				accent: '#d2691e',
				border: '#c28a3f',
				border2: '#e0b877',
				frame: '#f6d9a8',
			},
			terminal: {
				label: '像素·终端绿',
				panel: '#0a140c',
				panel2: '#0f1d11',
				sidebar: '#08110a',
				ink: '#9dffb0',
				inkSoft: '#5fd177',
				accent: '#3dff7a',
				border: '#1f4a2a',
				border2: '#2f6b3d',
				frame: '#0a140c',
			},
		};

		/** 给定底色与目标对比度，反解出「刚好达标」的文字色（保留层级感）。 */
		function solveShade(bgInput, target, tone) {
			var bg = asColor(bgInput);
			// 留 3% 余量：面板半透明叠在不同壁纸上，有效色会比估算略亮/略暗
			var wanted = (target || 7) * 1.03;
			var lightInk = { r: 255, g: 255, b: 255, a: 1 };
			var darkInk = { r: 0, g: 0, b: 0, a: 1 };
			var useLight = luminance(bg) < 0.5;
			var ink = useLight ? lightInk : darkInk;
			var other = useLight ? darkInk : lightInk;
			// 如果黑/白主方向都到不了目标，退到对比更强的那个
			if (contrastRatio(bg, ink) < wanted) ink = other;
			// 二分：从满对比向背景色方向推，找最大可读的「柔和度」
			var lo = 0;
			var hi = 1;
			for (var i = 0; i < 12; i += 1) {
				var mid = (lo + hi) / 2;
				var candidate = mixColor(ink, bg, mid * (tone === 'tertiary' ? 0.62 : tone === 'secondary' ? 0.4 : 0.24));
				if (contrastRatio(bg, candidate) >= wanted) lo = mid;
				else hi = mid;
			}
			return toHex(mixColor(ink, bg, lo * (tone === 'tertiary' ? 0.62 : tone === 'secondary' ? 0.4 : 0.24)));
		}

		function panelBase() {
			var dark = isDarkTheme();
			return dark
				? { r: 20, g: 22, b: 27, a: 1 }
				: { r: 255, g: 255, b: 255, a: 1 };
		}

		function wallpaperAvgColor() {
			var mode = A.cfg && A.cfg.wallpaper ? A.cfg.wallpaper.mode : 'none';
			if (mode === 'image' || mode === 'video') {
				if (A.derived && A.derived.avg) return A.derived.avg;
				return { r: 18, g: 22, b: 32, a: 1 };
			}
			if (mode === 'css') {
				var preset = CSS_WALLPAPERS[A.cfg.wallpaper.cssPreset];
				return parseColor(preset ? preset.avg : '#111627');
			}
			// none：跟随宿主深浅
			return isDarkTheme() ? { r: 16, g: 18, b: 23, a: 1 } : { r: 244, g: 245, b: 247, a: 1 };
		}

		function accentFromWallpaper() {
			if (!A.cfg || !A.cfg.theme || !A.cfg.theme.deriveFromWallpaper) return null;
			if (A.derived && A.derived.dominant) return toHex(A.derived.dominant);
			var mode = A.cfg.wallpaper ? A.cfg.wallpaper.mode : 'none';
			if (mode === 'css') {
				var preset = CSS_WALLPAPERS[A.cfg.wallpaper.cssPreset];
				if (preset) return preset.avg;
			}
			return null;
		}

		/** 输入框的「有效底色」：半透明输入框叠在壁纸上，用于光标/文字可读性反解。 */
		function inputEffectiveColor(panel, wallpaperColor, alpha) {
			var fillList = A.cfg && A.cfg.glass ? (Array.isArray(A.cfg.glass.inputFills) ? A.cfg.glass.inputFills : ['frosted']) : ['frosted'];
			var fill = fillList.indexOf('transparent') !== -1 || fillList.indexOf('bordered') !== -1 ? 'transparent' : 'frosted';
			var localAlpha = fill === 'transparent' || fill === 'bordered' ? 0.06 : Math.max(clamp(alpha, 0, 1), 0.5);
			return composite({ r: panel.r, g: panel.g, b: panel.b, a: localAlpha }, wallpaperColor);
		}

		/** 输入框底色 + 边框组合（可多选叠加：磨砂底 + 渐变边框 + 描边…）。 */
		function inputFillColor(modeInput, panel, accent, ink) {
			var opacity = A.cfg && A.cfg.glass ? clamp(A.cfg.glass.inputFillOpacity, 0, 1) : 0.6;
			var list = Array.isArray(modeInput) ? modeInput : [modeInput || 'frosted'];
			var fillKinds = ['solid', 'frosted', 'transparent', 'tinted', 'accent', 'bordered'];
			var mode = 'frosted';
			for (var i = 0; i < list.length; i += 1) {
				if (fillKinds.indexOf(list[i]) !== -1) { mode = list[i]; break; }
			}
			if (list.indexOf('wenxin') !== -1) {
				// 渐变边框由 CSS 的 border-box 层负责；底色仍按选中的填充类走
				var inner = inputFillColor(mode, panel, accent, ink);
				return { bg: inner.bg === 'rgba(0,0,0,0)' ? rgba(panel, 0.55) : inner.bg, border: 'transparent' };
			}
			switch (mode) {
				case 'solid':
					return { bg: toHex(panel), border: rgba(ink, 0.14) };
				case 'transparent':
					return { bg: 'rgba(0,0,0,0)', border: rgba(ink, 0.22) };
				case 'tinted':
					return { bg: rgba(panel, Math.min(0.35, opacity)), border: rgba(ink, 0.12) };
				case 'bordered':
					return { bg: 'rgba(0,0,0,0)', border: rgba(ink, 0.38) };
				case 'accent':
					return { bg: rgba(parseColor(accent), 0.16), border: rgba(parseColor(accent), 0.46) };

				case 'frosted':
				default:
					return { bg: rgba(panel, opacity), border: rgba(ink, 0.16) };
			}
		}

		/** 像素 9-slice 边框：内联 SVG data URI（零图片文件随包分发）。 */
		function pixelFrameUri(palette, slicePx) {
			var size = 9;
			var svg = [
				'<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" shape-rendering="crispEdges">',
				'<rect width="' + size + '" height="' + size + '" fill="' + palette.frame + '"/>',
				'<rect width="' + size + '" height="1" fill="' + palette.border + '"/>',
				'<rect y="' + (size - 1) + '" width="' + size + '" height="1" fill="' + palette.border2 + '"/>',
				'<rect width="1" height="' + size + '" fill="' + palette.border + '"/>',
				'<rect x="' + (size - 1) + '" width="1" height="' + size + '" fill="' + palette.border2 + '"/>',
				'<rect x="1" y="1" width="' + (size - 2) + '" height="' + (size - 2) + '" fill="' + palette.panel + '"/>',
				'<rect x="1" y="1" width="' + (size - 2) + '" height="1" fill="' + palette.panel2 + '" opacity=".55"/>',
				'<rect x="1" y="' + (size - 2) + '" width="' + (size - 2) + '" height="1" fill="' + palette.panel2 + '" opacity=".4"/>',
				'</svg>',
			].join('');
			return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg) + '")';
		}

		/**
		 * 主投影：把配置写进 CSS 变量。
		 * @param {string} reason - 变更来源（启动 / 保存 / 重置 / 主题跟随）
		 */
		function applyAppearance(reason) {
			if (!A.cfg) return;
			if (A.canary.disabled) return;
			if (A.cfg.enabled === false) {
				removeStyle();
				removeStage();
				try {
					document.documentElement.removeAttribute('data-dsh-aether');
					document.documentElement.removeAttribute('data-dsh-aether-pixel');
				} catch (error) { /* ignore */ }
				notify();
				return;
			}
			ensureStyle();
			startCanary();
			try {
				document.documentElement.setAttribute('data-dsh-aether', 'on');
				document.documentElement.setAttribute('data-dsh-aether-platform', String(document.documentElement.getAttribute('data-platform') || ''));
			} catch (error) { /* ignore */ }

			var dark = isDarkTheme();
			A.flags.dark = dark;
			var panel = panelBase();
			var wallpaperAvg = wallpaperAvgColor();
			var target = clamp(A.cfg.theme.contrastTarget, 3, 21);
			var glass = A.cfg.glass || {};
			var regions = Object.assign({ base: 0.52, sidebar: 0.44, layers: 0.5, menu: 0.74, input: 0.58, bubble: 0.5 }, glass.regions || {});

			// 主色：壁纸智能衍生优先，其次手动
			var derivedAccent = accentFromWallpaper();
			var accentHex = derivedAccent || (A.cfg.theme.accent || '#7aa2ff');
			var palette = derivePalette(accentHex);
			var secondary = A.cfg.theme.secondary || palette.secondary;

			// 有效底色 = 面板色按 alpha 叠在壁纸均色上 → 用来反解文字色
			var baseEffective = composite({ r: panel.r, g: panel.g, b: panel.b, a: clamp(regions.base, 0, 1) }, wallpaperAvg);
			var inkDecision = solveForeground(baseEffective, target, dark ? undefined : 'dark');
			var ink = inkDecision.color;
			// 对比度兜底：主区先保证；主区达不了标就把它往不透明推
			var baseAlpha = clamp(regions.base, 0, 1);
			if (!inkDecision.ok) {
				baseAlpha = ensureContrast(panel, baseAlpha, wallpaperAvg, ink, target);
				baseEffective = composite({ r: panel.r, g: panel.g, b: panel.b, a: baseAlpha }, wallpaperAvg);
			}

			// 区域：每个区域各自检查对比度，不够就提高该区域不透明度
			function regionAlpha(key) {
				var alpha = clamp(regions[key], 0, 1);
				var effective = composite({ r: panel.r, g: panel.g, b: panel.b, a: alpha }, wallpaperAvg);
				if (contrastRatio(effective, ink) < target) {
					alpha = ensureContrast(panel, alpha, wallpaperAvg, ink, target);
				}
				return alpha;
			}

			var alphaBase = baseAlpha;
			var alphaSidebar = regionAlpha('sidebar');
			// 外壳统一：侧栏暗度直接跟 chromeOpacity（6 区里的 sidebar 滑杆仍可微调 alphaSidebar 变量）

			var alphaLayers = regionAlpha('layers');
			var alphaMenu = Math.max(regionAlpha('menu'), 0.5);
			var alphaInput = regionAlpha('input');
			var alphaBubble = regionAlpha('bubble');

			// 文字：一等/二等/三等色都在对应底色上反解，保证 ≥ target
			var baseSurface = composite({ r: panel.r, g: panel.g, b: panel.b, a: alphaBase }, wallpaperAvg);
			var stackedSurface = composite({ r: panel.r, g: panel.g, b: panel.b, a: Math.max(alphaBase, 0.6) }, wallpaperAvg);
			var labelPrimary = finalInk(solveShade(toHex(baseSurface), target, 'primary'), baseSurface);
			var labelSecondary = finalInk(solveShade(toHex(baseSurface), target, 'secondary'), baseSurface);
			var labelTertiary = finalInk(solveShade(toHex(stackedSurface), target, 'tertiary'), stackedSurface);
			var labelCaption = finalInk(solveShade(toHex(stackedSurface), Math.max(4.5, target - 2.5), 'tertiary'), stackedSurface);

			// 代码块：底色刻意不透明一些，避免语法高亮的标点被浅色壁纸吃掉
			var codeAlpha = Math.max(regionAlpha('layers'), 0.82);
			var codeBg = rgba(panel, codeAlpha);
			var codeEffective = composite({ r: panel.r, g: panel.g, b: panel.b, a: codeAlpha }, wallpaperAvg);
			var codeFg = solveShade(toHex(codeEffective), 7, 'primary');

			// 边框：跟文字色同源，透明度由 border 参数控制
			var borderStrength = clamp(glass.border === undefined ? 0.14 : glass.border, 0.02, 0.6);
			var border1 = rgba(ink, borderStrength * 0.5);
			var border2 = rgba(ink, borderStrength);
			var border3 = rgba(ink, borderStrength * 1.6);
			var border4 = rgba(ink, borderStrength * 2.2);

			var inputFills = Array.isArray(glass.inputFills) ? glass.inputFills : ['frosted'];
			var input = inputFillColor(inputFills, panel, accentHex, ink);

			// 官方品牌蓝：深色主题用 deepseek-400（#7aa2ff，DSH 原生「亮蓝」），浅色用 deepseek-500。
			// 光标 / 侧栏工作区选中图标 / 审批允许按钮 / 链接 / 焦点环 固定用它，不跟壁纸取色，
			// 保证永远是官方那抹蓝。文字色按 contrast 反解（亮蓝底给深字）。
			var brandBlue = dark ? '#7aa2ff' : '#4176e6';
			var brandBlueHover = dark ? '#9ab8ff' : '#2f5fcc';
			var brandBlueInk = inkOn(brandBlue, 4.5);
			var caretColor = brandBlue;
			var sidebarSurface = composite({ r: panel.r, g: panel.g, b: panel.b, a: alphaSidebar }, wallpaperAvg);
			var accentReadable = readableOn(accentHex, sidebarSurface, 4.5);
			var accentInk = inkOn(accentHex, 4.5);

			var chromeOpacity = clamp(glass.chromeOpacity === undefined ? 0.55 : glass.chromeOpacity, 0, 1);
			var chromeBlur = clamp(glass.chromeBlur === undefined ? 0 : glass.chromeBlur, 0, 24);

			var vars = {
				'--aether-accent': palette.accent,
				'--aether-chrome-fill': rgba(panel, chromeOpacity),
				'--aether-chrome-blur': chromeBlur + 'px',
				'--aether-accent-readable': accentReadable,
				'--aether-accent-ink': accentInk,
				'--aether-brand-blue': brandBlue,
				'--aether-brand-blue-hover': brandBlueHover,
				'--aether-brand-blue-ink': brandBlueInk,
				'--aether-caret': caretColor,
				'--aether-accent-soft': palette.accentSoft,
				'--aether-accent-strong': palette.accentStrong,
				'--aether-secondary': secondary,
				'--aether-tertiary': palette.tertiary,
				'--aether-bg-base': rgba(panel, alphaBase),
				'--aether-bg-layer-1': rgba(panel, alphaLayers),
				'--aether-bg-layer-2': rgba(shiftColor(panel, dark ? 0.035 : -0.03), alphaLayers),
				'--aether-bg-layer-3': rgba(shiftColor(panel, dark ? 0.06 : -0.05), Math.min(1, alphaLayers + 0.06)),
				'--aether-bg-overlay': rgba(panel, Math.max(alphaMenu, 0.82)),
				'--aether-bg-module': rgba(panel, alphaLayers),
				'--aether-sidebar-fill': rgba(panel, alphaSidebar),
				'--aether-menu-fill': rgba(panel, Math.max(alphaMenu, 0.88)),
				'--aether-input-fill': input.bg,
				'--aether-bubble-fill': rgba(parseColor(secondary), Math.min(0.7, alphaBubble)),
				'--aether-bubble-highlight': rgba(parseColor(secondary), Math.min(0.85, alphaBubble + 0.12)),
				'--aether-code-bg': codeBg,
				'--aether-code-banner': rgba(shiftColor(panel, dark ? -0.05 : 0.02), Math.min(1, codeAlpha + 0.05)),
				'--aether-inline-code': rgba(shiftColor(panel, dark ? 0.06 : -0.04), aliasCode(alphaLayers)),
				'--aether-code-fg': codeFg,
				'--aether-label-primary': labelPrimary,
				'--aether-label-secondary': labelSecondary,
				'--aether-label-tertiary': labelTertiary,
				'--aether-label-caption': labelCaption,
				'--aether-label-dimmed': rgba(parseColor(labelSecondary), 0.55),
				'--aether-border-l1': border1,
				'--aether-border-l2': border2,
				'--aether-border-l3': border3,
				'--aether-border-l4': border4,
				'--aether-glass-blur': clamp(glass.glassBlur === undefined ? 0 : glass.glassBlur, 0, 64) + 'px',
				'--aether-bg-blur': clamp(glass.backgroundBlur === undefined ? 0 : glass.backgroundBlur, 0, 64) + 'px',
				'--aether-saturation': String(clamp(glass.saturation === undefined ? 1.15 : glass.saturation, 0.2, 2.5)),
				'--aether-transition': clamp(A.cfg.theme.transitionMs, 0, 2000) + 'ms',
				'--aether-veil': 'rgba(0,0,0,' + clamp(A.cfg.wallpaper.dim === undefined ? 0 : A.cfg.wallpaper.dim, 0, 1) + ')',
				'--aether-wall-brightness': String(clamp(A.cfg.wallpaper.brightness === undefined ? 0.85 : A.cfg.wallpaper.brightness, 0.3, 1.4)),
				'--aether-scanline': String(clamp(A.cfg.pixel.scanline === undefined ? 0.08 : A.cfg.pixel.scanline, 0, 0.4)),
			};
			Object.keys(vars).forEach(function (name) { setVar(name, vars[name]); });
			// ── 文心式输入框 / 字体字号 / 加粗色 / 气泡 / 面板缩放 ─────────────
			try {
				var inputInner = toHex(composite({ r: panel.r, g: panel.g, b: panel.b, a: 0.9 }, wallpaperAvg));
				setVar('--aether-input-inner', inputInner);
				setVar('--aether-wenxin-a', dark ? '#3d7dfe' : '#2f6bff');
				setVar('--aether-wenxin-b', dark ? '#6a59fe' : '#5b48f0');
				setVar('--aether-wenxin-c', dark ? '#9142ff' : '#7b2ee0');
				if (moduleOn('inputGlow')) {
					document.documentElement.setAttribute('data-aether-input', 'wenxin');
				} else {
					document.documentElement.removeAttribute('data-aether-input');
				}
			} catch (error) { /* ignore */ }

			try {
				// 用户气泡：默认官方，只有显式关掉 official 才接管
				var bubble = A.cfg.bubble || { official: true, color: '#dbe7ff' };
				if (bubble.official === false) {
					document.documentElement.setAttribute('data-aether-bubble', 'custom');
					var bubbleColor = parseColor(bubble.color || '#dbe7ff');
					setVar('--aether-bubble-fill', rgba(bubbleColor, clamp(bubble.opacity === undefined ? 0.62 : bubble.opacity, 0.1, 1)));
					setVar('--aether-bubble-highlight', rgba(shiftColor(bubbleColor, 0.15), 0.8));
				} else {
					document.documentElement.removeAttribute('data-aether-bubble');
				}
			} catch (error) { /* ignore */ }

			try {
				// 加粗（**重点**）：亮黄偏白
				var strong = (A.cfg.theme && A.cfg.theme.strongColor) || '#ffe6a3';
				setVar('--aether-strong', strong);
				// 面板缩放
				var scale = A.cfg.panel && A.cfg.panel.scale ? clamp(A.cfg.panel.scale, 0.8, 1.6) : 1.15;
				setVar('--aether-panel-scale', String(scale));
				// 字体与字号：走官方 theme-presenter 的 CSS 变量（写在 body 上）
				var themeCfg = A.cfg.theme || {};
				if (themeCfg.fontSize) {
					document.body.style.setProperty('--dsh-content-font-size', clamp(themeCfg.fontSize, 11, 24) + 'px');
				}
				if (themeCfg.fontFamily) {
					document.body.style.setProperty('--dsh-font-family-text', '"' + String(themeCfg.fontFamily).replace(/"/g, '') + '", system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif');
				} else {
					document.body.style.removeProperty('--dsh-font-family-text');
				}
			} catch (error) { /* ignore */ }

			setVar('--aether-input-border', input.border);
			setVar('--aether-input-focus', rgba(parseColor(accentHex), 0.6));

			// 像素风
			try {
				if (moduleOn('pixel') && A.cfg.pixel && A.cfg.pixel.theme) {
					var pixelPalette = PIXEL_PALETTES[A.cfg.pixel.theme] || PIXEL_PALETTES.cabin;
					document.documentElement.setAttribute('data-dsh-aether-pixel', 'on');
					setVar('--aether-pixel-frame', pixelFrameUri(pixelPalette, A.cfg.pixel.nineSlice));
					setVar('--aether-pixel-slice', clamp(A.cfg.pixel.nineSlice || 12, 4, 40) + 'px');
					setVar('--aether-accent', pixelPalette.accent);
					setVar('--aether-accent-soft', pixelPalette.inkSoft);
					setVar('--aether-accent-strong', pixelPalette.accent);
					setVar('--aether-accent-readable', pixelPalette.accent);
					setVar('--aether-accent-ink', inkOn(pixelPalette.accent, 4.5));
					setVar('--aether-brand-blue', pixelPalette.accent);
					setVar('--aether-brand-blue-hover', pixelPalette.inkSoft);
					setVar('--aether-brand-blue-ink', inkOn(pixelPalette.accent, 4.5));
					setVar('--aether-caret', pixelPalette.ink);
					setVar('--aether-label-primary', pixelPalette.ink);
					setVar('--aether-label-secondary', pixelPalette.inkSoft);
					setVar('--aether-label-tertiary', pixelPalette.inkSoft);
					setVar('--aether-label-caption', pixelPalette.inkSoft);
					setVar('--aether-bg-base', pixelPalette.panel);
					setVar('--aether-bg-layer-1', pixelPalette.panel);
					setVar('--aether-bg-layer-2', pixelPalette.panel2);
					setVar('--aether-bg-layer-3', pixelPalette.panel2);
					setVar('--aether-bg-overlay', pixelPalette.panel);
					setVar('--aether-sidebar-fill', pixelPalette.sidebar);
					setVar('--aether-menu-fill', pixelPalette.panel);
					setVar('--aether-border-l2', pixelPalette.border);
					setVar('--aether-border-l3', pixelPalette.border2);
					setVar('--aether-code-bg', pixelPalette.sidebar);
					setVar('--aether-code-fg', pixelPalette.ink);
					setVar('--aether-glass-blur', '0px');
					setVar('--aether-bg-blur', '0px');
					setVar('--aether-transition', '0ms');
				} else {
					document.documentElement.removeAttribute('data-dsh-aether-pixel');
				}
				// CRT 扫描线
				if (moduleOn('pixel') && A.cfg.pixel && A.cfg.pixel.crt) {
					if (!A.scanEl) {
						A.scanEl = document.createElement('div');
						A.scanEl.id = 'dsh-aether-scan';
						A.scanEl.setAttribute('aria-hidden', 'true');
						document.body.appendChild(A.scanEl);
					}
				} else if (A.scanEl) {
					try { A.scanEl.remove(); } catch (error) { /* ignore */ }
					A.scanEl = null;
				}
			} catch (error) {
				pushLog('warn', '像素主题应用失败', { message: String(error && error.message) });
			}

			// 混合模式：给正文区域一个 blend 变量（默认 normal；multiply 用于浅壁纸 + 深字）
			setVar('--aether-content-blend', A.cfg.theme.mixMode === 'normal' ? 'normal' : (A.cfg.theme.mixMode || 'normal'));

			// 玻璃模块关闭时把两个模糊都归零
			if (!moduleOn('glass')) {
				setVar('--aether-glass-blur', '0px');
				setVar('--aether-bg-blur', '0px');
			}

			try { syncFx(); } catch (error) { /* ignore */ }

			pushLog('info', '外观已应用', {
				reason: reason,
				dark: dark,
				accent: accentHex,
				derived: Boolean(derivedAccent),
				regions: { base: round3(alphaBase), sidebar: round3(alphaSidebar), layers: round3(alphaLayers), menu: round3(alphaMenu) },
				contrastOk: inkDecision.ok,
			});
			notify();
		}

		function aliasCode(alpha) {
			return clamp(alpha, 0, 1);
		}

		function round3(value) {
			return Math.round(clamp(value, 0, 1) * 1000) / 1000;
		}

		/** 壁纸采样（图片）→ 更新衍生色；CSS/视频走已知平均值。 */
		function refreshDerivedFromWallpaper() {
			var config = A.cfg.wallpaper || {};
			if (config.mode !== 'image') {
				A.derived = null;
				return Promise.resolve(null);
			}
			var url = wallpaperUrlFor(config);
			if (!url) {
				A.derived = null;
				return Promise.resolve(null);
			}
			return sampleImage(url).then(function (sample) {
				if (sample) {
					A.derived = { avg: sample.avg, dominant: sample.dominant, brightness: sample.brightness };
					pushLog('info', '壁纸取色完成', { brightness: Number(sample.brightness.toFixed(3)), dominant: toHex(sample.dominant) });
				}
				return sample;
			});
		}

		function wallpaperUrlFor(config) {
			if (!config) return '';
			if (config.mode === 'image') {
				if (config.source === 'file' && config.id) {
					return A.apiBase + '/api/wallpaper?id=' + encodeURIComponent(config.id) + (A.token ? '&token=' + encodeURIComponent(A.token) : '');
				}
				return config.presetUrl || '';
			}
			return '';
		}

		// ── 40-wallpaper.js ─────────────────────────────────────────────────
		// ── wallpaper：背景层（图片 / 视频 / 纯 CSS 动态） ──────────────────────
		// 防闪烁：双缓冲——旧层先保持、新层从 opacity:0 淡入，过渡结束才移除旧层；
		// 视频用原生流式硬解（muted + playsinline + preload=metadata），200MB 文件
		// 不进内存、不阻塞主线程。

		function clearWallpaperLayers() {
			A.layerEls.forEach(function (layer) {
				try { layer.remove(); } catch (error) { /* ignore */ }
			});
			A.layerEls = [];
			A.currentWallKey = '';
			if (A.rotationTimer) {
				try { clearInterval(A.rotationTimer); } catch (error) { /* ignore */ }
				A.rotationTimer = null;
			}
		}

		function currentWallpaperKey() {
			var config = A.cfg && A.cfg.wallpaper;
			if (!config) return '';
			if (config.mode === 'css') return 'css:' + config.cssPreset;
			if (config.mode === 'image') return 'img:' + (config.id || config.presetUrl || '');
			if (config.mode === 'video') return 'vid:' + (config.id || '');
			return '';
		}

		function buildWallLayer(kind, source) {
			var layer = document.createElement('div');
			layer.className = 'aether-wall';
			if (kind === 'css') {
				var css = document.createElement('div');
				css.className = 'aether-css ' + source;
				layer.appendChild(css);
				return layer;
			}
			if (kind === 'video') {
				var video = document.createElement('video');
				video.muted = true;
				video.loop = true;
				video.playsInline = true;
				video.autoplay = true;
				video.preload = 'metadata';
				video.setAttribute('muted', '');
				video.setAttribute('playsinline', '');
				video.src = source;
				video.addEventListener('error', function () {
					pushLog('warn', '视频壁纸加载失败，降级为纯 CSS 背景', { source: String(source).slice(0, 120) });
					try { layer.remove(); } catch (error) { /* ignore */ }
					A.currentWallKey = '';
					var preset = A.cfg && A.cfg.wallpaper ? A.cfg.wallpaper.cssPreset : 'aurora';
					swapWallLayer('css', preset || 'aurora');
				});
				var playPromise = video.play();
				if (playPromise && typeof playPromise.catch === 'function') {
					playPromise.catch(function () {
						// 自动播放被拦：静音后重试一次
						video.muted = true;
						video.play().catch(function () { /* 留给用户点击/悬停 */ });
					});
				}
				layer.appendChild(video);
				return layer;
			}
			var img = document.createElement('img');
			img.alt = '';
			img.decoding = 'async';
			img.src = source;
			layer.appendChild(img);
			return layer;
		}

		function swapWallLayer(kind, source) {
			var stage = ensureStage();
			var key = kind + ':' + source;
			if (A.currentWallKey === key) return;
			var oldLayers = A.layerEls.slice();
			var layer = buildWallLayer(kind, source);
			stage.appendChild(layer);
			var reduced = shouldReduceMotion();
			if (reduced) {
				layer.style.transition = 'none';
				layer.classList.add('is-on');
				oldLayers.forEach(function (old) { try { old.remove(); } catch (error) { /* ignore */ } });
				A.layerEls = [layer];
				A.currentWallKey = key;
				return;
			}
			// 双缓冲：先挂上（opacity 0），下一帧再淡入
			requestAnimationFrame(function () {
				try { layer.classList.add('is-on'); } catch (error) { /* ignore */ }
			});
			var cleanup = setTimeout(function () {
				oldLayers.forEach(function (old) { try { old.remove(); } catch (error) { /* ignore */ } });
			}, 900);
			// 旧层保持到新层过渡完成（transitionend 是加分项，setTimeout 是兜底）
			layer.addEventListener('transitionend', function handler() {
				layer.removeEventListener('transitionend', handler);
				if (cleanup) clearTimeout(cleanup);
				oldLayers.forEach(function (old) { try { old.remove(); } catch (error) { /* ignore */ } });
			});
			A.layerEls = [layer];
			A.currentWallKey = key;
		}

		function ensureVeil() {
			var stage = ensureStage();
			var veil = stage.querySelector('.aether-veil');
			if (!veil) {
				veil = document.createElement('div');
				veil.className = 'aether-veil';
				stage.appendChild(veil);
			}
			return veil;
		}

		/** 应用壁纸配置（模式/来源/预设/本地库 id）。 */
		function applyWallpaper(reason) {
			if (A.canary.disabled) return;
			var config = A.cfg && A.cfg.wallpaper;
			if (!moduleOn('wallpaper') || !config || config.mode === 'none') {
				clearWallpaperLayers();
				removeStage();
				scheduleRotation();
				return;
			}
			var stage = ensureStage();
			ensureVeil();
			var kind = config.mode === 'css' ? 'css' : config.mode === 'video' ? 'video' : 'image';
			var source = kind === 'css'
				? (config.cssPreset || 'aurora')
				: (config.source === 'file' && config.id
					? A.apiBase + '/api/wallpaper?id=' + encodeURIComponent(config.id) + (A.token ? '&token=' + encodeURIComponent(A.token) : '')
					: (config.presetUrl || ''));
			if (!source) {
				clearWallpaperLayers();
				scheduleRotation();
				return;
			}
			swapWallLayer(kind, source);
			if (A.stageEl) {
				A.stageEl.setAttribute('data-mode', kind);
			}
			// 图片壁纸取色（只对图片；视频取色成本高，用兜底均色）
			refreshDerivedFromWallpaper().then(function () {
				if (A.cfg && A.cfg.theme.deriveFromWallpaper) applyAppearance('wallpaper-derived');
			}).catch(function () { /* 取色失败不影响壁纸 */ });
			scheduleRotation();
			pushLog('info', '壁纸已应用', { reason: reason, kind: kind, source: String(source).slice(0, 100) });
		}

		// ── 轮换：自动 + 时段 + 分类锁定 ────────────────────────────────────────
		function rotationCategories() {
			var rotation = A.cfg.wallpaper.rotation || {};
			var locked = Array.isArray(rotation.categories) ? rotation.categories : [];
			if (locked.length) return locked;
			var hour = new Date().getHours();
			var range = Array.isArray(rotation.timeOfDay) ? rotation.timeOfDay : [6, 18];
			var dayStart = clamp(range[0], 0, 23);
			var dayEnd = clamp(range[1], 0, 23);
			var isDay = dayStart <= dayEnd ? (hour >= dayStart && hour < dayEnd) : (hour >= dayStart || hour < dayEnd);
			// 时段模式：白天偏自然/城市，夜晚偏星空/极简
			return isDay ? ['nature', 'city', 'minimal'] : ['space', 'retro', 'minimal'];
		}

		function pickNextWallpaper() {
			var categories = rotationCategories();
			var pool = (A.host.wallpapers || []).filter(function (item) {
				return categories.indexOf(item.category) !== -1 || (item.category === 'custom' && categories.indexOf('custom') !== -1);
			});
			if (pool.length) {
				var pick = pool[Math.floor(Math.random() * pool.length)];
				var kind = pick.kind === 'video' ? 'video' : 'image';
				return { kind: kind, source: pick.url + (A.token ? '&token=' + encodeURIComponent(A.token) : ''), id: pick.id };
			}
			// 没有本地库就轮换内置 CSS 预设
			var cssPool = Object.keys(CSS_WALLPAPERS).filter(function (name) {
				return categories.indexOf(CSS_WALLPAPERS[name].category) !== -1;
			});
			if (!cssPool.length) cssPool = Object.keys(CSS_WALLPAPERS);
			var chosen = cssPool[Math.floor(Math.random() * cssPool.length)];
			return { kind: 'css', source: chosen, id: null };
		}

		function scheduleRotation() {
			if (A.rotationTimer) {
				try { clearInterval(A.rotationTimer); } catch (error) { /* ignore */ }
				A.rotationTimer = null;
			}
			var config = A.cfg && A.cfg.wallpaper;
			if (!config || !config.rotation || !moduleOn('wallpaper')) return;
			if (config.mode === 'none') return;
			var minutes = clamp(config.rotation.intervalMin || 30, 1, 24 * 60);
			A.rotationTimer = setInterval(function () {
				var next = pickNextWallpaper();
				if (!next) return;
				A.cfg.wallpaper.mode = next.kind === 'css' ? 'css' : next.kind;
				if (next.kind === 'css') {
					A.cfg.wallpaper.cssPreset = next.source;
				} else {
					A.cfg.wallpaper.source = 'file';
					A.cfg.wallpaper.id = next.id;
				}
				applyWallpaper('rotation');
				saveConfig('rotation').catch(function () { /* 轮换保存失败不致命 */ });
			}, minutes * 60 * 1000);
			if (A.rotationTimer && typeof A.rotationTimer.unref === 'function') A.rotationTimer.unref();
		}

		// ── 上传（流式） ────────────────────────────────────────────────────────
		function uploadWallpaper(file, category) {
			if (!file) return Promise.reject(new Error('no file'));
			var query = '?name=' + encodeURIComponent(file.name || 'wallpaper.png') + '&category=' + encodeURIComponent(category || 'custom');
			var headers = {};
			if (A.token) headers['x-dsh-aether-token'] = A.token;
			return fetch(A.apiBase + '/api/upload' + query, {
				method: 'POST',
				headers: headers,
				body: file,
			}).then(function (response) {
				if (!response.ok) throw new Error('HTTP ' + response.status);
				return response.json();
			}).then(function (payload) {
				if (!payload || payload.ok !== true) throw new Error((payload && payload.error) || 'upload failed');
				A.host.wallpapers = (A.host.wallpapers || []).concat([payload.item]);
				notify();
				return payload.item;
			});
		}

		function removeWallpaper(id) {
			var headers = {};
			if (A.token) headers['x-dsh-aether-token'] = A.token;
			return fetch(A.apiBase + '/api/wallpaper?id=' + encodeURIComponent(id), {
				method: 'DELETE',
				headers: headers,
			}).then(function (response) { return response.json(); }).then(function (payload) {
				if (payload && payload.ok) {
					A.host.wallpapers = (A.host.wallpapers || []).filter(function (item) { return item.id !== id; });
					if (A.cfg.wallpaper.id === id) {
						A.cfg.wallpaper.mode = 'css';
						A.cfg.wallpaper.id = '';
						applyWallpaper('deleted');
					}
					notify();
				}
				return payload;
			});
		}

		// ── 50-overlays.js ──────────────────────────────────────────────────
		// ── overlays：桌宠 / 余额挂件 / 开屏 / 诊断浮层 ──────────────────────────
		// 全部通过官方 shell.overlay 槽位挂载（宿主自己决定层叠上下文），因此不需要
		// 往 body 里塞节点、也不影响宿主布局。四个模块各自可关。

		function useAetherTick() {
			var state = react.useState(0);
			var set = state[1];
			react.useEffect(function () {
				return subscribe(function () { set(function (value) { return value + 1; }); });
			}, []);
			return state[0];
		}

		function parseUsage(raw) {
			try {
				var file = raw && raw['.dshw-usage.json'];
				if (!file || typeof file !== 'object') return null;
				var events = Array.isArray(file.events) ? file.events : [];
				var last = events.length ? events[events.length - 1] : null;
				return {
					currency: 'CNY',
					balance: Number.isFinite(Number(file.lastBalance)) ? Number(file.lastBalance) : null,
					today: Number.isFinite(Number(file.todayUsage)) ? Number(file.todayUsage) : null,
					dayStart: Number.isFinite(Number(file.dayStart)) ? Number(file.dayStart) : null,
					lastTurn: last && Number.isFinite(Number(last.cost)) ? { cost: Number(last.cost), tokens: Number(last.tokens) || 0, model: last.model || '' } : null,
				};
			} catch (error) {
				return null;
			}
		}

		function fmtMoney(value) {
			if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
			return '¥' + Number(value).toFixed(2);
		}

		function fmtTokens(value) {
			var n = Number(value) || 0;
			if (n >= 100000000) return (n / 100000000).toFixed(2) + '亿';
			if (n >= 10000) return (n / 10000).toFixed(1) + '万';
			return String(n);
		}

		// ── 余额挂件：数据来自 Host 读取的本机用量文件 ──────────────────────────
		function BalanceWidget() {
			useAetherTick();
			var openState = react.useState(false);
			var open = openState[0];
			var setOpen = openState[1];
			var usage = parseUsage(A.host.usage);
			if (!moduleOn('widget') || A.canary.disabled || !usage) return null;
			var warn = A.cfg.widget && usage.balance !== null ? usage.balance < (A.cfg.widget.warnBelow || 5) : false;
			var parts = [];
			if (A.cfg.widget.showBalance !== false) parts.push(h('span', { key: 'b', className: warn ? 'aeth-warn' : '' }, h('b', null, fmtMoney(usage.balance))));
			if (A.cfg.widget.showToday !== false) parts.push(h('span', { key: 't' }, t('label.today') + ' ' + fmtMoney(usage.today)));
			if (A.cfg.widget.showTurn !== false && usage.lastTurn) parts.push(h('span', { key: 'u' }, t('label.turn') + ' ' + fmtMoney(usage.lastTurn.cost)));
			return h('div', {
				className: 'aeth-widget',
				style: { right: '20px', bottom: '20px' },
				onClick: function () { setOpen(!open); },
				title: usage.lastTurn ? usage.lastTurn.model + ' · ' + fmtTokens(usage.lastTurn.tokens) + ' tokens' : '',
				role: 'button',
				tabIndex: 0,
				onKeyDown: function (event) { if (event.key === 'Enter' || event.key === ' ') setOpen(!open); },
			},
				parts,
				open && usage.lastTurn
					? h('span', { style: { opacity: '.75' } }, usage.lastTurn.model + ' · ' + fmtTokens(usage.lastTurn.tokens))
					: null,
			);
		}

		// ── 开屏动画：纯 CSS，播完自动卸载 ─────────────────────────────────────
		function BootSplash() {
			var state = react.useState(true);
			var visible = state[0];
			var setVisible = state[1];
			var config = A.cfg && A.cfg.boot ? A.cfg.boot : { durationMs: 2200 };
			react.useEffect(function () {
				if (!moduleOn('boot')) { setVisible(false); return undefined; }
				if (config.skipOnReducedMotion !== false && shouldReduceMotion()) { setVisible(false); return undefined; }
				var duration = clamp(config.durationMs || 2200, 400, 8000);
				var timer = setTimeout(function () { setVisible(false); }, duration + 120);
				return function () { clearTimeout(timer); };
			}, []);
			if (!visible || !moduleOn('boot') || A.canary.disabled) return null;
			var duration = clamp(config.durationMs || 2200, 400, 8000);
			return h('div', {
				className: 'aeth-boot',
				style: { '--aether-boot-dur': duration + 'ms' },
				'aria-hidden': 'true',
			},
				h('div', { style: { display: 'grid', justifyItems: 'center' } },
					h('div', { className: 'aeth-boot-mark' }),
					h('div', { className: 'aeth-boot-text' }, t('boot.title')),
				),
			);
		}

		// ── 诊断浮层：屏幕内直接看锚点/金丝雀，不用开 DevTools ─────────────────
		function DiagOverlay() {
			useAetherTick();
			var dismissed = react.useState(false);
			var closed = dismissed[0];
			var setClosed = dismissed[1];
			if (!moduleOn('diag') || !A.cfg.diag || !A.cfg.diag.showOverlay || closed || A.canary.disabled) return null;
			var anchors = canaryAnchors();
			var ok = anchors.root && anchors.body && anchors.platform;
			return h('div', { className: 'aeth-diag-overlay' },
				h('div', { className: 'aeth-diag-head' },
					h('span', null, t('title.diag') + ' · v' + VERSION),
					h('button', {
						className: 'aeth-btn',
						onClick: function () { setClosed(true); },
						'aria-label': t('action.close'),
					}, '×'),
				),
				h('div', { className: ok ? 'aeth-ok' : 'aeth-bad' }, ok ? t('diag.canaryOk') : t('diag.canaryLost')),
				h('div', { className: 'aeth-kv' },
					h('b', null, '#root'), h('span', null, String(anchors.root)),
					h('b', null, 'data-platform'), h('span', null, String(anchors.platform)),
					h('b', null, t('label.strikes')), h('span', null, String(A.canary.strikes)),
					h('b', null, 'dark'), h('span', null, String(isDarkTheme())),
				),
			);
		}

		// ── 55-meteor.js ────────────────────────────────────────────────────
		// ── meteor：鼠标流星尾缀（canvas 粒子，零图片） ────────────────────────
		// 尊重 prefers-reduced-motion：减弱动效时整个模块不启动（连 canvas 都不建）。
		// 配置：A.cfg.meteor = { enabled, density, hue }

		function MeteorCursor() {
			useAetherTick();
			var canvasState = react.useState(null);
			var canvas = canvasState[0];
			var setCanvas = canvasState[1];
			var enabled = Boolean(A.cfg && A.cfg.meteor && A.cfg.meteor.enabled) && moduleOn('theme') && !A.canary.disabled;

			react.useEffect(function () {
				if (!enabled) {
					if (canvas && canvas.parentNode) {
						try { canvas.parentNode.removeChild(canvas); } catch (error) { /* ignore */ }
					}
					return undefined;
				}
				if (shouldReduceMotion()) return undefined;
				var element = document.createElement('canvas');
				element.id = 'dsh-aether-meteor';
				element.setAttribute('aria-hidden', 'true');
				document.body.appendChild(element);
				setCanvas(element);
				return function () {
					try { element.remove(); } catch (error) { /* ignore */ }
					setCanvas(null);
				};
			}, [enabled]);

			react.useEffect(function () {
				if (!canvas || !enabled) return undefined;
				var context = canvas.getContext('2d');
				if (!context) return undefined;
				var dpr = Math.min(2, window.devicePixelRatio || 1);
				var particles = [];
				var frame = null;
				var last = { x: -1, y: -1, t: 0 };
				var density = clamp((A.cfg.meteor && A.cfg.meteor.density) || 1, 0.2, 3);
				var hueBase = clamp((A.cfg.meteor && A.cfg.meteor.hue) || 222, 0, 360);

				function resize() {
					canvas.width = Math.round(window.innerWidth * dpr);
					canvas.height = Math.round(window.innerHeight * dpr);
					canvas.style.width = '100%';
					canvas.style.height = '100%';
					context.setTransform(dpr, 0, 0, dpr, 0, 0);
				}
				resize();
				window.addEventListener('resize', resize);

				function spawn(x, y, dx, dy) {
					var speed = Math.min(48, Math.sqrt(dx * dx + dy * dy));
					var count = Math.max(1, Math.round((0.6 + speed / 10) * density));
					for (var i = 0; i < count; i += 1) {
						particles.push({
							x: x + (Math.random() - 0.5) * 6,
							y: y + (Math.random() - 0.5) * 6,
							vx: -dx * 0.045 + (Math.random() - 0.5) * 1.4,
							vy: -dy * 0.045 + (Math.random() - 0.5) * 1.4 - 0.35,
							life: 1,
							decay: 0.012 + Math.random() * 0.02,
							size: 0.9 + Math.random() * 2.2,
							hue: hueBase + (Math.random() * 70 - 20),
						});
					}
					if (particles.length > 260) particles.splice(0, particles.length - 260);
				}

				function onMove(event) {
					var now = performance.now();
					var x = event.clientX;
					var y = event.clientY;
					var dt = now - last.t;
					if (last.x >= 0 && dt < 40) {
						spawn(x, y, x - last.x, y - last.y);
					}
					last = { x: x, y: y, t: now };
				}

				function tick() {
					context.clearRect(0, 0, window.innerWidth, window.innerHeight);
					context.globalCompositeOperation = 'lighter';
					for (var i = particles.length - 1; i >= 0; i -= 1) {
						var p = particles[i];
						p.x += p.vx;
						p.y += p.vy;
						p.vx *= 0.97;
						p.vy = p.vy * 0.97 + 0.012;
						p.life -= p.decay;
						if (p.life <= 0) {
							particles.splice(i, 1);
							continue;
						}
						var alpha = Math.max(0, p.life) * 0.85;
						var gradient = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
						gradient.addColorStop(0, 'hsla(' + p.hue + ', 100%, 78%, ' + alpha + ')');
						gradient.addColorStop(0.45, 'hsla(' + (p.hue + 18) + ', 100%, 66%, ' + (alpha * 0.55) + ')');
						gradient.addColorStop(1, 'hsla(' + (p.hue + 30) + ', 100%, 60%, 0)');
						context.fillStyle = gradient;
						context.beginPath();
						context.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
						context.fill();
					}
					context.globalCompositeOperation = 'source-over';
					frame = requestAnimationFrame(tick);
				}

				window.addEventListener('mousemove', onMove, { passive: true });
				frame = requestAnimationFrame(tick);
				return function () {
					window.removeEventListener('mousemove', onMove);
					window.removeEventListener('resize', resize);
					if (frame !== null) cancelAnimationFrame(frame);
					particles = [];
				};
			}, [canvas, enabled]);

			return null;
		}

		// ── 56-particles.js ─────────────────────────────────────────────────
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

		// ── 60-panel.js ─────────────────────────────────────────────────────
		// ── panel：左侧边栏面板 —— 全功能控制台 ─────────────────────────────────
		// 分区：外观 / 壁纸 / 玻璃 / 像素 / 模块 / 主题包 / 诊断。
		// 所有改动即时生效（applyAppearance），并以 600ms 防抖落盘（Host 原子写+备份）。

		var PANEL_TABS = ['appearance', 'wallpaper', 'glass', 'pixel', 'modules', 'pack', 'diag'];

		function row(label, control, extra) {
			return h('div', { className: 'aeth-row' },
				h('label', null, label),
				h('div', { className: 'aeth-grow' }, control),
				extra || null,
			);
		}

		function sliderRow(label, value, min, max, step, onChange, suffix) {
			return row(label,
				h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
					h('input', {
						className: 'aeth-range',
						type: 'range',
						min: min,
						max: max,
						step: step,
						value: value,
						onChange: function (event) { onChange(Number(event.target.value)); },
						style: { flex: '1 1 auto' },
					}),
					h('span', { className: 'aeth-note', style: { minWidth: '52px', textAlign: 'right' } }, String(value) + (suffix || '')),
				),
			);
		}

		function toggleRow(label, value, onChange) {
			return row(label,
				h('button', {
					className: 'aeth-btn' + (value ? ' primary' : ''),
					onClick: function () { onChange(!value); },
					'aria-pressed': value ? 'true' : 'false',
				}, value ? '开' : '关'),
			);
		}

		function chipsRow(label, options, value, onChange) {
			return row(label,
				h('div', { className: 'aeth-chips' },
					options.map(function (option) {
						return h('button', {
							key: option.value,
							className: 'aeth-chip' + (value === option.value ? ' on' : ''),
							onClick: function () { onChange(option.value); },
						}, option.label);
					}),
				),
			);
		}

		function selectRow(label, options, value, onChange) {
			return row(label,
				h('select', {
					className: 'aeth-select',
					value: value,
					onChange: function (event) { onChange(event.target.value); },
				}, options.map(function (option) {
					return h('option', { key: option.value, value: option.value }, option.label);
				})),
			);
		}

		function AetherPanel() {
			var tick = useAetherTick();
			var tabState = react.useState('appearance');
			var tab = tabState[0];
			var setTab = tabState[1];
			var statusState = react.useState('');
			var status = statusState[0];
			var setStatus = statusState[1];
			var saveTimer = react.useRef(null);
			var importRef = react.useRef(null);
			var uploadRef = react.useRef(null);
			var uploadCategoryState = react.useState('custom');
			var uploadCategory = uploadCategoryState[0];
			var setUploadCategory = uploadCategoryState[1];

			var cfg = A.cfg;
			var hostOk = A.host.ok;

			function mutate(mutator, options) {
				if (!A.cfg) return;
				mutator(A.cfg);
				applyAppearance('panel');
				if (!options || options.wallpaper !== false) {
					try { applyWallpaper('panel'); } catch (error) { /* 无壁纸模块时忽略 */ }
				}
				if (saveTimer.current) clearTimeout(saveTimer.current);
				saveTimer.current = setTimeout(function () {
					saveConfig('panel').then(function () {
						setStatus(t('state.saved'));
						setTimeout(function () { setStatus(''); }, 1200);
					}).catch(function () { setStatus(t('state.error')); });
				}, 600);
			}

			function doReset() {
				if (!window.confirm(t('action.resetConfirm'))) return;
				resetConfig().then(function () {
					setStatus(t('action.resetDone'));
				}).catch(function () { setStatus(t('state.error')); });
			}

			function exportPack() {
				try {
					var pack = {
						schema: 'dsh-aether-theme-pack',
						version: 1,
						exportedAt: new Date().toISOString(),
						appearance: A.cfg,
					};
					var blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
					var url = URL.createObjectURL(blob);
					var link = document.createElement('a');
					link.href = url;
					link.download = 'aether-theme-pack.json';
					document.body.appendChild(link);
					link.click();
					setTimeout(function () {
						try { link.remove(); URL.revokeObjectURL(url); } catch (error) { /* ignore */ }
					}, 400);
					setStatus(t('action.export'));
				} catch (error) {
					setStatus(t('state.error'));
				}
			}

			function importPack(file) {
				if (!file) return;
				var reader = new FileReader();
				reader.onload = function () {
					try {
						var parsed = JSON.parse(String(reader.result));
						var appearance = parsed && parsed.appearance ? parsed.appearance : parsed;
						A.cfg = mergeConfig(appearance, A.defaults || defaultConfigFallback());
						applyAppearance('import');
						applyWallpaper('import');
						saveConfig('import').then(function () { setStatus(t('state.saved')); });
					} catch (error) {
						setStatus(t('state.error'));
					}
				};
				reader.readAsText(file, 'utf-8');
			}

			function upload(file) {
				if (!file) return;
				setStatus(t('state.uploading'));
				uploadWallpaper(file, uploadCategory).then(function (item) {
					A.cfg.wallpaper.mode = item.kind === 'video' ? 'video' : 'image';
					A.cfg.wallpaper.source = 'file';
					A.cfg.wallpaper.id = item.id;
					applyWallpaper('upload');
					saveConfig('upload').catch(function () { /* ignore */ });
					setStatus(t('state.uploadDone'));
				}).catch(function () {
					setStatus(t('state.uploadFail'));
				});
			}

			function exportDiag() {
				try {
					apiFetch('/api/diag.json').then(function (text) {
						var blob = new Blob([typeof text === 'string' ? text : JSON.stringify(text, null, 2)], { type: 'application/json' });
						var url = URL.createObjectURL(blob);
						var link = document.createElement('a');
						link.href = url;
						link.download = 'diag.json';
						document.body.appendChild(link);
						link.click();
						setTimeout(function () { try { link.remove(); URL.revokeObjectURL(url); } catch (error) { /* ignore */ } }, 400);
					}).catch(function () {
						var payload = reportDiag('manual-export');
						var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
						var url = URL.createObjectURL(blob);
						var link = document.createElement('a');
						link.href = url;
						link.download = 'diag.json';
						document.body.appendChild(link);
						link.click();
					});
				} catch (error) { /* ignore */ }
			}

			if (!cfg) {
				return h('div', { className: 'aeth-root', 'data-aeth-surface': 'panel' },
					h('div', { className: 'aeth-head' }, h('div', { className: 'aeth-title' }, t('panel.title'))),
					h('div', { className: 'aeth-card' }, hostOk ? t('state.loading') : t('state.hostDown')),
				);
			}

			return h('div', { className: 'aeth-root', 'data-aeth-surface': 'panel' },
				h('div', { className: 'aeth-head' },
					h('div', { className: 'aeth-title' }, t('panel.title')),
					h('div', { className: 'aeth-sub' }, t('panel.subtitle') + ' · v' + VERSION + (A.canary.disabled ? ' · ' + t('safe.mode') : '')),
					A.lastSavedAt
						? h('div', { className: 'aeth-note', style: { marginLeft: '10px' }, title: '配置已落盘到 Host 的 config.json（每次写前备份）' },
							(A.lastSavedOk === false ? '⚠ 保存失败 ' : '✓ 已保存 ') + new Date(A.lastSavedAt).toLocaleTimeString())
						: null,
					h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '6px' } },
						h('button', { className: 'aeth-btn', onClick: function () { loadState().then(function () { applyAppearance('refresh'); applyWallpaper('refresh'); }).catch(function () { setStatus(t('state.error')); }); } }, t('action.refresh')),
						h('button', { className: 'aeth-btn danger', onClick: doReset }, t('action.reset')),
					),
				),
				status ? h('div', { className: 'aeth-note', style: { marginBottom: '8px' } }, status) : null,
				A.canary.disabled
					? h('div', { className: 'aeth-card', style: { borderColor: 'var(--dsw-alias-state-error-primary,#e06c75)' } },
						h('div', { className: 'aeth-bad' }, t('safe.exited')),
					)
					: null,
				h('div', { className: 'aeth-tabs' },
					PANEL_TABS.map(function (key) {
						return h('button', {
							key: key,
							className: 'aeth-tab' + (tab === key ? ' on' : ''),
							onClick: function () { setTab(key); },
						}, t('section.' + key));
					}),
				),
				tab === 'appearance' ? AppearanceTab(cfg, mutate) : null,
				tab === 'wallpaper' ? WallpaperTab(cfg, mutate, tick, uploadRef, uploadCategory, setUploadCategory, upload) : null,
				tab === 'glass' ? GlassTab(cfg, mutate) : null,
				tab === 'pixel' ? PixelTab(cfg, mutate) : null,
				tab === 'modules' ? ModulesTab(cfg, mutate) : null,
				tab === 'pack'
					? h('div', { className: 'aeth-card' },
						h('h3', null, t('title.pack')),
						h('div', { className: 'aeth-note', style: { marginBottom: '10px' } }, t('label.packHint')),
						h('div', { className: 'aeth-row' },
							h('button', { className: 'aeth-btn primary', onClick: exportPack }, t('action.export')),
							h('button', { className: 'aeth-btn', onClick: function () { if (importRef.current) importRef.current.click(); } }, t('action.import')),
							h('input', {
								ref: importRef,
								type: 'file',
								accept: 'application/json,.json',
								style: { display: 'none' },
								onChange: function (event) { importPack(event.target.files && event.target.files[0]); event.target.value = ''; },
							}),
						),
					)
					: null,
				tab === 'diag' ? DiagTab(exportDiag) : null,
			);
		}

		function AppearanceTab(cfg, mutate) {
			var theme = cfg.theme;
			return h('div', null,
				h('div', { className: 'aeth-card' },
					h('h3', null, t('title.appearance')),
					h('div', { className: 'aeth-swatches', style: { marginBottom: '10px' } },
						h('span', { className: 'aeth-note' }, t('label.accent')),
						h('input', {
							type: 'color',
							value: theme.accent,
							onChange: function (event) { mutate(function (draft) { draft.theme.accent = event.target.value; }, { wallpaper: false }); },
							style: { width: '40px', height: '28px', border: 'none', background: 'transparent' },
						}),
						h('span', { className: 'aeth-swatch', style: { background: theme.accent } }),
						h('span', { className: 'aeth-swatch', style: { background: derivePalette(theme.accent).accentSoft } }),
						h('span', { className: 'aeth-swatch', style: { background: derivePalette(theme.accent).secondary } }),
						h('span', { className: 'aeth-note' }, theme.deriveFromWallpaper ? '（壁纸取色已接管）' : ''),
					),
					toggleRow(t('label.derive'), theme.deriveFromWallpaper, function (value) {
						mutate(function (draft) { draft.theme.deriveFromWallpaper = value; }, { wallpaper: false });
					}),
					sliderRow(t('label.contrast'), theme.contrastTarget, 3, 21, 0.5, function (value) {
						mutate(function (draft) { draft.theme.contrastTarget = value; }, { wallpaper: false });
					}, ':1'),
					selectRow(t('label.mixMode'), [
						{ value: 'normal', label: 'normal' },
						{ value: 'multiply', label: 'multiply（乘法混合，浅底正文更清晰）' },
						{ value: 'screen', label: 'screen（滤色，暗底更亮）' },
					], theme.mixMode, function (value) {
						mutate(function (draft) { draft.theme.mixMode = value; }, { wallpaper: false });
					}),
					sliderRow(t('label.transition'), theme.transitionMs, 0, 1200, 20, function (value) {
						mutate(function (draft) { draft.theme.transitionMs = value; }, { wallpaper: false });
					}, 'ms'),
					selectRow(t('label.reducedMotion'), [
						{ value: 'auto', label: '跟随系统（auto）' },
						{ value: 'always', label: '始终减弱' },
						{ value: 'never', label: '始终完整动效' },
					], theme.reducedMotion, function (value) {
						mutate(function (draft) { draft.theme.reducedMotion = value; }, { wallpaper: false });
					}),
				),
				AdvancedCards(cfg, mutate),
			);
		}

		var FONT_CHOICES = [
			{ value: '', label: '官方默认' },
			{ value: 'Microsoft YaHei', label: '微软雅黑' },
			{ value: 'PingFang SC', label: '苹方' },
			{ value: 'Noto Sans SC', label: '思源黑体' },
			{ value: 'Source Han Sans SC', label: 'Source Han Sans' },
			{ value: 'Segoe UI', label: 'Segoe UI' },
			{ value: 'SimSun', label: '宋体' },
			{ value: 'KaiTi', label: '楷体' },
		];

		function AdvancedCards(cfg, mutate) {
			var theme = cfg.theme;
			var bubble = cfg.bubble || { official: true, color: '#dbe7ff', opacity: 0.62 };
			var panel = cfg.panel || { scale: 1.15 };
			var meteor = cfg.meteor || { enabled: false, density: 1, hue: 222 };
			var userMd = cfg.userMd || { enabled: true };
			return h('div', null,
				h('div', { className: 'aeth-card' },
					h('h3', null, '字体与字号'),
					selectRow('字体', FONT_CHOICES, theme.fontFamily || '', function (value) {
						mutate(function (draft) { draft.theme.fontFamily = value; }, { wallpaper: false });
					}),
					sliderRow('字号', theme.fontSize || 0, 0, 24, 1, function (value) {
						mutate(function (draft) { draft.theme.fontSize = value === 0 ? 0 : value; }, { wallpaper: false });
					}, theme.fontSize ? 'px' : '（官方）'),
					row('加粗颜色', h('input', {
						type: 'color',
						value: theme.strongColor || '#ffe6a3',
						onChange: function (event) { mutate(function (draft) { draft.theme.strongColor = event.target.value; }, { wallpaper: false }); },
						style: { width: '40px', height: '28px', border: 'none', background: 'transparent' },
					})),
					h('div', { className: 'aeth-chips', style: { marginLeft: '160px' } },
						['#ffe6a3', '#ffd76e', '#fff2b8', '#ffcf5c'].map(function (color) {
							return h('button', {
								key: color,
								className: 'aeth-chip' + ((theme.strongColor || '').toLowerCase() === color ? ' on' : ''),
								onClick: function () { mutate(function (draft) { draft.theme.strongColor = color; }, { wallpaper: false }); },
								style: { background: color, color: '#0b0f16', borderColor: 'transparent' },
							}, color);
						}),
					),
					h('div', { className: 'aeth-note' }, '作用于模型输出的 **加粗重点**（host 的 strong/b）。'),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, '用户气泡'),
					toggleRow('使用官方气泡样式', bubble.official !== false, function (value) {
						mutate(function (draft) { draft.bubble = Object.assign({}, draft.bubble || {}, { official: value }); }, { wallpaper: false });
					}),
					bubble.official === false
						? h('div', null,
							row('气泡颜色', h('input', {
								type: 'color',
								value: bubble.color || '#dbe7ff',
								onChange: function (event) { mutate(function (draft) { draft.bubble = Object.assign({}, draft.bubble || {}, { color: event.target.value }); }, { wallpaper: false }); },
								style: { width: '40px', height: '28px', border: 'none', background: 'transparent' },
							})),
							sliderRow('不透明度', bubble.opacity === undefined ? 0.62 : bubble.opacity, 0.1, 1, 0.02, function (value) {
								mutate(function (draft) { draft.bubble = Object.assign({}, draft.bubble || {}, { opacity: value }); }, { wallpaper: false });
							}),
						)
						: h('div', { className: 'aeth-note' }, '当前跟随宿主原生气泡色。'),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, '交互效果'),
					toggleRow('用户消息 Markdown 自动渲染', userMd.enabled !== false, function (value) {
						mutate(function (draft) { draft.userMd = Object.assign({}, draft.userMd || {}, { enabled: value }); }, { wallpaper: false });
						setTimeout(function () { try { scanUserMarkdown(); } catch (error) { /* ignore */ } }, 80);
					}),
					toggleRow('鼠标流星尾缀', Boolean(meteor.enabled), function (value) {
						mutate(function (draft) { draft.meteor = Object.assign({}, draft.meteor || {}, { enabled: value }); }, { wallpaper: false });
					}),
					toggleRow('粒子与小鱼（背景特效）', moduleOn('fx'), function (value) {
						mutate(function (draft) {
							draft.modules = draft.modules || {};
							draft.modules.fx = Object.assign({}, draft.modules.fx || {}, { enabled: value });
						}, { wallpaper: false });
						setTimeout(function () { try { syncFx(); } catch (error) { /* ignore */ } }, 60);
					}),
					h('div', { className: 'aeth-note', style: { marginBottom: '6px' } }, '粒子密度 / 小鱼数量'),
					sliderRow('粒子密度', (cfg.fx || {}).density === undefined ? 60 : cfg.fx.density, 0, 200, 5, function (value) {
						mutate(function (draft) { draft.fx = Object.assign({}, draft.fx || {}, { density: value }); }, { wallpaper: false });
						setTimeout(function () { try { syncFx(); } catch (error) { /* ignore */ } }, 60);
					}),
					sliderRow('小鱼数量', (cfg.fx || {}).fishCount === undefined ? 4 : cfg.fx.fishCount, 0, 10, 1, function (value) {
						mutate(function (draft) { draft.fx = Object.assign({}, draft.fx || {}, { fishCount: value }); }, { wallpaper: false });
						setTimeout(function () { try { syncFx(); } catch (error) { /* ignore */ } }, 60);
					}),
					meteor.enabled
						? sliderRow('流星密度', meteor.density || 1, 0.2, 3, 0.1, function (value) {
							mutate(function (draft) { draft.meteor = Object.assign({}, draft.meteor || {}, { density: value }); }, { wallpaper: false });
						})
						: null,
					sliderRow('面板内容缩放', panel.scale || 1.15, 0.8, 1.6, 0.05, function (value) {
						mutate(function (draft) { draft.panel = Object.assign({}, draft.panel || {}, { scale: value }); }, { wallpaper: false });
					}, '×'),
				),
			);
		}

		function WallpaperTab(cfg, mutate, tick, uploadRef, uploadCategory, setUploadCategory, upload) {
			var wallpaper = cfg.wallpaper;
			var rotation = wallpaper.rotation || { enabled: false, intervalMin: 30, timeOfDay: [6, 18], categories: [] };
			var files = A.host.wallpapers || [];
			return h('div', null,
				h('div', { className: 'aeth-card' },
					h('h3', null, t('title.wallpaper')),
					chipsRow(t('label.mode'), [
						{ value: 'none', label: t('mode.none') },
						{ value: 'css', label: t('mode.css') },
						{ value: 'image', label: t('mode.image') },
						{ value: 'video', label: t('mode.video') },
					], wallpaper.mode, function (value) {
						mutate(function (draft) { draft.wallpaper.mode = value; }, { wallpaper: true });
					}),
					wallpaper.mode === 'css'
						? h('div', { className: 'aeth-grid', style: { marginTop: '10px' } },
							Object.keys(CSS_WALLPAPERS).map(function (name) {
								var preset = CSS_WALLPAPERS[name];
								return h('div', {
									key: name,
									className: 'aeth-wall' + (wallpaper.cssPreset === name ? ' on' : ''),
									onClick: function () {
										mutate(function (draft) { draft.wallpaper.cssPreset = name; draft.wallpaper.mode = 'css'; }, { wallpaper: true });
									},
									style: { position: 'relative' },
								},
									h('div', { className: 'aether-css ' + name, style: { position: 'absolute', inset: 0 } }),
									h('span', { className: 'aeth-badge' }, preset.label + ' · ' + t('label.category.' + preset.category)),
								);
							}),
						)
						: null,
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, '我的壁纸库（' + files.length + '）'),
					h('div', { className: 'aeth-row' },
						h('select', {
							className: 'aeth-select',
							value: uploadCategory,
							onChange: function (event) { setUploadCategory(event.target.value); },
						}, WALLPAPER_CATEGORIES.map(function (name) {
							return h('option', { key: name, value: name }, t('label.category.' + name));
						})),
						h('button', { className: 'aeth-btn primary', onClick: function () { if (uploadRef.current) uploadRef.current.click(); } }, t('action.upload')),
						h('input', {
							ref: uploadRef,
							type: 'file',
							accept: 'image/*,video/*',
							style: { display: 'none' },
							onChange: function (event) { upload(event.target.files && event.target.files[0]); event.target.value = ''; },
						}),
						h('span', { className: 'aeth-note' }, '图片/视频，流式落盘，单个上限由 Host 配置'),
					),
					files.length
						? h('div', { className: 'aeth-grid', style: { marginTop: '10px' } },
							files.map(function (item) {
								var active = wallpaper.source === 'file' && wallpaper.id === item.id;
								var url = item.url + (A.token ? (item.url.indexOf('?') === -1 ? '?' : '&') + 'token=' + encodeURIComponent(A.token) : '');
								return h('div', { key: item.id, className: 'aeth-wall' + (active ? ' on' : '') },
									item.kind === 'video'
										? h('video', { src: url, muted: true, loop: true, autoPlay: true, playsInline: true, preload: 'metadata' })
										: h('img', { src: url, alt: item.name, loading: 'lazy' }),
									h('span', { className: 'aeth-badge' }, t('label.category.' + (item.category || 'custom'))),
									h('button', {
										className: 'aeth-x',
										title: t('action.delete'),
										onClick: function (event) {
											event.stopPropagation();
											removeWallpaper(item.id).then(function () { notify(); });
										},
									}, '×'),
									h('div', {
										style: { position: 'absolute', inset: 0, cursor: 'pointer' },
										onClick: function () {
											mutate(function (draft) {
												draft.wallpaper.mode = item.kind === 'video' ? 'video' : 'image';
												draft.wallpaper.source = 'file';
												draft.wallpaper.id = item.id;
											}, { wallpaper: true });
										},
									}),
								);
							}),
						)
						: h('div', { className: 'aeth-note' }, t('state.empty')),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, '壁纸亮度与压暗'),
					sliderRow('壁纸亮度（filter，不盖遮罩）', wallpaper.brightness === undefined ? 0.85 : wallpaper.brightness, 0.3, 1.4, 0.05, function (value) {
						mutate(function (draft) { draft.wallpaper.brightness = value; }, { wallpaper: true });
					}),
					sliderRow('压暗遮罩（黑色蒙层，建议留 0）', wallpaper.dim === undefined ? 0 : wallpaper.dim, 0, 1, 0.02, function (value) {
						mutate(function (draft) { draft.wallpaper.dim = value; }, { wallpaper: true });
					}),
					h('div', { className: 'aeth-note' }, '亮度直接调壁纸本身（不影响文字）；压暗是额外的一层黑色遮罩，会把文字一起压暗。'),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, t('label.rotation')),
					toggleRow(t('label.rotation'), rotation.enabled, function (value) {
						mutate(function (draft) { draft.wallpaper.rotation.enabled = value; }, { wallpaper: true });
					}),
					sliderRow(t('label.interval'), rotation.intervalMin, 1, 240, 1, function (value) {
						mutate(function (draft) { draft.wallpaper.rotation.intervalMin = value; }, { wallpaper: true });
					}, 'min'),
					sliderRow('白天区间起点', rotation.timeOfDay[0], 0, 23, 1, function (value) {
						mutate(function (draft) { draft.wallpaper.rotation.timeOfDay[0] = value; }, { wallpaper: true });
					}, '点'),
					sliderRow('白天区间终点', rotation.timeOfDay[1], 0, 23, 1, function (value) {
						mutate(function (draft) { draft.wallpaper.rotation.timeOfDay[1] = value; }, { wallpaper: true });
					}, '点'),
					row(t('label.categoryLock'),
						h('div', { className: 'aeth-chips' },
							WALLPAPER_CATEGORIES.map(function (name) {
								var on = (rotation.categories || []).indexOf(name) !== -1;
								return h('button', {
									key: name,
									className: 'aeth-chip' + (on ? ' on' : ''),
									onClick: function () {
										mutate(function (draft) {
											var list = draft.wallpaper.rotation.categories || [];
											var index = list.indexOf(name);
											if (index === -1) list.push(name); else list.splice(index, 1);
											draft.wallpaper.rotation.categories = list;
										}, { wallpaper: true });
									},
								}, t('label.category.' + name));
							}),
						),
					),
				),
			);
		}

		function GlassTab(cfg, mutate) {
			var glass = cfg.glass;
			var regionKeys = [
				['base', '主背景'],
				['sidebar', '侧栏'],
				['layers', '卡片/层'],
				['menu', '弹窗/菜单'],
				['input', '输入框'],
				['bubble', '消息气泡'],
			];
			return h('div', null,
				h('div', { className: 'aeth-card' },
					h('h3', null, t('title.glass')),
					sliderRow(t('label.glassBlur'), glass.glassBlur, 0, 64, 1, function (value) {
						mutate(function (draft) { draft.glass.glassBlur = value; }, { wallpaper: false });
					}, 'px'),
					sliderRow(t('label.bgBlur'), glass.backgroundBlur, 0, 64, 1, function (value) {
						mutate(function (draft) { draft.glass.backgroundBlur = value; }, { wallpaper: false });
					}, 'px'),
					sliderRow(t('label.saturation'), glass.saturation, 0.2, 2.5, 0.05, function (value) {
						mutate(function (draft) { draft.glass.saturation = value; }, { wallpaper: false });
					}),
					sliderRow(t('label.border'), glass.border, 0.02, 0.5, 0.01, function (value) {
						mutate(function (draft) { draft.glass.border = value; }, { wallpaper: false });
					}),
					sliderRow('外壳暗度（顶栏/侧栏/输入框统一）', glass.chromeOpacity === undefined ? 0.55 : glass.chromeOpacity, 0, 1, 0.01, function (value) {
						mutate(function (draft) { draft.glass.chromeOpacity = value; }, { wallpaper: false });
					}),
					sliderRow('外壳磨砂（顶栏/侧栏/输入框统一）', glass.chromeBlur === undefined ? 0 : glass.chromeBlur, 0, 24, 1, function (value) {
						mutate(function (draft) { draft.glass.chromeBlur = value; }, { wallpaper: false });
					}, 'px'),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, t('label.regions')),
					regionKeys.map(function (pair) {
						var key = pair[0];
						var label = pair[1];
						return sliderRow(label, glass.regions[key], 0, 1, 0.01, function (value) {
							mutate(function (draft) { draft.glass.regions[key] = value; }, { wallpaper: false });
						}, '');
					}),
					h('div', { className: 'aeth-note' }, '毛玻璃（glassBlur）与背景模糊（backgroundBlur）完全解耦；对比度不足时会自动兜底提高不透明度。'),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, t('label.inputFill')),
					row('填充模式（可多选叠加）',
						h('div', { className: 'aeth-chips' },
							[
								['frosted', t('input.frosted') + ' · 底色'],
								['solid', t('input.solid') + ' · 底色'],
								['transparent', t('input.transparent') + ' · 底色'],
								['tinted', t('input.tinted') + ' · 底色'],
								['accent', t('input.accent') + ' · 底色'],
								['bordered', t('input.bordered') + ' · 边框'],
							].map(function (pair) {
								var list = Array.isArray(glass.inputFills) ? glass.inputFills : ['frosted'];
								var on = list.indexOf(pair[0]) !== -1;
								return h('button', {
									key: pair[0],
									className: 'aeth-chip' + (on ? ' on' : ''),
									onClick: function () {
										mutate(function (draft) {
											var next = Array.isArray(draft.glass.inputFills) ? draft.glass.inputFills.slice() : [];
											var index = next.indexOf(pair[0]);
											if (index === -1) next.push(pair[0]); else next.splice(index, 1);
											if (!next.length) next = ['frosted'];
											draft.glass.inputFills = next;
										}, { wallpaper: false });
									},
								}, pair[1]);
							}),
						),
					),
					h('div', { className: 'aeth-note', style: { marginLeft: '160px', marginTop: '-4px' } },
						'底色类只生效优先级最高的一个（实色 > 磨砂 > 透明 > 淡染 > 主色 > 描边）；文心渐变是边框层，可与任意底色叠加。'),
					sliderRow('填充不透明度', glass.inputFillOpacity, 0, 1, 0.01, function (value) {
						mutate(function (draft) { draft.glass.inputFillOpacity = value; }, { wallpaper: false });
					}),
				),
			);
		}

		function PixelTab(cfg, mutate) {
			var pixel = cfg.pixel;
			var preview = PIXEL_PALETTES[pixel.theme] || PIXEL_PALETTES.cabin;
			return h('div', null,
				h('div', { className: 'aeth-card' },
					h('h3', null, t('title.pixel')),
					toggleRow('启用像素风', moduleOn('pixel'), function (value) {
						mutate(function (draft) { draft.modules.pixel.enabled = value; }, { wallpaper: false });
					}),
					chipsRow(t('label.pixelTheme'), Object.keys(PIXEL_PALETTES).map(function (key) {
						return { value: key, label: PIXEL_PALETTES[key].label };
					}), pixel.theme, function (value) {
						mutate(function (draft) { draft.pixel.theme = value; }, { wallpaper: false });
					}),
					sliderRow(t('label.nineSlice'), pixel.nineSlice, 4, 40, 1, function (value) {
						mutate(function (draft) { draft.pixel.nineSlice = value; }, { wallpaper: false });
					}, 'px'),
					toggleRow(t('label.crt'), pixel.crt, function (value) {
						mutate(function (draft) { draft.pixel.crt = value; }, { wallpaper: false });
					}),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, '9-slice 预览'),
					h('div', {
						style: {
							padding: '14px',
							color: preview.ink,
							background: preview.panel,
							borderImage: (function () {
								try { return pixelFrameUri(preview, pixel.nineSlice); } catch (error) { return 'none'; }
							})(),
							borderStyle: 'solid',
							borderWidth: clamp(pixel.nineSlice || 12, 4, 40) + 'px',
							borderImageSlice: 3,
						},
					}, '不同分辨率下四角不变形：边框用 9-slice 贴图，中段拉伸。'),
				),
			);
		}

		function ModulesTab(cfg, mutate) {
			var names = [
				['theme', '主题引擎（对比度/取色）'],
				['wallpaper', t('title.wallpaper')],
				['glass', t('title.glass')],
				['pixel', t('title.pixel')],
				['widget', t('label.widget')],
				['boot', t('label.boot')],
				['diag', t('section.diag')],
				['inputGlow', '渐变边框（输入态）'],
				['fx', '粒子与小鱼'],
			];
			return h('div', { className: 'aeth-card' },
				h('h3', null, t('title.modules')),
				h('div', { className: 'aeth-note', style: { marginBottom: '10px' } }, t('label.modulesHint')),
				names.map(function (pair) {
					var key = pair[0];
					return toggleRow(pair[1], moduleOn(key), function (value) {
						mutate(function (draft) { draft.modules[key].enabled = value; }, { wallpaper: key === 'wallpaper' || key === 'pixel' });
					});
				}),
			);
		}

		function DiagTab(exportDiag) {
			var diag = A.lastDiag || collectDiag();
			var anchors = canaryAnchors();
			var ok = anchors.root && anchors.body && anchors.platform;
			return h('div', null,
				h('div', { className: 'aeth-card' },
					h('h3', null, t('title.diag')),
					h('div', { className: 'aeth-note', style: { marginBottom: '8px' } }, t('label.diagHint')),
					h('div', { className: 'aeth-kv' },
						h('b', null, t('label.version')), h('span', null, VERSION),
						h('b', null, t('label.anchors')), h('span', { className: ok ? 'aeth-ok' : 'aeth-bad' }, ok ? t('diag.canaryOk') : t('diag.canaryLost')),
						h('b', null, t('label.strikes')), h('span', null, String(A.canary.strikes)),
						h('b', null, 'Host'), h('span', { className: A.host.ok ? 'aeth-ok' : 'aeth-bad' }, A.host.ok ? 'ok · v' + A.host.version : t('state.hostDown') + (A.host.error ? '（' + A.host.error + '）' : '')),
						h('b', null, 'dark'), h('span', null, String(isDarkTheme())),
						h('b', null, 'reduced-motion'), h('span', null, String(shouldReduceMotion())),
						h('b', null, '#root'), h('span', null, String(anchors.root)),
						h('b', null, 'data-platform'), h('span', null, String(anchors.platform)),
						h('b', null, '配置文件'), h('span', null, (A.host.diag && A.host.diag.configFile) || '~/.dsh/aether-theme/config.json'),
						h('b', null, '粒子/小鱼'), h('span', { className: (typeof CRITTERS !== 'undefined' && CRITTERS.built > 0) ? 'aeth-ok' : 'aeth-bad' },
							(typeof CRITTERS !== 'undefined' && CRITTERS.built > 0)
								? CRITTERS.built + ' 个节点已注入'
								: (shouldReduceMotion() ? '已被 reduced-motion 静默' : '未注入')),
					),
					h('div', { className: 'aeth-row', style: { marginTop: '10px' } },
						h('button', { className: 'aeth-btn primary', onClick: exportDiag }, '导出 diag.json'),
						h('button', { className: 'aeth-btn', onClick: function () { reportDiag('panel'); } }, '刷新诊断'),
						toggleRow(t('section.diag') + ' 浮层', A.cfg.diag.showOverlay, function (value) {
							A.cfg.diag.showOverlay = value;
							applyAppearance('diag');
							saveConfig('diag').catch(function () { /* ignore */ });
						}),
					),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, t('label.logs')),
					h('div', {
						style: { maxHeight: '180px', overflow: 'auto', fontFamily: 'var(--dsw-font-mono, monospace)', fontSize: '11px', lineHeight: '1.6' },
					},
						(A.logs || []).slice(-40).map(function (entry, index) {
							var detail = entry.meta && (entry.meta.message || entry.meta.slot) ? ' — ' + (entry.meta.slot ? '[' + entry.meta.slot + '] ' : '') + (entry.meta.message || '') : '';
							return h('div', { key: index, className: entry.level === 'error' ? 'aeth-bad' : '' },
								new Date(entry.t).toLocaleTimeString() + ' ' + entry.level + ' ' + entry.message + detail,
							);
						}),
					),
				),
			);
		}

		// ── 70-settings.js ──────────────────────────────────────────────────
		// ── settings：设置页标签页（settings.section） ──────────────────────────
		// 与左侧面板同一份配置与同一套控件；设置页只放高频项 + 入口，细节仍走面板，
		// 避免两处 UI 各自演化出不一致的行为。

		function openSidePanel() {
			try {
				var label = t('panel.title');
				var buttons = document.querySelectorAll('button, a, [role="button"], [role="treeitem"], [data-sidebar-item]');
				for (var i = 0; i < buttons.length; i += 1) {
					var node = buttons[i];
					var text = (node.textContent || '').trim();
					if (text === label || text.indexOf(label) === 0) {
						if (typeof node.click === 'function') {
							node.click();
							return true;
						}
					}
				}
			} catch (error) { /* 找不到就静默 */ }
			return false;
		}

		function AetherSettingsSection() {
			useAetherTick();
			var statusState = react.useState('');
			var status = statusState[0];
			var setStatus = statusState[1];
			var importRef = react.useRef(null);
			var cfg = A.cfg;

			function mutate(mutator) {
				if (!A.cfg) return;
				mutator(A.cfg);
				applyAppearance('settings');
				try { applyWallpaper('settings'); } catch (error) { /* ignore */ }
				saveConfig('settings').then(function () { setStatus(t('state.saved')); setTimeout(function () { setStatus(''); }, 1200); }).catch(function () { setStatus(t('state.error')); });
			}

			if (!cfg) {
				return h('div', { className: 'aeth-root', 'data-aeth-surface': 'settings' },
					h('div', { className: 'aeth-head' }, h('div', { className: 'aeth-title' }, t('nav.settings'))),
					h('div', { className: 'aeth-card' }, A.host.ok ? t('state.loading') : t('state.hostDown')),
				);
			}

			return h('div', { className: 'aeth-root', 'data-aeth-surface': 'settings' },
				h('div', { className: 'aeth-head' },
					h('div', { className: 'aeth-title' }, t('nav.settings')),
					h('div', { className: 'aeth-sub' }, 'v' + VERSION + (status ? ' · ' + status : '')),
					A.lastSavedAt ? h('div', { className: 'aeth-note', style: { marginLeft: '10px' } },
						(A.lastSavedOk === false ? '⚠ 保存失败 ' : '✓ 已保存 ') + new Date(A.lastSavedAt).toLocaleTimeString()) : null,
					h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '6px' } },
						h('button', { className: 'aeth-btn', onClick: function () { openSidePanel(); } }, t('settings.openPanel')),
					),
				),
				h('div', { className: 'aeth-note', style: { marginBottom: '10px' } }, t('settings.intro')),
				A.canary.disabled ? h('div', { className: 'aeth-card aeth-bad' }, t('safe.exited')) : null,
				h('div', { className: 'aeth-card' },
					h('h3', null, '快速开关'),
					toggleRow('启用以太主题', cfg.enabled !== false, function (value) { mutate(function (draft) { draft.enabled = value; }); }),
					chipsRow(t('label.mode'), [
						{ value: 'none', label: t('mode.none') },
						{ value: 'css', label: t('mode.css') },
						{ value: 'image', label: t('mode.image') },
						{ value: 'video', label: t('mode.video') },
					], cfg.wallpaper.mode, function (value) { mutate(function (draft) { draft.wallpaper.mode = value; }); }),
					sliderRow(t('label.contrast'), cfg.theme.contrastTarget, 3, 21, 0.5, function (value) {
						mutate(function (draft) { draft.theme.contrastTarget = value; });
					}, ':1'),
					sliderRow(t('label.bgBlur'), cfg.glass.backgroundBlur, 0, 64, 1, function (value) {
						mutate(function (draft) { draft.glass.backgroundBlur = value; });
					}, 'px'),
					sliderRow(t('label.glassBlur'), cfg.glass.glassBlur, 0, 64, 1, function (value) {
						mutate(function (draft) { draft.glass.glassBlur = value; });
					}, 'px'),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, '字体与内容'),
					selectRow('字体', FONT_CHOICES, cfg.theme.fontFamily || '', function (value) { mutate(function (draft) { draft.theme.fontFamily = value; }); }),
					sliderRow('字号', cfg.theme.fontSize || 0, 0, 24, 1, function (value) { mutate(function (draft) { draft.theme.fontSize = value; }); }, cfg.theme.fontSize ? 'px' : '（官方）'),
					row('加粗颜色', h('input', {
						type: 'color',
						value: cfg.theme.strongColor || '#ffe6a3',
						onChange: function (event) { mutate(function (draft) { draft.theme.strongColor = event.target.value; }); },
						style: { width: '40px', height: '28px', border: 'none', background: 'transparent' },
					})),
					sliderRow('面板内容缩放', (cfg.panel || {}).scale || 1.15, 0.8, 1.6, 0.05, function (value) {
						mutate(function (draft) { draft.panel = Object.assign({}, draft.panel || {}, { scale: value }); });
					}, '×'),
					toggleRow('用户消息 Markdown 渲染', (cfg.userMd || {}).enabled !== false, function (value) {
						mutate(function (draft) { draft.userMd = Object.assign({}, draft.userMd || {}, { enabled: value }); });
					}),
					toggleRow('鼠标流星尾缀', Boolean((cfg.meteor || {}).enabled), function (value) {
						mutate(function (draft) { draft.meteor = Object.assign({}, draft.meteor || {}, { enabled: value }); });
					}),
					toggleRow('使用官方气泡样式', (cfg.bubble || {}).official !== false, function (value) {
						mutate(function (draft) { draft.bubble = Object.assign({}, draft.bubble || {}, { official: value }); });
					}),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, '模块'),
						[['theme', '主题引擎'], ['wallpaper', '壁纸'], ['glass', '玻璃'], ['widget', t('label.widget')], ['boot', t('label.boot')], ['fx', '粒子与小鱼'], ['inputGlow', '渐变边框']].map(function (pair) {
							return toggleRow(pair[1], moduleOn(pair[0]), function (value) {
								mutate(function (draft) { draft.modules[pair[0]].enabled = value; });
							});
						}),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, t('title.pack')),
					h('div', { className: 'aeth-row' },
						h('button', {
							className: 'aeth-btn primary',
							onClick: function () {
								try {
									var pack = { schema: 'dsh-aether-theme-pack', version: 1, exportedAt: new Date().toISOString(), appearance: A.cfg };
									var blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
									var url = URL.createObjectURL(blob);
									var link = document.createElement('a');
									link.href = url;
									link.download = 'aether-theme-pack.json';
									document.body.appendChild(link);
									link.click();
									setTimeout(function () { try { link.remove(); URL.revokeObjectURL(url); } catch (error) { /* ignore */ } }, 400);
								} catch (error) { /* ignore */ }
							},
						}, t('action.export')),
						h('button', { className: 'aeth-btn', onClick: function () { if (importRef.current) importRef.current.click(); } }, t('action.import')),
						h('input', {
							ref: importRef,
							type: 'file',
							accept: 'application/json,.json',
							style: { display: 'none' },
							onChange: function (event) {
								var file = event.target.files && event.target.files[0];
								event.target.value = '';
								if (!file) return;
								var reader = new FileReader();
								reader.onload = function () {
									try {
										var parsed = JSON.parse(String(reader.result));
										A.cfg = mergeConfig(parsed && parsed.appearance ? parsed.appearance : parsed, A.defaults || defaultConfigFallback());
										applyAppearance('import');
										applyWallpaper('import');
										saveConfig('import').then(function () { setStatus(t('state.saved')); });
									} catch (error) { setStatus(t('state.error')); }
								};
								reader.readAsText(file, 'utf-8');
							},
						}),
						h('button', {
							className: 'aeth-btn danger',
							onClick: function () {
								if (!window.confirm(t('action.resetConfirm'))) return;
								resetConfig().then(function () { setStatus(t('action.resetDone')); }).catch(function () { setStatus(t('state.error')); });
							},
						}, t('action.reset')),
					),
				),
				h('div', { className: 'aeth-card' },
					h('h3', null, t('title.diag')),
					h('div', { className: 'aeth-kv' },
						h('b', null, t('label.version')), h('span', null, VERSION),
						h('b', null, 'Host'), h('span', { className: A.host.ok ? 'aeth-ok' : 'aeth-bad' }, A.host.ok ? 'ok' : t('state.hostDown')),
						h('b', null, t('label.strikes')), h('span', null, String(A.canary.strikes)),
					),
				),
			);
		}

		function AetherNavIcon(props) {
			var size = props && props.size ? props.size : 16;
			return h('svg', {
				width: size,
				height: size,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 1.6,
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-hidden': 'true',
				focusable: 'false',
			},
				h('circle', { cx: 12, cy: 12, r: 7.4, strokeDasharray: '29 7', transform: 'rotate(-38 12 12)' }),
				h('path', { d: 'M5 17.4c2-1.8 3.6 1.8 5.6 0s3.6 1.8 5.6 0 2.8 1.4 4 .4' }),
				h('circle', { cx: 18, cy: 6.4, r: 1.5, fill: 'currentColor', stroke: 'none' }),
			);
		}

		function AetherRailIcon(props) {
			var size = props && props.size ? props.size : 18;
			return h('svg', {
				width: size,
				height: size,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 1.6,
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-hidden': 'true',
				focusable: 'false',
			},
				h('circle', { cx: 12, cy: 11, r: 6.4 }),
				h('path', { d: 'M6.4 13.4c1.8-1.6 3.2 1.6 5 0s3.2 1.6 5 0 2.4 1.2 3.4.4' }),
				h('circle', { cx: 15.6, cy: 8.6, r: 1.3, fill: 'currentColor', stroke: 'none' }),
			);
		}

		// ── 80-usermd.js ────────────────────────────────────────────────────
		// ── usermd：用户消息 markdown 自动渲染 ──────────────────────────────────
		// 宿主的用户气泡用 UserTextRun 渲染纯文本（引用 chip 除外），不解析 markdown。
		// 这里做 DOM 后处理：找到 [data-message-bubble]，把含标记的原文渲染成 .aeth-md
		// 并隐藏原文（原文保留，方便回退；原文节点不清空）。
		//
		// 安全：先 HTML 转义再套规则；链接只允许 http(s)/mailto/相对路径；
		// 代码块内容单独转义；不执行任何脚本。

		var USER_MD_PATTERN = /(\*\*|__|~~|`|^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|\[[^\]]+\]\([^)]+\))/m;

		function escapeHtmlText(text) {
			return String(text)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#39;');
		}

		function safeHref(url) {
			var value = String(url || '').trim();
			if (/^(https?:|mailto:|\/|#)/i.test(value)) return value.replace(/"/g, '%22');
			return '#';
		}

		/** 极简 markdown → HTML（够用即可：粗体/斜体/删除线/行内码/代码块/标题/列表/链接/段落）。 */
		function renderUserMarkdown(text) {
			var source = String(text || '').replace(/\r\n/g, '\n');
			if (!source.trim()) return '';
			var slots = [];
			function stash(html) {
				var token = '\u0000SLOT' + slots.length + '\u0000';
				slots.push(html);
				return token;
			}
			// 1) 围栏代码块先摘出来（内部不再解析）
			source = source.replace(/```([A-Za-z0-9_+-]*)\n([\s\S]*?)```/g, function (match, lang, body) {
				return stash('<pre><code data-lang="' + escapeHtmlText(lang) + '">' + escapeHtmlText(body.replace(/\n$/, '')) + '</code></pre>');
			});
			// 2) 转义
			var escaped = escapeHtmlText(source);
			// 3) 行内代码
			escaped = escaped.replace(/`([^`\n]+)`/g, function (match, code) {
				return '<code>' + escapeHtmlText(code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")) + '</code>';
			});
			// 4) 链接
			escaped = escaped.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (match, label, href) {
				return '<a href="' + safeHref(href.replace(/&amp;/g, '&')) + '" target="_blank" rel="noreferrer noopener">' + label + '</a>';
			});
			// 5) 粗体 / 斜体 / 删除线
			escaped = escaped
				.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
				.replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
				.replace(/~~([^~\n]+)~~/g, '<del>$1</del>')
				.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
				.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');
			// 6) 分块：标题 / 列表 / 段落
			var lines = escaped.split('\n');
			var html = [];
			var listType = '';
			function closeList() {
				if (listType) { html.push('</' + listType + '>'); listType = ''; }
			}
			for (var i = 0; i < lines.length; i += 1) {
				var line = lines[i];
				var heading = /^(#{1,6})\s+(.*)$/.exec(line);
				var bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
				var ordered = /^\s*\d+\.\s+(.*)$/.exec(line);
				if (heading) {
					closeList();
					var level = Math.min(6, heading[1].length + 2);
					html.push('<h' + level + '>' + heading[2] + '</h' + level + '>');
				} else if (bullet) {
					if (listType !== 'ul') { closeList(); html.push('<ul>'); listType = 'ul'; }
					html.push('<li>' + bullet[1] + '</li>');
				} else if (ordered) {
					if (listType !== 'ol') { closeList(); html.push('<ol>'); listType = 'ol'; }
					html.push('<li>' + ordered[1] + '</li>');
				} else if (line.trim() === '') {
					closeList();
				} else {
					closeList();
					html.push('<p>' + line + '</p>');
				}
			}
			closeList();
			var output = html.join('');
			// 7) 把摘出来的代码块放回
			output = output.replace(/\u0000SLOT(\d+)\u0000/g, function (match, index) {
				return slots[Number(index)] || '';
			});
			return output;
		}

		var userMdObserver = null;
		var userMdTimer = null;

		function processUserBubble(bubble) {
			try {
				if (!bubble || bubble.dataset.aetherMd === '1') return;
				if (bubble.querySelector('.aeth-md')) { bubble.dataset.aetherMd = '1'; return; }
				var holder = bubble.querySelector('[data-aether-md-source]') || bubble.firstElementChild;
				if (!holder) return;
				var text = holder.textContent || '';
				if (!text.trim() || text.length > 24000) return;
				if (!USER_MD_PATTERN.test(text)) return;
				var html = renderUserMarkdown(text);
				if (!html || html === escapeHtmlText(text)) return;
				var md = document.createElement('div');
				md.className = 'aeth-md';
				md.innerHTML = html;
				holder.style.display = 'none';
				bubble.appendChild(md);
				bubble.dataset.aetherMd = '1';
			} catch (error) {
				pushLog('warn', '用户消息 markdown 渲染失败', { message: String(error && error.message) });
			}
		}

		function scanUserMarkdown() {
			// 聊天区是异步渲染的：每次 DOM 变化顺手补一次输入框卡片标记
			try { tagInputHosts(); } catch (error) { /* ignore */ }
			if (!A.cfg || !A.cfg.userMd || A.cfg.userMd.enabled !== true) {
				// 关掉时把已渲染的还原
				document.querySelectorAll('[data-message-bubble]').forEach(function (bubble) {
					if (bubble.dataset.aetherMd !== '1') return;
					var md = bubble.querySelector('.aeth-md');
					if (md) { try { md.remove(); } catch (error) { /* ignore */ } }
					var holder = bubble.firstElementChild;
					if (holder) holder.style.display = '';
					delete bubble.dataset.aetherMd;
				});
				return;
			}
			if (A.canary.disabled) return;
			var bubbles = document.querySelectorAll('[data-message-bubble]');
			for (var i = 0; i < bubbles.length; i += 1) processUserBubble(bubbles[i]);
		}

		function startUserMarkdown() {
			if (userMdObserver) return;
			try {
				userMdObserver = new MutationObserver(function () {
					if (userMdTimer) return;
					userMdTimer = setTimeout(function () {
						userMdTimer = null;
						scanUserMarkdown();
					}, 220);
				});
				userMdObserver.observe(document.body, { childList: true, subtree: true });
			} catch (error) {
				pushLog('warn', '用户 markdown observer 启动失败', { message: String(error && error.message) });
			}
			scanUserMarkdown();
		}

		function stopUserMarkdown() {
			if (userMdObserver) {
				try { userMdObserver.disconnect(); } catch (error) { /* ignore */ }
				userMdObserver = null;
			}
			if (userMdTimer) { clearTimeout(userMdTimer); userMdTimer = null; }
		}

		// ── 90-apply.js ─────────────────────────────────────────────────────
		// ── apply：客户端插件入口 ───────────────────────────────────────────────
		// 顺序：读令牌 → 注册四个官方槽位 → 本地缓存先上屏（防止首屏白闪）→
		// Host 状态覆盖 → 金丝雀启动 → 主题跟随监听 → 服务注入。

		function AetherOverlayHost() {
			useAetherTick();
			return h(react.Fragment, null,
				h(BootSplash, { key: 'boot' }),
				h(BalanceWidget, { key: 'widget' }),
				h(DiagOverlay, { key: 'diag' }),
			);
		}

		/** 服务注入：其他插件可以拿到这套 API 注册自己的主题色/触发重应用。 */
		function provideService(ctx) {
			var api = {
				version: VERSION,
				get: function () { return A.cfg; },
				apply: function (reason) { applyAppearance(reason || 'service'); return A.cfg; },
				setAccent: function (hex) {
					if (!A.cfg) return false;
					A.cfg.theme.accent = String(hex || '#7aa2ff');
					A.cfg.theme.deriveFromWallpaper = false;
					applyAppearance('service-accent');
					saveConfig('service').catch(function () { /* ignore */ });
					return true;
				},
				derivePalette: derivePalette,
				registerTheme: function (definition) {
					try {
						if (!definition || !definition.id) return false;
						A.services[definition.id] = definition;
						pushLog('info', '第三方主题已注册', { id: definition.id });
						notify();
						return true;
					} catch (error) {
						return false;
					}
				},
				themes: function () { return Object.keys(A.services).map(function (id) { return A.services[id]; }); },
				diag: collectDiag,
			};
			try {
				if (typeof ctx.provide === 'function') ctx.provide('aetherTheme');
				if (typeof ctx.set === 'function') ctx.set('aetherTheme', api);
			} catch (error) {
				pushLog('warn', 'Cordis 服务注入失败（已回落 window 全局）', { message: String(error && error.message) });
			}
			try {
				window.__DSH_AETHER_THEME__ = api;
			} catch (error) { /* ignore */ }
			return api;
		}

		function watchThemeChanges(ctx) {
			// ① 宿主主题服务（可选服务，拿不到就靠 ②③）
			try {
				if (typeof ctx.on === 'function') {
					var off = ctx.on('theme/change', function () {
						try { applyAppearance('theme-service'); } catch (error) { /* ignore */ }
					});
					if (typeof off === 'function') A.themeOff = off;
				}
			} catch (error) { /* 服务缺席不声明依赖，避免插件被 park */ }

			// ② body[data-ds-dark-theme] 属性变化（宿主切深浅色的实际落点）
			try {
				if (typeof MutationObserver === 'function' && document.body) {
					A.observer = new MutationObserver(function (mutations) {
						var hit = mutations.some(function (mutation) { return mutation.attributeName === 'data-ds-dark-theme'; });
						if (hit) {
							try { applyAppearance('theme-attribute'); } catch (error) { /* ignore */ }
						}
					});
					A.observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] });
				}
			} catch (error) { /* ignore */ }

			// ③ 系统 prefers-color-scheme / reduce-motion
			try {
				var media = window.matchMedia('(prefers-color-scheme: dark)');
				var onScheme = function () { try { applyAppearance('media-scheme'); } catch (error) { /* ignore */ } };
				if (typeof media.addEventListener === 'function') media.addEventListener('change', onScheme);
				A.mediaOff = function () {
					try { if (typeof media.removeEventListener === 'function') media.removeEventListener('change', onScheme); } catch (error) { /* ignore */ }
				};
				var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
				var onMotion = function () { try { applyAppearance('media-motion'); } catch (error) { /* ignore */ } };
				if (typeof motion.addEventListener === 'function') motion.addEventListener('change', onMotion);
				A.motionOff = function () {
					try { if (typeof motion.removeEventListener === 'function') motion.removeEventListener('change', onMotion); } catch (error) { /* ignore */ }
				};
			} catch (error) { /* ignore */ }
		}

		function registerSlot(ctx, name, factory, label) {
			try {
				ctx.slots.inject(name, factory);
			} catch (error) {
				pushLog('error', '槽位注册失败：' + (label || name), { slot: name, message: String(error && error.message) });
			}
		}

		function subscribeSlots(ctx) {
			registerSlot(ctx, 'sidebar.panellist', function () {
				return ctx.slots.register({
					name: 'sidebar.panellist',
					id: PANEL_ID,
					order: 26,
					label: function () { return t('panel.title'); },
				}, AetherRailIcon);
			}, 'sidebar.panellist');
			registerSlot(ctx, 'main', function () {
				return ctx.slots.register({ name: 'main', key: PANEL_ID }, AetherPanel);
			}, 'main');
			registerSlot(ctx, 'settings.section', function () {
				return ctx.slots.register({
					name: 'settings.section',
					id: PANEL_ID,
					order: 58,
					label: function () { return t('nav.settings'); },
					locale: 'aether-theme',
				}, AetherSettingsSection);
			}, 'settings.section');
			registerSlot(ctx, 'settings.section.icon', function () {
				return ctx.slots.register({
					name: 'settings.section.icon',
					id: PANEL_ID,
					order: 58,
				}, AetherNavIcon);
			}, 'settings.section.icon');
			registerSlot(ctx, 'shell.overlay', function () {
				return ctx.slots.register({ name: 'shell.overlay', id: PANEL_ID, order: 5 }, AetherOverlayHost);
			}, 'shell.overlay');
		}

		var apply = function apply(ctx) {
			A.ctx = ctx;
			setLangFromService(ctx);
			A.token = readToken();
			A.apiBase = readApiBase();
			A.flags.reduceMotion = prefersReducedMotion();

			// 0) 本地缓存先上屏：Host 慢或端口变化时也能立即恢复观感（防白闪）
			var cached = loadLocalCache();
			if (cached) {
				A.cfg = mergeConfig(cached, defaultConfigFallback());
				try { applyAppearance('cache'); applyWallpaper('cache'); } catch (error) { /* ignore */ }
			}

			// 1) 槽位注册
			try {
				subscribeSlots(ctx);
			} catch (error) {
				pushLog('error', '槽位注册失败', { message: String(error && error.message) });
			}

			// 2) Host 状态
			loadState().then(function () {
				A.ready = true;
				applyAppearance('ready');
				applyWallpaper('ready');
				notify();
			}).catch(function (error) {
				A.ready = true;
				if (!A.cfg) A.cfg = mergeConfig(null, defaultConfigFallback());
				pushLog('warn', 'Host 状态不可用，使用本地配置运行', { message: String(error && error.message) });
				applyAppearance('offline');
				applyWallpaper('offline');
				notify();
			});

			// 2.5) 用户消息 markdown 自动渲染
			try { startUserMarkdown(); } catch (error) { /* ignore */ }

			// 3) 金丝雀 + 主题跟随 + 服务
			if (A.cfg && A.cfg.diag && A.cfg.diag.enabled === false) {
				// 诊断模块关掉也不影响金丝雀（安全兜底必须常驻）
			}
			startCanary();
			watchThemeChanges(ctx);
			provideService(ctx);

			// 4) 周期诊断（60s 一次，Host 不在线就只留本地）
			A.diagTimer = setInterval(function () { reportDiag('periodic'); }, 60000);
			if (A.diagTimer && typeof A.diagTimer.unref === 'function') A.diagTimer.unref();

			// 5) 页面卸载时清理（插件热重载/关闭）
			try {
				if (typeof ctx.effect === 'function') {
					ctx.effect(function () {
						return function () {
							try { if (A.canary.timer) clearInterval(A.canary.timer); } catch (error) { /* ignore */ }
							try { if (A.rotationTimer) clearInterval(A.rotationTimer); } catch (error) { /* ignore */ }
							try { if (A.diagTimer) clearInterval(A.diagTimer); } catch (error) { /* ignore */ }
							try { if (A.observer) A.observer.disconnect(); } catch (error) { /* ignore */ }
							try { stopUserMarkdown(); } catch (error) { /* ignore */ }
							try { stopFx(); } catch (error) { /* ignore */ }
							try { if (A.themeOff) A.themeOff(); } catch (error) { /* ignore */ }
							try { if (A.mediaOff) A.mediaOff(); } catch (error) { /* ignore */ }
							try { if (A.motionOff) A.motionOff(); } catch (error) { /* ignore */ }
							try { removeStyle(); removeStage(); } catch (error) { /* ignore */ }
							try {
								document.documentElement.removeAttribute('data-dsh-aether');
								document.documentElement.removeAttribute('data-dsh-aether-pixel');
								clearInputHosts();
							} catch (error) { /* ignore */ }
							try { delete window.__DSH_AETHER_THEME__; } catch (error) { /* ignore */ }
							A.subscribers = [];
						};
					});
				}
			} catch (error) { /* ignore */ }

			pushLog('info', '客户端插件已启动', { theme: 'aether', host: A.host.ok, token: Boolean(A.token) });
		};

		return { inject: inject, apply: apply };
	},
});
