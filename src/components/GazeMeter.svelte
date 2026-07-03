<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventGazeMeter =
		| { type: 'gazeMeterShow' }
		| { type: 'gazeMeterHide' }
		| { type: 'gazeMeterReset' }
		| { type: 'gazeMeterFill'; fromPositions: Position[]; charge: number }
		| { type: 'gazeMeterToEye' }
		| { type: 'gazeMeterDrain' };
</script>

<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import gsap from 'gsap';
	import { FillGradient } from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { BitmapText, Container, Graphics, Sprite } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import {
		abyssalBitmapStyle,
		BOARD_SIZES,
		GAZE_METER_IMAGE_SIZE,
		GAZE_METER_LAYOUT,
		GAZE_METER_MAX_CHARGE,
		SYMBOL_SIZE,
	} from '../game/constants';
	import { getPositionX, getPositionY } from '../game/utils';

	const context = getContext();

	const LAYER_KEYS = {
		bar: 'winMeter',
	} as const;
	type TrackSegment = { x: number; y: number; w: number; h: number; r: number };
	const GAZE_COLORS = {
		fillDeep: 0x075aa8,
		fillMid: 0x0aa4ff,
		fillCore: 0x28d7ff,
		fillTop: 0xc7ffff,
		fillGlow: 0x35cfff,
		edge: 0xe9ffff,
		energy: 0xc77dff,
		rim: 0xffffff,
		backing: 0x0d4b53,
		backingStroke: 0x0d4b53,
	} as const;

	let show = $state(false);
	let charge = $state(0);
	// Energy orbs in flight: each winning symbol releases one glowing orb that arcs into the
	// meter; the fill rises once the convoy lands.
	type Orb = { sx: number; sy: number; wobble: number };
	let orbs = $state<Orb[]>([]);
	// The Gaze seed in flight: the charge value leaves the plaque and travels to the board
	// centre, where the Eye combine equation picks it up (eyeBurst seeds with the same charge).
	let flying = $state(false);
	let flightValue = $state(0);
	let fx = $state({
		burst: 0,
		textScale: 1,
		overcharge: 0,
	});
	const animations = new Set<gsap.core.Animation>();

	const fill = new Tween(0, { duration: 520, easing: cubicOut });
	const orbFlight = new Tween(0, { duration: 1 });
	const toCenter = new Tween(0, { duration: 1 });
	// Ambient liquid clock — drives the fill's surface wave, its glowing crest and the rising
	// bubbles, so the charge reads as living water rather than a static bar.
	const liquid = $state({ t: 0 });
	// The fill gradients are cached: FillGradient builds a texture, and the liquid redraws every
	// frame — allocating them inside the draw would churn textures/GC.
	const progressGradient = new FillGradient({
		textureSpace: 'local',
		start: { x: 0, y: 1 },
		end: { x: 0, y: 0 },
		colorStops: [
			{ offset: 0, color: GAZE_COLORS.fillDeep },
			{ offset: 0.32, color: GAZE_COLORS.fillMid },
			{ offset: 0.72, color: GAZE_COLORS.fillCore },
			{ offset: 1, color: GAZE_COLORS.fillTop },
		],
	});
	const fadeGradient = new FillGradient({
		textureSpace: 'local',
		start: { x: 0, y: 0 },
		end: { x: 1, y: 0 },
		colorStops: [
			{ offset: 0, color: GAZE_COLORS.fillTop },
			{ offset: 0.42, color: GAZE_COLORS.fillCore },
			{ offset: 1, color: GAZE_COLORS.fillDeep },
		],
	});

	onMount(() => {
		const clock = gsap.to(liquid, { t: 3600, duration: 3600, ease: 'none', repeat: -1 });
		animations.add(clock);
		return () => {
			clock.kill();
			animations.delete(clock);
		};
	});

	const isMobile = $derived(context.stateLayoutDerived.layoutType() === 'portrait');
	const gazeH = $derived(isMobile ? BOARD_SIZES.width * 0.82 : BOARD_SIZES.height * 0.84);
	const gazeW = $derived(gazeH * (GAZE_METER_IMAGE_SIZE.width / GAZE_METER_IMAGE_SIZE.height));
	const nativeScale = $derived(gazeH / GAZE_METER_IMAGE_SIZE.height);
	const meterRotation = $derived(isMobile ? Math.PI / 2 : 0);
	const multiplierTextRotation = $derived(isMobile ? -Math.PI / 2 : 0);
	const mobileArtworkLeft = $derived(gazeW * GAZE_METER_LAYOUT.visibleBounds.left);
	const mobileArtworkCenterY = $derived(
		gazeH * ((GAZE_METER_LAYOUT.visibleBounds.top + GAZE_METER_LAYOUT.visibleBounds.bottom) / 2),
	);
	const mobileMeterTop = $derived(BOARD_SIZES.height - SYMBOL_SIZE * 0.02);
	const desktopMeterGap = $derived(SYMBOL_SIZE * 0.22);
	const position = $derived({
		x: isMobile
			? BOARD_SIZES.width / 2 + mobileArtworkCenterY
			: -gazeW * GAZE_METER_LAYOUT.visibleBounds.right - desktopMeterGap,
		y: isMobile ? mobileMeterTop - mobileArtworkLeft : (BOARD_SIZES.height - gazeH) / 2,
	});

	const trackSegments = $derived(
		GAZE_METER_LAYOUT.trackSegments.map((segment) => {
			const h = gazeH * (segment.bottom - segment.top);
			return {
				x: gazeW * segment.left,
				y: gazeH * segment.top,
				w: gazeW * (segment.right - segment.left),
				h,
				r: h * segment.radius,
			};
		}),
	);
	const trackTotalH = $derived(trackSegments.reduce((total, segment) => total + segment.h, 0));
	const trackFill = $derived.by(() => {
		let remaining = Math.min(Math.max(fill.current, 0), 1) * trackTotalH;

		return trackSegments.map((segment) => {
			const amount = Math.min(Math.max(remaining / segment.h, 0), 1);
			remaining -= segment.h;
			return amount;
		});
	});
	const eyeX = $derived(gazeW * GAZE_METER_LAYOUT.eye.x);
	const eyeY = $derived(gazeH * GAZE_METER_LAYOUT.eye.y);
	const gemX = $derived(gazeW * GAZE_METER_LAYOUT.gem.x);
	const gemY = $derived(gazeH * GAZE_METER_LAYOUT.gem.y);
	const gemR = $derived(gazeH * GAZE_METER_LAYOUT.gem.radius);
	const plaqueX = $derived(gazeW * GAZE_METER_LAYOUT.plaque.x);
	const plaqueY = $derived(gazeH * GAZE_METER_LAYOUT.plaque.y);
	const plaqueR = $derived(gazeH * GAZE_METER_LAYOUT.plaque.radius);
	const plaqueTextX = $derived(plaqueX);
	const plaqueTextY = $derived(plaqueY + gazeH * GAZE_METER_LAYOUT.plaque.textDy);
	const meterEnergyX = $derived(isMobile ? position.x - eyeY : position.x + eyeX);
	const meterEnergyY = $derived(isMobile ? position.y + eyeX : position.y + eyeY);
	const fillLead = $derived.by(() => {
		let remaining = Math.min(Math.max(fill.current, 0), 1) * trackTotalH;
		let lead:
			| {
					x: number;
					y: number;
					h: number;
			  }
			| undefined;

		for (const segment of trackSegments) {
			const height = Math.max(0, Math.min(segment.h, remaining));
			if (height > 0.5) {
				lead = {
					x: segment.x + segment.w / 2,
					y: segment.y + segment.h - height,
					h: segment.w,
				};
			}
			remaining -= segment.h;
		}

		return lead;
	});

	const track = <T extends gsap.core.Animation>(animation: T) => {
		animations.add(animation);
		animation.eventCallback('onComplete', () => animations.delete(animation));
		return animation;
	};

	const resetFx = () => {
		Object.assign(fx, {
			burst: 0,
			textScale: 1,
			overcharge: 0,
		});
	};

	const playChargeFx = (overcharged = false) => {
		gsap.killTweensOf(fx);
		const timeline = gsap.timeline();
		track(timeline);
		timeline
			.set(fx, { burst: 0, textScale: 0.9 })
			.to(fx, {
				burst: 0.92,
				textScale: 1.12,
				duration: 0.14,
				ease: 'power2.out',
			})
			.to(fx, {
				burst: 0,
				textScale: 1,
				duration: overcharged ? 0.5 : 0.32,
				ease: 'power2.out',
			});

		if (overcharged) {
			track(
				gsap.fromTo(
					fx,
					{ overcharge: 0 },
					{
						overcharge: 1,
						duration: 0.36,
						repeat: 1,
						yoyo: true,
						ease: 'sine.inOut',
					},
				),
			);
		}
	};

	onDestroy(() => {
		animations.forEach((animation) => animation.kill());
		animations.clear();
		gsap.killTweensOf(fx);
	});

	const setCharge = async (value: number) => {
		charge = value;
		await fill.set(Math.min(value / GAZE_METER_MAX_CHARGE, 1));
	};

	context.eventEmitter.subscribeOnMount({
		gazeMeterShow: () => (show = true),
		gazeMeterHide: () => (show = false),
		gazeMeterReset: () => {
			charge = 0;
			orbs = [];
			orbFlight.set(0, { duration: 0 });
			flying = false;
			toCenter.set(0, { duration: 0 });
			gsap.killTweensOf(fx);
			resetFx();
			// ease the fill away instead of snapping empty (no-op when already drained)
			fill.set(0, { duration: 360 });
		},
		gazeMeterFill: async (emitterEvent) => {
			show = true;
			context.eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBetDerived.isContinuousBet(),
			});
			// each winning symbol releases an orb; the convoy arcs into the meter with a slight
			// stagger, then the fill rises and the plaque pops.
			const ts = stateBetDerived.timeScale();
			orbs = emitterEvent.fromPositions.slice(0, 10).map((position) => ({
				sx: getPositionX(position.reel),
				sy: getPositionY(position.row),
				wobble: (Math.random() - 0.5) * SYMBOL_SIZE * 0.9,
			}));
			orbFlight.set(0, { duration: 0 });
			await orbFlight.set(1, { duration: (420 + orbs.length * 55) / ts });
			orbs = [];
			await setCharge(emitterEvent.charge);
			playChargeFx(emitterEvent.charge > GAZE_METER_MAX_CHARGE);
		},
		gazeMeterToEye: async () => {
			if (charge <= 0) return;
			// The Gaze seed leaves the plaque and flies to the BOARD CENTRE, where the combine
			// equation builds (eyeResolve awaits this, then eyeBurst pops the same value there —
			// a clean hand-off). The meter drains as the seed departs.
			flightValue = charge;
			charge = 0;
			flying = true;
			toCenter.set(0, { duration: 0 });
			void fill.set(0, { duration: 420 });
			await toCenter.set(1, { duration: 520, easing: cubicOut });
			flying = false;
		},
		gazeMeterDrain: async () => {
			await fill.set(0, { duration: 420 });
			await waitForResolve((resolve) => setTimeout(resolve, 120));
			charge = 0;
			orbs = [];
		},
	});

	// Energy orbs: one per winning symbol, arcing from its cell into the meter's eye with a
	// slight per-orb stagger. Each orb is a layered additive glow (white-hot core, cyan body,
	// purple halo) with a short fading tail along its path.
	const ORB_TRAVEL_FRACTION = 0.6; // each orb spends this share of the timeline in flight
	const drawOrbs = (g: import('pixi.js').Graphics) => {
		const t = orbFlight.current;
		if (t <= 0 || orbs.length === 0) return;
		const count = orbs.length;
		const stagger = count > 1 ? (1 - ORB_TRAVEL_FRACTION) / (count - 1) : 0;
		const baseR = SYMBOL_SIZE * 0.09;

		orbs.forEach((orb, index) => {
			const p = Math.min(Math.max((t - index * stagger) / ORB_TRAVEL_FRACTION, 0), 1);
			if (p <= 0 || p >= 1) return;
			// quadratic arc from the cell to the meter's eye, bowed upward with a per-orb wobble
			const cx = (orb.sx + meterEnergyX) / 2;
			const cy = Math.min(orb.sy, meterEnergyY) - SYMBOL_SIZE * 0.45 + orb.wobble;
			const u = 1 - p;
			const x = u * u * orb.sx + 2 * u * p * cx + p * p * meterEnergyX;
			const y = u * u * orb.sy + 2 * u * p * cy + p * p * meterEnergyY;
			// pop in fast, shrink slightly as it dives into the meter
			const appear = Math.min(p / 0.12, 1);
			const r = baseR * appear * (1 - p * 0.35);

			// short fading tail back along the curve
			const pt = Math.max(p - 0.12, 0);
			const ut = 1 - pt;
			const tailX = ut * ut * orb.sx + 2 * ut * pt * cx + pt * pt * meterEnergyX;
			const tailY = ut * ut * orb.sy + 2 * ut * pt * cy + pt * pt * meterEnergyY;
			g.moveTo(tailX, tailY)
				.lineTo(x, y)
				.stroke({ width: r * 0.9, color: GAZE_COLORS.energy, alpha: 0.35 * appear });

			// layered glow: halo → body → core
			g.circle(x, y, r * 2.4).fill({ color: GAZE_COLORS.energy, alpha: 0.16 * appear });
			g.circle(x, y, r * 1.4).fill({ color: GAZE_COLORS.fillCore, alpha: 0.5 * appear });
			g.circle(x, y, r * 0.7).fill({ color: GAZE_COLORS.fillTop, alpha: 0.95 * appear });
		});
	};

	// --- The Gaze seed flight: plaque → board centre (where the combine builds) ---------------
	const CENTER_X = BOARD_SIZES.width / 2;
	const CENTER_Y = BOARD_SIZES.height / 2;
	const flyT = $derived(toCenter.current);
	const flyX = $derived(meterEnergyX + (CENTER_X - meterEnergyX) * flyT);
	const flyY = $derived(
		meterEnergyY + (CENTER_Y - meterEnergyY) * flyT - Math.sin(flyT * Math.PI) * SYMBOL_SIZE * 0.5,
	);
	// grows as it approaches the centre, then gets absorbed by the combine's pop
	const flyScale = $derived(0.75 + flyT * 0.55);
	const flyAlpha = $derived(flyT < 0.85 ? 1 : Math.max(0, 1 - (flyT - 0.85) / 0.15));

	const drawTrackBackplates = (g: import('pixi.js').Graphics) => {
		const inset = Math.max(1, nativeScale);
		const strokeWidth = Math.max(1, nativeScale * 0.85);
		const bleedX = 4 * nativeScale;
		const bleedY = 22 * nativeScale;

		for (const segment of trackSegments) {
			const backingRadius = Math.max(4 * nativeScale, segment.w * 0.18);
			g.roundRect(
				segment.x - bleedX,
				segment.y - bleedY,
				segment.w + bleedX * 2,
				segment.h + bleedY * 2,
				backingRadius,
			).fill({
				color: GAZE_COLORS.backing,
				alpha: 0.6,
			});
			g.roundRect(
				segment.x + inset,
				segment.y + inset,
				Math.max(0, segment.w - inset * 2),
				Math.max(0, segment.h - inset * 2),
				Math.max(0, backingRadius - inset),
			).stroke({
				width: strokeWidth,
				color: GAZE_COLORS.backingStroke,
				alpha: 0.16,
			});
		}
	};

	const drawMultiplierBackplate = (g: import('pixi.js').Graphics) => {
		g.circle(plaqueX, plaqueY, plaqueR * 1.26).fill({
			color: GAZE_COLORS.backing,
			alpha: 0.42,
		});
		g.circle(plaqueX, plaqueY, plaqueR * 1.16).stroke({
			width: Math.max(1, nativeScale * 1.4),
			color: GAZE_COLORS.backingStroke,
			alpha: 0.2,
		});
	};

	const drawTrackFill = (g: import('pixi.js').Graphics, segment: TrackSegment, amount: number) => {
		if (amount <= 0) return;
		const fillH = segment.h * Math.min(amount, 1);
		const fillY = segment.y + segment.h - fillH;
		const inset = 1.5 * nativeScale;
		const innerH = Math.max(0, fillH - inset * 2);
		const shineW = segment.w * 0.2;
		const edgeInset = 2 * nativeScale;
		const t = liquid.t;

		// Liquid surface: a travelling wave across the top of the fill. The charge burst
		// (fx.burst, set on each convoy landing) splashes the wave higher for a beat.
		const maxAmp = Math.max(0, fillY - segment.y - inset);
		const waveAmp = Math.min(nativeScale * (1.7 + fx.burst * 5.5), maxAmp);
		const waveK = (Math.PI * 2) / (segment.w * 0.85);
		const surfaceY = (x: number) => fillY + Math.sin(x * waveK + t * 3.1) * waveAmp;
		const steps = 9;
		const surface: { x: number; y: number }[] = [];
		for (let s = 0; s <= steps; s++) {
			const x = segment.x + (segment.w * s) / steps;
			surface.push({ x, y: surfaceY(x) });
		}
		const body = [
			...surface,
			{ x: segment.x + segment.w, y: segment.y + segment.h },
			{ x: segment.x, y: segment.y + segment.h },
		];

		// soft outer glow behind the liquid
		g.rect(
			segment.x - edgeInset,
			fillY - edgeInset,
			segment.w + edgeInset * 2,
			fillH + edgeInset * 2,
		).fill({
			color: GAZE_COLORS.fillGlow,
			alpha: 0.16 + fx.overcharge * 0.16,
		});

		// the liquid body, topped by the wave
		g.poly(body).fill(progressGradient);
		g.poly(body).fill({ fill: fadeGradient, alpha: 0.16 });

		// glowing crest riding the surface (brighter on the splash)
		g.moveTo(surface[0].x, surface[0].y);
		for (let s = 1; s < surface.length; s++) g.lineTo(surface[s].x, surface[s].y);
		g.stroke({
			width: Math.max(1.5, 2.4 * nativeScale),
			color: GAZE_COLORS.fillTop,
			alpha: 0.55 + fx.burst * 0.4,
		});

		// vertical sheens (kept from the static look)
		g.rect(segment.x + segment.w * 0.36, fillY + inset, segment.w * 0.34, innerH).fill({
			color: GAZE_COLORS.fillTop,
			alpha: 0.12,
		});
		g.rect(segment.x + inset, fillY + inset, shineW, innerH).fill({
			color: GAZE_COLORS.edge,
			alpha: 0.28,
		});

		// bubbles rising through the liquid, fading out as they near the surface
		if (fillH > segment.w * 0.5) {
			const bubbleR = Math.max(1.4, 2.6 * nativeScale);
			for (let i = 0; i < 6; i++) {
				const speed = (10 + (i % 3) * 6) * nativeScale;
				const travel = (t * speed + i * 37 * nativeScale) % Math.max(1, fillH - inset * 2);
				const by = segment.y + segment.h - inset - travel;
				const bx =
					segment.x +
					segment.w * (0.2 + 0.6 * ((i * 0.618) % 1)) +
					Math.sin(t * 1.8 + i * 2.1) * segment.w * 0.07;
				const nearSurface = Math.min(1, (by - fillY) / (segment.w * 0.4));
				if (nearSurface <= 0) continue;
				const r = bubbleR * (0.45 + ((i * 0.7) % 1) * 0.55);
				g.circle(bx, by, r).fill({ color: GAZE_COLORS.fillTop, alpha: 0.22 * nearSurface });
			}
		}
	};

	const drawMeterGlows = (g: import('pixi.js').Graphics) => {
		const pulse = fx.burst;
		const orbAlpha = 0.18 + pulse * 0.58;
		const gemAlpha = pulse * 0.5;
		const edgeAlpha = fillLead ? 0.28 + pulse * 0.5 : 0;

		if (gemAlpha > 0) {
			const gemGlow = new FillGradient({
				type: 'radial',
				center: { x: gemX, y: gemY },
				innerRadius: 0,
				outerCenter: { x: gemX, y: gemY },
				outerRadius: gemR * 2.4,
				colorStops: [
					{ offset: 0, color: GAZE_COLORS.energy },
					{ offset: 1, color: 0x000000 },
				],
			});
			g.circle(gemX, gemY, gemR * 2.4).fill({ fill: gemGlow, alpha: gemAlpha });
		}

		if (orbAlpha > 0) {
			const orbGlow = new FillGradient({
				type: 'radial',
				center: { x: plaqueX, y: plaqueY },
				innerRadius: 0,
				outerCenter: { x: plaqueX, y: plaqueY },
				outerRadius: plaqueR * 1.7,
				colorStops: [
					{ offset: 0, color: GAZE_COLORS.energy },
					{ offset: 1, color: 0x000000 },
				],
			});
			g.circle(plaqueX, plaqueY, plaqueR * 1.7).fill({ fill: orbGlow, alpha: orbAlpha });
		}

		if (fillLead && edgeAlpha > 0) {
			const edgeGlow = new FillGradient({
				type: 'radial',
				center: { x: fillLead.x, y: fillLead.y },
				innerRadius: 0,
				outerCenter: { x: fillLead.x, y: fillLead.y },
				outerRadius: fillLead.h * 1.35,
				colorStops: [
					{ offset: 0, color: GAZE_COLORS.edge },
					{ offset: 1, color: 0x000000 },
				],
			});
			g.circle(fillLead.x, fillLead.y, fillLead.h * 1.35).fill({
				fill: edgeGlow,
				alpha: edgeAlpha,
			});
		}
	};
</script>

<FadeContainer {show}>
	<BoardContainer>
		<!-- energy orbs flying from the winning symbols into the meter -->
		<Container blendMode="add">
			<Graphics draw={drawOrbs} />
		</Container>

		<Container x={position.x} y={position.y} rotation={meterRotation}>
			<Graphics draw={drawTrackBackplates} />
			<Graphics draw={drawMultiplierBackplate} />
			{#each trackSegments as segment, index}
				<Graphics
					draw={(g) => drawTrackFill(g, segment, trackFill[index])}
					alpha={0.96 + fx.overcharge * 0.04}
				/>
			{/each}
			<Sprite key={LAYER_KEYS.bar} anchor={0} width={gazeW} height={gazeH} />
			<Graphics draw={drawMeterGlows} blendMode="add" />

			{#if charge > 0}
				<Container
					x={plaqueTextX}
					y={plaqueTextY}
					rotation={multiplierTextRotation}
					scale={fx.textScale}
				>
					<!-- branded AbyssalBitmap face — gold fill/outline baked into the glyphs -->
					<BitmapText
						anchor={0.5}
						text={String(charge)}
						style={abyssalBitmapStyle({ fontSize: plaqueR * 1.34 })}
					/>
				</Container>
			{/if}
		</Container>

		<!-- the Gaze seed flying to the board centre, where the combine equation picks it up -->
		{#if flying}
			<Container x={flyX} y={flyY} scale={flyScale} alpha={flyAlpha}>
				<BitmapText
					anchor={0.5}
					text={`${flightValue}`}
					style={abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.42 })}
				/>
			</Container>
		{/if}
	</BoardContainer>
</FadeContainer>
