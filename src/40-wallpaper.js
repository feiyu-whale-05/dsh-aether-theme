// ── wallpaper：背景层（图片 / 视频 / 纯 CSS 动态） ──────────────────────
// 防闪烁：双缓冲——旧层先保持、新层从 opacity:0 淡入，过渡结束才移除旧层；
// 视频用原生流式硬解（muted + playsinline + preload=metadata），200MB 文件
// 不进内存、不阻塞主线程。

/**
 * 彻底释放一层壁纸：先让 <video> 停止解码，再摘节点。
 * Chromium 对"已脱离文档"的媒体元素不保证立刻挂起解码，4K 视频壁纸会持续吃 GPU/内存。
 */
function disposeWallLayer(layer) {
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
		video.addEventListener('error', function () {
			pushLog('warn', '视频壁纸加载失败，降级为纯 CSS 背景', { source: String(source).slice(0, 120) });
			try { layer.remove(); } catch (error) { /* ignore */ }
			A.currentWallKey = '';
			var preset = A.cfg && A.cfg.wallpaper ? A.cfg.wallpaper.cssPreset : 'aurora';
			swapWallLayer('css', preset || 'aurora');
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

function ensureVeil() {
	var stage = ensureStage();
	var veil = stage.querySelector('.aether-veil');
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
		var video = A.videoEl;
		if (!video || !video.isConnected) return;
		if (document.hidden) return;
		if (video.paused) video.play().catch(function () { /* ignore */ });
	} catch (error) { /* ignore */ }
}

function applyWallpaper(reason) {
	if (A.canary.disabled) return;
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
