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
		return h('div', { className: 'aeth-root' },
			h('div', { className: 'aeth-head' }, h('div', { className: 'aeth-title' }, t('nav.settings'))),
			h('div', { className: 'aeth-card' }, A.host.ok ? t('state.loading') : t('state.hostDown')),
		);
	}

	return h('div', { className: 'aeth-root' },
		h('div', { className: 'aeth-head' },
			h('div', { className: 'aeth-title' }, t('nav.settings')),
			h('div', { className: 'aeth-sub' }, 'v' + VERSION + (status ? ' · ' + status : '')),
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
			h('h3', null, '模块'),
				[['theme', '主题引擎'], ['wallpaper', '壁纸'], ['glass', '玻璃'], ['widget', t('label.widget')], ['pet', t('label.pet')], ['boot', t('label.boot')]].map(function (pair) {
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
