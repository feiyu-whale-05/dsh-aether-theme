// ── apply：客户端插件入口 ───────────────────────────────────────────────
// 顺序：读令牌 → 注册四个官方槽位 → 本地缓存先上屏（防止首屏白闪）→
// Host 状态覆盖 → 金丝雀启动 → 主题跟随监听 → 服务注入。

function AetherOverlayHost() {
	useAetherTick();
	return h(react.Fragment, null,
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

	// 2.35) 气泡装饰观察器
	try { startBubbleDeco(); } catch (error) { /* ignore */ }
	try { startAvatars(); } catch (error) { /* ignore */ }

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
					try { stopBubbleDeco(); } catch (error) { /* ignore */ }
					try { stopAvatars(); } catch (error) { /* ignore */ }
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
