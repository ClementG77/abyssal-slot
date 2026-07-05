<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import { Container, Graphics } from 'pixi-svelte';
	import { CanvasSizeRectangle } from 'components-layout';

	import type { WinLevelAlias } from '../game/winLevelMap';
	import { getContext } from '../game/context';

	// Gates-style celebration fountain, in water: two emitters at the bottom of the screen spray
	// bubbles diagonally up-left and up-right for the whole takeover. Water drag bleeds off the
	// launch velocity, then buoyancy carries them; each `burstKey` bump (tier-up / lock) fires a
	// dense surge. Bigger win levels run a denser, faster fountain.
	type Props = {
		burstKey?: number;
		levelAlias?: WinLevelAlias;
	};

	const props: Props = $props();
	const context = getContext();

	// ---- Tunable knobs ----------------------------------------------------------------------
	const FLOW_RATE = 26; // bubbles / second at intensity 1 (continuous fountain)
	const SURGE_COUNT = 56; // extra bubbles per tier-up / lock burst
	const SPRAY_ANGLE = 0.62; // radians off vertical the diagonals lean (≈35°)
	const SPRAY_SPREAD = 0.38; // fan width around each diagonal
	const DRAG = 1.9; // water drag (1/s) — how fast launch speed bleeds off
	const BUOYANCY = 0.22; // upward accel as a fraction of screen height / s²

	type Bubble = {
		x: number;
		y: number;
		vx: number; // px / second at launch
		vy: number;
		size: number;
		wobble: number; // phase for the sideways sway
		born: number; // performance.now()
		life: number; // seconds
		bright: boolean; // a few run hotter for sparkle
	};

	let bubbles: Bubble[] = [];
	let now = $state(0);
	let count = $state(0);
	let raf = 0;
	let spawnDebt = 0;

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const intensity = $derived(
		props.levelAlias === 'max'
			? 1.7
			: props.levelAlias === 'epic'
				? 1.35
				: props.levelAlias === 'mega'
					? 1.1
					: 0.9,
	);

	const spawnBubble = (t0: number, surge = false) => {
		const { width, height } = sizes;
		// two emitters just below the bottom edge, either side of centre
		const side = Math.random() < 0.5 ? -1 : 1;
		const originX = width * (0.5 + side * (0.06 + Math.random() * 0.1));
		// diagonal spray: lean SPRAY_ANGLE off vertical toward that side, fan by SPRAY_SPREAD
		const angle =
			-Math.PI / 2 + side * SPRAY_ANGLE + (Math.random() - 0.5) * SPRAY_SPREAD;
		const speed = height * (0.55 + Math.random() * 0.65) * intensity * (surge ? 1.25 : 1);
		bubbles.push({
			x: originX,
			y: height + 20,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: height * 0.008 * (0.6 + Math.random() * 1.5),
			wobble: Math.random() * Math.PI * 2,
			born: t0,
			life: 1.6 + Math.random() * 1.3,
			bright: Math.random() > 0.72,
		});
	};

	const spawnSurge = () => {
		const t0 = performance.now();
		const amount = Math.round(SURGE_COUNT * intensity);
		for (let i = 0; i < amount; i++) spawnBubble(t0, true);
		count = bubbles.length;
	};

	// fire a surge whenever burstKey changes (skip the initial mount value)
	let prevKey: number | undefined;
	$effect(() => {
		const key = props.burstKey;
		if (key !== undefined && key !== prevKey) {
			if (prevKey !== undefined) spawnSurge();
			prevKey = key;
		}
	});

	onMount(() => {
		let last = performance.now();
		const loop = (t: number) => {
			now = t;
			const dt = Math.min((t - last) / 1000, 0.05);
			last = t;
			// continuous fountain: accumulate fractional spawns so the rate is frame-rate proof
			spawnDebt += FLOW_RATE * intensity * dt;
			while (spawnDebt >= 1) {
				spawnDebt -= 1;
				spawnBubble(t);
			}
			bubbles = bubbles.filter((b) => (t - b.born) / 1000 <= b.life);
			count = bubbles.length;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
	});
	onDestroy(() => cancelAnimationFrame(raf));

	const draw = (g: import('pixi.js').Graphics) => {
		const { height } = sizes;
		const buoy = height * BUOYANCY;
		for (const b of bubbles) {
			const t = (now - b.born) / 1000;
			if (t < 0 || t > b.life) continue;
			// closed-form drag: position from exponentially-decaying launch velocity...
			const decay = (1 - Math.exp(-DRAG * t)) / DRAG;
			const x = b.x + b.vx * decay + Math.sin(t * 3.2 + b.wobble) * b.size * 2.4;
			// ...plus buoyancy taking over as the launch speed dies
			const y = b.y + b.vy * decay - 0.5 * buoy * t * t;
			if (y < -40) continue;

			const lifeFrac = t / b.life;
			const alpha =
				(lifeFrac < 0.75 ? 1 : Math.max(0, (1 - lifeFrac) / 0.25)) * (b.bright ? 1 : 0.72);
			const r = b.size * (1 + lifeFrac * 0.5); // bubbles grow as they rise

			// soft glow core + rim + specular highlight (no hard shapes)
			g.circle(x, y, r * 2.1).fill({ color: 0x7fd8ff, alpha: alpha * 0.08 });
			g.circle(x, y, r).fill({ color: 0xbfeaff, alpha: alpha * 0.1 });
			g.circle(x, y, r).stroke({ width: 1.2, color: 0xd8f6ff, alpha: alpha * 0.75 });
			g.circle(x - r * 0.32, y - r * 0.36, Math.max(0.8, r * 0.22)).fill({
				color: 0xffffff,
				alpha: alpha * 0.8,
			});
		}
	};
</script>

{#if count > 0}
	<!-- a near-invisible full-canvas rect keeps the draw mounted in screen space -->
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.001} />
	<Container blendMode="add">
		<Graphics {draw} />
	</Container>
{/if}
