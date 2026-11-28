// ── wallpaper：背景层（图片 / 视频 / 纯 CSS 动态） ──────────────────────
// 防闪烁：双缓冲——旧层先保持、新层从 opacity:0 淡入，过渡结束才移除旧层；
// 视频用原生流式硬解（muted + playsinline + preload=metadata），200MB 文件
// 不进内存、不阻塞主线程。

/**
 * 彻底释放一层壁纸：先让 <video> 停止解码，再摘节点。
 * Chromium 对"已脱离文档"的媒体元素不保证立刻挂起解码，4K 视频壁纸会持续吃 GPU/内存。
 */
function disposeWallLayer(layer) {
	// 只有"整层被替换"时才释放 blob；同一层内部换 src 由调用方处理
	try { releaseWallpaperBlob(); } catch (error) { /* ignore */ }
	try {
		var media = layer && layer.querySelector ? layer.querySelector('video') : null;
		if (media) {
			try { media.pause(); } catch (error) { /* ignore */ }
			try { media.removeAttribute('src'); } catch (error) { /* ignore */ }
			try { media.load(); } catch (error) { /* ignore */ }
		}
	} catch (error) { /* ignore */ }
	try { layer.remove(); } catch (error) { /* ignore */ }
}

function clearWallpaperLayers() {
	if (A.videoEl) {
		try { A.videoEl.pause(); } catch (error) { /* ignore */ }
		try { A.videoEl.removeAttribute('src'); } catch (error) { /* ignore */ }
		try { A.videoEl.load(); } catch (error) { /* ignore */ }
		A.videoEl = null;
	}
	A.layerEls.forEach(disposeWallLayer);
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

/** 释放上一张 Blob 壁纸，避免切换多次后内存堆积 */
function releaseWallpaperBlob() {
	try {
		if (A.videoBlobUrl) { URL.revokeObjectURL(A.videoBlobUrl); A.videoBlobUrl = null; }
	} catch (error) { /* ignore */ }
}

/**
 * 用带 header 令牌的请求把媒体取成 Blob URL。
 * 只在 <video>/<img> 直连失败时兜底（query 令牌在 dsh-app:// 下不可靠）。
 * 超过上限（默认 96MB）不兜底，避免把大文件塞进内存。
 * @returns {Promise<string|null>}
 */
function fetchWallpaperBlob(source, kind) {
	var id = '';
	try {
		var m = /[?&]id=([^&]+)/.exec(String(source || ''));
		if (m) id = decodeURIComponent(m[1]);
	} catch (error) { /* ignore */ }
	if (!id) return Promise.resolve(null);
	var limitBytes = 96 * 1024 * 1024;
	// 加超时：自定义协议下媒体流请求可能一直不返回
	var controller = null;
	try { controller = new AbortController(); } catch (error) { controller = null; }
	var timer = controller ? setTimeout(function () { try { controller.abort(); } catch (error) { /* ignore */ } }, 8000) : null;
	var clearTimer = function () { if (timer) { try { clearTimeout(timer); } catch (error) { /* ignore */ } } };
	return apiFetch('/api/wallpaper?id=' + encodeURIComponent(id), { raw: true, signal: controller ? controller.signal : undefined })
		.then(function (r) { clearTimer(); return r; }, function (e) { clearTimer(); throw e; })
		.then(function (response) {
			if (!response || !response.ok) return null;
			var length = Number(response.headers.get('content-length') || 0);
			if (length && length > limitBytes) {
				pushLog('warn', '媒体过大，放弃 Blob 兜底', { id: id, bytes: length });
				return null;
			}
			return response.blob();
		})
		.then(function (blob) {
			if (!blob || blob.size === 0) return null;
			if (blob.size > limitBytes) return null;
			releaseWallpaperBlob();
			return URL.createObjectURL(blob);
		})
		.catch(function (error) {
			pushLog('warn', '媒体 Blob 兜底失败', { id: id, message: String(error && error.message).slice(0, 80) });
			return null;
		});
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
		// 只兜底一次，避免 401 → blob 失败 → 再兜底的死循环
		var recovered = false;
		video.addEventListener('error', function () {
			var fail = {
				kind: 'video',
				url: String(video.currentSrc || video.src || source).slice(0, 220),
				code: video.error ? video.error.code : null,
				message: video.error ? String(video.error.message || '').slice(0, 120) : '',
				networkState: video.networkState,
				at: Date.now(),
			};
			A.lastMediaFail = fail;
			// 桌面版走 dsh-app:// 自定义协议：<video> 无法带自定义 header，
			// 如果协议层把 query 吃掉或拒绝，直连必然失败。
			// 这时改用 apiFetch（带 x-dsh-aether-token header，桌面版是通的）
			// 把媒体取成 Blob，再用 blob: URL 播 —— 绕开协议层的鉴权限制。
			if (!recovered && typeof fetch === 'function') {
				recovered = true;
				fetchWallpaperBlob(source, 'video').then(function (blobUrl) {
					if (!blobUrl) {
						pushLog('warn', '视频壁纸加载失败，降级为纯 CSS 背景', { url: fail.url, code: fail.code });
						try { layer.remove(); } catch (error) { /* ignore */ }
						A.currentWallKey = '';
						var preset = A.cfg && A.cfg.wallpaper ? A.cfg.wallpaper.cssPreset : 'aurora';
						swapWallLayer('css', preset || 'aurora');
						return;
					}
					pushLog('info', '视频壁纸改走 Blob 通路', { url: fail.url });
					A.videoBlobUrl = blobUrl;
					video.src = blobUrl;
					video.play().catch(function () { /* ignore */ });
				});
				return;
			}
			pushLog('warn', '视频壁纸加载失败，降级为纯 CSS 背景', { url: fail.url, code: fail.code });
			try { layer.remove(); } catch (error) { /* ignore */ }
			A.currentWallKey = '';
			var preset2 = A.cfg && A.cfg.wallpaper ? A.cfg.wallpaper.cssPreset : 'aurora';
			swapWallLayer('css', preset2 || 'aurora');
		});
		var playPromise = video.play();
		if (playPromise && typeof playPromise.catch === 'function') {
			playPromise.catch(function () {
				// 自动播放被拦：静音后重试一次
				video.muted = true;
				video.play().catch(function () { /* 留给用户点击/悬停 */ });
			});
		}
		// 记住当前视频，供「恢复可见/被暂停」时续播
		A.videoEl = video;
		video.addEventListener('pause', function () {
			// 窗口最小化、后台节流、系统休眠都会暂停视频；恢复后自动续播
			if (document.hidden) return;
			setTimeout(function () {
				if (video.isConnected && video.paused && !document.hidden) {
					video.play().catch(function () { /* ignore */ });
				}
			}, 300);
		});
		video.addEventListener('ended', function () {
			try { video.currentTime = 0; video.play().catch(function () { /* ignore */ }); } catch (error) { /* ignore */ }
		});
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
	// 切走视频壁纸时清掉陈旧引用：否则 ensureVideoPlaying() 还会对已脱离文档的
	// <video> 调 play()，并在诊断里报"已暂停"的假象。
	if (kind !== 'video') A.videoEl = null;
	stage.appendChild(layer);
	var reduced = shouldReduceMotion();
	if (reduced) {
		layer.style.transition = 'none';
		layer.classList.add('is-on');
		oldLayers.forEach(disposeWallLayer);
		A.layerEls = [layer];
		A.currentWallKey = key;
		return;
	}
	// 双缓冲：先挂上（opacity 0），下一帧再淡入
	requestAnimationFrame(function () {
		try { layer.classList.add('is-on'); } catch (error) { /* ignore */ }
	});
	var cleanup = setTimeout(function () {
		oldLayers.forEach(disposeWallLayer);
	}, 900);
	// 旧层保持到新层过渡完成（transitionend 是加分项，setTimeout 是兜底）
	layer.addEventListener('transitionend', function handler() {
		layer.removeEventListener('transitionend', handler);
		if (cleanup) clearTimeout(cleanup);
		oldLayers.forEach(disposeWallLayer);
	});
	A.layerEls = [layer];
	A.currentWallKey = key;
}

/** 读当前 veil 的 alpha（0~1）。alpha 为 0 时不该存在这个全屏层。 */
function veilAlphaNow() {
	try {
		var raw = getComputedStyle(document.documentElement).getPropertyValue('--aether-veil').trim();
		var m = /rgba?\([^)]*?,\s*([0-9.]+)\s*\)/.exec(raw);
		if (m) return Number(m[1]);
		if (raw === 'transparent' || raw === '') return 0;
		return 1;     // #000 之类的不透明色
	} catch (error) {
		return 0;
	}
}

/**
 * 只有确实需要压暗时才创建 veil。
 * 旧实现无条件创建，于是 dim=0 + brightness=1 时白白多一个全屏合成层。
 * @returns {HTMLElement|null}
 */
function ensureVeil() {
	var stage = ensureStage();
	var veil = stage.querySelector('.aether-veil');
	if (veilAlphaNow() <= 0.004) {
		if (veil) { try { veil.remove(); } catch (error) { /* ignore */ } }
		return null;
	}
	if (!veil) {
		veil = document.createElement('div');
		veil.className = 'aether-veil';
		stage.appendChild(veil);
	}
	return veil;
}

/** 应用壁纸配置（模式/来源/预设/本地库 id）。 */
/** 页面重新可见 / 窗口获得焦点时，把被节流暂停的视频壁纸续播。 */
function ensureVideoPlaying() {
	try {
		if (A.idle && A.idle.paused) return;   // 失焦/不可见：不要抢着续播
		var video = A.videoEl;
		if (!video || !video.isConnected) return;
		if (document.hidden) return;
		if (video.paused) video.play().catch(function () { /* ignore */ });
	} catch (error) { /* ignore */ }
}

function applyWallpaper(reason) {
	if (A.canary.disabled) return;
	// 主题引擎整体关闭时绝不能再建舞台层：面板的 mutate 是"先 applyAppearance（拆解）
	// 再 applyWallpaper"，后者会 ensureStage() 把刚拆掉的舞台又造回来（实测踩到：
	// data-dsh-aether 已移除，但 #dsh-aether-stage 还在）。
	var engineDisabled = A.cfg && (A.cfg.enabled === false
		|| (A.cfg.modules && A.cfg.modules.theme && A.cfg.modules.theme.enabled === false));
	if (engineDisabled) {
		clearWallpaperLayers();
		removeStage();
		return;
	}
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
			? mediaUrl(config.id)
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
			pushLog('info', '壁纸已删除', { id: id });
			notify();
		} else {
			pushLog('warn', '壁纸删除失败', { id: id, error: payload && payload.error });
		}
		return payload;
	});
}
