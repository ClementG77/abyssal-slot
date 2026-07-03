<script lang="ts">
	import { onMount } from 'svelte';

	import { Container, Graphics, Rectangle, Text } from 'pixi-svelte';
	import { Button, FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { stateBet, stateBetDerived, stateUrlDerived } from 'state-shared';
	import { requestReplay } from 'rgs-requests';
	import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
	import { bookEventAmountToCurrencyString, numberToCurrencyString } from 'utils-shared/amount';

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
	// machine nulls stateBet.betToResume when it plays).
	let snapshot: typeof stateBet.betToResume = null;

	onMount(async () => {
		// the replay bet mode + amount drive the read-only cost display
		if (stateUrlDerived.mode()) stateBet.activeBetModeKey = stateUrlDerived.mode();
		const amount = stateUrlDerived.amount();
		if (amount) {
			stateBet.betAmount = amount / API_AMOUNT_MULTIPLIER;
			stateBet.wageredBetAmount = stateBet.betAmount;
		}

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
		stateBet.betToResume = structuredClone(snapshot) as typeof stateBet.betToResume;
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
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (stateBet.isTurbo) {
			stateBetDerived.updateIsTurbo(false, { persistent: true });
		} else {
			context.stateGameDerived.enableTurbo();
		}
	};

	const winText = $derived(bookEventAmountToCurrencyString(stateBet.winBookEventAmount));
	const betText = $derived(numberToCurrencyString(stateBetDerived.betCost()));
	const showButton = $derived(phase !== 'playing' && status === 'ready');
	const buttonLabel = $derived(phase === 'done' ? 'PLAY AGAIN' : 'PLAY');
	const statusText = $derived(
		status === 'loading' ? 'LOADING REPLAY…' : status === 'error' ? 'REPLAY UNAVAILABLE' : '',
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

	const drawBar = (g: import('pixi.js').Graphics) => {
		g.roundRect(-BAR_W / 2, -BAR_H / 2, BAR_W, BAR_H, 24).fill({ color: C.navyDeep, alpha: 0.82 });
		g.roundRect(-BAR_W / 2, -BAR_H / 2, BAR_W, BAR_H, 24).stroke({
			width: 2,
			color: C.purpleBright,
			alpha: 0.5,
		});
	};
</script>

<MainContainer standard alignVertical="bottom">
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
					text="REPLAY"
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
				<Text anchor={{ x: 0, y: 0.5 }} y={-16} text="BET" style={labelStyle} />
				<Text anchor={{ x: 0, y: 0.5 }} y={16} text={betText} style={valueStyle} />
			</Container>

			<!-- WIN (right) -->
			<Container x={BAR_W / 2 - 44} y={18}>
				<Text anchor={{ x: 1, y: 0.5 }} y={-16} text="WIN" style={labelStyle} />
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
			text="SPEED"
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
