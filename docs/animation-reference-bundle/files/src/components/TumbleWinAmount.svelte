<script lang="ts" module>
	export type EmitterEventTumbleWinAmount =
		| { type: 'tumbleWinAmountShow' }
		| { type: 'tumbleWinAmountHide' }
		| { type: 'tumbleWinAmountReset' }
		| { type: 'tumbleWinAmountUpdate'; amount: number; animate: boolean }
		// The Eye's multiplier flies from its board cell into the banner and the raw win counts up
		// to the multiplied final (`totalWin`). The banner derives the ×N from totalWin / its own raw.
		| { type: 'tumbleWinAmountMultiply'; totalWin: number; fromReel: number; fromRow: number };
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import { ResponsiveText, FadeContainer } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getPositionX, getPositionY } from '../game/utils';

	const context = getContext();
	const ts = () => stateBetDerived.timeScale();

	// ---- panel geometry --------------------------------------------------------------------
	const PANEL_H = SYMBOL_SIZE * 0.82;
	const PANEL_W = PANEL_H * 3.9;
	const BANNER_SIZE = PANEL_W;
	const INNER_W = BANNER_SIZE * 0.73;
	const INNER_H = BANNER_SIZE * 0.2;
	const INNER_RADIUS = INNER_H * 0.22;

	// Sits just above the reels, centred. Nudged left in the feature so it clears the snowball.
	const desktopPosition = $derived({
		x: context.stateGameDerived.boardLayout().width * 0.5,
		y: -SYMBOL_SIZE * 0.74,
	});
	const portraitPosition = $derived({
		x:
			context.stateGameDerived.boardLayout().width *
			(context.stateGame.gameType === 'basegame' ? 0.5 : 0.37),
		y: -SYMBOL_SIZE * 0.8,
	});
	const position = $derived(
		context.stateLayoutDerived.isStacked() ? portraitPosition : desktopPosition,
	);
	const bannerScale = $derived(context.stateLayoutDerived.isStacked() ? 1.18 : 1);

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
	// multiply and big single-cluster jumps); otherwise it snaps.
	let token = 0;
	$effect(() => {
		const target = amount;
		const anim = animate;
		const my = ++token;
		(async () => {
			if (anim) {
				numScale.set(1.3);
				await displayAmount.set(target, { duration: 620 / ts() });
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
		// PLACEHOLDER multiplier-impact hit — swap for a bespoke sound later.
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_landing' });
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
		tumbleWinAmountHide: () => (show = false),
		tumbleWinAmountReset: () => {
			show = false;
			amount = 0;
			animate = false;
			oncomplete = () => {};
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
				await flyMultiplier({
					mult,
					fromReel: emitterEvent.fromReel,
					fromRow: emitterEvent.fromRow,
				});
				// the token lands → the display reads "raw × mult" with a punch, holds, then resolves
				multiplyExpr = { rawText, mult };
				numScale.set(1.32, { duration: 0 });
				numScale.set(1, { duration: 320 / ts(), easing: backOut });
				await waitForTimeout(750 / ts());
				multiplyExpr = null;
			}
			// count the banner up from the raw win to the multiplied final
			await waitForResolve((resolve) => {
				amount = emitterEvent.totalWin;
				animate = true;
				oncomplete = resolve;
			});
			// let the multiplied total read before the round proceeds (finalWin hides the banner)
			await waitForTimeout(500 / ts());
		},
	});

	// ---- styles (branded "minted" type, matches the Eye / Win values) ----------------------
	const labelStyle = {
		fontFamily: 'Abyssal, Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: PANEL_H * 0.22,
		fill: 0xcaf6ff,
		letterSpacing: 2,
		align: 'center',
		stroke: { color: 0x071124, width: 4 },
		dropShadow: { color: 0x1fcfff, blur: 8, distance: 0, alpha: 0.45 },
	} as const;
	const amountStyle = {
		fontFamily: 'Abyssal, Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: PANEL_H * 0.5,
		fill: 0xfff0b8,
		align: 'center',
		stroke: { color: 0x2a1400, width: 6 },
		dropShadow: { color: 0x000000, blur: 8, distance: 3, alpha: 0.6 },
	} as const;
	const exprStyle = {
		fontFamily: 'Abyssal, Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: PANEL_H * 0.44,
		fill: 0xffd76a,
		align: 'center',
		stroke: { color: 0x2a1400, width: 6 },
		dropShadow: { color: 0xffae3a, blur: 10, distance: 0, alpha: 0.7 },
	} as const;
	const multStyle = {
		fontFamily: 'Abyssal, Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: SYMBOL_SIZE * 0.72,
		fill: 0xffd76a,
		align: 'center',
		stroke: { color: 0x2a1400, width: 7 },
		dropShadow: { color: 0xffae3a, blur: 12, distance: 0, alpha: 0.9 },
	} as const;

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
				<Sprite anchor={0.5} key="tumbleWin" width={BANNER_SIZE} height={BANNER_SIZE} />
				{#if panelFx.flash > 0}
					<Container alpha={panelFx.flash} blendMode="add">
						<Graphics draw={drawFlash} />
					</Container>
				{/if}

				<Text anchor={0.5} y={-PANEL_H * 0.2} text="TUMBLE WIN" style={labelStyle} />
				<Container scale={numScale.current} y={PANEL_H * 0.16}>
					{#if multiplyExpr}
						<!-- "raw × mult" — the equation, before it resolves into the counted final -->
						<ResponsiveText
							anchor={0.5}
							maxWidth={INNER_W * 0.92}
							text={`${multiplyExpr.rawText}  ×${multiplyExpr.mult}`}
							style={exprStyle}
						/>
					{:else}
						<ResponsiveText
							anchor={0.5}
							maxWidth={INNER_W * 0.9}
							text={bookEventAmountToCurrencyString(displayAmount.current)}
							style={amountStyle}
						/>
					{/if}
				</Container>
			</Container>
		</Container>
	</BoardContainer>
</FadeContainer>
