<script lang="ts" module>
	export type EmitterEventScatterPay = {
		type: 'scatterPayShow';
		count: number;
		amount: number;
	};
</script>

<script lang="ts">
	import gsap from 'gsap';

	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';
	import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

	import WinBackdrop from './WinBackdrop.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	// Instant scatter-pay celebration: 4 = 3×, 5 = 5×, 6 = 100×. Escalates with the count, with a
	// proper hero takeover (screen flash + deeper dim + bigger banner) for the six-scatter 100×.
	const context = getContext();

	let show = $state(false);
	let count = $state(4);
	let mult = $state(3);
	const fx = $state({ scale: 0.6, alpha: 0, flash: 0 });

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const isHero = $derived(count >= 6);
	const color = $derived(isHero ? 0xff6a3c : count >= 5 ? 0x9b6cff : 0xffb13c);

	context.eventEmitter.subscribeOnMount({
		scatterPayShow: async (emitterEvent) => {
			count = emitterEvent.count;
			mult = Math.round(emitterEvent.amount / BOOK_AMOUNT_MULTIPLIER);
			show = true;
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });

			gsap.killTweensOf(fx);
			await new Promise<void>((resolve) => {
				const timeline = gsap.timeline({ onComplete: resolve });
				timeline
					.set(fx, { scale: 0.6, alpha: 0, flash: isHero ? 0.85 : 0 })
					.to(fx, { alpha: 1, duration: 0.12 })
					.to(fx, { scale: isHero ? 1.18 : 1.06, duration: 0.32, ease: 'back.out(2.4)' }, '<')
					.to(fx, { flash: 0, duration: 0.4, ease: 'power2.out' }, '<')
					.to(fx, { scale: 1, duration: 0.2 });
			});

			await waitForTimeout((isHero ? 2200 : 1400) / stateBetDerived.timeScale());

			await new Promise<void>((resolve) => {
				gsap.timeline({ onComplete: resolve }).to(fx, {
					alpha: 0,
					scale: 1.12,
					duration: 0.3,
					ease: 'power2.in',
				});
			});
			show = false;
		},
	});
</script>

<FadeContainer {show} zIndex={46}>
	<CanvasSizeRectangle backgroundColor={0x05080f} backgroundAlpha={isHero ? 0.7 : 0.42} />
	<MainContainer>
		<Container x={boardLayout.x} y={boardLayout.y} scale={fx.scale} alpha={fx.alpha}>
			<WinBackdrop radius={SYMBOL_SIZE * (isHero ? 4 : 2.6)} {color} />
			<Text
				anchor={0.5}
				y={-SYMBOL_SIZE * 0.78}
				text={`${count} SCATTERS`}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '800',
					fontSize: SYMBOL_SIZE * 0.36,
					letterSpacing: 2,
					fill: 0xeaf6ff,
					stroke: { color: 0x05080f, width: 5 },
				}}
			/>
			<Text
				anchor={0.5}
				y={SYMBOL_SIZE * 0.34}
				text={`×${mult}`}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '900',
					fontSize: SYMBOL_SIZE * (isHero ? 1.6 : 1.15),
					fill: color,
					stroke: { color: 0x05080f, width: 7 },
					dropShadow: { color: 0x000000, blur: 6, distance: 3, alpha: 0.85 },
				}}
			/>
		</Container>
	</MainContainer>
	{#if fx.flash > 0}
		<CanvasSizeRectangle backgroundColor={0xffffff} backgroundAlpha={fx.flash} />
	{/if}
</FadeContainer>
