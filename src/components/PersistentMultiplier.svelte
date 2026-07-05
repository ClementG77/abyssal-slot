<script lang="ts" module>
	export type EmitterEventPersistentMultiplier =
		| { type: 'snowballShow' }
		| { type: 'snowballHide' }
		| { type: 'snowballUpdate'; mult: number }
		// the banked ×M flies from the badge to the BOARD CENTRE to join the Eye combine
		// (eyeResolve awaits this alongside the Gaze seed — they converge together)
		| { type: 'snowballToCombine' };
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';

	import { Container, Graphics, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { getPositionX, getPositionY } from '../game/utils';
	import { SYMBOL_SIZE, BOARD_SIZES } from '../game/constants';

	const context = getContext();

	// The snowball persistent multiplier `M` for the feature (setPersistentMult). Sits just
	// above the board; punches up each time it climbs; fires its value into the Eye combine.
	let show = $state(false);
	let mult = $state(1);
	const pop = new Tween(1, { duration: 160 });

	const BADGE_X = () => BOARD_SIZES.width / 2;
	const BADGE_Y = () => -SYMBOL_SIZE * 0.72;

	// the ×M token in flight toward the combine at the board centre
	const flyFx = $state({ x: 0, y: 0, scale: 1, alpha: 0, active: false });

	const flyToCombine = () =>
		new Promise<void>((resolve) => {
			flyFx.active = true;
			gsap.killTweensOf(flyFx);
			const tl = gsap.timeline({
				onComplete: () => {
					flyFx.active = false;
					resolve();
				},
			});
			tl.timeScale(stateBetDerived.timeScale());
			tl.set(flyFx, { x: BADGE_X(), y: BADGE_Y(), scale: 1, alpha: 0 })
				.to(flyFx, { alpha: 1, scale: 1.25, duration: 0.18, ease: 'back.out(2)' })
				.to(
					flyFx,
					{
						x: getPositionX(2.5),
						y: getPositionY(3),
						duration: 0.5,
						ease: 'power2.inOut',
					},
					'<0.05',
				)
				.to(flyFx, { scale: 0.3, alpha: 0, duration: 0.16, ease: 'power2.in' });
			// the badge dips as it gives its value away (M itself only changes at setPersistentMult)
			void pop.set(0.85).then(() => pop.set(1));
		});

	context.eventEmitter.subscribeOnMount({
		snowballShow: () => (show = true),
		snowballHide: () => (show = false),
		snowballUpdate: async (e) => {
			const climbed = e.mult > mult;
			mult = e.mult;
			if (climbed) {
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
				await pop.set(1.35);
				await pop.set(1);
			}
		},
		snowballToCombine: async () => {
			if (!show || mult <= 1) return;
			await flyToCombine();
		},
	});

	const draw = (g: import('pixi.js').Graphics) => {
		g.roundRect(-95, -36, 190, 72, 18).fill({ color: 0x0a1a2e, alpha: 0.85 });
		g.roundRect(-95, -36, 190, 72, 18).stroke({ width: 3, color: 0xffb13c, alpha: 0.9 });
	};

	const tokenStyle = {
		fontFamily: 'sans-serif',
		fontWeight: '700',
		fontSize: SYMBOL_SIZE * 0.34,
		fill: 0xffb13c,
	} as const;
</script>

<FadeContainer {show}>
	<BoardContainer>
		<Container x={BADGE_X()} y={BADGE_Y()} scale={pop.current}>
			<Graphics {draw} />
			<Text anchor={0.5} text={`M  ×${mult}`} style={tokenStyle} />
		</Container>
		{#if flyFx.active}
			<Container x={flyFx.x} y={flyFx.y} scale={flyFx.scale} alpha={flyFx.alpha}>
				<Text anchor={0.5} text={`×${mult}`} style={tokenStyle} />
			</Container>
		{/if}
	</BoardContainer>
</FadeContainer>
