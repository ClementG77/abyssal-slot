<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container, Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer, ResponsiveText } from 'components-pixi';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';

	const context = getContext();

	// Placeholder feature-total card — auto-advances on a timer so the round always settles.
	let show = $state(false);
	let amount = $state(0);

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => (show = true),
		freeSpinOutroHide: () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			amount = emitterEvent.amount;
			await waitForTimeout(2200 / stateBetDerived.timeScale());
		},
	});

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const imageAspect = 1408 / 768;
	const imgW = $derived(Math.min(sizes.width * 0.88, sizes.height * 0.72 * imageAspect));
	const imgH = $derived(imgW / imageAspect);
	const amountY = $derived(imgH * (505 / 768 - 0.5));
	const amountMaxWidth = $derived(imgW * 0.48);
	const amountStyle = $derived({
		fontFamily: 'Abyssal, Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: imgH * 0.12,
		fill: 0xffe7a0,
		align: 'center',
		stroke: { color: 0x2a1400, width: Math.max(4, imgH * 0.012) },
		dropShadow: { color: 0x000000, blur: Math.max(5, imgH * 0.012), distance: 2, alpha: 0.78 },
	});
</script>

<FadeContainer {show} zIndex={45}>
	<Rectangle {...sizes} backgroundColor={0x05080f} backgroundAlpha={0.78} />
	<Container x={sizes.width / 2} y={sizes.height / 2}>
		<Sprite anchor={0.5} key="freeSpinOutro" width={imgW} height={imgH} />
		<ResponsiveText
			anchor={0.5}
			y={amountY}
			maxWidth={amountMaxWidth}
			text={bookEventAmountToCurrencyString(amount)}
			style={amountStyle}
		/>
	</Container>
</FadeContainer>
