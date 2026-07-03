<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventScatterFx = { type: 'scatterCelebrate'; positions: Position[] };
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';

	import { Container, Graphics } from 'pixi-svelte';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { getPositionX, getPositionY } from '../game/utils';

	// Board-wide scatter reactions:
	//  • anticipation (3+ scatters) → dim the screen, set the shared `scatterAnticipating` flag
	//    (the scatters pulse harder via Symbol) and run a rising audio hum.
	//  • trigger → pulse the winning scatter cells and flash before the transition.
	const context = getContext();

	const dim = new Tween(0, { duration: 320 });
	const celebrate = $state({ link: 0, flash: 0 });
	let positions = $state<Position[]>([]);

	const stopAnticipation = () => {
		context.stateGame.scatterAnticipating = false;
		void dim.set(0);
		context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_anticipation' });
	};

	context.eventEmitter.subscribeOnMount({
		reelFrameScatterAnticipationStart: () => {
			context.stateGame.scatterAnticipating = true;
			void dim.set(0.4);
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_anticipation_start' });
			context.eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_anticipation' });
		},
		reelFrameScatterAnticipationEnd: () => stopAnticipation(),
		scatterCelebrate: async (emitterEvent) => {
			positions = emitterEvent.positions;
			stopAnticipation();
			gsap.killTweensOf(celebrate);
			await new Promise<void>((resolve) => {
				gsap
					.timeline({ onComplete: resolve })
					.set(celebrate, { link: 0, flash: 0 })
					.to(celebrate, { link: 1, duration: 0.4, ease: 'power2.out' })
					.to(celebrate, { flash: 0.85, duration: 0.1 }, '-=0.06')
					.to(celebrate, { flash: 0, duration: 0.4, ease: 'power2.out' })
					.to(celebrate, { link: 0, duration: 0.3 }, '<');
			});
		},
	});

	const drawScatterPulses = (g: import('pixi.js').Graphics) => {
		const p = celebrate.link;
		if (p <= 0) return;
		const points = positions.map((pos) => ({
			x: getPositionX(pos.reel),
			y: getPositionY(pos.row),
		}));
		for (const point of points) {
			g.circle(point.x, point.y, 12 * p).fill({ color: 0xffffff, alpha: 0.7 * p });
		}
	};
</script>

<!-- anticipation dim (screen space) -->
{#if dim.current > 0.001}
	<CanvasSizeRectangle backgroundColor={0x03060e} backgroundAlpha={dim.current} />
{/if}

<!-- trigger scatter pulses (board space) -->
{#if celebrate.link > 0}
	<MainContainer>
		<BoardContainer>
			<Container blendMode="add">
				<Graphics draw={drawScatterPulses} />
			</Container>
		</BoardContainer>
	</MainContainer>
{/if}

<!-- trigger flash (screen space) -->
{#if celebrate.flash > 0}
	<CanvasSizeRectangle backgroundColor={0xffffff} backgroundAlpha={celebrate.flash} />
{/if}
