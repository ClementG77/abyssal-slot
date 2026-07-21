<script lang="ts" module>
	export type EmitterEventTumbleWinAmount =
		| { type: 'tumbleWinAmountShow' }
		| { type: 'tumbleWinAmountHide' }
		| { type: 'tumbleWinAmountReset' }
		| { type: 'tumbleWinAmountUpdate'; amount: number; animate: boolean }
		// The Eye's multiplier flies from its board cell into the banner and (by default) the raw
		// win counts up to the multiplied final (`totalWin`). The banner derives the ×N from
		// totalWin / its own raw. `countToFinal: false` stops after the "raw × mult" equation so
		// the FINAL is never shown on the banner — used by celebration wins, where the win-steps
		// takeover owns the final reveal.
		| {
				type: 'tumbleWinAmountMultiply';
				totalWin: number;
				fromReel: number;
				fromRow: number;
				countToFinal?: boolean;
		  };
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import ResponsiveText from './ResponsiveText.svelte';
	import { FadeContainer } from 'components-pixi';
	import { FONT } from './controls/theme';
	import { stateBetDerived } from 'state-shared';
	import { waitForResolve } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import {
		abyssalAmountTextStyle,
		abyssalLabelTextStyle,
		CELEBRATION_FACE,
	} from '../game/textStyles';
	import { getPositionX, getPositionY } from '../game/utils';
	import { raceSkip, skippableWait } from '../game/skip.svelte';

	const context = getContext();
	const ts = () => stateBetDerived.timeScale();

	// ---- banner geometry -------------------------------------------------------------------
	// tumble_win.png is 1448×1086 (aspect 1.333); render at that aspect, not square.
	const BANNER_W = SYMBOL_SIZE * 2.6;
	const BANNER_H = BANNER_W * (1086 / 1448);
	// text sits in the frame's blue interior (measured ~89% wide, vertically centred)
	const INNER_W = BANNER_W * 0.78;
	const INNER_H = BANNER_H * 0.42;
	const INNER_RADIUS = INNER_H * 0.22;

	// Sits just above the reels, centred. On HORIZONTAL layouts (popup/laptop/desktop) the
	// FREE-SPINS reel frame is taller and sits higher, so the board scales up and rides up —
	// which pushes this banner (already well above the board top) off the top edge and crops it.
	// Shrink + lower it for the feature on horizontal only; base-horizontal and portrait keep
	// their placement (portrait has its own spot above the gaze meter).
	const feature = $derived(context.stateGame.gameType === 'freegame');
	const FEATURE_DESKTOP_SCALE = 0.82; // horizontal free-spins: smaller so it isn't cropped
	const FEATURE_DESKTOP_Y = -SYMBOL_SIZE * 0.3; // …and lower (was -0.55 in base)
	const desktopPosition = $derived({
		x: context.stateGameDerived.boardLayout().width * 0.5,
		y: feature ? FEATURE_DESKTOP_Y : -SYMBOL_SIZE * 0.55,
	});
	const portraitPosition = $derived({
		x: context.stateGameDerived.boardLayout().width * 0.5,
		y: -SYMBOL_SIZE * 0.62,
	});
	const position = $derived(
		context.stateLayoutDerived.isStacked() ? portraitPosition : desktopPosition,
	);
	const bannerScale = $derived(
		context.stateLayoutDerived.isStacked() ? 1.18 : feature ? FEATURE_DESKTOP_SCALE : 1,
	);

	// ---- state -----------------------------------------------------------------------------
	let show = $state(false);
	let amount = $state(0); // the running RAW tumble win (cents-of-bet)
	let animate = $state(false);
	let oncomplete = $state(() => {});

	const displayAmount = new Tween(0);
	const numScale = new Tween(1, { duration: 160, easing: backOut });
	const panelFx = $state({ flash: 0, scale: 1, glow: 0 });
	const flyFx = $state({ x: 0, y: 0, scale: 0.5, alpha: 0, mult: 1, active: false });
	// While set, the banner shows the equation "raw × mult" instead of the plain amount; it then
	// resolves into the counted final.
	let multiplyExpr = $state<{ rawText: string; mult: number } | null>(null);

	// Count the displayed number toward `amount`. `animate` adds a scale pop (used for the eye
	// multiply and big single-cluster jumps); otherwise it snaps. A press-to-skip FINISHES the
	// running count fast (turbo pace) instead of jumping to the target.
	const COUNT_SKIP_MS = 180; // the fast finish of an interrupted count-up

	let token = 0;
	$effect(() => {
		const target = amount;
		const anim = animate;
		const my = ++token;
		(async () => {
			if (anim) {
				numScale.set(1.3);
				const raced = await raceSkip(displayAmount.set(target, { duration: 620 / ts() }));
				if (raced === 'skipped')
					await displayAmount.set(target, { duration: COUNT_SKIP_MS });
				await numScale.set(1);
			} else {
				await displayAmount.set(target, { duration: 0 });
			}
			if (my === token) oncomplete();
		})();
	});

	// ---- the multiplier flying from the Eye into the banner --------------------------------
	const panelImpact = () => {
		gsap.killTweensOf(panelFx);
		gsap
			.timeline()
			.set(panelFx, { flash: 0.95, scale: 1.2, glow: 1 })
			.to(panelFx, { flash: 0, duration: 0.42, ease: 'power2.out' })
			.to(panelFx, { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)' }, 0)
			.to(panelFx, { glow: 0, duration: 0.7, ease: 'power2.out' }, 0.1);
		// Deliberately SILENT: the flight already sounds at launch (sfx_mult_moove). Re-using the
		// combine clip here made it the 4th cue of the same family in one sequence.
	};

	const flyMultiplier = ({
		mult,
		fromReel,
		fromRow,
	}: {
		mult: number;
		fromReel: number;
		fromRow: number;
	}) =>
		new Promise<void>((resolve) => {
			flyFx.mult = mult;
			flyFx.active = true;
			gsap.killTweensOf(flyFx);
			// the combined final multiplier launches toward the banner — the travel whoosh
			// (panelImpact's combine hit lands the arrival beat)
			context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_mult_moove', forcePlay: true });
			const tl = gsap.timeline({
				onComplete: () => {
					flyFx.active = false;
					resolve();
				},
			});
			tl.timeScale(ts());
			tl.set(flyFx, { x: getPositionX(fromReel), y: getPositionY(fromRow), scale: 0.5, alpha: 0 })
				.to(flyFx, { alpha: 1, scale: 1.2, duration: 0.22, ease: 'back.out(2.2)' })
				.to(flyFx, { x: position.x, y: position.y, duration: 0.5, ease: 'power2.inOut' }, '<0.06')
				.to(flyFx, { scale: 1.7, duration: 0.12, ease: 'power2.in' }, '-=0.14')
				.add(() => panelImpact())
				.to(flyFx, { scale: 0.2, alpha: 0, duration: 0.16, ease: 'power2.in' });
		});

	context.eventEmitter.subscribeOnMount({
		tumbleWinAmountShow: () => (show = amount > 0),
		tumbleWinAmountHide: () => {
			show = false;
			// clear any equation left up by a celebration multiply (countToFinal:false) so it
			// never leaks onto the next win
			multiplyExpr = null;
		},
		tumbleWinAmountReset: () => {
			show = false;
			amount = 0;
			animate = false;
			oncomplete = () => {};
			multiplyExpr = null;
			displayAmount.set(0, { duration: 0 });
		},
		tumbleWinAmountUpdate: async (emitterEvent) => {
			if (emitterEvent.amount <= 0) {
				show = false;
				return;
			}
			if (amount !== emitterEvent.amount) {
				amount = emitterEvent.amount;
				animate = emitterEvent.animate;
				show = true;
				await waitForResolve((resolve) => (oncomplete = resolve));
			}
		},
		tumbleWinAmountMultiply: async (emitterEvent) => {
			show = true;
			const raw = amount;
			const mult = raw > 0 ? Math.max(1, Math.round(emitterEvent.totalWin / raw)) : 1;
			if (mult >= 2) {
				const rawText = bookEventAmountToCurrencyString(raw);
				const flight = flyMultiplier({
					mult,
					fromReel: emitterEvent.fromReel,
					fromRow: emitterEvent.fromRow,
				});
				// a press-to-skip accelerates the flight to turbo (skip.svelte retimes all
				// in-flight gsap animations), so just await the real landing
				await flight;
				// the token lands → the display reads "raw × mult" with a punch, holds, then resolves
				multiplyExpr = { rawText, mult };
				numScale.set(1.32, { duration: 0 });
				numScale.set(1, { duration: 320 / ts(), easing: backOut });
				await skippableWait(750 / ts());
				// Celebration wins: stop on the equation — the win-steps takeover reveals the
				// final, so the banner must NOT count to it. Leave the equation up; the banner
				// fades out (tumbleWinAmountHide clears it) as the takeover opens.
				if (emitterEvent.countToFinal === false) return;
				multiplyExpr = null;
			}
			// celebration wins never reveal the final on the banner (guards the mult<2 path too)
			if (emitterEvent.countToFinal === false) return;
			// count the banner up from the raw win to the multiplied final — the count-up loop runs
			// ONLY here (a real multiplied count), not on plain tumble amount adds
			context.eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_countup_loop' });
			await waitForResolve((resolve) => {
				amount = emitterEvent.totalWin;
				animate = true;
				oncomplete = resolve;
			});
			context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_countup_loop' });
			// let the multiplied total read before the round proceeds (finalWin hides the banner)
			await skippableWait(500 / ts());
		},
	});

	// ---- styles. All from game/textStyles.ts so the banner carries the same metal as the rest of
	// the game's numbers. Left on the NEUTRAL accent deliberately: the tumble banner is teal
	// furniture with no win-step identity, so a tier colour here would claim a tier it hasn't won.
	//
	// The BANNER's own text stays on the UI face. It carries currency (which the display serif
	// lacks for ~10 of Stake's symbols, so those amounts would render mixed) and its caption runs
	// ~17-21px, where a serif's hairlines get eaten by the stroke. `exprStyle` and `amountStyle`
	// share one slot and swap as the equation resolves, so they must always match each other.
	const labelStyle = abyssalLabelTextStyle({ fontSize: SYMBOL_SIZE * 0.14, letterSpacing: 2 });
	const amountStyle = abyssalAmountTextStyle({ fontSize: SYMBOL_SIZE * 0.31 });
	const exprStyle = abyssalAmountTextStyle({ fontSize: SYMBOL_SIZE * 0.27 });

	// The flying multiplier token is the exception: big, digits-only, no currency, and it reads as
	// a prize being carried out of the Eye rather than as banner copy — so it keeps the display
	// face. Drop `face` here to put it back on the UI face with everything else.
	const multStyle = abyssalAmountTextStyle({ fontSize: SYMBOL_SIZE * 0.6, face: CELEBRATION_FACE });

	// ---- banner overlays -------------------------------------------------------------------
	const drawGlow = (g: import('pixi.js').Graphics) => {
		g.roundRect(
			-INNER_W / 2 - 12,
			-INNER_H / 2 - 12,
			INNER_W + 24,
			INNER_H + 24,
			INNER_RADIUS + 10,
		).fill({ color: 0xffce5a, alpha: 0.28 });
	};
	const drawFlash = (g: import('pixi.js').Graphics) => {
		g.roundRect(-INNER_W / 2, -INNER_H / 2, INNER_W, INNER_H, INNER_RADIUS).fill({
			color: 0xffffff,
		});
	};
</script>

<!-- the multiplier token flying from the Eye cell into the banner (board space) -->
<BoardContainer>
	{#if flyFx.active}
		<Container x={flyFx.x} y={flyFx.y} scale={flyFx.scale} alpha={flyFx.alpha}>
			<Text anchor={0.5} text={`×${flyFx.mult}`} style={multStyle} />
		</Container>
	{/if}
</BoardContainer>

<!-- the banner -->
<FadeContainer {show}>
	<BoardContainer>
		<Container {...position} scale={bannerScale}>
			<Container scale={panelFx.scale}>
				{#if panelFx.glow > 0}
					<Container alpha={panelFx.glow} blendMode="add">
						<Graphics draw={drawGlow} />
					</Container>
				{/if}
				<Sprite anchor={0.5} key="tumbleWin" width={BANNER_W} height={BANNER_H} />
				{#if panelFx.flash > 0}
					<Container alpha={panelFx.flash} blendMode="add">
						<Graphics draw={drawFlash} />
					</Container>
				{/if}

				<Text
					anchor={0.5}
					y={-BANNER_H * 0.09}
					text={context.i18nDerived.tumbleWin()}
					style={labelStyle}
				/>
				<Container scale={numScale.current} y={BANNER_H * 0.09}>
					{#if multiplyExpr}
						<!-- "raw × mult" — the equation, before it resolves into the counted final -->
						<ResponsiveText
							anchor={0.5}
							maxWidth={INNER_W * 0.92}
							text={`${multiplyExpr.rawText}  ×${multiplyExpr.mult}`}
							style={exprStyle}
						/>
					{:else}
						<Text
							anchor={0.5}
							text={bookEventAmountToCurrencyString(displayAmount.current)}
							style={amountStyle}
						/>
					{/if}
				</Container>
			</Container>
		</Container>
	</BoardContainer>
</FadeContainer>
