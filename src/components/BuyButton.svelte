<script lang="ts">
	import { Container, Graphics, Rectangle, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { stateModal } from 'state-shared';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_SIZES } from '../game/constants';
	import { C, FONT } from './controls/theme';

	// Always-visible "BUY BONUS" call-to-action sitting on the left, just beyond the Gaze
	// meter. Opens the shared buyBonus modal (lists BONUS / SUPER SPINS / SUPER BONUS).
	const context = getContext();
	const disabled = $derived(!context.stateXstateDerived.isIdle());

	const W = SYMBOL_SIZE * 1.35;
	const H = SYMBOL_SIZE * 1.35;
	// board-local: left of the board, beyond the Gaze meter (meter sits ~x:-90..-40),
	// vertically centred on the board.
	const pos = { x: -SYMBOL_SIZE * 1.95, y: BOARD_SIZES.height / 2 };

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};
</script>

<BoardContainer>
	<Container {...pos}>
		<Button anchor={0.5} sizes={{ width: W, height: H }} {disabled} {onpress}>
			{#snippet children({ center, hovered, pressed })}
				{@const r = 18}
				{@const fillAlpha = disabled ? 0.28 : pressed ? 1 : hovered ? 0.95 : 0.85}
				{@const draw = (g: import('pixi.js').Graphics) => {
					g.roundRect(-W / 2 - 4, -H / 2 - 4, W + 8, H + 8, r + 4).stroke({
						width: 2,
						color: C.amber,
						alpha: disabled ? 0.2 : 0.4,
					});
					g.roundRect(-W / 2, -H / 2, W, H, r).fill({ color: C.navy, alpha: 0.92 });
					g.roundRect(-W / 2, -H / 2, W, H, r).stroke({
						width: 3,
						color: C.amber,
						alpha: disabled ? 0.3 : 1,
					});
					// amber header plate behind the icon
					g.roundRect(-W / 2 + 10, -H / 2 + 10, W - 20, H * 0.34, 10).fill({
						color: C.amber,
						alpha: fillAlpha,
					});
				}}
				<Container x={center.x} y={center.y}>
					<Rectangle
						anchor={0.5}
						width={W}
						height={H}
						backgroundColor={0x000000}
						backgroundAlpha={0.001}
					/>
					<Container scale={pressed ? 0.95 : hovered ? 1.04 : 1}>
						<Graphics {draw} />
						<!-- '+' coin glyph on the amber plate -->
						<Graphics
							draw={(g) => {
								const cyTop = -H / 2 + 10 + H * 0.17;
								const t = 7;
								const l = 30;
								const col = disabled ? C.iconDisabled : C.navyDeep;
								g.roundRect(-l / 2, cyTop - t / 2, l, t, t / 2).fill({ color: col });
								g.roundRect(-t / 2, cyTop - l / 2, t, l, t / 2).fill({ color: col });
							}}
						/>
						<Text
							anchor={0.5}
							y={H * 0.12}
							text={context.i18nDerived.buy()}
							style={{
								fontFamily: FONT,
								fontWeight: '900',
								fontSize: 26,
								fill: disabled ? C.iconDisabled : C.white,
							}}
						/>
						<Text
							anchor={0.5}
							y={H * 0.32}
							text={context.i18nDerived.bonus()}
							style={{
								fontFamily: FONT,
								fontWeight: '800',
								fontSize: 16,
								fill: disabled ? C.iconDisabled : C.amber,
								letterSpacing: 1,
							}}
						/>
					</Container>
				</Container>
			{/snippet}
		</Button>
	</Container>
</BoardContainer>
