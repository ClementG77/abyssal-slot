<script lang="ts">
	import { Container, Graphics, Rectangle, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateBet } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_SIZES } from '../game/constants';
	import { C, FONT } from './controls/theme';

	// Left-side ANTE BET toggle, sitting under the BUY card. A direct activate/deactivate
	// slide switch (no modal) with a one-line note beneath. Flipping it sets
	// `activeBetModeKey` to ANTE (active, 1.25× cost) or BASE (off); gated to idle.
	const context = getContext();
	const idle = $derived(context.stateXstateDerived.isIdle());
	const anteOn = $derived(stateBet.activeBetModeKey.toUpperCase() === 'ANTE');

	const pos = { x: -SYMBOL_SIZE * 1.95, y: BOARD_SIZES.height / 2 + SYMBOL_SIZE * 1.3 };

	const toggle = () => {
		if (!idle) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBet.activeBetModeKey = anteOn ? 'BASE' : 'ANTE';
	};

	const SW = 150;
	const SH = 54;
	const switchDraw = (g: import('pixi.js').Graphics) => {
		const accent = anteOn ? C.amber : C.textDim;
		g.roundRect(-SW / 2, -SH / 2, SW, SH, SH / 2).fill({
			color: anteOn ? C.amber : C.navyDeep,
			alpha: anteOn ? 0.9 : 0.85,
		});
		g.roundRect(-SW / 2, -SH / 2, SW, SH, SH / 2).stroke({
			width: 2,
			color: accent,
			alpha: idle ? 0.95 : 0.4,
		});
		const kx = anteOn ? SW / 2 - SH / 2 : -SW / 2 + SH / 2;
		g.circle(kx, 0, (SH - 12) / 2).fill({ color: idle ? C.white : C.iconDisabled });
	};
</script>

<BoardContainer>
	<Container {...pos}>
		<Text
			anchor={0.5}
			y={-48}
			text="ANTE BET"
			style={{ fontFamily: FONT, fontWeight: '800', fontSize: 18, fill: C.white, letterSpacing: 1 }}
		/>

		<Button anchor={0.5} sizes={{ width: SW, height: SH }} disabled={!idle} onpress={toggle}>
			{#snippet children({ center })}
				<Container x={center.x} y={center.y}>
					<Rectangle
						anchor={0.5}
						width={SW}
						height={SH}
						backgroundColor={0x000000}
						backgroundAlpha={0.001}
					/>
					<Graphics draw={switchDraw} />
					<Text
						anchor={0.5}
						x={anteOn ? -SW * 0.18 : SW * 0.18}
						text={anteOn ? 'ON' : 'OFF'}
						style={{
							fontFamily: FONT,
							fontWeight: '900',
							fontSize: 16,
							fill: anteOn ? C.navyDeep : C.textDim,
							letterSpacing: 1,
						}}
					/>
				</Container>
			{/snippet}
		</Button>

		<Text
			anchor={0.5}
			y={46}
			text="More Eyes & Scatters · 1.25× bet"
			style={{
				fontFamily: FONT,
				fontWeight: '600',
				fontSize: 13,
				fill: C.textDim,
				align: 'center',
				wordWrap: true,
				wordWrapWidth: 190,
				lineHeight: 17,
			}}
		/>
	</Container>
</BoardContainer>
