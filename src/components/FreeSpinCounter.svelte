<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { MainContainer } from 'components-layout';
	import { FadeContainer, ResponsiveBitmapText } from 'components-pixi';

	import { BitmapText, Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { MOBILE_REEL_DISPLAY_SCALE, SYMBOL_SIZE, abyssalBitmapStyle } from '../game/constants';

	const context = getContext();
	const freeSpinsSize = $derived(SYMBOL_SIZE * 2.05); // width
	// freespins_count.png is now 1448×1086 (aspect 1.333, horizontal), no longer square
	const freeSpinsH = $derived(freeSpinsSize * (1086 / 1448));
	const totalMultSize = $derived(SYMBOL_SIZE * 1.42);
	const panelGap = $derived(SYMBOL_SIZE * 0.18);
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const isStacked = $derived(context.stateLayoutDerived.isStacked());
	// Desktop/landscape: stacked panels to the right of the board (as before). Portrait: the
	// board is drawn 1.45× through BoardContainer, so anchor to its VISUAL top-right and lay the
	// two panels side by side in the band above the reels (the tumble banner shifts left there).
	const position = $derived(
		isStacked
			? {
					x:
						boardLayout.x +
						boardLayout.width * 0.5 * MOBILE_REEL_DISPLAY_SCALE -
						totalMultSize * 0.75,
					y:
						boardLayout.y -
						boardLayout.height * 0.5 * MOBILE_REEL_DISPLAY_SCALE -
						SYMBOL_SIZE * 0.62,
				}
			: {
					x: boardLayout.x + boardLayout.width * 0.5 + SYMBOL_SIZE * 1.08,
					y: boardLayout.y - boardLayout.height * 0.5 + totalMultSize * 0.5,
				},
	);
	const groupScale = $derived(isStacked ? 0.55 : 1);
	// portrait: free-spins panel sits LEFT of the mult panel; desktop: below it
	const spinsPanelOffset = $derived(
		isStacked
			? { x: -(totalMultSize * 0.5 + freeSpinsSize * 0.5 + panelGap), y: 0 }
			: { x: 0, y: totalMultSize * 0.5 + freeSpinsH * 0.5 + panelGap },
	);

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let lastPersistentMult = $state(context.stateGame.persistentMult);
	const totalMultPop = new Tween(1, { duration: 160 });
	// feature-entry flourish: the HUD pops in instead of just fading
	const entrance = new Tween(1, { duration: 420, easing: backOut });

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: async () => {
			if (!show) {
				show = true;
				entrance.set(0.55, { duration: 0 });
				void entrance.set(1);
				await totalMultPop.set(1.3);
				await totalMultPop.set(1);
				return;
			}
			show = true;
		},
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

	// Branded AbyssalBitmap face. The text that sits INSIDE a frame (on the bright blue interior)
	// is tinted dark navy for legibility (the baked gold `fill`-tints multiplicatively). The
	// floating "TOTAL MULT" caption keeps the gold — it sits on the dark game background above the frame.
	const DARK_TEXT = 0x183a54;
	const totalMultLabelStyle = abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.145 });
	const freeSpinsLabelStyle = { ...abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.14 }), fill: DARK_TEXT };
	const freeSpinsValueStyle = { ...abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.26 }), fill: DARK_TEXT };
	const totalMultValueStyle = { ...abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.34 }), fill: DARK_TEXT };
</script>

<MainContainer>
	<FadeContainer {show} {...position}>
		<Container scale={groupScale * entrance.current}>
			<Container scale={totalMultPop.current}>
				<Container y={-totalMultSize * 0.58}>
					<BitmapText text={context.i18nDerived.totalMult()} anchor={0.5} style={totalMultLabelStyle} />
				</Container>
				<Container>
					<Sprite
						anchor={0.5}
						key="totalMultBanner"
						width={totalMultSize}
						height={totalMultSize}
					/>
					<ResponsiveBitmapText
						text={`x${context.stateGame.persistentMult}`}
						anchor={0.5}
						y={-totalMultSize * 0.06}
						maxWidth={totalMultSize * 0.46}
						style={totalMultValueStyle}
					/>
				</Container>
			</Container>

			<Container x={spinsPanelOffset.x} y={spinsPanelOffset.y}>
				<Sprite anchor={0.5} key="freeSpinsCount" width={freeSpinsSize} height={freeSpinsH} />
				<BitmapText
					text={context.i18nDerived.freeSpins()}
					anchor={0.5}
					y={-freeSpinsH * 0.11}
					style={freeSpinsLabelStyle}
				/>
				<ResponsiveBitmapText
					text={`${current} OF ${total}`}
					anchor={0.5}
					y={freeSpinsH * 0.1}
					maxWidth={freeSpinsSize * 0.56}
					style={freeSpinsValueStyle}
				/>
			</Container>
		</Container>
	</FadeContainer>
</MainContainer>
