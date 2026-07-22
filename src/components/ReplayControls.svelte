<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';

	import { Container, Graphics, Rectangle, Text } from 'pixi-svelte';
	import { Button, FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { stateBet, stateBetDerived, stateSound, stateUrlDerived } from 'state-shared';
	import { requestReplay } from 'rgs-requests';
	import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
	import { bookEventAmountToCurrencyString, numberToCurrencyString } from 'utils-shared/amount';

	import WinReadout from './WinReadout.svelte';
	import { getContext } from '../game/context';
	import { C, FONT } from './controls/theme';
	import { drawControlGlyph } from '../controlbar/vectorIcons';

	// Slimmed-down replay UI, shown instead of the ControlBar when launched with ?replay=true.
	// The game fetches its own replay state (per the Bet Replay spec) and plays it through the
	// standard resume path, gated behind Play / Play Again. No balance, bet selector, autoplay or
	// buy — a replay can never start real play.
	const context = getContext();

	type Status = 'loading' | 'ready' | 'error';
	type Phase = 'idle' | 'playing' | 'done';
	let status = $state<Status>('loading');
	let phase = $state<Phase>('idle');
	let leftIdle = false;

	// Immutable copy of the replay bet so it can be replayed any number of times (the resume
	// machine nulls stateBet.betToResume when it plays). `$state`, not a plain `let` — the
	// `betCostAmount` derived below reads it, and only a rune tracks that reassignment inside
	// onMount.
	let snapshot = $state<typeof stateBet.betToResume>(null);

	onMount(async () => {
		// the replay bet mode + amount drive the read-only cost display
		if (stateUrlDerived.mode()) stateBet.activeBetModeKey = stateUrlDerived.mode();
		const amount = stateUrlDerived.amount();
		if (amount) {
			stateBet.betAmount = amount / API_AMOUNT_MULTIPLIER;
			stateBet.wageredBetAmount = stateBet.betAmount;
		}

		// Bet Replay's `currency` query param (optional per spec, but authoritative when
		// present): a replay never authenticates — no session — so `stateBet.currency` is
		// otherwise left at its hardcoded default and every amount below would render in the
		// wrong currency for a non-default-currency round. `page` (SvelteKit, not an SDK
		// package) mirrors how state-shared's own stateUrlDerived reads the URL.
		const currency = page.url.searchParams.get('currency');
		if (currency) stateBet.currency = currency;

		// prefer data already loaded by <Authenticate>; otherwise fetch it ourselves
		if (stateBet.betToResume?.state) {
			snapshot = $state.snapshot(stateBet.betToResume) as typeof stateBet.betToResume;
			status = 'ready';
			return;
		}

		try {
			const data = await requestReplay({
				rgsUrl: stateUrlDerived.rgsUrl(),
				game: stateUrlDerived.game(),
				mode: stateUrlDerived.mode(),
				version: stateUrlDerived.version(),
				event: stateUrlDerived.event(),
			});

			if (!data || (data as { error?: unknown }).error || !(data as { state?: unknown }).state) {
				throw data ?? new Error('Empty replay response');
			}

			snapshot = {
				...(data as object),
				event: '0',
				active: true,
				mode: stateUrlDerived.mode(),
			} as typeof stateBet.betToResume;
			status = 'ready';
		} catch (error) {
			console.error('[replay] failed to load replay data', error);
			status = 'error';
		}
	});

	const play = () => {
		if (status !== 'ready' || !snapshot) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		// snapshot is now $state (reactive, so betCostAmount can watch it) — de-proxy it before
		// structuredClone, which chokes on Svelte's reactive proxies the same way it would on
		// stateBet.betToResume itself (the reason the initial assignment above ALSO snapshots).
		stateBet.betToResume = structuredClone($state.snapshot(snapshot)) as typeof stateBet.betToResume;
		stateBet.winBookEventAmount = 0;
		leftIdle = false;
		phase = 'playing';
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	};

	// once the round has actually started (left idle) and returns to idle, it's finished
	$effect(() => {
		if (phase !== 'playing') return;
		const idle = context.stateXstateDerived.isIdle();
		if (!idle) leftIdle = true;
		if (leftIdle && idle) phase = 'done';
	});

	// speed / turbo toggle — available even while the replay is playing
	const turboDisabled = $derived(stateBet.isSpaceHold);
	const toggleTurbo = () => {
		if (turboDisabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressToggle' });
		if (stateBet.isTurbo) {
			stateBetDerived.updateIsTurbo(false, { persistent: true });
		} else {
			context.stateGameDerived.enableTurbo();
		}
	};

	// music/sfx mute toggle — same global `stateSound.volumeValueMaster` the main ControlBar's
	// menu sliders drive (state-shared), so it's a real cut, not a replay-local fake. Remembers
	// the level it muted FROM so unmuting restores it exactly, instead of snapping to a fixed
	// value like the SDK's own ButtonSoundSwitch does.
	let volumeBeforeMute = stateSound.volumeValueMaster || 75;
	const muted = $derived(stateSound.volumeValueMaster === 0);
	const toggleMute = () => {
		context.eventEmitter.broadcast({ type: 'soundPressToggle' });
		if (muted) {
			stateSound.volumeValueMaster = volumeBeforeMute;
		} else {
			volumeBeforeMute = stateSound.volumeValueMaster;
			stateSound.volumeValueMaster = 0;
		}
	};

	const winText = $derived(bookEventAmountToCurrencyString(stateBet.winBookEventAmount));

	// The RGS's own `costMultiplier` for THIS historical round (returned by the replay endpoint
	// itself — see rgs-requests' requestReplay) is the authoritative figure for an audit-trail
	// feature: prefer it over our local bet-mode table, which is tuned for pricing LIVE bets and
	// could in principle drift from the math config a past round actually priced under. Read
	// defensively — the replay response isn't fully modeled in rgs-fetcher's schema yet (see the
	// `@ts-ignore` on requestReplay), so `snapshot` may or may not carry the field at runtime.
	const responseCostMultiplier = $derived(
		(snapshot as unknown as { costMultiplier?: number } | null)?.costMultiplier,
	);
	const betCostAmount = $derived(
		responseCostMultiplier !== undefined
			? stateBet.betAmount * responseCostMultiplier
			: stateBetDerived.betCost(),
	);
	// `amount` is optional per the Bet Replay spec; if a replay link omits it, show a placeholder
	// instead of a misleading "$0.00" (a round that happened obviously wasn't free).
	const betText = $derived(stateBet.betAmount > 0 ? numberToCurrencyString(betCostAmount) : '—');
	const showButton = $derived(phase !== 'playing' && status === 'ready');
	const buttonLabel = $derived(
		phase === 'done' ? context.i18nDerived.playAgain() : context.i18nDerived.play(),
	);
	const statusText = $derived(
		status === 'loading'
			? context.i18nDerived.loadingReplay()
			: status === 'error'
				? context.i18nDerived.replayUnavailable()
				: '',
	);

	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());

	const BAR_W = 820;
	const BAR_H = 168;
	const BTN_W = 250;
	const BTN_H = 80;

	const labelStyle = {
		fontFamily: FONT,
		fontWeight: '700',
		fontSize: 15,
		fill: C.textDim,
		letterSpacing: 1.5,
	} as const;
	const valueStyle = {
		fontFamily: FONT,
		fontWeight: '900',
		fontSize: 30,
		fill: C.white,
		dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 },
	} as const;

	// ONE plate material for the whole replay UI. These live here rather than at each call site
	// because the compact win plate below first drifted to 0.78/0.45 against the bar's 0.82/0.5 —
	// identical colours, slightly different alphas. That is invisible in code and reads on screen as
	// two surfaces that ALMOST match, which is worse than two that clearly differ.
	const PLATE = {
		fill: C.navyDeep,
		fillAlpha: 0.82,
		stroke: C.purpleBright,
		strokeAlpha: 0.5,
		strokeWidth: 2,
		/** corner radius as a fraction of plate HEIGHT, so a small plate curves like the big one */
		radiusRatio: 24 / 168,
	} as const;

	const drawPlate = (g: import('pixi.js').Graphics, w: number, h: number) => {
		const r = h * PLATE.radiusRatio;
		g.roundRect(-w / 2, -h / 2, w, h, r).fill({ color: PLATE.fill, alpha: PLATE.fillAlpha });
		g.roundRect(-w / 2, -h / 2, w, h, r).stroke({
			width: PLATE.strokeWidth,
			color: PLATE.stroke,
			alpha: PLATE.strokeAlpha,
		});
	};

	const drawBar = (g: import('pixi.js').Graphics) => drawPlate(g, BAR_W, BAR_H);

	// --- Running win, shown WHILE the round plays ------------------------------------------------
	// The full bar is hidden during playback so it does not cover the win animation, which took the
	// WIN readout with it — leaving a replay with no way to see what the round was paying as it
	// played. A live round never does that: the ControlBar stays up and its WIN counts along.
	//
	// So this is the same readout at a fraction of the footprint (a ~5x smaller plate), shown only
	// while the bar is away. It reads the SAME `stateBet.winBookEventAmount` the bar and the
	// ControlBar both use, so the number is identical and cannot drift between them.
	// Only worth drawing once the round has actually paid something — an empty "WIN 0.00" hovering
	// over the board for every losing replay is noise, not information.
	const showMiniWin = $derived(phase === 'playing' && stateBet.winBookEventAmount > 0);

</script>

<MainContainer standard alignVertical="bottom">
	<!-- Running win while the bar is away. Sits at the bar's own centre line so it reads as the bar
	     shrinking down to just its essential number, rather than as a new element appearing
	     somewhere else. Exactly one of the two is on screen at any time. -->
	<FadeContainer show={showMiniWin}>
		<Container x={layout.width * 0.5} y={layout.height - BAR_H * 0.5 - 36}>
			<WinReadout text={winText} />
		</Container>
	</FadeContainer>

	<!-- hide the whole bar while the round is playing so it doesn't cover the win animation -->
	<FadeContainer show={phase !== 'playing'}>
		<Container x={layout.width * 0.5} y={layout.height - BAR_H * 0.5 - 36}>
			<Graphics draw={drawBar} />

			<!-- REPLAY badge (top center) -->
			<Container y={-BAR_H * 0.5 + 24}>
				<Graphics
					draw={(g) => {
						g.roundRect(-58, -14, 116, 28, 8).fill({ color: C.purpleBright, alpha: 0.92 });
					}}
				/>
				<Text
					anchor={0.5}
					text={context.i18nDerived.replay()}
					style={{
						fontFamily: FONT,
						fontWeight: '900',
						fontSize: 14,
						fill: C.white,
						letterSpacing: 3,
					}}
				/>
			</Container>

			<!-- BET (left) -->
			<Container x={-BAR_W / 2 + 44} y={18}>
				<Text anchor={{ x: 0, y: 0.5 }} y={-16} text={context.i18nDerived.bet()} style={labelStyle} />
				<Text anchor={{ x: 0, y: 0.5 }} y={16} text={betText} style={valueStyle} />
			</Container>

			<!-- WIN (right) -->
			<Container x={BAR_W / 2 - 44} y={18}>
				<Text anchor={{ x: 1, y: 0.5 }} y={-16} text={context.i18nDerived.win()} style={labelStyle} />
				<Text
					anchor={{ x: 1, y: 0.5 }}
					y={16}
					text={winText}
					style={{ ...valueStyle, fill: C.amber }}
				/>
			</Container>

			<!-- center: PLAY / PLAY AGAIN button, or loading/error status -->
			{#if showButton}
				<Container y={16}>
					<Button anchor={0.5} sizes={{ width: BTN_W, height: BTN_H }} onpress={play}>
						{#snippet children({ center, hovered, pressed })}
							<Container x={center.x} y={center.y} scale={pressed ? 0.97 : hovered ? 1.03 : 1}>
								<Rectangle
									anchor={0.5}
									width={BTN_W}
									height={BTN_H}
									backgroundColor={0x000000}
									backgroundAlpha={0.001}
								/>
								<Graphics
									draw={(g) => {
										g.roundRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_H / 2).fill({
											color: hovered ? C.purpleBright : C.violet,
										});
										g.roundRect(-BTN_W / 2, -BTN_H / 2, BTN_W, BTN_H, BTN_H / 2).stroke({
											width: 2,
											color: C.white,
											alpha: 0.5,
										});
										g.poly([-BTN_W / 2 + 40, -16, -BTN_W / 2 + 40, 16, -BTN_W / 2 + 64, 0]).fill(
											C.white,
										);
									}}
								/>
								<Text
									anchor={0.5}
									x={16}
									text={buttonLabel}
									style={{
										fontFamily: FONT,
										fontWeight: '900',
										fontSize: 26,
										fill: C.white,
										letterSpacing: 1,
									}}
								/>
							</Container>
						{/snippet}
					</Button>
				</Container>
			{:else if statusText}
				<Text
					anchor={0.5}
					y={16}
					text={statusText}
					style={{
						fontFamily: FONT,
						fontWeight: '800',
						fontSize: 20,
						fill: status === 'error' ? C.ember : C.textDim,
						letterSpacing: 1,
					}}
				/>
			{/if}
		</Container>
	</FadeContainer>

	<!-- music/sfx mute: stays visible the whole time, same as the turbo toggle beside it -->
	<Container x={layout.width - 192} y={layout.height - BAR_H * 0.5 - 36}>
		<Button anchor={0.5} sizes={{ width: 76, height: 76 }} onpress={toggleMute}>
			{#snippet children({ center, hovered, pressed })}
				<Container x={center.x} y={center.y} scale={pressed ? 0.96 : hovered ? 1.04 : 1}>
					<Graphics
						draw={(g) => {
							g.circle(0, 0, 38).fill({
								color: muted ? C.navyDeep : C.purpleBright,
								alpha: 0.92,
							});
							g.circle(0, 0, 38).stroke({
								width: 2,
								color: muted ? C.purpleBright : C.white,
								alpha: 0.8,
							});
						}}
					/>
					<Graphics
						draw={(g) => drawControlGlyph(g, 'sound', 42, { active: !muted, color: C.white })}
					/>
				</Container>
			{/snippet}
		</Button>
		<Text
			anchor={0.5}
			y={54}
			text={context.i18nDerived.audio()}
			style={{
				fontFamily: FONT,
				fontWeight: '800',
				fontSize: 12,
				fill: C.textDim,
				letterSpacing: 1.5,
			}}
		/>
	</Container>

	<!-- speed/turbo toggle: stays visible the whole time so the replay can be sped up mid-play -->
	<Container x={layout.width - 96} y={layout.height - BAR_H * 0.5 - 36}>
		<Button
			anchor={0.5}
			sizes={{ width: 76, height: 76 }}
			onpress={toggleTurbo}
			disabled={turboDisabled}
		>
			{#snippet children({ center, hovered, pressed })}
				<Container
					x={center.x}
					y={center.y}
					scale={pressed ? 0.96 : hovered ? 1.04 : 1}
					alpha={turboDisabled ? 0.45 : 1}
				>
					<Graphics
						draw={(g) => {
							g.circle(0, 0, 38).fill({
								color: stateBet.isTurbo ? C.purpleBright : C.navyDeep,
								alpha: 0.92,
							});
							g.circle(0, 0, 38).stroke({
								width: 2,
								color: stateBet.isTurbo ? C.white : C.purpleBright,
								alpha: 0.8,
							});
						}}
					/>
					<Graphics
						draw={(g) =>
							drawControlGlyph(g, 'turbo', 42, {
								active: stateBet.isTurbo,
								disabled: turboDisabled,
								color: C.white,
							})}
					/>
				</Container>
			{/snippet}
		</Button>
		<Text
			anchor={0.5}
			y={54}
			text={context.i18nDerived.speed()}
			style={{
				fontFamily: FONT,
				fontWeight: '800',
				fontSize: 12,
				fill: C.textDim,
				letterSpacing: 1.5,
			}}
		/>
	</Container>
</MainContainer>
