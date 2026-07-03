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
	}));

	// One light rAF clock for the ambient motion (drift / breathe / shimmer).
	let t = $state(0);
	// A core-pixi ColorMatrixFilter gives the painting a slow caustic brightness/hue shimmer.
	// Created in onMount so it never runs during SSR/prerender.
	let shimmer = $state<Filter | null>(null);

	onMount(() => {
		const filter = new ColorMatrixFilter();
		shimmer = filter;

		const start = performance.now();
		let raf = 0;
		const loop = (now: number) => {
			t = (now - start) / 1000;
			// recompose the matrix each frame: gentle breathing brightness + a drifting hue
			filter.brightness(1 + Math.sin(t * 0.6) * 0.05, false);
			filter.hue(Math.sin(t * 0.13) * 5, true);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
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

	const drawParticles = (g: import('pixi.js').Graphics) => {
		const { width, height } = sizes;
		for (const p of PARTICLES) {
			const px = ((p.x / 1000) * width + Math.sin(t * 0.21 + p.phase) * 26) % width;
			const py = (((p.y / 1000) * height - t * height * p.speed) % height) + height * 0.02;
			const pulse = 0.65 + Math.sin(t * 1.1 + p.phase) * 0.35;
			g.circle(px, py < 0 ? py + height : py, p.r * pulse).fill({
				color: 0xdaf9ff,
				alpha: p.alpha,
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

<!-- swaying light shafts -->
<Graphics draw={drawGodRays} zIndex={-1.95} />

<!-- drifting marine snow for a touch of depth -->
<Container zIndex={-1.8}>
	<Graphics draw={drawParticles} />
</Container>
