<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import { Container, Graphics } from 'pixi-svelte';
	import { CanvasSizeRectangle } from 'components-layout';

	import type { WinLevelAlias } from '../game/winLevelMap';
	import { getContext } from '../game/context';

	// Physics coin bursts. Each bump of `burstKey` launches a fan of coins upward from the lower
	// board; they arc under gravity, spin (faked with an ellipse squash) and fade out. Used for the
	// win-tier escalations and the final count-up lock — bigger win levels throw more, faster coins.
	type Props = {
		burstKey?: number;
		levelAlias?: WinLevelAlias;
	};

	const props: Props = $props();
	const context = getContext();

	type Coin = {
		x: number; // launch origin
		y: number;
		vx: number; // px / second
		vy: number;
		size: number;
		rot: number;
		vrot: number;
		born: number; // performance.now()
		life: number; // seconds
		gold: boolean;
	};

	let coins: Coin[] = [];
	let now = $state(0);
	let count = $state(0);
	let raf = 0;

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const intensity = $derived(
		props.levelAlias === 'max'
			? 1.6
			: props.levelAlias === 'epic'
				? 1.3
				: props.levelAlias === 'mega'
					? 1.1
					: 0.9,
	);

	const GRAVITY = () => sizes.height * 1.8; // px / second²

	const spawnBurst = () => {
		const cx = sizes.width / 2;
		const cy = sizes.height * 0.62;
		const amount = Math.round(46 * intensity);
		const t0 = performance.now();
		for (let i = 0; i < amount; i++) {
			const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95; // upward fan
			const speed = sizes.height * (0.62 + Math.random() * 0.75) * intensity;
			coins.push({
				x: cx + (Math.random() - 0.5) * sizes.width * 0.22,
				y: cy,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				size: sizes.height * 0.013 * (0.7 + Math.random() * 0.9),
				rot: Math.random() * Math.PI,
				vrot: (Math.random() - 0.5) * 9,
				born: t0,
				life: 1.15 + Math.random() * 0.8,
				gold: Math.random() > 0.4,
			});
		}
		count = coins.length;
	};

	// fire a burst whenever burstKey changes (skip the initial mount value)
	let prevKey: number | undefined;
	$effect(() => {
		const key = props.burstKey;
		if (key !== undefined && key !== prevKey) {
			if (prevKey !== undefined) spawnBurst();
			prevKey = key;
		}
	});

	onMount(() => {
		const loop = (t: number) => {
			now = t;
			if (coins.length) {
				coins = coins.filter((c) => (t - c.born) / 1000 <= c.life);
				count = coins.length;
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
	});
	onDestroy(() => cancelAnimationFrame(raf));

	const draw = (g: import('pixi.js').Graphics) => {
		const G = GRAVITY();
		for (const c of coins) {
			const t = (now - c.born) / 1000;
			if (t < 0 || t > c.life) continue;
			const x = c.x + c.vx * t;
			const y = c.y + c.vy * t + 0.5 * G * t * t;
			if (y > sizes.height + 60) continue;

			const lifeFrac = t / c.life;
			const alpha = lifeFrac < 0.82 ? 1 : Math.max(0, (1 - lifeFrac) / 0.18);
			const rot = c.rot + c.vrot * t;
			const ellipseW = c.size * (0.32 + 0.68 * Math.abs(Math.cos(rot))); // spin → squash
			const body = c.gold ? 0xffce5a : 0xffe6a6;

			g.ellipse(x, y, ellipseW * 1.7, c.size * 1.7).fill({ color: body, alpha: alpha * 0.18 }); // glow
			g.ellipse(x, y, ellipseW, c.size).fill({ color: body, alpha });
			g.ellipse(x, y, ellipseW, c.size).stroke({ width: 1, color: 0xfff6cf, alpha: alpha * 0.8 });
			g.circle(x - ellipseW * 0.22, y - c.size * 0.26, Math.max(1, c.size * 0.2)).fill({
				color: 0xffffff,
				alpha: alpha * 0.7,
			});
		}
	};
</script>

{#if count > 0}
	<!-- a near-invisible full-canvas rect keeps the draw mounted in screen space -->
	<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.001} />
	<Container>
		<Graphics {draw} />
	</Container>
{/if}
