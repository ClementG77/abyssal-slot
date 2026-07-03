<script lang="ts" module>
	export type EmitterEventTransition =
		// the dive in two awaited phases: the water wall rises to full cover (Cover), the scene
		// is swapped underneath, then the wall passes upward off the screen (Reveal)
		| { type: 'transitionCover' }
		| { type: 'transitionReveal' }
		| { type: 'freeSpinExitCover' }
		| { type: 'freeSpinExitReveal' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';
	import { cubicIn, cubicOut } from 'svelte/easing';

	import { Graphics, Rectangle } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';

	const context = getContext();

	// The base ↔ feature "dive": a wall of deep water RISES from the bottom of the screen (wavy,
	// foam-crested, bubbles streaming inside it), holds a beat, then passes upward off the screen
	// — like sinking through a depth layer. Code-driven and tween-based so the book sequence can
	// never stall: every phase is a Tween.set that always resolves.
	//
	// `dive` runs 0 → 2: 0–1 the wall's crest climbs to the top; 1–2 the wall's trailing edge
	// follows it up, revealing the scene beneath.
	const dive = new Tween(0, { duration: 1 });
	const alpha = new Tween(0, { duration: 320 });
	const irisProgress = new Tween(0, { duration: 680 });
	const FREE_SPIN_EXIT_COVER_DURATION = 350;
	const FREE_SPIN_EXIT_REVEAL_DURATION = 1650;
	let irisActive = $state(false);
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const irisRadius = $derived(
		(Math.hypot(sizes.width, sizes.height) * 0.5 + 4) * irisProgress.current,
	);

	// ambient clock for the crest wave + bubble motion during the dive
	const water = $state({ t: 0 });
	onMount(() => {
		const clock = gsap.to(water, { t: 3600, duration: 3600, ease: 'none', repeat: -1 });
		return () => clock.kill();
	});

	// deterministic bubble field (screen-fractional positions/speeds/sizes)
	const BUBBLES = Array.from({ length: 26 }, (_, i) => ({
		x: ((i * 0.383) % 1) * 0.96 + 0.02,
		speed: 0.35 + ((i * 0.271) % 1) * 0.5,
		r: 2.5 + ((i * 0.617) % 1) * 5,
		phase: i * 0.77,
	}));

	context.eventEmitter.subscribeOnMount({
		transitionCover: async () => {
			const ts = stateBetDerived.timeScale();
			dive.set(0, { duration: 0 });
			await dive.set(1, { duration: 620 / ts, easing: cubicOut });
			// the wall holds full cover until transitionReveal — the caller swaps the scene now
		},
		transitionReveal: async () => {
			const ts = stateBetDerived.timeScale();
			await waitForTimeout(120 / ts);
			await dive.set(2, { duration: 640 / ts, easing: cubicIn });
			dive.set(0, { duration: 0 });
		},
		freeSpinExitCover: async () => {
			irisActive = false;
			void irisProgress.set(0, { duration: 0 });
			void alpha.set(1, { duration: FREE_SPIN_EXIT_COVER_DURATION });
			await waitForTimeout(FREE_SPIN_EXIT_COVER_DURATION);
		},
		freeSpinExitReveal: async () => {
			irisActive = true;
			void irisProgress.set(1, { duration: FREE_SPIN_EXIT_REVEAL_DURATION });
			await waitForTimeout(FREE_SPIN_EXIT_REVEAL_DURATION);
			void alpha.set(0, { duration: 0 });
			irisActive = false;
		},
	});

	const drawDive = (g: import('pixi.js').Graphics) => {
		const d = dive.current;
		if (d <= 0 || d >= 2) return;
		const { width: W, height: H } = sizes;
		const t = water.t;

		// crest (leading, wavy) and trailing edge positions
		const crestY = H * (1 - Math.min(d, 1)) - 30; // overshoot so the wave never gaps
		const tailY = d > 1 ? H * (1 - (d - 1)) : H + 40;

		// wall body with a wavy crest
		const steps = 12;
		const amp = H * 0.018;
		const crest: { x: number; y: number }[] = [];
		for (let s = 0; s <= steps; s++) {
			const x = (W * s) / steps;
			crest.push({ x, y: crestY + Math.sin((x / W) * Math.PI * 4 + t * 5) * amp });
		}
		const tail: { x: number; y: number }[] = [];
		for (let s = steps; s >= 0; s--) {
			const x = (W * s) / steps;
			tail.push({ x, y: tailY + Math.sin((x / W) * Math.PI * 4 + t * 5 + 1.7) * amp });
		}
		// deep petrol teal — the same water family as the reel-window backdrop art
		g.poly([...crest, ...tail]).fill({ color: 0x0a3a42, alpha: 1 });

		// foam line riding the crest
		g.moveTo(crest[0].x, crest[0].y);
		for (let s = 1; s < crest.length; s++) g.lineTo(crest[s].x, crest[s].y);
		g.stroke({ width: 4, color: 0x8fe8de, alpha: 0.45 });
		// a fainter glow band just under the foam
		g.moveTo(crest[0].x, crest[0].y + 10);
		for (let s = 1; s < crest.length; s++) g.lineTo(crest[s].x, crest[s].y + 10);
		g.stroke({ width: 14, color: 0x2a8f8f, alpha: 0.16 });

		// bubbles streaming upward inside the wall
		for (const bubble of BUBBLES) {
			const bx = bubble.x * W + Math.sin(t * 1.6 + bubble.phase) * 14;
			const travel = (t * bubble.speed * H * 0.35 + bubble.phase * 200) % (H * 1.1);
			const by = H + 20 - travel;
			// only inside the water band, fading near the crest
			if (by < crestY + 24 || by > tailY) continue;
			const nearCrest = Math.min(1, (by - crestY) / (H * 0.12));
			g.circle(bx, by, bubble.r).stroke({
				width: 1.5,
				color: 0x9ff0e6,
				alpha: 0.4 * nearCrest,
			});
			g.circle(bx - bubble.r * 0.3, by - bubble.r * 0.3, bubble.r * 0.25).fill({
				color: 0xffffff,
				alpha: 0.35 * nearCrest,
			});
		}
	};
</script>

{#if dive.current > 0 && dive.current < 2}
	<Graphics zIndex={40} draw={drawDive} />
{/if}

{#if irisActive}
	<Graphics
		zIndex={40}
		draw={(g) => {
			const centerX = sizes.width * 0.5;
			const centerY = sizes.height * 0.5;
			const top = Math.max(0, centerY - irisRadius);
			const bottom = Math.min(sizes.height, centerY + irisRadius);
			const fill = { color: 0x05080f, alpha: 1 };

			if (irisRadius < 1) {
				g.rect(0, 0, sizes.width, sizes.height).fill(fill);
				return;
			}

			if (top > 0) g.rect(0, 0, sizes.width, top).fill(fill);
			if (bottom < sizes.height) g.rect(0, bottom, sizes.width, sizes.height - bottom).fill(fill);

			const left = [{ x: 0, y: top }];
			const right = [{ x: sizes.width, y: top }];
			const steps = 28;
			for (let index = 0; index <= steps; index += 1) {
				const y = top + ((bottom - top) * index) / steps;
				const halfChord = Math.sqrt(Math.max(0, irisRadius ** 2 - (y - centerY) ** 2));
				left.push({ x: Math.max(0, centerX - halfChord), y });
				right.push({ x: Math.min(sizes.width, centerX + halfChord), y });
			}
			left.push({ x: 0, y: bottom });
			right.push({ x: sizes.width, y: bottom });
			g.poly(left).fill(fill);
			g.poly(right).fill(fill);
		}}
	/>
{:else if alpha.current > 0.001}
	<Rectangle {...sizes} backgroundColor={0x05080f} backgroundAlpha={alpha.current} zIndex={40} />
{/if}
