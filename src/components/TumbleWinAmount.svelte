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

	import { Container, Graphics, Text } from 'pixi-svelte';
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
	const RADIUS = PANEL_H * 0.32;

	// Sits just above the reels, centred. Nudged left in the feature so it clears the snowball.
	const desktopPosition = $derived({
		x: context.stateGameDerived.boardLayout().width * 0.5,
		y: -SYMBOL_SIZE * 0.56,
	});
	const portraitPosition = $derived({
		x:
			context.stateGameDerived.boardLayout().width *
			(context.stateGame.gameType === 'basegame' ? 0.5 : 0.37),
		y: -SYMBOL_SIZE * 0.62,
	});
	const position = $derived(
		context.stateLayoutDerived.isStacked() ? portraitPosition : desktopPosition,
	);
	const bannerScale = $derived(context.stateLayoutDerived.isStacked() ? 1.26 : 1);

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
		tumbleWinAmountShow: () => (show = true),
		tumbleWinAmountHide: () => (show = false),
		tumbleWinAmountReset: () => {
			amount = 0;
			animate = false;
			oncomplete = () => {};
			displayAmount.set(0, { duration: 0 });
		},
		tumbleWinAmountUpdate: async (emitterEvent) => {
			if (amount !== emitterEvent.amount) {
				amount = emitterEvent.amount;
				animate = emitterEvent.animate;
				await waitForResolve((resolve) => (oncomplete = resolve));
			}
		},
		tumbleWinAmountMultiply: async (emitterEvent) => {
			show = true;
			const raw = amount;
			const mult = raw > 0 ? Math.max(1, Math.round(emitterEvent.totalWin / raw)) : 1;
			if (mult >= 2) {
				const rawText = bookEventAmountToCurrencyString(raw);
				await flyMultiplier({ mult, fromReel: emitterEvent.fromReel, fromRow: emitterEvent.fromRow });
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
		fontFamily: 'Cinzel, Georgia, serif',
		fontWeight: '700',
		fontSize: PANEL_H * 0.17,
		fill: 0x9fe8ff,
		letterSpacing: 2,
		align: 'center',
		stroke: { color: 0x05111e, width: 3 },
	} as const;
	const amountStyle = {
		fontFamily: 'Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: PANEL_H * 0.46,
		fill: 0xffe6a6,
		align: 'center',
		stroke: { color: 0x2a1400, width: 6 },
		dropShadow: { color: 0x000000, blur: 8, distance: 3, alpha: 0.6 },
	} as const;
	const exprStyle = {
		fontFamily: 'Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: PANEL_H * 0.42,
		fill: 0xffd76a,
		align: 'center',
		stroke: { color: 0x2a1400, width: 6 },
		dropShadow: { color: 0xffae3a, blur: 10, distance: 0, alpha: 0.7 },
	} as const;
	const multStyle = {
		fontFamily: 'Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: SYMBOL_SIZE * 0.72,
		fill: 0xffd76a,
		align: 'center',
		stroke: { color: 0x2a1400, width: 7 },
		dropShadow: { color: 0xffae3a, blur: 12, distance: 0, alpha: 0.9 },
	} as const;

	// ---- panel drawing ---------------------------------------------------------------------
	const drawGlow = (g: import('pixi.js').Graphics) => {
		g.roundRect(
			-PANEL_W / 2 - 10,
			-PANEL_H / 2 - 10,
			PANEL_W + 20,
			PANEL_H + 20,
			RADIUS + 8,
		).fill({ color: 0xffce5a, alpha: 0.28 });
	};
	const drawPanel = (g: import('pixi.js').Graphics) => {
		// glassy base
		g.roundRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, RADIUS).fill({
			color: 0x060a16,
			alpha: 0.92,
		});
		// top sheen
		g.roundRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H * 0.5, RADIUS).fill({
			color: 0xffffff,
			alpha: 0.05,
		});
		// gold rim + inner cyan line
		g.roundRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, RADIUS).stroke({
			width: 3,
			color: 0xffcf5a,
			alpha: 0.85,
		});
		g.roundRect(-PANEL_W / 2 + 4, -PANEL_H / 2 + 4, PANEL_W - 8, PANEL_H - 8, RADIUS - 3).stroke({
			width: 1.5,
			color: 0x22e0ff,
			alpha: 0.45,
		});
	};
	const drawFlash = (g: import('pixi.js').Graphics) => {
		g.roundRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, RADIUS).fill({ color: 0xffffff });
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
				<Graphics draw={drawPanel} />
				{#if panelFx.flash > 0}
					<Container alpha={panelFx.flash} blendMode="add">
						<Graphics draw={drawFlash} />
					</Container>
				{/if}

				<Text anchor={0.5} y={-PANEL_H * 0.27} text="TUMBLE WIN" style={labelStyle} />
				<Container scale={numScale.current} y={PANEL_H * 0.1}>
					{#if multiplyExpr}
						<!-- "raw × mult" — the equation, before it resolves into the counted final -->
						<ResponsiveText
							anchor={0.5}
							maxWidth={PANEL_W * 0.86}
							text={`${multiplyExpr.rawText}  ×${multiplyExpr.mult}`}
							style={exprStyle}
						/>
					{:else}
						<ResponsiveText
							anchor={0.5}
							maxWidth={PANEL_W * 0.82}
							text={bookEventAmountToCurrencyString(displayAmount.current)}
							style={amountStyle}
						/>
					{/if}
				</Container>
			</Container>
		</Container>
	</BoardContainer>
</FadeContainer>
