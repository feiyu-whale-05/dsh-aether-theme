// ── meteor：鼠标流星尾缀（canvas 粒子，零图片） ────────────────────────
// 尊重 prefers-reduced-motion：减弱动效时整个模块不启动（连 canvas 都不建）。
// 配置：A.cfg.meteor = { enabled, density, hue }

function MeteorCursor() {
	useAetherTick();
	A.meteorMounted = true;
	var canvasState = react.useState(null);
	var canvas = canvasState[0];
	var setCanvas = canvasState[1];
	var enabled = Boolean(A.cfg && A.cfg.meteor && A.cfg.meteor.enabled) && moduleOn('theme') && !A.canary.disabled;

	react.useEffect(function () {
		if (!enabled) {
			if (canvas && canvas.parentNode) {
				try { canvas.parentNode.removeChild(canvas); } catch (error) { /* ignore */ }
			}
			return undefined;
		}
		if (shouldReduceMotion()) return undefined;
		var element = document.createElement('canvas');
		element.id = 'dsh-aether-meteor';
		element.setAttribute('aria-hidden', 'true');
		document.body.appendChild(element);
		setCanvas(element);
		return function () {
			try { element.remove(); } catch (error) { /* ignore */ }
			setCanvas(null);
		};
	}, [enabled]);

	react.useEffect(function () {
		if (!canvas || !enabled) return undefined;
		var context = canvas.getContext('2d');
		if (!context) return undefined;
		var dpr = Math.min(2, window.devicePixelRatio || 1);
		var particles = [];
		var frame = null;
		var last = { x: -1, y: -1, t: 0 };
		var density = clamp((A.cfg.meteor && A.cfg.meteor.density) || 1, 0.2, 3);
		var hueBase = clamp((A.cfg.meteor && A.cfg.meteor.hue) || 222, 0, 360);

		function resize() {
			canvas.width = Math.round(window.innerWidth * dpr);
			canvas.height = Math.round(window.innerHeight * dpr);
			canvas.style.width = '100%';
			canvas.style.height = '100%';
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
		}
		resize();
		window.addEventListener('resize', resize);

		function spawn(x, y, dx, dy) {
			var speed = Math.min(48, Math.sqrt(dx * dx + dy * dy));
			var count = Math.max(1, Math.round((0.6 + speed / 10) * density));
			for (var i = 0; i < count; i += 1) {
				particles.push({
					x: x + (Math.random() - 0.5) * 6,
					y: y + (Math.random() - 0.5) * 6,
					vx: -dx * 0.045 + (Math.random() - 0.5) * 1.4,
					vy: -dy * 0.045 + (Math.random() - 0.5) * 1.4 - 0.35,
					life: 1,
					decay: 0.012 + Math.random() * 0.02,
					size: 0.9 + Math.random() * 2.2,
					hue: hueBase + (Math.random() * 70 - 20),
				});
			}
			if (particles.length > 260) particles.splice(0, particles.length - 260);
		}

		function onMove(event) {
			var now = performance.now();
			var x = event.clientX;
			var y = event.clientY;
			var dt = now - last.t;
			if (last.x >= 0 && dt < 40) {
				spawn(x, y, x - last.x, y - last.y);
			}
			last = { x: x, y: y, t: now };
		}

		function tick() {
			context.clearRect(0, 0, window.innerWidth, window.innerHeight);
			context.globalCompositeOperation = 'lighter';
			for (var i = particles.length - 1; i >= 0; i -= 1) {
				var p = particles[i];
				p.x += p.vx;
				p.y += p.vy;
				p.vx *= 0.97;
				p.vy = p.vy * 0.97 + 0.012;
				p.life -= p.decay;
				if (p.life <= 0) {
					particles.splice(i, 1);
					continue;
				}
				var alpha = Math.max(0, p.life) * 0.85;
				var gradient = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
				gradient.addColorStop(0, 'hsla(' + p.hue + ', 100%, 78%, ' + alpha + ')');
				gradient.addColorStop(0.45, 'hsla(' + (p.hue + 18) + ', 100%, 66%, ' + (alpha * 0.55) + ')');
				gradient.addColorStop(1, 'hsla(' + (p.hue + 30) + ', 100%, 60%, 0)');
				context.fillStyle = gradient;
				context.beginPath();
				context.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
				context.fill();
			}
			context.globalCompositeOperation = 'source-over';
			frame = requestAnimationFrame(tick);
		}

		window.addEventListener('mousemove', onMove, { passive: true });
		frame = requestAnimationFrame(tick);
		return function () {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('resize', resize);
			if (frame !== null) cancelAnimationFrame(frame);
			particles = [];
		};
	}, [canvas, enabled]);

	return null;
}
