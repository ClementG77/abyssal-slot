<script lang="ts">
	// Painted abyss scene (`base.webp`) used as a full-cover backdrop, brought to
	// life with a core-pixi ColorMatrixFilter shimmer + a slow breathe/drift and light shafts.
	import { onMount } from 'svelte';
	import { ColorMatrixFilter, type Filter } from 'pixi.js';
	import { Tween } from 'svelte/motion';

	import { Container, Graphics, Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';

	const context = getContext();
	const IMAGE_RATIO = 2752 / 1536; // base.webp / freespins.webp
	const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
		x: (i * 137) % 1000,
		y: (i * 251) % 1000,
		r: 1.4 + (i % 5) * 0.7,
		speed: 0.018 + (i % 7) * 0.006,
		alpha: 0.14 + (i % 4) * 0.05,
		phase: i * 0.77,
		depth: 0.45 + (i % 6) * 0.12,
	}));
	const BUBBLES = Array.from({ length: 10 }, (_, i) => ({
		x: (i * 211 + 90) % 1000,
		y: (i * 307 + 140) % 1000,
		r: 3.5 + (i % 4) * 1.6,
		speed: 0.028 + (i % 5) * 0.008,
		alpha: 0.08 + (i % 3) * 0.025,
		phase: i * 1.13,
		wander: 18 + (i % 4) * 10,
	}));
	const CAUSTIC_BANDS = Array.from({ length: 5 }, (_, i) => ({
		y: 0.12 + i * 0.115,
		phase: i * 1.71,
		amp: 7 + (i % 3) * 4,
		alpha: 0.018 + i * 0.004,
	}));

	// One light rAF clock for the ambient motion (drift / breathe / shimmer).
	let t = $state(0);
	let reduceMotion = $state(false);
	// A core-pixi ColorMatrixFilter gives the painting a slow caustic brightness/hue shimmer.
	// Created in onMount so it never runs during SSR/prerender.
	let shimmer = $state<Filter | null>(null);

	onMount(() => {
		const filter = new ColorMatrixFilter();
		shimmer = filter;

		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		let start = performance.now();
		let raf = 0;
		const loop = (now: number) => {
			t = (now - start) / 1000;
			// recompose the matrix each frame: gentle breathing brightness + a drifting hue
			filter.brightness(1 + Math.sin(t * 0.6) * 0.05, false);
			filter.hue(Math.sin(t * 0.13) * 5, true);
			raf = requestAnimationFrame(loop);
		};
		const startLoop = () => {
			if (raf || reduceMotion) return;
			start = performance.now() - t * 1000;
			raf = requestAnimationFrame(loop);
		};
		const stopLoop = () => {
			if (!raf) return;
			cancelAnimationFrame(raf);
			raf = 0;
		};
		const syncMotionPreference = () => {
			reduceMotion = media.matches;
			if (reduceMotion) {
				stopLoop();
				t = 0;
				filter.brightness(1.02, false);
				filter.hue(0, true);
				return;
			}
			startLoop();
		};

		syncMotionPreference();
		media.addEventListener('change', syncMotionPreference);

		return () => {
			stopLoop();
			media.removeEventListener('change', syncMotionPreference);
		};
	});

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const feature = $derived(context.stateGame.gameType === 'freegame');
	const featureMix = new Tween(0, { duration: 720 });

	$effect(() => {
		featureMix.set(feature ? 1 : 0);
	});

	// slow drift + gentle swell, applied to the cover transform only (cheap)
	const driftX = $derived(Math.sin(t * 0.06) * 14);
	const driftY = $derived(Math.cos(t * 0.045) * 10);
	const breathe = $derived(1 + Math.sin(t * 0.08) * 0.014);

	// cover the canvas with the 3:2 painting (recomputes on resize / per frame for breathe)
	const cover = $derived.by(() => {
		const { width: cw, height: ch } = sizes;
		let w = cw;
		let h = cw / IMAGE_RATIO;
		if (h < ch) {
			h = ch;
			w = ch * IMAGE_RATIO;
		}
		return {
			cx: cw / 2 + driftX,
			cy: ch / 2 + driftY,
			w: w * 1.06 * breathe,
			h: h * 1.06 * breathe,
		};
	});

	// slow swaying light shafts over the painting (the underwater "godray" effect)
	const drawGodRays = (g: import('pixi.js').Graphics) => {
		const { width, height } = sizes;
		const top = height * -0.05;
		const sway = Math.sin(t * 0.055) * width * 0.035;
		const color = feature ? 0xbfe6ff : 0xa07bff;
		for (let i = 0; i < 6; i++) {
			const x = width * (0.16 + i * 0.14) + sway * (i % 2 ? -1 : 1);
			const w = width * (0.05 + (i % 3) * 0.014);
			const pulse = 0.55 + Math.sin(t * 0.4 + i) * 0.45;
			g.moveTo(x, top)
				.lineTo(x + w, top)
				.lineTo(x + w * 2.6, height * 0.8)
				.lineTo(x - w * 1.4, height * 0.8)
				.fill({ color, alpha: 0.04 * pulse });
		}
	};

	const drawAmbientGlow = (g: import('pixi.js').Graphics) => {
		const { width, height } = sizes;
		const color = feature ? 0x5fdcff : 0x6d4cff;
		const pulse = 0.55 + Math.sin(t * 0.22) * 0.45;
		const sidePulse = 0.55 + Math.cos(t * 0.18 + 1.3) * 0.45;

		g.ellipse(
			width * 0.52,
			height * (0.08 + Math.sin(t * 0.11) * 0.015),
			width * 0.42,
			height * 0.16,
		).fill({ color, alpha: 0.032 + pulse * 0.026 });
		g.ellipse(
			width * (0.22 + Math.sin(t * 0.07) * 0.015),
			height * 0.64,
			width * 0.22,
			height * 0.24,
		).fill({ color: 0x21f2c5, alpha: feature ? 0.022 + sidePulse * 0.015 : 0.014 });
		g.ellipse(
			width * (0.82 + Math.cos(t * 0.08) * 0.018),
			height * 0.55,
			width * 0.2,
			height * 0.2,
		).fill({ color: 0x9f6bff, alpha: feature ? 0.012 : 0.018 + sidePulse * 0.012 });
	};

	const drawCaustics = (g: import('pixi.js').Graphics) => {
		const { width, height } = sizes;
		const color = feature ? 0xd8fbff : 0xc4aeff;
		const segmentCount = 12;

		for (const [i, band] of CAUSTIC_BANDS.entries()) {
			g.beginPath();
			const baseY = height * band.y + Math.sin(t * 0.13 + band.phase) * height * 0.012;
			for (let segment = 0; segment <= segmentCount; segment++) {
				const x = (segment / segmentCount) * width;
				const wave =
					Math.sin(segment * 1.35 + t * 0.32 + band.phase) * band.amp +
					Math.sin(segment * 0.7 - t * 0.19 + i) * band.amp * 0.55;
				if (segment === 0) g.moveTo(x, baseY + wave);
				else g.lineTo(x, baseY + wave);
			}
			const pulse = 0.55 + Math.sin(t * 0.48 + band.phase) * 0.45;
			g.stroke({ width: 1 + (i % 2) * 0.6, color, alpha: band.alpha * pulse });
		}
	};

	const drawParticles = (g: import('pixi.js').Graphics) => {
		const { width, height } = sizes;
		for (const p of PARTICLES) {
			const px = ((p.x / 1000) * width + Math.sin(t * 0.21 + p.phase) * 26 * p.depth) % width;
			const py =
				(((p.y / 1000) * height - t * height * p.speed * p.depth) % height) + height * 0.02;
			const pulse = 0.65 + Math.sin(t * 1.1 + p.phase) * 0.35;
			g.circle(px, py < 0 ? py + height : py, p.r * p.depth * pulse).fill({
				color: 0xdaf9ff,
				alpha: p.alpha * (0.65 + p.depth * 0.35),
			});
		}
	};

	const drawBubbles = (g: import('pixi.js').Graphics) => {
		const { width, height } = sizes;
		const color = feature ? 0xe2fdff : 0xcbd6ff;
		const travelRange = height * 1.12;

		for (const bubble of BUBBLES) {
			const px =
				((bubble.x / 1000) * width + Math.sin(t * 0.42 + bubble.phase) * bubble.wander + width) %
				width;
			const travel = (t * height * bubble.speed + (bubble.y / 1000) * travelRange) % travelRange;
			const py = height * 1.04 - travel;
			const pulse = 0.75 + Math.sin(t * 0.9 + bubble.phase) * 0.25;
			const radius = bubble.r * pulse;

			g.circle(px, py, radius).stroke({ width: 1, color, alpha: bubble.alpha });
			g.circle(px - radius * 0.3, py - radius * 0.35, Math.max(0.9, radius * 0.18)).fill({
				color: 0xffffff,
				alpha: bubble.alpha * 0.55,
			});
		}
	};
</script>

<!-- deep backdrop so letterbox edges read as abyss, never white -->
<Rectangle {...sizes} backgroundColor={0x05080f} zIndex={-3} />

<!-- painted scene as a full cover, animated with the shimmer filter + breathe/drift -->
<Sprite
	key="backgroundBase"
	anchor={0.5}
	x={cover.cx}
	y={cover.cy}
	width={cover.w}
	height={cover.h}
	alpha={1 - featureMix.current}
	filters={shimmer ? [shimmer] : []}
	zIndex={-2}
/>
<Sprite
	key="backgroundFs"
	anchor={0.5}
	x={cover.cx}
	y={cover.cy}
	width={cover.w}
	height={cover.h}
	alpha={featureMix.current}
	filters={shimmer ? [shimmer] : []}
	zIndex={-2}
/>

<!-- soft mode-colored glow under the rays -->
<Graphics draw={drawAmbientGlow} zIndex={-1.98} />

<!-- swaying light shafts -->
<Graphics draw={drawGodRays} zIndex={-1.95} />

<!-- faint caustic lines, drifting marine snow, and a few slow bubbles for depth -->
<Graphics draw={drawCaustics} zIndex={-1.9} />
<Container zIndex={-1.8}>
	<Graphics draw={drawParticles} />
	<Graphics draw={drawBubbles} />
</Container>
