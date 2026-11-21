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
	var fill = A.cfg && A.cfg.glass ? A.cfg.glass.inputFill : 'frosted';
	var localAlpha = fill === 'transparent' || fill === 'bordered' ? 0.06 : Math.max(clamp(alpha, 0, 1), 0.5);
	return composite({ r: panel.r, g: panel.g, b: panel.b, a: localAlpha }, wallpaperColor);
}

/** 输入框 6 种填充模式 → 实际底色/边框。 */
function inputFillColor(mode, panel, accent, ink) {
	var opacity = A.cfg && A.cfg.glass ? clamp(A.cfg.glass.inputFillOpacity, 0, 1) : 0.6;
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

	var input = inputFillColor(glass.inputFill || 'frosted', panel, accentHex, ink);

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

	var vars = {
		'--aether-accent': palette.accent,
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
		'--aether-glass-blur': clamp(glass.glassBlur === undefined ? 18 : glass.glassBlur, 0, 64) + 'px',
		'--aether-bg-blur': clamp(glass.backgroundBlur === undefined ? 8 : glass.backgroundBlur, 0, 64) + 'px',
		'--aether-saturation': String(clamp(glass.saturation === undefined ? 1.15 : glass.saturation, 0.2, 2.5)),
		'--aether-transition': clamp(A.cfg.theme.transitionMs, 0, 2000) + 'ms',
		'--aether-veil': 'rgba(0,0,0,' + clamp(A.cfg.wallpaper.dim === undefined ? 0.32 : A.cfg.wallpaper.dim, 0, 1) + ')',
		'--aether-scanline': String(clamp(A.cfg.pixel.scanline === undefined ? 0.08 : A.cfg.pixel.scanline, 0, 0.4)),
	};
	Object.keys(vars).forEach(function (name) { setVar(name, vars[name]); });
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
