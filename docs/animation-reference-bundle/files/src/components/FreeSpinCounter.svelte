<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';

	import { MainContainer } from 'components-layout';
	import { FadeContainer, ResponsiveText } from 'components-pixi';

	import { Container, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	const freeSpinsSize = $derived(SYMBOL_SIZE * 2.05);
	const totalMultSize = $derived(SYMBOL_SIZE * 1.42);
	const panelGap = $derived(SYMBOL_SIZE * 0.18);
	const scale = 1;
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const position = $derived({
		x: boardLayout.x + boardLayout.width * 0.5 + SYMBOL_SIZE * 1.08,
		y: boardLayout.y - boardLayout.height * 0.5 + totalMultSize * 0.5,
	});

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let lastPersistentMult = $state(context.stateGame.persistentMult);
	const totalMultPop = new Tween(1, { duration: 160 });

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
		snowballUpdate: async (emitterEvent) => {
			const climbed = emitterEvent.mult > lastPersistentMult;
			lastPersistentMult = emitterEvent.mult;
			if (!climbed) return;
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
			await totalMultPop.set(1.16);
			await totalMultPop.set(1);
		},
	});

	const totalMultLabelStyle = $derived({
		fontFamily: 'Abyssal, Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: SYMBOL_SIZE * 0.18,
		fill: 0xd7fbff,
		align: 'center',
		stroke: { color: 0x071124, width: 3 },
		dropShadow: { color: 0x22e0ff, blur: 6, distance: 0, alpha: 0.45 },
	});
	const freeSpinsLabelStyle = $derived({
		...totalMultLabelStyle,
		fontSize: SYMBOL_SIZE * 0.17,
	});
	const freeSpinsValueStyle = $derived({
		fontFamily: 'Abyssal, Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: SYMBOL_SIZE * 0.32,
		fill: 0xffe7a0,
		align: 'center',
		stroke: { color: 0x2a1400, width: 5 },
		dropShadow: { color: 0x000000, blur: 7, distance: 2, alpha: 0.75 },
	});
	const totalMultValueStyle = $derived({
		fontFamily: 'Abyssal, Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: SYMBOL_SIZE * 0.34,
		fill: 0xffe7a0,
		align: 'center',
		stroke: { color: 0x2a1400, width: 6 },
		dropShadow: { color: 0x000000, blur: 8, distance: 2, alpha: 0.8 },
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position} {scale}>
		<Container scale={totalMultPop.current}>
			<Container y={-totalMultSize * 0.58}>
				<Text text="TOTAL MULT" anchor={0.5} style={totalMultLabelStyle} />
			</Container>
			<Container>
				<Sprite anchor={0.5} key="totalMultBanner" width={totalMultSize} height={totalMultSize} />
				<ResponsiveText
					text={`x${context.stateGame.persistentMult}`}
					anchor={0.5}
					maxWidth={totalMultSize * 0.52}
					style={totalMultValueStyle}
				/>
			</Container>
		</Container>

		<Container y={totalMultSize * 0.5 + freeSpinsSize * 0.5 + panelGap}>
			<Sprite anchor={0.5} key="freeSpinsCount" width={freeSpinsSize} height={freeSpinsSize} />
			<Text text="FREE SPINS" anchor={0.5} y={-freeSpinsSize * 0.14} style={freeSpinsLabelStyle} />
			<ResponsiveText
				text={`${current} / ${total}`}
				anchor={0.5}
				y={freeSpinsSize * 0.13}
				maxWidth={freeSpinsSize * 0.68}
				style={freeSpinsValueStyle}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
