<script lang="ts" module>
	// Board-level shatter debris. Spawned when cells explode (TumbleBoard → `boardDebris`), the
	// shards live here instead of on the symbols so they can be bigger and outlast the cell that
	// collapsed and got refilled.
	export type EmitterEventBoardDebris = {
		type: 'boardDebris';
		cells: { reel: number; row: number; color: number }[];
	};
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

	type Shard = { angle: number; dist: number; size: number };
	type Burst = {
		id: number;
		x: number;
		y: number;
		color: number;
		start: number;
		duration: number;
		shards: Shard[];
	};

	let now = $state(performance.now());
	let bursts = $state<Burst[]>([]);
	let nextId = 0;

	onMount(() => {
		let raf = 0;
		const loop = (t: number) => {
			now = t;
			// prune finished bursts (only rebuild the array when something actually expired)
			if (bursts.length) {
				const alive = bursts.filter((b) => t - b.start < b.duration);
				if (alive.length !== bursts.length) bursts = alive;
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});

	context.eventEmitter.subscribeOnMount({
		boardDebris: ({ cells }) => {
			const t = performance.now();
			const duration = 620 / stateBetDerived.timeScale();
			const spawned = cells.map((cell) => {
				const count = 11;
				const shards: Shard[] = Array.from({ length: count }, (_, i) => ({
					angle: (i / count) * Math.PI * 2 + Math.random() * 0.55,
					dist: SYMBOL_SIZE * (0.6 + Math.random() * 1.0),
					size: SYMBOL_SIZE * (0.07 + Math.random() * 0.08),
				}));
				return {
					id: nextId++,
					x: getPositionX(cell.reel),
					y: getPositionY(cell.row),
					color: cell.color,
					start: t,
					duration,
					shards,
				};
			});
			bursts = [...bursts, ...spawned];
		},
	});

	const easeOut = (p: number) => 1 - (1 - p) * (1 - p);

	const drawBurst = (g: import('pixi.js').Graphics, burst: Burst) => {
		const p = Math.min(1, (now - burst.start) / burst.duration);
		if (p >= 1) return;
		const e = easeOut(p);
		const fade = 1 - p;
		const gravity = SYMBOL_SIZE * 1.0 * p * p; // shards arc downward as they fly
		for (const s of burst.shards) {
			const dist = s.dist * e;
			const x = Math.cos(s.angle) * dist;
			const y = Math.sin(s.angle) * dist + gravity;
			const r = s.size * (1 - p * 0.55);
			const tail = s.size * 2.2;
			// motion streak
			g.moveTo(x - Math.cos(s.angle) * tail, y - Math.sin(s.angle) * tail)
				.lineTo(x, y)
				.stroke({ width: Math.max(1, r * 0.7), color: burst.color, alpha: fade * 0.8 });
			// bright head
			g.circle(x, y, r * 0.55).fill({ color: 0xffffff, alpha: fade });
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
