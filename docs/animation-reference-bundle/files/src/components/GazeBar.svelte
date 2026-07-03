<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { FillGradient, type Graphics as PixiGraphics } from 'pixi.js';
	import { GlowFilter } from 'pixi-filters/glow';

	import { Container, Graphics } from 'pixi-svelte';

	// Polished energy fill for the Gaze tube. Prop-driven: give it the tube rect (top-left) and a
	// 0..1 fill level. It renders a gradient "liquid" pill with a glowing rim (GlowFilter), a
	// bright rising meniscus, and floating energy bubbles — the motion is driven by GSAP.
	type Props = {
		x: number;
		y: number;
		width: number;
		height: number;
		fill: number; // 0..1
	};
	const props: Props = $props();

	// gsap-driven decorative values
	let glow = $state<GlowFilter | null>(null);
	let phase = $state(0); // bubble rise 0..1 (loops)
	let crestAlpha = $state(0.7); // meniscus shimmer

	onMount(() => {
		const g = new GlowFilter({
			distance: 16,
			outerStrength: 1.7,
			innerStrength: 0.6,
			color: 0x237caf,
			quality: 0.4,
			alpha: 0.95,
		});
		glow = g;

		// pulse the glow, loop the bubbles, shimmer the meniscus
		const pulse = gsap.to(g, {
			outerStrength: 3.5,
			duration: 0.9,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut',
		});
		const bubble = { p: 0 };
		const rise = gsap.to(bubble, {
			p: 1,
			duration: 1.6,
			repeat: -1,
			ease: 'none',
			onUpdate: () => (phase = bubble.p),
		});
		const crest = { a: 0.55 };
		const shimmer = gsap.to(crest, {
			a: 1,
			duration: 0.7,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut',
			onUpdate: () => (crestAlpha = crest.a),
		});

		return () => {
			pulse.kill();
			rise.kill();
			shimmer.kill();
			g.destroy();
		};
	});

	const fillH = $derived(Math.max(0, props.height * Math.min(Math.max(props.fill, 0), 1)));
	const fillY = $derived(props.y + props.height - fillH);
	const radius = $derived(props.width / 2);

	// gradient "liquid" pill — redraws only when the level changes
	const drawFill = (g: PixiGraphics) => {
		if (fillH <= 1) return;
		const grad = new FillGradient({
			textureSpace: 'local',
			start: { x: 0, y: 0 },
			end: { x: 0, y: 1 },
			colorStops: [
				{ offset: 0, color: 0x66c7e8 },
				{ offset: 0.35, color: 0x1b6f9d },
				{ offset: 1, color: 0x082946 },
			],
		});
		g.roundRect(props.x, fillY, props.width, fillH, radius).fill(grad);
	};

	// bright meniscus at the top of the fill (position follows the level; alpha shimmers via prop)
	const drawCrest = (g: PixiGraphics) => {
		if (fillH <= 2) return;
		g.roundRect(props.x, fillY, props.width, Math.min(fillH, radius * 1.1), radius).fill({
			color: 0xa6e4f5,
		});
	};

	const BUBBLES = Array.from({ length: 6 }, (_, i) => ({
		x: 0.28 + ((i * 0.27) % 0.46),
		r: 0.1 + (i % 3) * 0.05,
		speed: 0.7 + (i % 4) * 0.25,
		offset: (i * 0.37) % 1,
	}));
	const drawBubbles = (g: PixiGraphics) => {
		if (fillH <= radius) return;
		for (const b of BUBBLES) {
			const p = (phase * b.speed + b.offset) % 1;
			const by = props.y + props.height - p * fillH;
			if (by < fillY + radius * 0.3) continue;
			g.circle(props.x + props.width * b.x, by, props.width * b.r).fill({
				color: 0x9bdcf2,
				alpha: 0.22 * (1 - p),
			});
		}
	};
</script>

<Container filters={glow ? [glow] : []}>
	<Graphics draw={drawFill} />
	<Graphics draw={drawCrest} alpha={crestAlpha} />
	<Graphics draw={drawBubbles} />
</Container>
