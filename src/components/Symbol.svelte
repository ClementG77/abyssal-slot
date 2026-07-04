<script lang="ts">
	import { onDestroy } from 'svelte';
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';
	import { backOut, cubicIn } from 'svelte/easing';

	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';

	import AbyssalEye from './AbyssalEye.svelte';
	import { getContext } from '../game/context';
	import { getSymbolInfo } from '../game/utils';
	import {
		GAZE_METER_MAX_CHARGE,
		getSymbolFill,
		REEL_CELL_HEIGHT,
		REEL_CELL_WIDTH,
		SYMBOL_SIZE,
		SYMBOL_SOURCE_SIZES,
		type EyeVariant,
	} from '../game/constants';
	import type { SymbolState, RawSymbol, SymbolName } from '../game/types';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	// Each paying / special symbol maps onto a frame of the `symbols` atlas. Eyes use the atlas's
	// baked EYE_*_ACTIVE / EYE_*_EMPTY / EYE_PURPLE_CLOSE art through the stateful AbyssalEye component.
	const SYMBOL_FRAME: Partial<Record<SymbolName, string>> = {
		H1: 'H1', // Anglerfish
		H2: 'H2', // Nautilus
		H3: 'H3', // Diving helmet
		H4: 'H4', // Jellyfish
		L1: 'L1', // Cyan gem
		L2: 'L2', // Teal gem
		L3: 'L3', // Sapphire gem
		L4: 'L4', // Violet gem
		L5: 'L5', // Aqua gem
		S: 'SCATTER', // Leviathan scatter
	};
	const frame = $derived(SYMBOL_FRAME[props.rawSymbol.name]);
	// The eye colour already signals ADD (cyan) vs MUL (red), so the label is just the number.
	// Shown on the revealed (EMPTY) face only WHILE the eye holds its value — once the
	// multiplier has fired into the win (`spent`), the eye rests as a plain empty eye.
	const eyeNumber = $derived(
		props.rawSymbol.name === 'EYE' &&
			props.rawSymbol.eyeType &&
			!props.rawSymbol.spent &&
			props.rawSymbol.startValue !== undefined
			? `${props.rawSymbol.startValue}`
			: undefined,
	);
	const isUnresolvedEye = $derived(props.rawSymbol.name === 'EYE' && !props.rawSymbol.eyeType);
	// resolved = revealed, holding its value → EMPTY (closed) art + number in the middle.
	// spent = has fired its multiplier into the win → AWAKENS to the ACTIVE (open) art, no number.
	const isSpentEye = $derived(
		props.rawSymbol.name === 'EYE' && !!props.rawSymbol.eyeType && !!props.rawSymbol.spent,
	);
	const isResolvedEye = $derived(
		props.rawSymbol.name === 'EYE' && !!props.rawSymbol.eyeType && !props.rawSymbol.spent,
	);
	const symbolSize = $derived.by(() => {
		const sourceSize = SYMBOL_SOURCE_SIZES[props.rawSymbol.name];
		const fill = getSymbolFill(props.rawSymbol.name);
		const scale = Math.min(
			(REEL_CELL_WIDTH * fill) / sourceSize.width,
			(REEL_CELL_HEIGHT * fill) / sourceSize.height,
		);

		return {
			width: sourceSize.width * scale,
			height: sourceSize.height * scale,
		};
	});

	// fallback (EYE) — coloured tile + label, drawn in code
	const info = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));

	const PAD = SYMBOL_SIZE * 0.06;

	const scale = new Tween(1, { duration: 120 });
	const alpha = new Tween(1, { duration: 120 });
	const ts = () => stateBetDerived.timeScale(); // turbo speed-up
	// The win beat: HIGHLIGHT (flash + pulsing glow) → GROW (a big, unmistakable swell right up
	// to the burst) → EXPLODE into bubbles.
	const WIN_GROW_MAX = 1.45;

	const isEye = $derived(isUnresolvedEye || isResolvedEye || isSpentEye);
	// The lifecycle variant fed to the single AbyssalEye instance (see the template comment):
	// unresolved → close; revealed or spent → EMPTY art (the value on it comes and goes via
	// `eyeNumber`, the art itself stays the coloured empty eye).
	const eyeVariant = $derived<EyeVariant>(
		isUnresolvedEye ? 'close' : props.rawSymbol.eyeType === 'MUL' ? 'multEmpty' : 'addEmpty',
	);

	// --- Win / cascade juice (non-Eye symbols) -----------------------------------------
	// `win`  → squash-pop + a bright additive flash bloom on the art, and the cell electrifies.
	// `explosion` → a hard flash on the cell; the flying shards are handled by the board-level
	//   debris layer (BoardDebris) so they can be bigger and outlive the collapsing cell.
	const winFx = $state({ glow: 0, squashX: 1, squashY: 1 });
	const boomFx = $state({ flash: 0 });
	let winTl: gsap.core.Timeline | undefined;
	let boomTl: gsap.core.Timeline | undefined;
	let landTl: gsap.core.Timeline | undefined;

	// Winning symbol GLOW (no border): a soft bloom behind the art + a pulsing additive
	// self-glow on the art itself, while the symbol is part of a win, right up until it
	// explodes and disappears.
	const winGlowFx = $state({ pulse: 0 });
	const isScatter = $derived(props.rawSymbol.name === 'S');
	const winGlowOn = $derived(
		!isEye && !isScatter && (props.state === 'win' || props.state === 'postWinStatic'),
	);
	let winGlowTween: gsap.core.Tween | undefined;

	$effect(() => {
		if (!winGlowOn) {
			winGlowTween?.kill();
			winGlowFx.pulse = 0;
			return;
		}
		winGlowTween?.kill();
		winGlowTween = gsap.fromTo(
			winGlowFx,
			{ pulse: 0.4 },
			{ pulse: 1, duration: 0.45, ease: 'sine.inOut', repeat: -1, yoyo: true },
		);
		return () => winGlowTween?.kill();
	});

	// --- Scatter (the leviathan): a hero symbol -----------------------------------------
	// A gentle breathe over a golden under-glow; landing is a pure GLOW surge. The soft coloured
	// halo only blooms on "connect" (when the scatter is part of the trigger), pulsing harder
	// while the board anticipates.
	// Landing is a pure GLOW surge (no flare/ring/rays) — `landGlow` spikes the under-glow,
	// scaled up with the scatter count so later scatters burn brighter.
	const scatterFx = $state({ breathe: 1, connect: 0, landGlow: 0 });
	// ambient clock (seconds) driving the under-glow shimmer
	const scatterAmb = $state({ t: 0 });
	let scatterIdleTl: gsap.core.Timeline | undefined;
	let scatterAmbTween: gsap.core.Tween | undefined;
	let scatterFlareTl: gsap.core.Timeline | undefined;
	let scatterConnectTl: gsap.core.Tween | undefined;
	let scatterLandWasActive = false;

	const scatterConnecting = $derived(
		isScatter && (props.state === 'win' || props.state === 'postWinStatic'),
	);

	$effect(() => {
		if (!isScatter) {
			scatterIdleTl?.kill();
			scatterAmbTween?.kill();
			return;
		}
		const anticipating = context.stateGame.scatterAnticipating; // re-runs when it toggles
		scatterIdleTl?.kill();
		scatterIdleTl = gsap.timeline({ repeat: -1, yoyo: true }).to(scatterFx, {
			breathe: anticipating ? 1.05 : 1.025,
			duration: anticipating ? 0.42 : 1.1,
			ease: 'sine.inOut',
		});
		// one long linear clock; the draws derive orbit angles / twinkle phases from it
		scatterAmbTween?.kill();
		scatterAmbTween = gsap.to(scatterAmb, {
			t: scatterAmb.t + 3600,
			duration: 3600,
			ease: 'none',
			repeat: -1,
		});
		return () => {
			scatterIdleTl?.kill();
			scatterAmbTween?.kill();
		};
	});

	// soft coloured halo only while connecting (trigger)
	$effect(() => {
		if (!scatterConnecting) {
			scatterConnectTl?.kill();
			scatterFx.connect = 0;
			return;
		}
		scatterConnectTl?.kill();
		scatterConnectTl = gsap.fromTo(
			scatterFx,
			{ connect: 0.45 },
			{ connect: 1, duration: 0.5, ease: 'sine.inOut', repeat: -1, yoyo: true },
		);
		return () => scatterConnectTl?.kill();
	});

	$effect(() => {
		const landing = isScatter && props.state === 'land';
		if (!landing) {
			scatterLandWasActive = false;
			return;
		}
		if (scatterLandWasActive) return;
		scatterLandWasActive = true;
		// cascade settles reuse the `land` state but are NOT landings — no fanfare
		if (context.stateGame.cascading) return;

		// A pure glow surge, escalating with the scatter count (2nd burns brighter than the 1st…)
		const count = Math.max(1, Math.min(context.stateGame.scatterCounter, 4));
		const power = 1 + (count - 1) * 0.45;

		scatterFlareTl?.kill();
		scatterFlareTl = gsap
			.timeline()
			.set(scatterFx, { landGlow: 0 })
			.to(scatterFx, { landGlow: power, duration: 0.14, ease: 'power2.out' })
			.to(scatterFx, { landGlow: 0, duration: 0.65, ease: 'power2.out' });
	});

	// Landing weight: a quick stretch-then-settle squash on every drop (reel stop + cascade slide).
	const playLandSquash = () => {
		landTl?.kill();
		// kept subtle: every symbol on a reel-stop lands at once, so a big squash reads as jelly
		landTl = gsap
			.timeline()
			.set(winFx, { squashX: 1.08, squashY: 0.92 })
			.to(winFx, { squashX: 1, squashY: 1, duration: 0.26, ease: 'back.out(2.2)' });
	};

	const playWinJuice = () => {
		winTl?.kill();
		// HIGHLIGHT: a bright instant flash + a tiny squash accent — short, the electric border
		// carries the "this one is winning" read while the grow builds underneath.
		winTl = gsap
			.timeline()
			.set(winFx, { glow: 0.9, squashX: 1.07, squashY: 0.95 })
			.to(winFx, { squashX: 1, squashY: 1, duration: 0.22, ease: 'back.out(2)' })
			.to(winFx, { glow: 0, duration: 0.3, ease: 'power2.out' }, 0.06);
	};

	const playBoom = () => {
		boomTl?.kill();
		// The cell flash: an instant white-hot hit that decays fast — the burst's "crack". The
		// flying shards are spawned at the board level (BoardDebris).
		boomTl = gsap
			.timeline()
			.set(boomFx, { flash: 1 })
			.to(boomFx, { flash: 0, duration: 0.16, ease: 'power3.out' });
	};

	onDestroy(() => {
		winTl?.kill();
		boomTl?.kill();
		landTl?.kill();
		winGlowTween?.kill();
		scatterIdleTl?.kill();
		scatterAmbTween?.kill();
		scatterFlareTl?.kill();
		scatterConnectTl?.kill();
		gsap.killTweensOf(winFx);
		gsap.killTweensOf(boomFx);
		gsap.killTweensOf(winGlowFx);
		gsap.killTweensOf(scatterFx);
		gsap.killTweensOf(scatterAmb);
	});

	// The Eye on the board feeds off the Gaze: it brightens as the charge climbs, so the player
	// feels the threat building before it ever opens. Only the eye branches read this.
	let gazeIntensity = $state(0);
	context.eventEmitter.subscribeOnMount({
		gazeMeterFill: (e) => (gazeIntensity = Math.min(1, e.charge / GAZE_METER_MAX_CHARGE)),
		gazeMeterReset: () => (gazeIntensity = 0),
		gazeMeterDrain: () => (gazeIntensity = 0),
	});

	// Drive the transient states with eased tweens and resolve `oncomplete` when the motion
	// finishes (the board/tumble handlers await it). A token guards against stale runs when
	// the state changes mid-animation.
	let token = 0;
	$effect(() => {
		const state = props.state;
		const myToken = ++token;
		const done = () => {
			if (myToken === token) props.oncomplete?.();
		};

		(async () => {
			if (state === 'win') {
				// HIGHLIGHT: flash + electric border + a clear pop, resolved fast so the sequence
				// moves on immediately.
				if (!isEye) playWinJuice();
				await scale.set(1.12, { duration: 100 / ts(), easing: backOut });
				if (myToken !== token) return;
				done();
			} else if (state === 'postWinStatic') {
				alpha.set(1, { duration: 0 });
				// GROW: a visible swell right up until the burst — the pre-explosion tell; the Eye
				// and Scatter have their own treatment.
				if (!isEye && !isScatter) {
					await scale.set(WIN_GROW_MAX, { duration: 380 / ts() });
				} else {
					await scale.set(1, { duration: 120 / ts() });
				}
			} else if (state === 'explosion') {
				if (!isEye) playBoom();
				// BURST, not fade: a fast overshoot pop from the hold size, then a hard collapse
				// while the bubbles (BoardDebris) carry the energy up and away. Alpha only drops
				// at the very end so the collapse itself reads.
				scale.set(WIN_GROW_MAX, { duration: 0 });
				await scale.set(WIN_GROW_MAX * 1.25, { duration: 70 / ts(), easing: backOut });
				if (myToken !== token) return;
				alpha.set(0, { duration: 90 / ts(), delay: 40 / ts() });
				await scale.set(0, { duration: 130 / ts(), easing: cubicIn });
				done();
			} else if (state === 'land') {
				scale.set(0.84, { duration: 0 });
				alpha.set(1, { duration: 0 });
				if (!isEye) playLandSquash();
				await scale.set(1, { duration: 150 / ts(), easing: backOut });
				done();
			} else {
				// static / spin
				scale.set(1, { duration: 0 });
				alpha.set(1, { duration: 0 });
			}
		})();
	});

	const isSpecial = $derived(info.glow !== undefined);

	const draw = (g: import('pixi.js').Graphics) => {
		const w = symbolSize.width;
		const h = symbolSize.height;
		g.roundRect(-w / 2 + PAD, -h / 2 + PAD, w - PAD * 2, h - PAD * 2, 14).fill({
			color: info.color,
		});
		// inner sheen
		g.roundRect(-w / 2 + PAD, -h / 2 + PAD, w - PAD * 2, (h - PAD * 2) * 0.5, 14).fill({
			color: 0xffffff,
			alpha: 0.08,
		});
		// special-symbol accent ring (wild / scatter / eye)
		if (isSpecial) {
			g.roundRect(-w / 2 + PAD * 0.5, -h / 2 + PAD * 0.5, w - PAD, h - PAD, 16).stroke({
				width: 4,
				color: info.glow,
				alpha: 0.9,
			});
		}
	};

	const eyeSize = $derived(Math.max(symbolSize.width, symbolSize.height) * 1.08);

	// Winning-symbol bloom — a soft cool radial glow behind the art (stacked additive discs,
	// bright core fading to the rim), breathing with the win pulse. No borders, pure light.
	const drawWinBloom = (g: import('pixi.js').Graphics) => {
		const pulse = winGlowFx.pulse;
		if (pulse <= 0) return;
		const base = Math.max(symbolSize.width, symbolSize.height) * 0.6;
		const steps = 4;
		for (let i = steps; i >= 1; i--) {
			const f = i / steps; // 1 = rim … 0.25 = core
			g.circle(0, 0, base * (0.5 + f * 0.7)).fill({
				color: 0xbfeeff,
				alpha: 0.05 * (1.25 - f) * pulse,
			});
		}
	};


	// Soft golden under-glow behind the leviathan — the "this one is special" beacon. Stacked
	// additive discs (bright core fading to the rim), shimmering with the ambient clock and
	// burning brighter while the board anticipates another scatter.
	const drawScatterGlow = (g: import('pixi.js').Graphics) => {
		const anticipating = context.stateGame.scatterAnticipating;
		const landGlow = scatterFx.landGlow;
		// while anticipating, the settled scatters "call" the missing one: hotter, faster, wider;
		// on landing the glow SURGES (landGlow spike, count-scaled)
		const base =
			Math.max(symbolSize.width, symbolSize.height) *
			0.56 *
			(anticipating ? 1.12 : 1) *
			(1 + landGlow * 0.22);
		const shimmer = anticipating
			? 0.75 + Math.sin(scatterAmb.t * 3.6) * 0.25
			: 0.8 + Math.sin(scatterAmb.t * 1.7) * 0.2;
		const boost = (anticipating ? 2.6 : 1) + landGlow * 3.2;
		const steps = 4;
		for (let i = steps; i >= 1; i--) {
			const f = i / steps; // 1 = rim … 0.25 = core
			g.circle(0, 0, base * (0.45 + f * 0.75) * scatterFx.breathe).fill({
				color: 0xffc964,
				alpha: 0.028 * (1.25 - f) * shimmer * boost,
			});
		}
	};

</script>

<Container
	x={props.x}
	y={props.y}
	scale={{ x: scale.current * winFx.squashX, y: scale.current * winFx.squashY }}
	alpha={alpha.current}
>
	{#if isEye}
		<!-- ONE persistent AbyssalEye across the whole lifecycle, so the variant EDGE animates:
		     close (purple) → flip → addEmpty/multEmpty with the multiplier in the middle →
		     the multiplier fires into the win → the number leaves (pulse) and the plain empty
		     eye remains. Splitting these into separate if-branches would remount the component
		     mid-transition and kill the flip. -->
		<AbyssalEye
			size={eyeSize}
			variant={eyeVariant}
			text={eyeNumber}
			land={props.state === 'land'}
			pulse={props.state === 'land' || isSpentEye}
			intensity={isSpentEye ? 0 : gazeIntensity}
		/>
	{:else}
		<!-- winning-symbol bloom (behind the art) -->
		{#if winGlowOn}
			<Container blendMode="add">
				<Graphics draw={drawWinBloom} />
			</Container>
		{/if}

		<!-- base art -->
		{#if frame}
			{#if isScatter}
				<!-- leviathan: breathing body over a golden under-glow, land flare/ring/rays;
				     the soft coloured halo only blooms on connect.
				     NOTE: never set `scale` alongside `width`/`height` on a pixi-svelte Sprite — the
				     scale prop is applied last and overrides the width/height sizing (rendering the
				     sprite at its native texture size). Bake the multiplier into width/height. -->
				<Container blendMode="add">
					<Graphics draw={drawScatterGlow} />
				</Container>
				{#if scatterFx.connect > 0}
					<Sprite
						key={frame}
						anchor={0.5}
						width={symbolSize.width * 1.16 * scatterFx.breathe}
						height={symbolSize.height * 1.16 * scatterFx.breathe}
						alpha={scatterFx.connect * 0.55}
						tint={0xffe6a6}
						blendMode="add"
					/>
				{/if}
				<Sprite
					key={frame}
					anchor={0.5}
					width={symbolSize.width * scatterFx.breathe}
					height={symbolSize.height * scatterFx.breathe}
				/>
				{#if scatterFx.landGlow > 0}
					<!-- landing: the art itself blooms warm (part of the glow-only land treatment) -->
					<Sprite
						key={frame}
						anchor={0.5}
						width={symbolSize.width * scatterFx.breathe}
						height={symbolSize.height * scatterFx.breathe}
						alpha={Math.min(0.5, scatterFx.landGlow * 0.32)}
						tint={0xffd27a}
						blendMode="add"
					/>
				{/if}
			{:else}
				<Sprite key={frame} anchor={0.5} width={symbolSize.width} height={symbolSize.height} />
			{/if}
		{:else}
			<Graphics {draw} />
			<Text
				anchor={0.5}
				text={info.label}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '700',
					fontSize: SYMBOL_SIZE * (info.label.length > 2 ? 0.24 : 0.34),
					fill: isSpecial ? info.glow : 0x05080f,
				}}
			/>
		{/if}

		<!-- pulsing self-glow while winning: an additive copy of the art brightens its own colours -->
		{#if winGlowOn && frame}
			<Sprite
				key={frame}
				anchor={0.5}
				width={symbolSize.width * 1.05}
				height={symbolSize.height * 1.05}
				alpha={winGlowFx.pulse * 0.4}
				tint={0xffffff}
				blendMode="add"
			/>
		{/if}

		<!-- win flash bloom: a bright additive copy of the art -->
		{#if winFx.glow > 0 && frame}
			<Sprite
				key={frame}
				anchor={0.5}
				width={symbolSize.width * 1.12}
				height={symbolSize.height * 1.12}
				alpha={winFx.glow}
				tint={0xffffff}
				blendMode="add"
			/>
		{/if}

		<!-- explosion flash -->
		{#if boomFx.flash > 0}
			{#if frame}
				<Sprite
					key={frame}
					anchor={0.5}
					width={symbolSize.width}
					height={symbolSize.height}
					alpha={boomFx.flash}
					tint={0xffffff}
					blendMode="add"
				/>
			{:else}
				<Graphics
					alpha={boomFx.flash}
					blendMode="add"
					draw={(g) =>
						g
							.roundRect(
								-symbolSize.width / 2 + PAD,
								-symbolSize.height / 2 + PAD,
								symbolSize.width - PAD * 2,
								symbolSize.height - PAD * 2,
								14,
							)
							.fill({ color: 0xffffff })}
				/>
			{/if}
		{/if}
	{/if}
</Container>
