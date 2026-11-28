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
		// 和面板同一套 600ms 防抖：旧实现在这里每次都直接落盘，
		// 拖一次滑杆 = 30 次全量备份 + 30 次目录扫描。
		scheduleSave('settings');
	}

	react.useEffect(function () {
		return onSaveState(function (state) {
			setStatus(state === 'saved' ? t('state.saved') : t('state.error'));
			if (state === 'saved') setTimeout(function () { setStatus(''); }, 1200);
		});
	}, []);

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
			// 「启用以太主题」是总开关：同时写顶层 enabled 与 modules.theme，
			// 否则两个开关会各说各话（设置页显示"开"、模块页显示"关"，用户不知道听谁的）。
			toggleRow('启用以太主题', cfg.enabled !== false,
				function (value) { mutate(function (draft) { setThemeEnabled(draft, value); }); }),
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
						if (!window.confirm(t('pack.confirm'))) return;
						var reader = new FileReader();
						reader.onload = function () {
							try {
								var parsed = JSON.parse(String(reader.result));
								var check = sanitizeThemePack(parsed && parsed.appearance ? parsed.appearance : parsed);
								if (!check.ok) {
									setStatus(t('pack.rejected'));
									pushLog('warn', '主题包被拒绝', { reason: check.reason });
									return;
								}
								A.cfg = mergeConfig(check.value, A.defaults || defaultConfigFallback());
								applyAppearance('import');
								applyWallpaper('import');
								scheduleSave('import');
								setStatus(t('state.saved'));
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
