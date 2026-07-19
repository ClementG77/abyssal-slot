<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number }
		// The snowball persistent multiplier `M` (setPersistentMult) lives on this HUD's
		// medallion. snowballShow/Hide are broadcast by the handlers for symmetry but the
		// medallion's visibility rides freeSpinCounterShow/Hide (one HUD, one lifecycle).
		| { type: 'snowballShow' }
		| { type: 'snowballHide' }
		| { type: 'snowballUpdate'; mult: number }
		// the banked ×M flies from the medallion to the BOARD CENTRE to join the Eye combine
		// (eyeResolve awaits this alongside the Gaze seed — they converge together)
		| { type: 'snowballToCombine' };
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { GlowFilter } from 'pixi-filters';

	import { MainContainer } from 'components-layout';
	import { FadeContainer, ResponsiveBitmapText } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';

	import { BitmapText, Container, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, abyssalBitmapStyle } from '../game/constants';

	const context = getContext();
	const freeSpinsSize = $derived(SYMBOL_SIZE * 2.05); // width
	// freespins_count.png is now 1448×1086 (aspect 1.333, horizontal), no longer square
	const freeSpinsH = $derived(freeSpinsSize * (1086 / 1448));
	const totalMultSize = $derived(SYMBOL_SIZE * 1.42);
	const panelGap = $derived(SYMBOL_SIZE * 0.18);
	const boardLayout = $derived(context.stateGameDerived.boardLayout());
	const isStacked = $derived(context.stateLayoutDerived.isStacked());
	// Desktop/landscape: stacked panels to the right of the board (as before).
	// Portrait: the panels sit ON the control bar's WIN readout row, flanking it — free spins
	// LEFT, total-mult medallion RIGHT. The readout lives in ControlBar in raw CANVAS pixels
	// (portrait: glass 300×78 centred at (w/2, h − 16 − 322·s), s = clamp(min(w/460, h/780),
	// 0.42, 0.48)) — mirror that math here and convert into this MainContainer's space via
	// mainLayout. If ControlBar's portrait numbers change, this block must follow.
	const PORTRAIT_GROUP_SCALE = 1.35;
	const PORTRAIT_WIN_GAP = SYMBOL_SIZE * 0.3; // gap between the readout glass and each panel
	const portrait = $derived.by(() => {
		const cs = context.stateLayoutDerived.canvasSizes();
		const ml = context.stateLayoutDerived.mainLayout();
		const s = Math.min(0.48, Math.max(0.42, Math.min(cs.width / 460, cs.height / 780)));
		const winCanvas = { x: cs.width * 0.5, y: cs.height - 16 - 322 * s };
		// mainLayout.anchor is a scalar (0.5) in utils-layout — normalize before using per-axis
		const anchor =
			typeof ml.anchor === 'number' ? { x: ml.anchor, y: ml.anchor } : ml.anchor;
		const win = {
			x: (winCanvas.x - ml.x) / ml.scale + anchor.x * ml.width,
			y: (winCanvas.y - ml.y) / ml.scale + anchor.y * ml.height,
		};
		const winHalfW = (150 * s) / ml.scale;
		const multDx = winHalfW + PORTRAIT_WIN_GAP + totalMultSize * 0.5 * PORTRAIT_GROUP_SCALE;
		const spinsDx = winHalfW + PORTRAIT_WIN_GAP + freeSpinsSize * 0.5 * PORTRAIT_GROUP_SCALE;
		return {
			x: win.x + multDx,
			y: win.y,
			// group units (the group is scaled), medallion origin → spins panel centre
			spinsOffsetX: -(multDx + spinsDx) / PORTRAIT_GROUP_SCALE,
		};
	});
	const position = $derived(
		isStacked
			? { x: portrait.x, y: portrait.y }
			: {
					x: boardLayout.x + boardLayout.width * 0.5 + SYMBOL_SIZE * 1.35,
					y: boardLayout.y - boardLayout.height * 0.5 + totalMultSize * 0.5 + SYMBOL_SIZE * 0.3,
				},
	);
	const groupScale = $derived(isStacked ? PORTRAIT_GROUP_SCALE : 1);
	// portrait: spins panel mirrors across the WIN readout; desktop: below the medallion
	const spinsPanelOffset = $derived(
		isStacked
			? { x: portrait.spinsOffsetX, y: 0 }
			: { x: 0, y: totalMultSize * 0.5 + freeSpinsH * 0.5 + panelGap },
	);

	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	let lastPersistentMult = $state(context.stateGame.persistentMult);
	const totalMultPop = new Tween(1, { duration: 160 });
	// feature-entry flourish: the HUD pops in instead of just fading
	const entrance = new Tween(1, { duration: 420, easing: backOut });

	// Blink-glow on the medallion when the banked ×M climbs (setPersistentMult lands after the
	// win is displayed, so this reads as "the win fed the snowball"). Kept disabled between
	// blinks so the filter costs nothing while idle.
	const MULT_GLOW_COLOR = 0xffb347;
	const MULT_GLOW_STRENGTH = 2.8;
	const multGlow = new GlowFilter({
		color: MULT_GLOW_COLOR,
		distance: 18,
		outerStrength: 0,
		quality: 0.3,
		// see Eye.svelte: a filter's render texture defaults to 1x, which rasterizes the banner +
		// its multiplier text at a fraction of the screen's density on a high-DPR phone. Match the
		// renderer's resolution exactly — capping it just trades 1x blur for 1.5x blur.
		resolution: window.devicePixelRatio || 1,
	});
	multGlow.enabled = false;
	const blinkGlow = () => {
		gsap.killTweensOf(multGlow);
		multGlow.enabled = true;
		gsap
			.timeline({ onComplete: () => (multGlow.enabled = false) })
			.to(multGlow, { outerStrength: MULT_GLOW_STRENGTH, duration: 0.12, ease: 'power2.out' })
			.to(multGlow, { outerStrength: 0.7, duration: 0.14, ease: 'power2.in' })
			.to(multGlow, { outerStrength: MULT_GLOW_STRENGTH * 0.85, duration: 0.12, ease: 'power2.out' })
			.to(multGlow, { outerStrength: 0, duration: 0.3, ease: 'power2.out' });
	};

	// The banked ×M in flight from the medallion to the BOARD CENTRE, where the combine equation
	// builds (eyeResolve awaits this alongside the Gaze seed — same hand-off as gazeMeterToEye).
	// boardLayout.x/y IS the board centre in this container's space, so no conversion needed.
	const flyFx = $state({ x: 0, y: 0, scale: 1, alpha: 0, active: false });
	const flyToCombine = () =>
		new Promise<void>((resolve) => {
			const target = context.stateGameDerived.boardLayout();
			flyFx.active = true;
			gsap.killTweensOf(flyFx);
			const tl = gsap.timeline({
				onComplete: () => {
					flyFx.active = false;
					resolve();
				},
			});
			tl.timeScale(stateBetDerived.timeScale());
			tl.set(flyFx, { x: position.x, y: position.y, scale: 0.6, alpha: 0 })
				.to(flyFx, { alpha: 1, scale: 1.25, duration: 0.2, ease: 'back.out(2)' })
				.to(flyFx, { x: target.x, y: target.y, duration: 0.5, ease: 'power2.inOut' }, '<0.05')
				.to(flyFx, { scale: 1.6, duration: 0.12, ease: 'power2.in' }, '-=0.12')
				.to(flyFx, { scale: 0.25, alpha: 0, duration: 0.16, ease: 'power2.in' });
			// the medallion dips as it hands its value to the combine (M itself doesn't change)
			void totalMultPop.set(0.85).then(() => totalMultPop.set(1));
		});

	context.eventEmitter.subscribeOnMount({
		snowballToCombine: async () => {
			// fly even at ×1 — the banked M is always the combine's last addend in the feature
			// (totalMult = eyeValue + old M, per the event guide §6.3)
			if (!show) return;
			await flyToCombine();
		},
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
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_snowball_up' });
			blinkGlow(); // runs alongside the pop; doesn't hold the book
			await totalMultPop.set(1.16);
			await totalMultPop.set(1);
		},
	});

	// Branded AbyssalBitmap face everywhere, at the lab-approved big sizes (/lab round 3):
	// gold label above the medallion, gold value in the teal porthole, gold FREE SPINS text on
	// the frame interior — same gold-on-blue treatment the tumble-win banner ships with.
	const totalMultLabelStyle = abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.16, letterSpacing: 2 });
	const totalMultValueStyle = abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.3 });
	const freeSpinsLabelStyle = abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.16, letterSpacing: 2 });
	const freeSpinsValueStyle = abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.28 });
	const flyTokenStyle = abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.4 });
</script>

<MainContainer>
	<FadeContainer {show} {...position}>
		<Container scale={groupScale * entrance.current}>
			<Container scale={totalMultPop.current}>
				<Container y={-totalMultSize * 0.58}>
					<BitmapText text={context.i18nDerived.totalMult()} anchor={0.5} style={totalMultLabelStyle} />
				</Container>
				<Container filters={[multGlow]}>
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

	<!-- the banked ×M flying from the medallion into the combine at the board centre -->
	{#if flyFx.active}
		<Container x={flyFx.x} y={flyFx.y} scale={flyFx.scale} alpha={flyFx.alpha}>
			<BitmapText
				anchor={0.5}
				text={`x${context.stateGame.persistentMult}`}
				style={flyTokenStyle}
			/>
		</Container>
	{/if}
</MainContainer>
