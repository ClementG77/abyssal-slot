<script lang="ts" module>
	export type EmitterEventWinCapCelebration = { type: 'winCapTrigger'; amount: number };
</script>

<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';

	const context = getContext();

	// The 15,000× max-win takeover. Placeholder visual (deep-sea dim + amber/cyan headline);
	// the full leviathan scene + god-rays come with the art pass.
	let show = $state(false);
	let amount = $state(0);

	context.eventEmitter.subscribeOnMount({
		winCapTrigger: async (e) => {
			amount = e.amount;
			show = true;
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
			await waitForTimeout(3500);
			show = false;
		},
	});

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
</script>

<FadeContainer {show} zIndex={50}>
	<Rectangle {...sizes} backgroundColor={0x05080f} backgroundAlpha={0.86} />
	<Container x={sizes.width / 2} y={sizes.height / 2}>
		<Text
			anchor={0.5}
			y={-70}
			text={context.i18nDerived.winTier('maxWin')}
			style={{ fontFamily: 'sans-serif', fontWeight: '800', fontSize: 110, fill: 0xffb13c }}
		/>
		<Text
			anchor={0.5}
			y={50}
			text={bookEventAmountToCurrencyString(amount)}
			style={{ fontFamily: 'sans-serif', fontWeight: '800', fontSize: 76, fill: 0x22e0ff }}
		/>
	</Container>
</FadeContainer>
