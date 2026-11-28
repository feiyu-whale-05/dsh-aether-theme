// ── panel：左侧边栏面板 —— 全功能控制台 ─────────────────────────────────
// 分区：外观 / 壁纸 / 玻璃 / 像素 / 模块 / 主题包 / 诊断。
// 所有改动即时生效（applyAppearance），并以 600ms 防抖落盘（Host 原子写+备份）。

var PANEL_TABS = ['appearance', 'wallpaper', 'glass', 'pixel', 'style', 'modules', 'pack', 'diag'];

/**
 * 图库选择弹层：从壁纸库的图片里挑一张（比手填 id 友好）。
 * 纯受控组件：请求对象与关闭回调都由 AetherPanel 持有。
 * （旧实现在渲染期直接读 useState 并顺手给 A.galleryPicker 赋值，
 *   既是渲染期副作用，也会在切页后留下陈旧 setter。）
 */
function GalleryPicker(props) {
	var request = props.request;
	var onClose = props.onClose;
	if (!request) return null;
	var images = (A.host.wallpapers || []).filter(function (w) { return !w.kind || w.kind === 'image'; });
	return h('div', {
		style: {
			position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(10,12,16,.72)',
			backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column', padding: '12px', gap: '10px',
		},
		onClick: function () { onClose(); },
	},
		h('div', { className: 'aeth-row', style: { justifyContent: 'space-between' } },
			h('b', null, request.title || '从图库选择'),
			h('button', { type: 'button', className: 'aeth-btn', onClick: function () { onClose(); } }, '关闭'),
		),
		images.length
			? h('div', {
				className: 'aeth-grid',
				style: { overflowY: 'auto', flex: '1 1 auto', alignContent: 'start' },
				onClick: function (event) { event.stopPropagation(); },
			},
				images.map(function (item) {
					var url = mediaUrl(item.id);
					return h('div', {
						key: item.id,
						className: 'aeth-wall',
						style: { cursor: 'pointer' },
						onClick: function () {
							try { request.onPick(item.id); } catch (error) { /* ignore */ }
							onClose();
						},
					},
						h('img', { src: url, alt: '' }),
						h('span', { className: 'aeth-badge' }, String(item.name || item.id).slice(0, 14)),
					);
				})
			)
			: h('div', { className: 'aeth-note' }, '图库还没有图片：先在「背景」页上传。'),
	);
}

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
	var importRef = react.useRef(null);
	var uploadRef = react.useRef(null);
	var uploadCategoryState = react.useState('custom');
	var uploadCategory = uploadCategoryState[0];
	var setUploadCategory = uploadCategoryState[1];
	var galleryState = react.useState(null);
	var galleryRequest = galleryState[0];
	var setGalleryRequest = galleryState[1];

	// 把"请求打开图库"的入口发布给其他卡片（它们只是纯渲染函数，拿不到本地 state）。
	// 必须在 effect 里做：渲染期赋值是副作用，且卸载后会留下陈旧 setter。
	react.useEffect(function () {
		A.galleryPicker = setGalleryRequest;
		return function () {
			if (A.galleryPicker === setGalleryRequest) A.galleryPicker = null;
		};
	}, []);

	var cfg = A.cfg;
	var hostOk = A.host.ok;

	function mutate(mutator, options) {
		if (!A.cfg) return;
		mutator(A.cfg);
		applyAppearance('panel');
		if (!options || options.wallpaper !== false) {
			try { applyWallpaper('panel'); } catch (error) { /* 无壁纸模块时忽略 */ }
		}
		// 统一走 600ms 防抖 + 单飞行落盘（见 20-core 的 scheduleSave）
		scheduleSave('panel');
	}

	// 保存状态回显（成功/失败）由 SAVE_BUS 统一广播，面板与设置页共用
	react.useEffect(function () {
		return onSaveState(function (state) {
			setStatus(state === 'saved' ? t('state.saved') : t('state.error'));
			if (state === 'saved') setTimeout(function () { setStatus(''); }, 1200);
		});
	}, []);

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
		if (!window.confirm(t('pack.confirm'))) return;
		var reader = new FileReader();
		reader.onload = function () {
			try {
				var parsed = JSON.parse(String(reader.result));
				var appearance = parsed && parsed.appearance ? parsed.appearance : parsed;
				var check = sanitizeThemePack(appearance);
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

	function downloadJson(text, filename) {
		// 统一出口：任何分支都必须 revokeObjectURL + 摘掉 <a>，否则每次都泄漏一个 Blob
		var blob = new Blob([text], { type: 'application/json' });
		var url = URL.createObjectURL(blob);
		var link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		try { link.click(); } catch (error) { /* ignore */ }
		setTimeout(function () {
			try { link.remove(); } catch (error) { /* ignore */ }
			try { URL.revokeObjectURL(url); } catch (error) { /* ignore */ }
		}, 400);
	}

	function exportDiag() {
		try {
			apiFetch('/api/diag.json').then(function (text) {
				downloadJson(typeof text === 'string' ? text : JSON.stringify(text, null, 2), 'diag.json');
			}).catch(function () {
				downloadJson(JSON.stringify(reportDiag('manual-export'), null, 2), 'diag.json');
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
		tab === 'style' ? StyleTab(cfg, mutate) : null,
		h(GalleryPicker, { request: galleryRequest, onClose: function () { setGalleryRequest(null); } }),
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

	/** 开机动画片库卡片。hook 必须落在组件体内 —— 旧实现写成 IIFE 在 AdvancedCards 渲染期调用，
	 *  等于把 hook 塞进 AetherPanel 的 hook 链；切标签页时 hook 数量变化会直接抛
	 *  "Rendered fewer hooks than expected"。 */
function BootLibraryCard() {
	var boot = react.useState(null);
	var bootData = boot[0];
	var setBootData = boot[1];
	var preview = react.useState('');
	var previewId = preview[0];
	var setPreviewId = preview[1];
	react.useEffect(function () {
		var alive = true;
		fetch('/dsh-boot-splash-pro/videos.json', { credentials: 'same-origin' })
			.then(function (res) { return res.json(); })
			.then(function (json) { if (alive) setBootData(json); })
			.catch(function () { if (alive) setBootData({ error: true }); });
		return function () { alive = false; };
	}, []);
	return h('div', { className: 'aeth-card' },
		h('h3', null, '开机动画（dsh-boot-splash-pro）'),
		h('div', { className: 'aeth-note', style: { marginBottom: '8px' } },
			'触发方式：仅在 DSH 启动时播放一次；打开 / 切换对话不再播放片头。片源与贴合方式由 dsh-boot-splash-pro 管理。'),
		BootLibraryView(bootData, previewId, setPreviewId),
	);
}

/** 纯渲染辅助（无 hook）：由 BootLibraryCard 以普通函数调用，与 row()/sliderRow() 同类。 */
function BootLibraryView(bootData, previewId, setPreviewId) {
	if (!bootData) {
		return h('div', { className: 'aeth-note' }, '正在读取片库…');
	}
	if (bootData.error) {
		return h('div', { className: 'aeth-note' }, '未检测到 dsh-boot-splash-pro（或片库接口不可用）。安装后重启 DSH 即可。');
	}
	var videos = Array.isArray(bootData.videos) ? bootData.videos : [];
	var activeName = '';
	for (var i = 0; i < videos.length; i += 1) {
		if (videos[i].id === bootData.activeId) activeName = videos[i].name;
	}
	return h('div', null,
		h('div', { className: 'aeth-row' },
			h('span', { className: 'aeth-note' }, '当前片头：' + (activeName || bootData.activeId || '未选')),
			h('span', { className: 'aeth-note' }, '共 ' + videos.length + ' 段'),
		),
		videos.length
			? h('div', { className: 'aeth-grid', style: { marginTop: '10px' } },
				videos.map(function (item) {
					var url = '/dsh-boot-splash-pro/media/' + encodeURIComponent(item.id);
					var isPlaying = previewId === item.id;
					return h('div', {
						key: item.id,
						className: 'aeth-wall' + (bootData.activeId === item.id ? ' on' : ''),
						style: { cursor: 'pointer' },
						onClick: function () { setPreviewId(isPlaying ? '' : item.id); },
					},
						h('video', {
							src: url,
							muted: true,
							loop: true,
							playsInline: true,
							preload: 'metadata',
							controls: isPlaying,
							autoPlay: isPlaying,
						}),
						h('span', { className: 'aeth-badge' }, (item.name || item.id) + (isPlaying ? ' · 播放中' : ' · 点击预览')),
					);
				})
			)
			: h('div', { className: 'aeth-note' }, '片库为空：在 dsh-boot-splash-pro 的设置里上传/选择片头。'),
	);
}

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
			A.toast ? h('div', { className: 'aeth-note', style: { color: '#9cc0f2', marginBottom: '8px' } }, A.toast) : null,
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
					h('button', {
						type: 'button',
						className: 'aeth-btn',
						style: { marginLeft: '4px' },
						onClick: function () {
							if (!A.galleryPicker) return;
							A.galleryPicker({
								title: '选择「' + pair[1] + '」背景图',
								onPick: function (id) {
									mutate(function (draft) {
										draft.backgrounds = draft.backgrounds || {};
										draft.backgrounds[key] = Object.assign({}, draft.backgrounds[key] || {}, { image: id, enabled: true });
									}, { wallpaper: false });
								},
							});
						},
					}, '图库'),
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
								toast('正在上传 ' + String(file.name || '').slice(0, 20) + '…');
								notify();
								pushLog('info', '分区背景图上传开始', { key: key, name: String(file.name || '').slice(0, 60), size: file.size });
								uploadWallpaper(file, 'region').then(function (uploaded) {
									try {
										mutate(function (draft) {
											draft.backgrounds = draft.backgrounds || {};
											draft.backgrounds[key] = Object.assign({}, draft.backgrounds[key] || {}, { image: uploaded.id, enabled: true });
										}, { wallpaper: false });
										toast('已应用：' + pair[1], 1800);
									} catch (error) {
										toast('保存失败', 2600);
										pushLog('error', '分区背景图保存失败', { key: key, message: String(error && error.message) });
									}
								}).catch(function (error) {
									toast('上传失败：' + String(error && error.message || '').slice(0, 40), 3000);
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
		h(BootLibraryCard, { key: 'boot' }),
		h('div', { className: 'aeth-card' },
			h('h3', null, '消息头像'),
			h('div', { className: 'aeth-note', style: { marginBottom: '8px' } },
				'用户消息右侧、agent 消息左侧的圆形头像（文字或图片）。'),
			(function () {
				var av = cfg.avatars || { enabled: false, user: '我', agent: 'AI', userImage: '', agentImage: '' };
				function avatarRow(side, label) {
					var image = side === 'user' ? av.userImage : av.agentImage;
					var text = side === 'user' ? av.user : av.agent;
					return h('div', { className: 'aeth-row', key: side },
						h('label', { style: { minWidth: '56px' } }, label),
						h('input', {
							className: 'aeth-input',
							type: 'text',
							maxLength: 2,
							value: text || '',
							style: { width: '56px', textAlign: 'center' },
							onInput: function (event) {
								var value = event.target.value;
								mutate(function (draft) {
									draft.avatars = Object.assign({}, draft.avatars || {}, side === 'user' ? { user: value, userImage: '' } : { agent: value, agentImage: '' });
								}, { wallpaper: false });
								setTimeout(function () { try { scanAvatars(); } catch (error) { /* ignore */ } }, 60);
							},
						}),
						h('button', {
							type: 'button', className: 'aeth-btn',
							onClick: function () {
								if (!A.galleryPicker) return;
								A.galleryPicker({
									title: '选择' + (side === 'user' ? '用户' : 'Agent') + '头像',
									onPick: function (id) {
										mutate(function (draft) {
											draft.avatars = Object.assign({}, draft.avatars || {}, { enabled: true });
											draft.avatars[side === 'user' ? 'userImage' : 'agentImage'] = id;
										}, { wallpaper: false });
										setTimeout(function () { try { scanAvatars(); } catch (error) { /* ignore */ } }, 80);
									},
								});
							},
						}, '图库'),
						h('label', { className: 'aeth-btn', style: { cursor: 'pointer' } }, image ? '换图' : '用图片',
							h('input', {
								type: 'file', accept: 'image/*',
								style: { position: 'absolute', width: '0', height: '0', opacity: '0', overflow: 'hidden' },
								onChange: function (event) {
									var file = event.target.files && event.target.files[0];
									try { event.target.value = ''; } catch (error) { /* ignore */ }
									if (!file) return;
									uploadWallpaper(file, 'avatar').then(function (uploaded) {
										mutate(function (draft) {
											draft.avatars = Object.assign({}, draft.avatars || {}, { enabled: true });
											draft.avatars[side === 'user' ? 'userImage' : 'agentImage'] = uploaded.id;
										}, { wallpaper: false });
										setTimeout(function () { try { scanAvatars(); } catch (error) { /* ignore */ } }, 80);
									}).catch(function (error) {
										pushLog('error', '头像上传失败', { message: String(error && error.message) });
									});
								},
							})
						),
						image
							? h('button', {
								type: 'button', className: 'aeth-btn',
								onClick: function () {
									mutate(function (draft) {
										draft.avatars = Object.assign({}, draft.avatars || {});
										draft.avatars[side === 'user' ? 'userImage' : 'agentImage'] = '';
									}, { wallpaper: false });
									setTimeout(function () { try { scanAvatars(); } catch (error) { /* ignore */ } }, 60);
								},
							}, '清除')
							: null,
						image
							? h('img', {
								src: mediaUrl(image),
								alt: '',
								style: { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' },
							})
							: null,
					);
				}
				return h('div', null,
					h('div', { className: 'aeth-row' },
						h('button', {
							type: 'button',
							className: 'aeth-btn' + (av.enabled ? ' primary' : ''),
							onClick: function () {
								mutate(function (draft) {
									draft.avatars = Object.assign({}, draft.avatars || {}, { enabled: !av.enabled });
								}, { wallpaper: false });
								setTimeout(function () { try { scanAvatars(); } catch (error) { /* ignore */ } }, 60);
							},
						}, av.enabled ? '开' : '关'),
						h('span', { className: 'aeth-note' }, '消息头像'),
					),
					avatarRow('user', '用户'),
					avatarRow('agent', 'Agent'),
				);
			})(),
		),
		h('div', { className: 'aeth-card' },
			h('h3', null, '用户气泡左下角装饰'),
			h('div', { className: 'aeth-note', style: { marginBottom: '8px' } },
				'像 QQ 装扮一样，在用户消息气泡左下角挂一个小挂件（emoji / 文字 / 图片）。'),
			(function () {
				var deco = cfg.bubbleDecoration || { enabled: false, text: '🎀', image: '' };
				return h('div', null,
					h('div', { className: 'aeth-row' },
						h('button', {
							type: 'button',
							className: 'aeth-btn' + (deco.enabled ? ' primary' : ''),
							onClick: function () {
								mutate(function (draft) {
									draft.bubbleDecoration = Object.assign({}, draft.bubbleDecoration || {}, { enabled: !deco.enabled });
								}, { wallpaper: false });
								setTimeout(function () { try { scanBubbleDeco(); } catch (error) { /* ignore */ } }, 60);
							},
						}, deco.enabled ? '开' : '关'),
						h('span', { className: 'aeth-note' }, '挂件'),
						h('input', {
							className: 'aeth-input',
							type: 'text',
							value: deco.text || '',
							maxLength: 8,
							placeholder: '🎀',
							style: { width: '70px', textAlign: 'center' },
							onInput: function (event) {
								var value = event.target.value;
								mutate(function (draft) {
									draft.bubbleDecoration = Object.assign({}, draft.bubbleDecoration || {}, { text: value, image: '' });
								}, { wallpaper: false });
								setTimeout(function () { try { scanBubbleDeco(); } catch (error) { /* ignore */ } }, 60);
							},
						}),
						h('button', {
							type: 'button', className: 'aeth-btn',
							onClick: function () {
								if (!A.galleryPicker) return;
								A.galleryPicker({
									title: '选择气泡挂件图片',
									onPick: function (id) {
										mutate(function (draft) {
											draft.bubbleDecoration = Object.assign({}, draft.bubbleDecoration || {}, { image: id, enabled: true });
										}, { wallpaper: false });
										setTimeout(function () { try { scanBubbleDeco(); } catch (error) { /* ignore */ } }, 80);
									},
								});
							},
						}, '图库'),
						h('label', {
							className: 'aeth-btn',
							style: { cursor: 'pointer' },
						}, deco.image ? '换图' : '用图片',
							h('input', {
								type: 'file',
								accept: 'image/*',
								style: { position: 'absolute', width: '0', height: '0', opacity: '0', overflow: 'hidden' },
								onChange: function (event) {
									var file = event.target.files && event.target.files[0];
									try { event.target.value = ''; } catch (error) { /* ignore */ }
									if (!file) return;
									uploadWallpaper(file, 'deco').then(function (uploaded) {
										mutate(function (draft) {
											draft.bubbleDecoration = Object.assign({}, draft.bubbleDecoration || {}, { image: uploaded.id, enabled: true });
										}, { wallpaper: false });
										setTimeout(function () { try { scanBubbleDeco(); } catch (error) { /* ignore */ } }, 80);
									}).catch(function (error) {
										pushLog('error', '气泡装饰上传失败', { message: String(error && error.message) });
									});
								},
							})
						),
						deco.image
							? h('button', {
								type: 'button',
								className: 'aeth-btn',
								onClick: function () {
									mutate(function (draft) {
										draft.bubbleDecoration = Object.assign({}, draft.bubbleDecoration || {}, { image: '', text: '🎀' });
									}, { wallpaper: false });
									setTimeout(function () { try { scanBubbleDeco(); } catch (error) { /* ignore */ } }, 60);
								},
							}, '清除图片')
							: null,
					),
					// 预览
					h('div', { className: 'aeth-note', style: { marginTop: '6px' } },
						'预览：消息气泡左下角 ',
						deco.image
							? h('img', {
								src: mediaUrl(deco.image),
								alt: '',
								style: { width: '22px', height: '22px', objectFit: 'contain', verticalAlign: 'middle', borderRadius: '5px' },
							})
							: h('span', { style: { fontSize: '17px', verticalAlign: 'middle' } }, deco.text || '🎀'),
					),
				);
			})(),
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
						var url = mediaUrl(item.id);
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
			sliderRow('压暗遮罩（黑色蒙层）', wallpaper.dim === undefined ? 0.32 : wallpaper.dim, 0, 1, 0.02, function (value) {
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
			// 0 = 跟随明暗自动（深色 .5 / 浅色 .42）。这里显示"实际生效值"，
			// 旧实现显示的 0.55 是第三份漂移的默认值，与真正生效的数值对不上。
			sliderRow('外壳暗度（顶栏/侧栏/输入框统一；0 = 自动）',
				(!glass.chromeOpacity ? (isDarkTheme() ? 0.5 : 0.42) : glass.chromeOpacity), 0, 1, 0.01, function (value) {
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

/** 样式页：气泡挂件坐标可视化 + 区域/全局自定义 CSS。 */
function StyleTab(cfg, mutate) {
	var deco = cfg.bubbleDecoration || {};
	var css = cfg.regionCss || {};
	var areaParts = [
		['global', '全局 CSS'],
		['sidebar', '侧边栏'],
		['input', '对话输入框'],
		['bubble', '用户气泡'],
		['topbar', '顶栏'],
		['titlebar', '标题栏'],
		['settings', '设置页'],
	];
	function setCss(key, value) {
		mutate(function (draft) {
			draft.regionCss = Object.assign({}, draft.regionCss || {}, { enabled: true });
			draft.regionCss[key] = value;
		}, { wallpaper: false });
	}
	return h('div', null,
		h('div', { className: 'aeth-card' },
			h('h3', null, '用户气泡挂件坐标'),
			h('div', { className: 'aeth-note', style: { marginBottom: '8px' } },
				'实时生效。X 越大越靠右，Y 越大越靠上；挂件本身在「外观 → 用户气泡左下角装饰」里开关。'),
			sliderRow('X 偏移', deco.x === undefined ? 0 : deco.x, -40, 120, 1, function (value) {
				mutate(function (draft) {
					draft.bubbleDecoration = Object.assign({}, draft.bubbleDecoration || {}, { x: value });
				}, { wallpaper: false });
			}, 'px'),
			sliderRow('Y 偏移', deco.y === undefined ? -2 : deco.y, -40, 120, 1, function (value) {
				mutate(function (draft) {
					draft.bubbleDecoration = Object.assign({}, draft.bubbleDecoration || {}, { y: value });
				}, { wallpaper: false });
			}, 'px'),
		),
		h('div', { className: 'aeth-card' },
			h('h3', null, '自定义 CSS'),
			toggleRow('启用自定义 CSS', css.enabled === true, function (value) {
				mutate(function (draft) {
					draft.regionCss = Object.assign({}, draft.regionCss || {}, { enabled: value });
				}, { wallpaper: false });
			}),
			h('div', { className: 'aeth-note', style: { margin: '6px 0 10px' } },
				'区域块里写样式时可用 {{self}} 代指该区域的选择器，例如 {{self}} { border-radius: 18px; }。留空即不注入。'),
			areaParts.map(function (pair) {
				return h('div', { key: pair[0], style: { marginBottom: '10px' } },
					h('label', { className: 'aeth-note', style: { display: 'block', marginBottom: '4px' } }, pair[1]),
					h('textarea', {
						className: 'aeth-input',
						rows: pair[0] === 'global' ? 4 : 3,
						spellCheck: false,
						value: css[pair[0]] || '',
						style: { width: '100%', fontFamily: 'Consolas, monospace', fontSize: '12px', resize: 'vertical' },
						onInput: function (event) { setCss(pair[0], event.target.value); },
					}),
				);
			}),
		),
	);
}

function ModulesTab(cfg, mutate) {
	var names = [
		['theme', '主题引擎（总开关：关掉=整套外观退场）'],
		['wallpaper', t('title.wallpaper')],
		['glass', t('title.glass')],
		['pixel', t('title.pixel')],
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
				mutate(function (draft) {
					if (key === 'theme') {
						// 主题引擎同时是总开关：两个字段一起写，避免状态不一致
						setThemeEnabled(draft, value);
						return;
					}
					draft.modules[key].enabled = value;
				}, { wallpaper: key === 'wallpaper' || key === 'pixel' || key === 'theme' });
			});
		}),
	);
}

function DiagTab(exportDiag) {
	try {
		return renderDiagTab(exportDiag);
	} catch (error) {
		// 诊断页自身出错时不能让整个面板消失，把错误显示出来
		try { pushLog('error', '诊断页渲染失败', { message: String(error && error.message) }); } catch (ignored) { /* ignore */ }
		return h('div', { className: 'aeth-card' },
			h('h3', null, '诊断'),
			h('div', { className: 'aeth-note', style: { color: '#ff9a9a' } }, '渲染失败：' + String(error && error.message)),
		);
	}
}

function renderDiagTab(exportDiag) {
	var diag = A.lastDiag || collectDiag();
	var anchors = canaryAnchors();
	var ok = canaryContractOk(anchors);
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
				h('b', null, 'data-platform'), h('span', null, anchors.platform ? 'true' : 'false（非契约锚点，web 正常）'),
				h('b', null, '配置文件'), h('span', null, (A.host.diag && A.host.diag.configFile) || '~/.dsh/aether-theme/config.json'),
				h('b', null, '下压状态'), h('span', { className: A.pressRunning ? 'aeth-ok' : 'aeth-bad' },
					A.pressRunning ? ('监听中（' + Math.round(TILT_MAX / 0.01745 * 10) / 10 + '° 倾斜）') : '未启动'),
				h('b', null, '下压目标'), h('span', null, A.pressDebug ? (A.pressDebug.tag + '.' + (A.pressDebug.cls.split(' ')[0] || '') + (A.pressDebug.position ? ' [' + A.pressDebug.position + ']' : '')) : '（把指针移到对话框上再看）'),
				h('b', null, '流星尾缀'), h('span', { className: (typeof METEOR !== 'undefined' && METEOR.canvas) ? 'aeth-ok' : (meteorEnabled() ? 'aeth-bad' : '') },
					(typeof METEOR !== 'undefined' && METEOR.canvas)
						? ('运行中 · canvas ' + METEOR.canvas.width + '×' + METEOR.canvas.height + ' · 粒子 ' + METEOR.particles.length)
						: (shouldReduceMotion() ? 'reduced-motion 静默' : (meteorEnabled() ? '已启用但未启动' : '开关未开'))),
				h('b', null, '粒子/小鱼'), h('span', { className: (typeof CRITTERS !== 'undefined' && CRITTERS.built > 0) ? 'aeth-ok' : (moduleOn('fx') ? 'aeth-bad' : '') },
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
						if (typeof METEOR === 'undefined' || !METEOR.running) {
							toast('流星未启动（检查开关/减弱动效）', 1800);
							pushLog('warn', '测试流星：未启动', { running: typeof METEOR !== 'undefined' ? METEOR.running : null });
							return;
						}
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
