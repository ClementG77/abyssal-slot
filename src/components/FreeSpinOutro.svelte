<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
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
</script>

<FadeContainer {show} zIndex={45}>
	<Rectangle {...sizes} backgroundColor={0x05080f} backgroundAlpha={0.78} />
	<Container x={sizes.width / 2} y={sizes.height / 2}>
		<Text
			anchor={0.5}
			y={-56}
			text="TOTAL WIN"
			style={{ fontFamily: 'sans-serif', fontWeight: '800', fontSize: 72, fill: 0x22e0ff }}
		/>
		<Text
			anchor={0.5}
			y={48}
			text={bookEventAmountToCurrencyString(amount)}
			style={{ fontFamily: 'sans-serif', fontWeight: '800', fontSize: 104, fill: 0xffb13c }}
		/>
	</Container>
</FadeContainer>
