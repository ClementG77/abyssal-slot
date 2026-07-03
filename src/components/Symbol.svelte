<script lang="ts">
	import { onDestroy } from 'svelte';
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

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
	// Connected (winning) cells keep scaling up — bigger and bigger — until they explode.
	const WIN_GROW_MAX = 1.4;

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

	// Electrified winning cell (Gates-style): an energised border + wiggling arcs while the symbol
	// is part of a win, right up until it explodes and disappears.
	const elecFx = $state({ t: 0, glow: 0 });
	const isScatter = $derived(props.rawSymbol.name === 'S');
	const electricOn = $derived(
		!isEye && !isScatter && (props.state === 'win' || props.state === 'postWinStatic'),
	);
	let elecT: gsap.core.Tween | undefined;
	let elecG: gsap.core.Tween | undefined;

	$effect(() => {
		if (!electricOn) {
			elecT?.kill();
			elecG?.kill();
			elecFx.glow = 0;
			return;
		}
		elecT?.kill();
		elecG?.kill();
		elecT = gsap.to(elecFx, { t: 60, duration: 60, ease: 'none', repeat: -1 });
		elecG = gsap.fromTo(
			elecFx,
			{ glow: 0.25 },
			{ glow: 1, duration: 0.45, ease: 'sine.inOut', repeat: -1, yoyo: true },
		);
		return () => {
			elecT?.kill();
			elecG?.kill();
		};
	});

	// --- Scatter (the leviathan): a hero symbol -----------------------------------------
	// No persistent halo (it reads too big) — just a gentle breathe + a land flare/ring. The soft
	// coloured halo only blooms on "connect" (when the scatter is part of the trigger), pulsing
	// harder while the board anticipates.
	const scatterFx = $state({ breathe: 1, flare: 0, ring: 0, connect: 0, rays: 0 });
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
		scatterFlareTl?.kill();
		scatterFlareTl = gsap
			.timeline()
			.set(scatterFx, { flare: 0, ring: 0, rays: 0 })
			.to(scatterFx, { flare: 1, duration: 0.08, ease: 'power2.out' })
			.to(scatterFx, { flare: 0, duration: 0.45, ease: 'power2.out' }, '<')
			.to(scatterFx, { ring: 1, duration: 0.5, ease: 'power2.out' }, '<')
			.to(scatterFx, { rays: 1, duration: 0.6, ease: 'power2.out' }, '<');
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
		winTl = gsap
			.timeline()
			.set(winFx, { glow: 0, squashX: 1, squashY: 1 })
			.to(winFx, { squashX: 1.16, squashY: 0.86, duration: 0.1, ease: 'power2.out' })
			.to(winFx, { squashX: 1, squashY: 1, duration: 0.34, ease: 'back.out(2.4)' })
			.to(winFx, { glow: 0.85, duration: 0.1, ease: 'power1.out' }, 0)
			.to(winFx, { glow: 0, duration: 0.42, ease: 'power2.out' }, 0.1);
	};

	const playBoom = () => {
		boomTl?.kill();
		// The cell flash; the flying shards are spawned at the board level (BoardDebris).
		boomTl = gsap
			.timeline()
			.set(boomFx, { flash: 0 })
			.to(boomFx, { flash: 0.95, duration: 0.05, ease: 'power1.out' })
			.to(boomFx, { flash: 0, duration: 0.18, ease: 'power2.out' });
	};

	onDestroy(() => {
		winTl?.kill();
		boomTl?.kill();
		landTl?.kill();
		elecT?.kill();
		elecG?.kill();
		scatterIdleTl?.kill();
		scatterAmbTween?.kill();
		scatterFlareTl?.kill();
		scatterConnectTl?.kill();
		gsap.killTweensOf(winFx);
		gsap.killTweensOf(boomFx);
		gsap.killTweensOf(elecFx);
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
				// connection: a quick pop, release the sequence, then keep growing in postWinStatic.
				if (!isEye) playWinJuice();
				await scale.set(1.2, { duration: 150 / ts(), easing: backOut });
				if (myToken !== token) return;
				done();
			} else if (state === 'postWinStatic') {
				alpha.set(1, { duration: 0 });
				// cluster symbols keep scaling up — bigger and bigger — right up until they explode;
				// the Eye and Scatter have their own treatment, so they just settle.
				if (!isEye && !isScatter) {
					await scale.set(WIN_GROW_MAX, { duration: 1100 / ts() });
				} else {
					await scale.set(1, { duration: 120 / ts() });
				}
			} else if (state === 'explosion') {
				if (!isEye) playBoom();
				// continue from the grown connection size (no snap-back), then implode + fade as the
				// shards fly out
				scale.set(WIN_GROW_MAX, { duration: 0 });
				alpha.set(0, { duration: 150 / ts() });
				await scale.set(0.2, { duration: 150 / ts() });
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

	// Electrified cell — an energised border + 4 wiggling lightning edges, drawn cell-sized.
	const ELEC_COLOR = 0x7fd4ff;
	const cellW = $derived(REEL_CELL_WIDTH * 0.92);
	const cellH = $derived(REEL_CELL_HEIGHT * 0.92);
	const drawElectric = (g: import('pixi.js').Graphics) => {
		const w = cellW;
		const h = cellH;
		const t = elecFx.t;
		const glow = elecFx.glow;
		// energised fill + glowing border
		g.roundRect(-w / 2, -h / 2, w, h, 12).fill({ color: ELEC_COLOR, alpha: 0.06 + glow * 0.07 });
		g.roundRect(-w / 2, -h / 2, w, h, 12).stroke({
			width: 2 + glow * 2.5,
			color: ELEC_COLOR,
			alpha: 0.4 + glow * 0.5,
		});
		// wiggling lightning along each edge
		const edges = [
			{ ax: -w / 2, ay: -h / 2, bx: w / 2, by: -h / 2 },
			{ ax: w / 2, ay: -h / 2, bx: w / 2, by: h / 2 },
			{ ax: w / 2, ay: h / 2, bx: -w / 2, by: h / 2 },
			{ ax: -w / 2, ay: h / 2, bx: -w / 2, by: -h / 2 },
		];
		const segs = 6;
		const amp = h * 0.07;
		edges.forEach((e, ei) => {
			const dx = e.bx - e.ax;
			const dy = e.by - e.ay;
			const len = Math.hypot(dx, dy) || 1;
			const nx = -dy / len;
			const ny = dx / len;
			g.moveTo(e.ax, e.ay);
			for (let s = 1; s < segs; s++) {
				const f = s / segs;
				const off = Math.sin(t * 9 + ei * 2.3 + s * 1.7) * amp;
				g.lineTo(e.ax + dx * f + nx * off, e.ay + dy * f + ny * off);
			}
			g.lineTo(e.bx, e.by);
		});
		g.stroke({ width: 2, color: 0xffffff, alpha: 0.45 + glow * 0.45 });
	};

	// Expanding ring thrown off when a scatter slams in.
	const drawScatterRing = (g: import('pixi.js').Graphics) => {
		const p = scatterFx.ring;
		if (p <= 0 || p >= 1) return;
		const base = Math.max(symbolSize.width, symbolSize.height) * 0.55;
		const r = base * (0.7 + p * 1.0);
		g.circle(0, 0, r).stroke({
			width: Math.max(1, 5 * (1 - p)),
			color: 0xffe6a6,
			alpha: (1 - p) * 0.9,
		});
	};

	// Soft golden under-glow behind the leviathan — the "this one is special" beacon. Stacked
	// additive discs (bright core fading to the rim), shimmering with the ambient clock and
	// burning brighter while the board anticipates another scatter.
	const drawScatterGlow = (g: import('pixi.js').Graphics) => {
		const base = Math.max(symbolSize.width, symbolSize.height) * 0.56;
		const anticipating = context.stateGame.scatterAnticipating;
		const shimmer = 0.8 + Math.sin(scatterAmb.t * 1.7) * 0.2;
		const boost = anticipating ? 1.9 : 1;
		const steps = 4;
		for (let i = steps; i >= 1; i--) {
			const f = i / steps; // 1 = rim … 0.25 = core
			g.circle(0, 0, base * (0.45 + f * 0.75) * scatterFx.breathe).fill({
				color: 0xffc964,
				alpha: 0.028 * (1.25 - f) * shimmer * boost,
			});
		}
	};

	// Radial ray burst on landing: golden light shafts shoot out of the cell and fade.
	const RAY_COUNT = 8;
	const drawScatterRays = (g: import('pixi.js').Graphics) => {
		const p = scatterFx.rays;
		if (p <= 0 || p >= 1) return;
		const base = Math.max(symbolSize.width, symbolSize.height) * 0.5;
		const len = base * (0.9 + p * 1.5);
		const spread = 0.09; // half-width of each ray, radians
		for (let i = 0; i < RAY_COUNT; i++) {
			const angle = (i * Math.PI * 2) / RAY_COUNT + p * 0.35 + 0.4;
			g.poly([
				{ x: Math.cos(angle - spread) * base * 0.5, y: Math.sin(angle - spread) * base * 0.5 },
				{ x: Math.cos(angle) * len, y: Math.sin(angle) * len },
				{ x: Math.cos(angle + spread) * base * 0.5, y: Math.sin(angle + spread) * base * 0.5 },
			]).fill({ color: 0xffdf8a, alpha: (1 - p) * 0.55 });
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
		<!-- electrified winning cell (behind the art) -->
		{#if electricOn}
			<Container blendMode="add">
				<Graphics draw={drawElectric} />
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
				{#if scatterFx.rays > 0 && scatterFx.rays < 1}
					<Container blendMode="add">
						<Graphics draw={drawScatterRays} />
					</Container>
				{/if}
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
				{#if scatterFx.flare > 0}
					<Sprite
						key={frame}
						anchor={0.5}
						width={symbolSize.width * scatterFx.breathe}
						height={symbolSize.height * scatterFx.breathe}
						alpha={scatterFx.flare}
						tint={0xffffff}
						blendMode="add"
					/>
				{/if}
				{#if scatterFx.ring > 0 && scatterFx.ring < 1}
					<Container blendMode="add">
						<Graphics draw={drawScatterRing} />
					</Container>
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
