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
