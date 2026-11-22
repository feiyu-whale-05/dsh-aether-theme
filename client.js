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
		var VERSION = '1.0.52';

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
			// 始终以「客户端自带默认值」为基线：host 的 defaultAppearance 可能是旧版本
			// （没有后来新增的字段，例如 backgrounds），只把它当作覆盖层。
			var out = JSON.parse(JSON.stringify(defaultConfigFallback()));
			function mergeInto(target, source) {
				if (!source || typeof source !== 'object') return;
				Object.keys(source).forEach(function (key) {
					var value = source[key];
					if (value && typeof value === 'object' && !Array.isArray(value)
						&& target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
						target[key] = Object.assign({}, target[key], value);
					} else if (value !== undefined) {
						target[key] = value;
					}
				});
			}
			mergeInto(out, defaults);
			mergeInto(out, saved);
			// 兼容旧配置：glass.inputFill 单值 → inputFills 数组
			if (out.glass) {
				if (out.glass.inputFill) {
					if (!Array.isArray(out.glass.inputFills) || !out.glass.inputFills.length) out.glass.inputFills = [out.glass.inputFill];
					delete out.glass.inputFill;
				}
				if (typeof out.glass.inputFills === 'string') out.glass.inputFills = [out.glass.inputFills];
				if (!Array.isArray(out.glass.inputFills) || !out.glass.inputFills.length) out.glass.inputFills = ['frosted'];
			}
			// 分区背景兜底：旧配置可能只有部分键
			if (!out.backgrounds || typeof out.backgrounds !== 'object') {
				out.backgrounds = (defaultConfigFallback().backgrounds);
			}
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

			// Aqua 同款：dark 卡片 #22262f 50%，light 卡片 #fff 42%
			var chromeDefault = dark ? 0.5 : 0.42;
			var chromeOpacity = clamp(glass.chromeOpacity === undefined || glass.chromeOpacity === 0 ? chromeDefault : glass.chromeOpacity, 0, 1);
			var chromeColor = dark ? { r: 34, g: 38, b: 47, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
			var chromeBlur = clamp(glass.chromeBlur === undefined ? 14 : glass.chromeBlur, 0, 40);

			// 分区背景：每个区域独立颜色/透明度，未启用则 clearVar 回落到外壳统一色
			var regionBg = A.cfg.backgrounds || {};
			(function applyRegionBackgrounds() {
				var keys = ['sidebar', 'input', 'bubble', 'topbar', 'titlebar', 'settings'];
				for (var i = 0; i < keys.length; i += 1) {
					var key = keys[i];
					var item = regionBg[key];
					var varName = '--aether-' + key + '-bg';
					var imgName = '--aether-' + key + '-img';
					if (item && item.enabled === true) {
						var color = parseColor(item.color || '#22262f');
						var alpha = clamp(item.opacity === undefined ? 0.5 : item.opacity, 0, 1);
						setVar(varName, rgba(color, alpha));
					} else {
						clearVar(varName);
					}
					// 分区背景图：选了壁纸库里的图片就挂上，否则清掉
					if (item && item.image) {
						var url = A.apiBase + '/api/wallpaper?id=' + encodeURIComponent(item.image) + (A.token ? '&token=' + encodeURIComponent(A.token) : '');
						setVar(imgName, 'url("' + url + '")');
					} else {
						clearVar(imgName);
					}
				}
			})();

			var vars = {
				'--aether-accent': palette.accent,
				'--aether-chrome-fill': rgba(chromeColor, chromeOpacity),
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
			try { syncWhale(); } catch (error) { /* ignore */ }
			try { syncGlowPress(); } catch (error) { /* ignore */ }
			try { syncMeteor(); } catch (error) { /* ignore */ }

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

		/** 标记 AppFrame 根（#root 下第一个 div），用于消掉 Windows 标题栏的双层半透明。 */
		function tagAppFrame() {
			try {
				var root = document.getElementById('root');
				if (!root) return;
				var frame = root.firstElementChild;
				if (!frame) return;
				if (frame.getAttribute('data-aether-frame') !== '1') frame.setAttribute('data-aether-frame', '1');
			} catch (error) { /* ignore */ }
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
			// 舞台层可能刚被重建：把挂在舞台里的特效重新挂上（否则鲸鱼/小鱼/粒子会消失）
			try { syncFx(); } catch (error) { /* ignore */ }
			try { syncWhale(); } catch (error) { /* ignore */ }
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
			if (METEOR.particles.length > 280) METEOR.particles.splice(0, METEOR.particles.length - 280);
		}

		function meteorTick() {
			if (!METEOR.running) return;
			var ctx = METEOR.ctx;
			if (!ctx) { METEOR.raf = requestAnimationFrame(meteorTick); return; }
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
				window.addEventListener('resize', function () { if (METEOR.running) meteorResize(); }, { passive: true });
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
		function MeteorCursor() { return null; }

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
			var host = crittersHost();
			host.innerHTML = crittersMarkup();
			CRITTERS.built = host.childElementCount;
		}

		function restartFx() {
			stopFx();
			startFx();
		}

		// ── 57-whale.js ─────────────────────────────────────────────────────
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
		var WHALE_FPS = 30;

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
							WHALE.particles.push({
								x: x, y: y, opacity: a, edge: edge / 8,
								sx: Math.sin(theta) * Math.cos(phi) * rad,
								sy: Math.sin(theta) * Math.sin(phi) * rad,
								sz: Math.cos(theta) * rad * 0.5,
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
				var px = p.x + whaleHash(i) * 0.05 * loose;
				var py = p.y + whaleHash(i * 1.37 + 7) * 0.05 * loose;
				px += Math.sin(time * 0.5 + i * 0.53) * 0.06 * loose;
				py += Math.cos(time * 0.42 + i * 0.71) * 0.06 * loose;
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
						var angle = Math.sin(i * 0.37 + time * 0.5) * WHALE_MOUSE_DISTORT;
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
				ctx.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha.toFixed(3) + ')';
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

		function syncWhale() {
			if (!A.cfg || A.canary.disabled || !moduleOn('fx') || (A.cfg.fx && A.cfg.fx.whale === false)) {
				whaleStop();
				return;
			}
			if (!WHALE.running || !WHALE.holder || !document.body.contains(WHALE.holder)) {
				whaleStop();
				whaleStart();
				return;
			}
			whaleResize();
		}

		// ── 58-glow.js ──────────────────────────────────────────────────────
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
		function pressTiltable(pane) {
			if (!pane) return false;
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
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

		/** 兜底：向上找第一个「fixed/absolute 且尺寸像对话框」的祖先（DSH 的对话框是 portal 到 body 的容器）。 */
		function pressFindFloatingPane(target) {
			try {
				var node = target;
				var depth = 0;
				while (node && node !== document.body && depth < 10) {
					var style = window.getComputedStyle(node);
					// 排除主面板（含设置页/图片预览/插件列表）、dialog、插件自己的面板
					// 排除「祖先链里有全局面板/插件面板/dialog」的节点：
					// 设置页内部元素此前会被误判成浮层，导致设置页被下压
					if (node.closest && node.closest('[data-global-panel], .aeth-root, [role="dialog"], [aria-modal="true"]')) {
						node = node.parentElement;
						depth += 1;
						continue;
					}
					if ((style.position === 'fixed' || style.position === 'absolute')
						&& node.offsetWidth > 360 && node.offsetHeight > 240) {
						return node;
					}
					node = node.parentElement;
					depth += 1;
				}
			} catch (error) { /* ignore */ }
			return null;
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
			// 侧栏：任何 transform 都会创建 containing block，把侧栏里 position:fixed 的
			// 收起按钮挤出顶栏。所以侧栏只做「不产生变换」的按压：内阴影 + 背景压暗。
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
					h('h3', null, '分区背景（每块可单独配置）'),
					h('div', { className: 'aeth-note', style: { marginBottom: '8px' } },
						'开启后该区域使用自己的颜色与不透明度；关闭则跟随「外壳暗度」统一值。'),
					[
						['sidebar', '侧边栏'],
						['input', '对话页输入框'],
						['bubble', '用户气泡'],
						['topbar', '顶栏（标签栏）'],
						['titlebar', '标题栏（应用/编辑）'],
						['settings', '设置页'],
					].map(function (pair) {
						var key = pair[0];
						var item = (cfg.backgrounds && cfg.backgrounds[key]) || { enabled: false, color: '#22262f', opacity: 0.5 };
						return h('div', { key: key, className: 'aeth-row', style: { alignItems: 'center' } },
							h('label', { style: { minWidth: '150px' } }, pair[1]),
							h('button', {
								type: 'button',
								className: 'aeth-btn' + (item.enabled ? ' primary' : ''),
								onClick: function () {
									mutate(function (draft) {
										draft.backgrounds = draft.backgrounds || {};
										draft.backgrounds[key] = Object.assign({}, draft.backgrounds[key] || {}, { enabled: !item.enabled });
									}, { wallpaper: false });
								},
							}, item.enabled ? '独立' : '跟随'),
							h('input', {
								type: 'color',
								value: item.color || '#22262f',
								onInput: function (event) {
									var value = event.target.value;
									try {
										mutate(function (draft) {
											draft.backgrounds = draft.backgrounds || {};
											draft.backgrounds[key] = Object.assign({}, draft.backgrounds[key] || {}, { color: value, enabled: true });
										}, { wallpaper: false });
									} catch (error) { pushLog('error', '分区背景保存失败', { key: key, message: String(error && error.message) }); }
								},
								style: { width: '34px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer' },
							}),
							h('select', {
								value: item.image || '',
								onChange: function (event) {
									var value = event.target.value;
									try {
										mutate(function (draft) {
											draft.backgrounds = draft.backgrounds || {};
											draft.backgrounds[key] = Object.assign({}, draft.backgrounds[key] || {}, { image: value, enabled: true });
										}, { wallpaper: false });
									} catch (error) { pushLog('error', '分区背景图保存失败', { key: key, message: String(error && error.message) }); }
								},
								style: { maxWidth: '140px', cursor: 'pointer' },
							}, [h('option', { value: '', key: '' }, '无背景图')].concat(
								(A.host.wallpapers || [])
									.filter(function (w) { return !w.kind || w.kind === 'image'; })
									.map(function (w) {
										return h('option', { value: w.id, key: w.id }, String(w.name || w.id).slice(0, 14));
									})
							)),
							h('input', {
								type: 'range', min: 0, max: 1, step: 0.01,
								value: item.opacity === undefined ? 0.5 : item.opacity,
								onInput: function (event) {
									var value = Number(event.target.value);
									try {
										mutate(function (draft) {
											draft.backgrounds = draft.backgrounds || {};
											draft.backgrounds[key] = Object.assign({}, draft.backgrounds[key] || {}, { opacity: value, enabled: true });
										}, { wallpaper: false });
									} catch (error) { pushLog('error', '分区背景保存失败', { key: key, message: String(error && error.message) }); }
								},
								style: { flex: '1 1 80px', minWidth: '80px' },
							}),
							h('label', {
								className: 'aeth-btn',
								title: '上传一张新图片作为该区域背景',
								style: { cursor: 'pointer', marginLeft: '4px' },
							}, '上传',
								h('input', {
									type: 'file',
									accept: 'image/*',
									style: { position: 'absolute', width: '0', height: '0', opacity: '0', overflow: 'hidden' },
									onChange: function (event) {
										var file = event.target.files && event.target.files[0];
										try { event.target.value = ''; } catch (error) { /* ignore */ }
										if (!file) return;
										setStatus('正在上传 ' + String(file.name || '').slice(0, 20) + '…');
										uploadWallpaper(file, 'region').then(function (uploaded) {
											try {
												mutate(function (draft) {
													draft.backgrounds = draft.backgrounds || {};
													draft.backgrounds[key] = Object.assign({}, draft.backgrounds[key] || {}, { image: uploaded.id, enabled: true });
												}, { wallpaper: false });
												setStatus('已应用：' + pair[1]);
												setTimeout(function () { setStatus(''); }, 1600);
											} catch (error) {
												pushLog('error', '分区背景图保存失败', { key: key, message: String(error && error.message) });
											}
										}).catch(function (error) {
											setStatus('上传失败');
											setTimeout(function () { setStatus(''); }, 2200);
											pushLog('error', '分区背景图上传失败', { key: key, message: String(error && error.message) });
										});
									},
								})
							),
							h('span', { className: 'aeth-note', style: { minWidth: '40px', textAlign: 'right' } },
								String(Math.round((item.opacity === undefined ? 0.5 : item.opacity) * 100)) + '%'),
						);
					}),
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
					toggleRow('指针光晕（Aqua spotlight）', (cfg.fx || {}).glow !== false, function (value) {
						mutate(function (draft) { draft.fx = Object.assign({}, draft.fx || {}, { glow: value }); }, { wallpaper: false });
						setTimeout(function () { try { syncGlowPress(); } catch (error) { /* ignore */ } }, 60);
					}),
					toggleRow('悬停下压（3D 倾斜）', (cfg.fx || {}).press !== false, function (value) {
						mutate(function (draft) { draft.fx = Object.assign({}, draft.fx || {}, { press: value }); }, { wallpaper: false });
						setTimeout(function () { try { syncGlowPress(); } catch (error) { /* ignore */ } }, 60);
					}),
					sliderRow('流星消散距离（超过即消失）', (meteor.maxDist === undefined ? 160 : meteor.maxDist), 40, 600, 10, function (value) {
						mutate(function (draft) { draft.meteor = Object.assign({}, draft.meteor || {}, { maxDist: value }); }, { wallpaper: false });
					}, 'px'),
					toggleRow('粒子鲸鱼（品牌鱼剪影）', (cfg.fx || {}).whale !== false, function (value) {
						mutate(function (draft) { draft.fx = Object.assign({}, draft.fx || {}, { whale: value }); }, { wallpaper: false });
						setTimeout(function () { try { syncWhale(); } catch (error) { /* ignore */ } }, 60);
					}),
					sliderRow('小鱼数量', (cfg.fx || {}).fishCount === undefined ? 3 : cfg.fx.fishCount, 0, 10, 1, function (value) {
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
						h('b', null, '下压状态'), h('span', { className: A.pressRunning ? 'aeth-ok' : 'aeth-bad' },
							A.pressRunning ? ('监听中（' + Math.round(TILT_MAX / 0.01745 * 10) / 10 + '° 倾斜）') : '未启动'),
						h('b', null, '下压目标'), h('span', null, A.pressDebug ? (A.pressDebug.tag + '.' + (A.pressDebug.cls.split(' ')[0] || '') + (A.pressDebug.position ? ' [' + A.pressDebug.position + ']' : '')) : '（把指针移到对话框上再看）'),
						h('b', null, '流星尾缀'), h('span', { className: (typeof METEOR !== 'undefined' && METEOR.canvas) ? 'aeth-ok' : 'aeth-bad' },
							(typeof METEOR !== 'undefined' && METEOR.canvas)
								? ('运行中 · canvas ' + METEOR.canvas.width + '×' + METEOR.canvas.height + ' · 粒子 ' + METEOR.particles.length)
								: (shouldReduceMotion() ? 'reduced-motion 静默' : (meteorEnabled() ? '已启用但未启动' : '开关未开'))),
						h('b', null, '粒子/小鱼'), h('span', { className: (typeof CRITTERS !== 'undefined' && CRITTERS.built > 0) ? 'aeth-ok' : 'aeth-bad' },
							(typeof CRITTERS !== 'undefined' && CRITTERS.built > 0)
								? CRITTERS.built + ' 个节点已注入'
								: (shouldReduceMotion() ? '已被 reduced-motion 静默' : '未注入')),
					),
					h('div', { className: 'aeth-row', style: { marginTop: '10px' } },
						h('button', { className: 'aeth-btn primary', onClick: exportDiag }, '导出 diag.json'),
						h('button', { className: 'aeth-btn', onClick: function () { reportDiag('panel'); } }, '刷新诊断'),
						h('button', {
							className: 'aeth-btn',
							onClick: function () {
								if (typeof METEOR === 'undefined' || !METEOR.running) { setStatus('流星未启动（检查开关/减弱动效）'); setTimeout(function () { setStatus(''); }, 1800); return; }
								var cx = Math.round(window.innerWidth / 2);
								var cy = Math.round(window.innerHeight / 2);
								METEOR.pointer.x = cx;
								METEOR.pointer.y = cy;
								for (var i = 0; i < 24; i += 1) {
									meteorSpawn(cx + (i - 12) * 7, cy + (i % 6) * 5, 14, 8);
								}
							},
						}, '测试流星'),
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
						[['theme', '主题引擎'], ['wallpaper', '壁纸'], ['glass', '玻璃'], ['boot', t('label.boot')], ['fx', '粒子与小鱼'], ['inputGlow', '渐变边框']].map(function (pair) {
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

			// 2.4) 遮罩层清理（设置/图片查看的黑底直接删元素）
			try { removeMaskLayers(); watchMaskLayers(); } catch (error) { /* ignore */ }

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
							try { if (A.maskObserver) A.maskObserver.disconnect(); } catch (error) { /* ignore */ }
							try { stopFx(); } catch (error) { /* ignore */ }
							try { whaleStop(); } catch (error) { /* ignore */ }
							try { stopGlow(); stopPress(); } catch (error) { /* ignore */ }
							try { stopMeteor(); } catch (error) { /* ignore */ }
							try { if (A.themeOff) A.themeOff(); } catch (error) { /* ignore */ }
							try { if (A.mediaOff) A.mediaOff(); } catch (error) { /* ignore */ }
							try { if (A.motionOff) A.motionOff(); } catch (error) { /* ignore */ }
							try { removeStyle(); removeStage(); } catch (error) { /* ignore */ }
							try {
								document.documentElement.removeAttribute('data-dsh-aether');
								document.documentElement.removeAttribute('data-dsh-aether-pixel');
								document.documentElement.removeAttribute('data-glass-blur');
								document.documentElement.removeAttribute('data-chrome-blur');
								clearInputHosts();
								try {
									document.querySelectorAll('[data-aether-frame]').forEach(function (node) { node.removeAttribute('data-aether-frame'); });
								} catch (error) { /* ignore */ }
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
