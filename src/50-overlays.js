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
