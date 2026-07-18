<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventScatterFx = { type: 'scatterCelebrate'; positions: Position[] };
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';

	import { Container, Graphics } from 'pixi-svelte';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { stateBetDerived } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { getPositionX, getPositionY } from '../game/utils';
	import { BOARD_SIZES, SYMBOL_SIZE } from '../game/constants';

	// Board-wide scatter reactions:
	//  • anticipation (3+ scatters) → dim the screen (breathing), set the shared
	//    `scatterAnticipating` flag (the scatters pulse harder via Symbol) and run a rising hum.
	//  • trigger → ALL scatters pulse/glow in unison, then a shockwave ring erupts from the
	//    board centre and the board takes the hit (no screen flash — glow only).
	const context = getContext();

	const dim = new Tween(0, { duration: 320 });
	// the dim breathes while anticipating — pressure, not a static veil
	const dimPulse = $state({ v: 0 });
	let dimPulseTween: gsap.core.Tween | undefined;
	// the trigger scatters' cells (all pulse in unison via cellPulse) + the centre shockwave
	let cellPulses = $state<{ x: number; y: number; p: number }[]>([]);
	const cellPulse = $state({ p: 0 });
	const shock = $state({ p: 0 });

	const stopAnticipation = () => {
		context.stateGame.scatterAnticipating = false;
		void dim.set(0);
		dimPulseTween?.kill();
		dimPulse.v = 0;
		context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_anticipation' });
	};

	context.eventEmitter.subscribeOnMount({
		reelFrameScatterAnticipationStart: () => {
			context.stateGame.scatterAnticipating = true;
			void dim.set(0.4);
			dimPulseTween?.kill();
			dimPulseTween = gsap.fromTo(
				dimPulse,
				{ v: 0 },
				{ v: 1, duration: 0.85, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 0.5 },
			);
			context.eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_anticipation' });
		},
		reelFrameScatterAnticipationEnd: () => stopAnticipation(),
		scatterCelebrate: async (emitterEvent) => {
			stopAnticipation();
			gsap.killTweensOf(shock);
			gsap.killTweensOf(cellPulse);

			// ALL trigger scatters pulse/glow together (two swells), THEN the shockwave + jolt
			cellPulses = emitterEvent.positions.map((pos) => ({
				x: getPositionX(pos.reel),
				y: getPositionY(pos.row),
				p: 0,
			}));
			const PULSE_DURATION = 0.95;
			const shockAt = PULSE_DURATION + 0.05;

			await new Promise<void>((resolve) => {
				const tl = gsap.timeline({
					onComplete: () => {
						cellPulses = [];
						cellPulse.p = 0;
						shock.p = 0;
						resolve();
					},
				});
				tl.timeScale(stateBetDerived.timeScale());
				tl.set(shock, { p: 0 }).set(cellPulse, { p: 0 });
				tl.to(cellPulse, { p: 1, duration: PULSE_DURATION, ease: 'none' }, 0);
				tl.add(() => context.eventEmitter.broadcast({ type: 'boardEyeImpact' }), shockAt).to(
					shock,
					{ p: 1, duration: 0.6, ease: 'power2.out' },
					shockAt,
				);
			});
		},
	});

	// Every trigger scatter glows in unison: two synced swells (|sin| gives pulse-up, down,
	// pulse-up again) of a warm bloom over each cell — glow only, no white core.
	const drawCellIgnites = (g: import('pixi.js').Graphics) => {
		const p = cellPulse.p;
		if (p <= 0 || p >= 1 || cellPulses.length === 0) return;
		const swell = Math.abs(Math.sin(p * Math.PI * 2));
		for (const cell of cellPulses) {
			const bloomR = SYMBOL_SIZE * (0.34 + swell * 0.28);
			g.circle(cell.x, cell.y, bloomR).fill({ color: 0xffd27a, alpha: swell * 0.4 });
		}
	};

	// The shockwave the flash gives birth to: a fat gold ring + white chaser expanding from the
	// board centre out past its corners.
	const drawShockwave = (g: import('pixi.js').Graphics) => {
		const p = shock.p;
		if (p <= 0 || p >= 1) return;
		const cx = BOARD_SIZES.width / 2;
		const cy = BOARD_SIZES.height / 2;
		const maxR = Math.hypot(BOARD_SIZES.width, BOARD_SIZES.height) * 0.6;
		g.circle(cx, cy, maxR * p).stroke({
			width: Math.max(2, 20 * (1 - p)),
			color: 0xffe6a6,
			alpha: (1 - p) * 0.8,
		});
		g.circle(cx, cy, maxR * Math.max(0, p - 0.07)).stroke({
			width: Math.max(1, 8 * (1 - p)),
			color: 0xffffff,
			alpha: (1 - p) * 0.55,
		});
	};
</script>

<!-- anticipation dim (screen space), breathing while the hold builds -->
{#if dim.current > 0.001}
	<CanvasSizeRectangle
		backgroundColor={0x03060e}
		backgroundAlpha={dim.current + dimPulse.v * 0.07}
	/>
{/if}

<!-- trigger: sequential scatter ignites + the centre shockwave (board space) -->
{#if cellPulses.length > 0}
	<MainContainer>
		<BoardContainer>
			<Container blendMode="add">
				<Graphics draw={drawCellIgnites} />
				<Graphics draw={drawShockwave} />
			</Container>
		</BoardContainer>
	</MainContainer>
{/if}
