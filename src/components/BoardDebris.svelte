<script lang="ts" module>
	// Board-level burst FX. Spawned when cells explode (TumbleBoard → `boardDebris`), the
	// bubbles live here instead of on the symbols so they can outlast the cell that collapsed
	// and got refilled.
	export type EmitterEventBoardDebris =
		| {
				type: 'boardDebris';
				cells: { reel: number; row: number; color: number }[];
		  }
		// a tiny contact puff at a landing cell (reveal reel-stops + the deepest refill
		// contact per column) — a few small bubbles, no ring, quieter than an explosion
		| { type: 'boardLandPuff'; cells: { reel: number; row: number }[] };
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	import { Container, Graphics } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getPositionX, getPositionY } from '../game/utils';

	const context = getContext();

	// Underwater burst: the cell pops into a cloud of BUBBLES that scatter, rise with a wobble
	// and pop away — plus a coloured shock ring on the first beat. No shard streaks.
	type Bubble = {
		ox: number; // scatter offset from the cell centre
		oy: number;
		rise: number; // how far it floats up over its life
		r: number;
		drift: number; // horizontal wobble amplitude
		phase: number;
		delay: number; // 0..0.25 of the burst's life
	};
	type Burst = {
		id: number;
		x: number;
		y: number;
		color: number;
		start: number;
		duration: number;
		bubbles: Bubble[];
		light: boolean; // landing puff — no shock ring, fewer/smaller bubbles
	};

	let now = $state(performance.now());
	let bursts = $state<Burst[]>([]);
	let nextId = 0;

	// Self-suspending clock: bubbles only exist for ~0.4–0.6s after a burst, so there's no reason
	// to run a perpetual rAF between them. The loop runs while bursts are alive and stops once
	// they've all expired; spawning a burst wakes it (ensureClock).
	let rafId = 0;
	const ensureClock = () => {
		if (rafId) return;
		const loop = (t: number) => {
			now = t;
			// prune finished bursts (only rebuild the array when something actually expired)
			const alive = bursts.filter((b) => t - b.start < b.duration);
			if (alive.length !== bursts.length) bursts = alive;
			rafId = alive.length ? requestAnimationFrame(loop) : 0;
		};
		rafId = requestAnimationFrame(loop);
	};

	onMount(() => () => {
		if (rafId) cancelAnimationFrame(rafId);
	});

	context.eventEmitter.subscribeOnMount({
		boardDebris: ({ cells }) => {
			const t = performance.now();
			const duration = 560 / stateBetDerived.timeScale();
			const spawned = cells.map((cell) => {
				const bubbles: Bubble[] = Array.from({ length: 9 }, () => {
					const angle = Math.random() * Math.PI * 2;
					const spread = SYMBOL_SIZE * (0.08 + Math.random() * 0.3);
					return {
						ox: Math.cos(angle) * spread,
						oy: Math.sin(angle) * spread * 0.7,
						rise: SYMBOL_SIZE * (0.45 + Math.random() * 0.6),
						r: SYMBOL_SIZE * (0.045 + Math.random() * 0.07),
						drift: SYMBOL_SIZE * (0.05 + Math.random() * 0.08),
						phase: Math.random() * Math.PI * 2,
						delay: Math.random() * 0.22,
					};
				});
				return {
					id: nextId++,
					x: getPositionX(cell.reel),
					y: getPositionY(cell.row),
					color: cell.color,
					start: t,
					duration,
					bubbles,
					light: false,
				};
			});
			bursts = [...bursts, ...spawned];
			ensureClock();
		},
		boardLandPuff: ({ cells }) => {
			const t = performance.now();
			const duration = 380 / stateBetDerived.timeScale();
			const spawned = cells.map((cell) => {
				// a handful of small bubbles kicked up from the cell's lower half
				const bubbles: Bubble[] = Array.from({ length: 4 }, () => {
					const angle = Math.random() * Math.PI * 2;
					const spread = SYMBOL_SIZE * (0.05 + Math.random() * 0.16);
					return {
						ox: Math.cos(angle) * spread,
						oy: SYMBOL_SIZE * 0.26 + Math.sin(angle) * spread * 0.3,
						rise: SYMBOL_SIZE * (0.22 + Math.random() * 0.3),
						r: SYMBOL_SIZE * (0.028 + Math.random() * 0.04),
						drift: SYMBOL_SIZE * (0.03 + Math.random() * 0.05),
						phase: Math.random() * Math.PI * 2,
						delay: Math.random() * 0.15,
					};
				});
				return {
					id: nextId++,
					x: getPositionX(cell.reel),
					y: getPositionY(cell.row),
					color: 0x9fdcff,
					start: t,
					duration,
					bubbles,
					light: true,
				};
			});
			bursts = [...bursts, ...spawned];
			ensureClock();
		},
	});

	const easeOut = (p: number) => 1 - (1 - p) * (1 - p);

	const drawBurst = (g: import('pixi.js').Graphics, burst: Burst) => {
		const p = Math.min(1, (now - burst.start) / burst.duration);
		if (p >= 1) return;

		// first beat: a coloured shock ring + soft core bloom at the cell (explosions only —
		// landing puffs are just the bubbles)
		if (!burst.light && p < 0.3) {
			const ringP = p / 0.3;
			g.circle(0, 0, SYMBOL_SIZE * (0.22 + ringP * 0.68)).stroke({
				width: Math.max(1.5, 6 * (1 - ringP)),
				color: burst.color,
				alpha: (1 - ringP) * 0.7,
			});
			g.circle(0, 0, SYMBOL_SIZE * 0.3 * (1 - ringP * 0.6)).fill({
				color: 0xffffff,
				alpha: (1 - ringP) * 0.45,
			});
		}

		// bubbles: scatter out, float upward with a wobble, pop away at the end of their life
		for (const b of burst.bubbles) {
			const lp = Math.min(1, Math.max(0, (p - b.delay) / (1 - b.delay)));
			if (lp <= 0 || lp >= 1) continue;
			const e = easeOut(lp);
			const x = b.ox * e + Math.sin(lp * 6 + b.phase) * b.drift * lp;
			const y = b.oy * e - b.rise * lp; // bubbles rise, they don't fall
			// grow slightly while rising, then pop (fast shrink) over the last 15%
			const popScale = lp > 0.85 ? Math.max(0, 1 - (lp - 0.85) / 0.15) : 1;
			const r = b.r * (0.75 + lp * 0.45) * popScale;
			if (r <= 0.5) continue;
			const alpha = (1 - lp * 0.55) * popScale;
			// aqua shell tinted faintly by the symbol colour, plus a white glint
			g.circle(x, y, r).stroke({ width: 1.5, color: 0xbfeeff, alpha: alpha * 0.8 });
			g.circle(x, y, r * 0.8).fill({ color: burst.color, alpha: alpha * 0.16 });
			g.circle(x - r * 0.3, y - r * 0.35, Math.max(0.8, r * 0.25)).fill({
				color: 0xffffff,
				alpha: alpha * 0.75,
			});
		}
	};
</script>

<BoardContainer>
	<Container blendMode="add">
		{#each bursts as burst (burst.id)}
			<Container x={burst.x} y={burst.y}>
				<Graphics draw={(g) => drawBurst(g, burst)} />
			</Container>
		{/each}
	</Container>
</BoardContainer>
