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

// ── 桌宠：纯 SVG 绘制（零图片），眼睛跟随鼠标 ───────────────────────────
function AetherPet() {
	useAetherTick();
	var config = A.cfg && A.cfg.pet ? A.cfg.pet : { size: 96, follow: true };
	var size = clamp(config.size || 96, 48, 220);
	var eyeState = react.useState({ x: 0, y: 0 });
	var eye = eyeState[0];
	var setEye = eyeState[1];
	var moodState = react.useState('idle');
	var mood = moodState[0];
	var setMood = moodState[1];

	react.useEffect(function () {
		if (!config.follow) return undefined;
		var frame = null;
		var latest = { x: 0, y: 0 };
		function onMove(event) {
			latest = { x: event.clientX, y: event.clientY };
			if (frame !== null) return;
			frame = requestAnimationFrame(function () {
				frame = null;
				try {
					var rect = document.querySelector('.aeth-pet');
					if (!rect) return;
					var box = rect.getBoundingClientRect();
					var cx = box.left + box.width / 2;
					var cy = box.top + box.height * 0.42;
					var dx = clamp((latest.x - cx) / 120, -1, 1);
					var dy = clamp((latest.y - cy) / 120, -1, 1);
					setEye({ x: dx * 2.6, y: dy * 2.2 });
				} catch (error) { /* ignore */ }
			});
		}
		window.addEventListener('mousemove', onMove, { passive: true });
		return function () {
			window.removeEventListener('mousemove', onMove);
			if (frame !== null) cancelAnimationFrame(frame);
		};
	}, [config.follow]);

	if (!moduleOn('pet') || A.canary.disabled) return null;

	return h('div', {
		className: 'aeth-pet',
		style: { right: '26px', bottom: '132px', width: size + 'px', height: (size * 0.78) + 'px' },
		role: 'img',
		'aria-label': t('pet.title'),
		title: t('pet.title'),
		onClick: function () { setMood(mood === 'idle' ? 'happy' : mood === 'happy' ? 'sleepy' : 'idle'); },
	},
		h('svg', { viewBox: '0 0 120 94', width: '100%', height: '100%', 'aria-hidden': 'true' },
			h('defs', null,
				h('linearGradient', { id: 'aeth-whale-body', x1: '0', y1: '0', x2: '1', y2: '1' },
					h('stop', { offset: '0', stopColor: '#7aa2ff' }),
					h('stop', { offset: '1', stopColor: '#9d7cff' }),
				),
				h('linearGradient', { id: 'aeth-whale-belly', x1: '0', y1: '0', x2: '0', y2: '1' },
					h('stop', { offset: '0', stopColor: '#eaf1ff' }),
					h('stop', { offset: '1', stopColor: '#c9d9ff' }),
				),
			),
			h('path', {
				d: 'M14 58 C14 40 34 26 58 26 C84 26 104 40 108 56 C110 64 104 70 96 70 L22 70 C16 70 14 66 14 58 Z',
				fill: 'url(#aeth-whale-body)',
			}),
			h('path', { d: 'M22 62 C34 74 78 74 96 64 L96 70 L22 70 Z', fill: 'url(#aeth-whale-belly)', opacity: '.9' }),
			h('path', { d: 'M58 62 C60 68 64 70 68 68 C64 66 62 64 61 60 Z', fill: '#5b7cfa', opacity: '.7' }),
			h('path', { d: 'M108 56 C114 48 118 46 120 44 C116 50 114 54 112 60 Z', fill: '#9d7cff' }),
			h('path', { d: 'M14 56 C10 48 8 44 4 42 C8 50 8 54 10 60 Z', fill: '#9d7cff' }),
			h('ellipse', { className: 'eye', cx: 84 + eye.x, cy: mood === 'sleepy' ? 44 : 44 + eye.y, rx: 4.2, ry: mood === 'sleepy' ? 1.2 : 4.6, fill: '#0d1220' }),
			h('ellipse', { className: 'eye', cx: 95 + eye.x * 0.8, cy: mood === 'sleepy' ? 43 : 43 + eye.y * 0.8, rx: 3.4, ry: mood === 'sleepy' ? 1 : 3.8, fill: '#0d1220' }),
			h('circle', { cx: 85.4, cy: 42.4, r: 1.2, fill: '#ffffff', opacity: '.9' }),
			mood === 'happy'
				? h('path', { d: 'M86 52 q4 4 8 0', stroke: '#0d1220', strokeWidth: 1.4, fill: 'none', strokeLinecap: 'round' })
				: h('path', { d: 'M86 53 q4 -3 8 1', stroke: '#0d1220', strokeWidth: 1.2, fill: 'none', strokeLinecap: 'round', opacity: '.55' }),
		),
	);
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
