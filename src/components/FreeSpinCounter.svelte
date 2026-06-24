<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { anchorToPivot, Container, Graphics, Text, type Sizes } from 'pixi-svelte';

	const context = getContext();
	const PANEL_RATIO_DESKTOP = 824 / 622;
	const panelWidth = $derived(SYMBOL_SIZE * 2);
	const panelSizes = $derived({
		width: panelWidth,
		height: panelWidth / PANEL_RATIO_DESKTOP,
	});
	const multiplierPanelSizes = $derived({
		width: panelSizes.width * 0.84,
		height: SYMBOL_SIZE * 0.52,
	});
	const scale = 1;
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const position = $derived({
		x: boardLayout.x + boardLayout.width * 0.5 + SYMBOL_SIZE * 0.35,
		y: boardLayout.y - boardLayout.height * 0.5,
	});

	const fontSize = SYMBOL_SIZE * 0.275;

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let titleSizes: Sizes = $state({ width: 0, height: 0 });
	let counterSizes: Sizes = $state({ width: 0, height: 0 });

	const textContainerSizes = $derived({
		width: titleSizes.width,
		height: titleSizes.height + counterSizes.height,
	});
	const counterPosition = $derived({ x: titleSizes.width / 2, y: titleSizes.height });

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: (emitterEvent) => {
			if (emitterEvent.current !== undefined) current = emitterEvent.current;
			if (emitterEvent.total !== undefined) total = emitterEvent.total;
		},
	});
</script>

<MainContainer>
	<FadeContainer {show} {...position} {scale}>
		<Container
			x={panelSizes.width * 0.5}
			y={-multiplierPanelSizes.height * 0.5 - SYMBOL_SIZE * 0.14}
		>
			<Graphics
				draw={(g) => {
					g.roundRect(
						-multiplierPanelSizes.width * 0.5,
						-multiplierPanelSizes.height * 0.5,
						multiplierPanelSizes.width,
						multiplierPanelSizes.height,
						14,
					).fill({ color: 0x0a1a2e, alpha: 0.92 });
					g.roundRect(
						-multiplierPanelSizes.width * 0.5,
						-multiplierPanelSizes.height * 0.5,
						multiplierPanelSizes.width,
						multiplierPanelSizes.height,
						14,
					).stroke({ width: 2.5, color: 0xffb13c, alpha: 0.9 });
				}}
			/>
			<Text
				text="TOTAL MULT"
				x={-multiplierPanelSizes.width * 0.31}
				anchor={{ x: 0, y: 0.5 }}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '800',
					fontSize: SYMBOL_SIZE * 0.16,
					fill: 0x8feeff,
				}}
			/>
			<Text
				text={`×${context.stateGame.persistentMult}`}
				x={multiplierPanelSizes.width * 0.34}
				anchor={{ x: 0.5, y: 0.5 }}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '900',
					fontSize: SYMBOL_SIZE * 0.28,
					fill: 0xffd27a,
				}}
			/>
		</Container>
		<Graphics
			draw={(g) => {
				g.roundRect(0, 0, panelSizes.width, panelSizes.height, 16).fill({
					color: 0x0a1a2e,
					alpha: 0.92,
				});
				g.roundRect(0, 0, panelSizes.width, panelSizes.height, 16).stroke({
					width: 2.5,
					color: 0x22e0ff,
					alpha: 0.8,
				});
			}}
		/>
		<Container
			x={panelSizes.width * 0.5}
			y={panelSizes.height * 0.48}
			pivot={anchorToPivot({
				sizes: textContainerSizes,
				anchor: { x: 0.5, y: 0.5 },
			})}
		>
			<Text
				text={'FREE SPIN'}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '800',
					fontSize,
					fill: 0x22e0ff,
					wordWrap: false,
				}}
				onresize={(sizes) => (titleSizes = sizes)}
			/>
			<Text
				text={`${current} OF ${total}`}
				{...counterPosition}
				anchor={{ x: 0.5, y: 0 }}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '800',
					fontSize,
					fill: 0xffd27a,
				}}
				onresize={(sizes) => (counterSizes = sizes)}
			/>
		</Container>
	</FadeContainer>
</MainContainer>
