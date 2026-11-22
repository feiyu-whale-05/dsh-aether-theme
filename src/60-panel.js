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
				h('b', null, '流星尾缀'), h('span', { className: A.meteorDebug ? 'aeth-ok' : 'aeth-bad' },
					A.meteorDebug ? 'canvas 已挂载（' + A.meteorDebug.canvas.width + '×' + A.meteorDebug.canvas.height + '）'
						: (!A.meteorMounted ? '组件未渲染'
							: (shouldReduceMotion() ? 'reduced-motion 静默'
								: (A.meteorEnabled ? '已启用但 canvas 未挂载' : '开关未开')))),
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
						if (!A.meteorDebug || !A.meteorDebug.spawn) { setStatus('流星 canvas 未挂载'); setTimeout(function () { setStatus(''); }, 1600); return; }
						var cx = Math.round(window.innerWidth / 2);
						var cy = Math.round(window.innerHeight / 2);
						for (var i = 0; i < 30; i += 1) {
							A.meteorDebug.spawn(cx + (i - 15) * 6, cy + (i % 5) * 4, 12, 6);
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
