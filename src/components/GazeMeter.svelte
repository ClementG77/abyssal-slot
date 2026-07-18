<script lang="ts" module>
	import type { Position } from '../game/types';

	// One winning cluster's essence contribution: `value` is what the chip shows (+2/+3/+5,
	// doubled in Super Bonus), `tier` sizes the hero orb (1 = 8-9 symbols, 2 = 10-11, 3 = 12+),
	// reel/row is the cluster's overlay cell the orb flies from.
	export type GazeCluster = { value: number; tier: 1 | 2 | 3; reel: number; row: number };

	export type EmitterEventGazeMeter =
		| { type: 'gazeMeterShow' }
		| { type: 'gazeMeterHide' }
		| { type: 'gazeMeterReset' }
		// `clusters` drives the per-cluster hero orbs + "+N" chips; when absent (old fixtures,
		// resume), the meter falls back to one small orb per winning cell.
		| { type: 'gazeMeterFill'; fromPositions: Position[]; charge: number; clusters?: GazeCluster[] }
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
	import { FadeContainer, ResponsiveBitmapText } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import {
		abyssalBitmapStyle,
		BOARD_SIZES,
		GAZE_LAP_SIZE,
		GAZE_METER_IMAGE_SIZE,
		GAZE_METER_LAYOUT,
		GAZE_METER_MAX_CHARGE,
		SYMBOL_SIZE,
	} from '../game/constants';
	import { getPositionX, getPositionY } from '../game/utils';
	import { raceSkip, SKIP_TIME_SCALE } from '../game/skip.svelte';

	const context = getContext();

	const LAYER_KEYS = {
		bar: 'winMeter',
	} as const;
	type TrackSegment = { x: number; y: number; w: number; h: number; r: number };
	// Shared meter palette — backing plates and the orb energy purple. The FILL colours live
	// per lap in GAZE_LAPS below.
	const GAZE_COLORS = {
		energy: 0xc77dff,
		rim: 0xffffff,
		backing: 0x0d4b53,
		backingStroke: 0x0d4b53,
	} as const;
	// ---- The three Gaze laps (essence economy: charge 0-10 / 11-20 / 21-30) ----------------
	// Same 10-wide track, re-coloured per lap: tide teal → abyssal purple (the Eye's family) →
	// ember red (the MUL-red family — pure ruby stays reserved for the 15,000× cap takeover).
	// The finished lap stays visible as a dimmed backing under the new colour, and crossing a
	// boundary FLOODS the track with the new colour (playLapFlood).
	type GazeLapPalette = {
		fillDeep: number;
		fillMid: number;
		fillCore: number;
		fillTop: number;
		fillGlow: number;
		edge: number;
	};
	const GAZE_LAPS: GazeLapPalette[] = [
		// lap 1 — classic tide teal (the original fill ramp, bright against the dark backing)
		{ fillDeep: 0x0c7d80, fillMid: 0x18c4b6, fillCore: 0x49f5df, fillTop: 0xe8fffb, fillGlow: 0x66ffe8, edge: 0xe9ffff },
		// lap 2 — deep abyssal purple (saturated, clearly violet)
		{ fillDeep: 0x4a1f9e, fillMid: 0x8a3fff, fillCore: 0xb56bff, fillTop: 0xefe4ff, fillGlow: 0xc98bff, edge: 0xf3e8ff },
		// lap 3 — molten red (pushed off the old orange ember toward true red)
		{ fillDeep: 0x8f1410, fillMid: 0xff2f2a, fillCore: 0xff6a52, fillTop: 0xffdcd2, fillGlow: 0xff7a5a, edge: 0xffe6de },
	];
	const LAP_BACKING_ALPHA = 0.72; // the completed lap's settled full-height background fill
	const LAP_FLOOD_ALPHA = 0.7; // peak of the colour flood when a lap boundary is crossed
	// Hero-orb SIZE encodes the cluster's essence tier (+2/+3/+5); its COLOUR encodes the gaze
	// RANGE it charges toward — blue (0-10) → purple (10-20) → red (20-30) — so the orb reads as
	// "the essence that pushes the meter into this band", matching the fill it's about to make.
	const ORB_TIER_RADIUS = [0.085, 0.14, 0.2] as const; // by cluster tier
	const ORB_TIER_WEIGHT = [1, 1.05, 1.12] as const; // heavier tiers arc slower
	// per-lap orb palette: dim halo → saturated body → near-white core (drawn additively)
	const ORB_LAP_COLORS = [
		{ halo: 0x1a6fd8, body: 0x37b0ff, core: 0xe6f5ff }, // 0-10 blue
		{ halo: 0x6a2fce, body: 0xb168ff, core: 0xf3e8ff }, // 10-20 purple
		{ halo: 0xb81f14, body: 0xff4230, core: 0xffd9cc }, // 20-30 red
	] as const;
	const CHIP_LIFE = 0.9; // seconds a "+N" essence chip lives beside the plaque

	let show = $state(false);
	let charge = $state(0);
	// Which lap the track is showing (0-based; charge 14 → lap 1 at 40%). The plaque always
	// shows the TRUE total charge — the lap only re-colours the liquid.
	let lap = $state(0);
	const lapFx = $state({ flood: 0 }); // full-track colour flash on a lap-boundary crossing
	// "+N" essence chips popping off the plaque as each cluster's orb lands (driven by the
	// liquid clock — no per-chip tweens)
	type Chip = { id: number; text: string; tier: number; bornT: number };
	let chips = $state<Chip[]>([]);
	let nextChipId = 0;
	// Energy orbs in flight: ONE HERO ORB PER WINNING CLUSTER (sized by its essence tier,
	// coloured by the gaze range it charges toward), arcing from the cluster's overlay cell into
	// the meter; the fill rises once the convoy lands. Fallback (no cluster data): one small orb
	// per winning cell.
	type Orb = {
		sx: number;
		sy: number;
		wobble: number;
		tier: 1 | 2 | 3;
		value: number;
		lap: 0 | 1 | 2;
	};
	let orbs = $state<Orb[]>([]);
	// chips scheduled against each orb's arrival; killed + flushed on skip/reset
	let chipCalls: gsap.core.Tween[] = [];
	let chipQueue: Orb[] = [];
	const killChipCalls = () => {
		chipCalls.forEach((call) => call.kill());
		chipCalls = [];
		chipQueue = [];
	};
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

	const fill = new Tween(0, { duration: 400, easing: cubicOut });
	const orbFlight = new Tween(0, { duration: 1 });
	const toCenter = new Tween(0, { duration: 1 });
	// Ambient liquid clock — drives the fill's surface wave, its glowing crest and the rising
	// bubbles, so the charge reads as living water rather than a static bar.
	const liquid = $state({ t: 0 });
	// The fill gradients are cached PER LAP: FillGradient builds a texture, and the liquid
	// redraws every frame — allocating them inside the draw would churn textures/GC.
	const progressGradients = GAZE_LAPS.map(
		(lapColors) =>
			new FillGradient({
				textureSpace: 'local',
				start: { x: 0, y: 1 },
				end: { x: 0, y: 0 },
				colorStops: [
					{ offset: 0, color: lapColors.fillDeep },
					{ offset: 0.32, color: lapColors.fillMid },
					{ offset: 0.72, color: lapColors.fillCore },
					{ offset: 1, color: lapColors.fillTop },
				],
			}),
	);
	const fadeGradients = GAZE_LAPS.map(
		(lapColors) =>
			new FillGradient({
				textureSpace: 'local',
				start: { x: 0, y: 0 },
				end: { x: 1, y: 0 },
				colorStops: [
					{ offset: 0, color: lapColors.fillTop },
					{ offset: 0.42, color: lapColors.fillCore },
					{ offset: 1, color: lapColors.fillDeep },
				],
			}),
	);

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
	const mobileArtworkThickness = $derived(
		gazeW * (GAZE_METER_LAYOUT.visibleBounds.right - GAZE_METER_LAYOUT.visibleBounds.left),
	);
	const mobileTumbleWinCenterY = -SYMBOL_SIZE * 0.8;
	const mobileTumbleWinVisualH = SYMBOL_SIZE * 0.82 * 1.18;
	const mobileMeterTop = $derived(
		mobileTumbleWinCenterY -
			mobileTumbleWinVisualH / 2 -
			SYMBOL_SIZE * 0.08 -
			mobileArtworkThickness,
	);
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

	const playChargeFx = (maxedHit = false) => {
		// scoped kill — fx.overcharge belongs to the sustained MAXED shimmer below
		gsap.killTweensOf(fx, 'burst,textScale');
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
				duration: maxedHit ? 0.5 : 0.32,
				ease: 'power2.out',
			});
	};

	// GAZE MAXED (charge 30): the full ember bar shimmers for as long as the charge holds —
	// the sustained beat the essence cap earns (the arrival that lands it also gets a bigger
	// burst via playChargeFx(maxedHit)).
	const maxed = $derived(charge >= GAZE_METER_MAX_CHARGE);
	let maxedTween: gsap.core.Tween | undefined;
	$effect(() => {
		if (!maxed) {
			maxedTween?.kill();
			maxedTween = undefined;
			fx.overcharge = 0;
			return;
		}
		maxedTween = gsap.fromTo(
			fx,
			{ overcharge: 0.35 },
			{ overcharge: 1, duration: 0.5, ease: 'sine.inOut', repeat: -1, yoyo: true },
		);
		return () => maxedTween?.kill();
	});

	// a cluster's orb has landed: pop its "+N" essence chip off the plaque + a small tick
	const spawnChip = (orb: Orb) => {
		if (orb.value > 0) {
			chips = [
				...chips.filter((chip) => liquid.t - chip.bornT < CHIP_LIFE),
				{ id: nextChipId++, text: `+${orb.value}`, tier: orb.tier, bornT: liquid.t },
			];
		}
		gsap.killTweensOf(fx, 'textScale');
		track(gsap.fromTo(fx, { textScale: 1.14 }, { textScale: 1, duration: 0.22, ease: 'power2.out' }));
	};

	// crossing a lap boundary: the track floods with the NEW lap's colour + a splash
	const playLapFlood = () => {
		gsap.killTweensOf(lapFx);
		track(gsap.fromTo(lapFx, { flood: 1 }, { flood: 0, duration: 0.45, ease: 'power2.out' }));
		gsap.killTweensOf(fx, 'burst');
		track(
			gsap
				.timeline()
				.set(fx, { burst: 1 })
				.to(fx, { burst: 0, duration: 0.4, ease: 'power2.out' }),
		);
		// the meter laps to the next colour band — the "gaze deepens" milestone hit.
		// forcePlay: a big essence step can cross several laps in one go — each lap should ring.
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_gaze_full', forcePlay: true });
	};

	onDestroy(() => {
		animations.forEach((animation) => animation.kill());
		animations.clear();
		killChipCalls();
		gsap.killTweensOf(fx);
		gsap.killTweensOf(lapFx);
	});

	// Raise the meter to `value`, crossing lap boundaries as needed: each crossing brims the
	// current colour, floods the track with the next lap's colour, then keeps filling. A big
	// essence step (Super Bonus multi-cluster) can cross more than one boundary — the loop
	// plays every crossing through.
	const setChargeStaged = async (value: number) => {
		charge = value;
		const clamped = Math.min(value, GAZE_METER_MAX_CHARGE);
		const targetLap =
			clamped <= 0 ? 0 : Math.min(GAZE_LAPS.length - 1, Math.ceil(clamped / GAZE_LAP_SIZE) - 1);
		while (lap < targetLap) {
			await fill.set(1);
			lap += 1;
			playLapFlood();
			fill.set(0, { duration: 0 });
		}
		await fill.set(Math.min(Math.max((clamped - lap * GAZE_LAP_SIZE) / GAZE_LAP_SIZE, 0), 1));
	};

	context.eventEmitter.subscribeOnMount({
		gazeMeterShow: () => (show = true),
		gazeMeterHide: () => (show = false),
		gazeMeterReset: () => {
			charge = 0;
			orbs = [];
			chips = [];
			killChipCalls();
			orbFlight.set(0, { duration: 0 });
			flying = false;
			toCenter.set(0, { duration: 0 });
			gsap.killTweensOf(fx, 'burst,textScale');
			resetFx();
			// ease the fill away instead of snapping empty (no-op when already drained)
			void fill.set(0, { duration: 360 }).then(() => (lap = 0));
		},
		gazeMeterFill: async (emitterEvent) => {
			show = true;
			// (no per-orb fill sound — it made the meter too noisy; the lap milestone `sfx_gaze_full`
			// is the only Gaze sound now)
			// One hero orb per winning CLUSTER (sized by essence tier, flying from the cluster's
			// overlay cell), heavier tiers arcing slightly slower. Only the FLIGHT blocks the
			// book — the fill rise (with its lap crossings) + plaque pops settle on their own
			// while the board already explodes/refills, keeping cascades fast.
			const ts = stateBetDerived.timeScale();
			const clusterData =
				emitterEvent.clusters && emitterEvent.clusters.length > 0
					? emitterEvent.clusters
					: // fallback (old fixtures / resume snapshots): one small orb per winning cell
						emitterEvent.fromPositions.slice(0, 10).map((position) => ({
							value: 0,
							tier: 1 as const,
							reel: position.reel,
							row: position.row,
						}));
			// the orbs take the colour of the lap this step CHARGES INTO (the resulting charge's
			// band), so they foreshadow the fill they're about to create
			const targetLap = (
				emitterEvent.charge <= 0
					? 0
					: Math.min(GAZE_LAPS.length - 1, Math.ceil(emitterEvent.charge / GAZE_LAP_SIZE) - 1)
			) as 0 | 1 | 2;
			orbs = clusterData.map((cluster) => ({
				sx: getPositionX(cluster.reel),
				sy: getPositionY(cluster.row),
				wobble: (Math.random() - 0.5) * SYMBOL_SIZE * 0.9,
				tier: cluster.tier,
				value: cluster.value,
				lap: targetLap,
			}));
			orbFlight.set(0, { duration: 0 });
			const flightBaseMs = 340 + orbs.length * 90;
			// schedule each orb's "+N" chip + plaque tick at its arrival moment
			killChipCalls();
			chipQueue = [...orbs];
			const stagger = orbs.length > 1 ? (1 - ORB_TRAVEL_FRACTION) / (orbs.length - 1) : 0;
			orbs.forEach((orb, index) => {
				const arrival = Math.min(
					1,
					index * stagger + ORB_TRAVEL_FRACTION * ORB_TIER_WEIGHT[orb.tier - 1],
				);
				chipCalls.push(
					gsap.delayedCall((arrival * flightBaseMs) / ts / 1000, () => {
						chipQueue = chipQueue.filter((queued) => queued !== orb);
						spawnChip(orb);
					}),
				);
			});
			// a skip mid-flight finishes it fast (turbo pace), matching how turbo would have run it
			if ((await raceSkip(orbFlight.set(1, { duration: flightBaseMs / ts }))) === 'skipped')
				await orbFlight.set(1, { duration: flightBaseMs / SKIP_TIME_SCALE });
			// flush chips the skip outran, so every landed orb still reports its essence
			const outran = chipQueue.slice();
			killChipCalls();
			outran.forEach(spawnChip);
			orbs = [];
			void setChargeStaged(emitterEvent.charge).then(() =>
				playChargeFx(emitterEvent.charge >= GAZE_METER_MAX_CHARGE),
			);
		},
		gazeMeterToEye: async () => {
			if (charge <= 0) return;
			// The Gaze seed leaves the plaque and flies to the BOARD CENTRE, where the combine
			// equation builds (eyeResolve awaits this, then eyeBurst pops the same value there —
			// a clean hand-off). The meter drains as the seed departs.
			flightValue = charge;
			charge = 0;
			chips = [];
			flying = true;
			// turbo/skip-aware — this flight was the one fixed-duration beat left in the combine
			const flightTs = stateBetDerived.timeScale();
			toCenter.set(0, { duration: 0 });
			void fill.set(0, { duration: 420 / flightTs }).then(() => (lap = 0));
			// a skip mid-flight finishes the seed's travel fast (turbo pace)
			if ((await raceSkip(toCenter.set(1, { duration: 520 / flightTs, easing: cubicOut }))) === 'skipped')
				await toCenter.set(1, { duration: 520 / SKIP_TIME_SCALE, easing: cubicOut });
			flying = false;
		},
		gazeMeterDrain: async () => {
			// the no-Eye fizzle: a deep charge visibly unwinds back through its laps
			// (ember → purple → teal) before the last of the liquid drains away
			while (lap > 0) {
				await fill.set(0, { duration: 260 });
				lap -= 1;
				fill.set(1, { duration: 0 });
			}
			await fill.set(0, { duration: 420 });
			chips = [];
			await waitForResolve((resolve) => setTimeout(resolve, 120));
			charge = 0;
			orbs = [];
		},
	});

	// Energy orbs: one HERO ORB PER CLUSTER, arcing from the cluster's overlay cell into the
	// meter's eye with a slight per-orb stagger. SIZE = essence tier (cluster size); COLOUR =
	// the gaze range it charges toward (blue → purple → red). Each orb is a glossy layered
	// sphere (dim halo → saturated body → white-hot core → offset specular) trailing a tapered
	// comet tail sampled back along its curve — heavier tiers drag a longer wake.
	const ORB_TRAVEL_FRACTION = 0.6; // each orb spends this share of the timeline in flight
	const ORB_TAIL_SAMPLES = 5;
	const drawOrbs = (g: import('pixi.js').Graphics) => {
		const t = orbFlight.current;
		if (t <= 0 || orbs.length === 0) return;
		const count = orbs.length;
		const stagger = count > 1 ? (1 - ORB_TRAVEL_FRACTION) / (count - 1) : 0;

		orbs.forEach((orb, index) => {
			const col = ORB_LAP_COLORS[orb.lap];
			const weight = ORB_TIER_WEIGHT[orb.tier - 1];
			const p = Math.min(
				Math.max((t - index * stagger) / (ORB_TRAVEL_FRACTION * weight), 0),
				1,
			);
			if (p <= 0 || p >= 1) return;
			// quadratic arc from the cell to the meter's eye, bowed upward with a per-orb wobble
			const cx = (orb.sx + meterEnergyX) / 2;
			const cy = Math.min(orb.sy, meterEnergyY) - SYMBOL_SIZE * 0.45 + orb.wobble;
			const bez = (tt: number) => {
				const uu = 1 - tt;
				return {
					x: uu * uu * orb.sx + 2 * uu * tt * cx + tt * tt * meterEnergyX,
					y: uu * uu * orb.sy + 2 * uu * tt * cy + tt * tt * meterEnergyY,
				};
			};
			// pop in fast, shrink slightly as it dives into the meter
			const appear = Math.min(p / 0.12, 1);
			const r = SYMBOL_SIZE * ORB_TIER_RADIUS[orb.tier - 1] * appear * (1 - p * 0.35);

			// tapered comet tail: fading circles sampled back along the curve
			const tailSpan = orb.tier === 3 ? 0.26 : orb.tier === 2 ? 0.2 : 0.15;
			for (let s = 1; s <= ORB_TAIL_SAMPLES; s++) {
				const frac = s / ORB_TAIL_SAMPLES;
				const pt = p - tailSpan * frac;
				if (pt <= 0) continue;
				const tail = bez(pt);
				const tr = r * (1 - frac * 0.72);
				if (tr <= 0.5) continue;
				g.circle(tail.x, tail.y, tr).fill({ color: col.body, alpha: (1 - frac) * 0.4 * appear });
			}

			// glossy head: soft halo → body bloom → body → white-hot core → offset specular
			const head = bez(p);
			g.circle(head.x, head.y, r * 2.6).fill({ color: col.halo, alpha: 0.14 * appear });
			g.circle(head.x, head.y, r * 1.65).fill({ color: col.body, alpha: 0.4 * appear });
			g.circle(head.x, head.y, r * 1.02).fill({ color: col.body, alpha: 0.9 * appear });
			g.circle(head.x, head.y, r * 0.58).fill({ color: col.core, alpha: 0.98 * appear });
			g.circle(head.x - r * 0.26, head.y - r * 0.3, r * 0.22).fill({
				color: 0xffffff,
				alpha: 0.85 * appear,
			});

			// tier "rank" made unmistakable: orbiting satellite sparks — none for +2, TWO for +3,
			// FOUR for +5 — so the payload's weight reads even before the "+N" label is legible.
			const satCount = orb.tier === 3 ? 4 : orb.tier === 2 ? 2 : 0;
			if (satCount > 0) {
				const orbitR = r * 1.95;
				const spin = p * 9 + index;
				for (let s = 0; s < satCount; s++) {
					const ang = (s / satCount) * Math.PI * 2 + spin;
					const sxo = head.x + Math.cos(ang) * orbitR;
					const syo = head.y + Math.sin(ang) * orbitR;
					g.circle(sxo, syo, r * 0.5).fill({ color: col.body, alpha: 0.38 * appear });
					g.circle(sxo, syo, r * 0.26).fill({ color: col.core, alpha: 0.92 * appear });
				}
			}
			// +5 heavyweight: a pulsing containment ring around the payload
			if (orb.tier === 3) {
				const ring = 0.5 + 0.5 * Math.sin(p * 14);
				g.circle(head.x, head.y, r * (2.0 + ring * 0.35)).stroke({
					width: Math.max(1, r * 0.14),
					color: col.body,
					alpha: 0.45 * appear,
				});
			}
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
		const lapColors = GAZE_LAPS[lap];

		// STACKED fill: the completed lap stays as a FULL, settled background of its own colour,
		// and the current lap fills OVER it — so climbing past 10 reads as "the bar was blue-full,
		// now purple is filling over it"; past 20, "red filling over the full purple". The active
		// liquid (below) rises from the bottom on top of this settled backing.
		if (lap > 0) {
			const prev = GAZE_LAPS[lap - 1];
			// full-height solid body (no wave — it's a settled, already-earned level)
			g.rect(segment.x, segment.y, segment.w, segment.h).fill({
				color: prev.fillDeep,
				alpha: LAP_BACKING_ALPHA,
			});
			g.rect(segment.x, segment.y, segment.w, segment.h).fill({
				color: prev.fillMid,
				alpha: LAP_BACKING_ALPHA * 0.65,
			});
			// a settled surface line at the very top so the full level reads as "capped"
			g.rect(segment.x, segment.y, segment.w, Math.max(1, segment.h * 0.05)).fill({
				color: prev.fillTop,
				alpha: LAP_BACKING_ALPHA * 0.7,
			});
		}

		// lap-boundary flood: the whole track flashes the NEW lap's colour for a beat
		if (lapFx.flood > 0) {
			g.rect(segment.x, segment.y, segment.w, segment.h).fill({
				color: lapColors.fillCore,
				alpha: LAP_FLOOD_ALPHA * lapFx.flood,
			});
		}

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
			color: lapColors.fillGlow,
			alpha: 0.16 + fx.overcharge * 0.16,
		});

		// the liquid body, topped by the wave
		g.poly(body).fill(progressGradients[lap]);
		g.poly(body).fill({ fill: fadeGradients[lap], alpha: 0.16 });

		// glowing crest riding the surface (brighter on the splash)
		g.moveTo(surface[0].x, surface[0].y);
		for (let s = 1; s < surface.length; s++) g.lineTo(surface[s].x, surface[s].y);
		g.stroke({
			width: Math.max(1.5, 2.4 * nativeScale),
			color: lapColors.fillTop,
			alpha: 0.55 + fx.burst * 0.4,
		});

		// vertical sheens (kept from the static look)
		g.rect(segment.x + segment.w * 0.36, fillY + inset, segment.w * 0.34, innerH).fill({
			color: lapColors.fillTop,
			alpha: 0.12,
		});
		g.rect(segment.x + inset, fillY + inset, shineW, innerH).fill({
			color: lapColors.edge,
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
				g.circle(bx, by, r).fill({ color: lapColors.fillTop, alpha: 0.22 * nearSurface });
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
					{ offset: 0, color: GAZE_LAPS[lap].edge },
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
					<!-- branded AbyssalBitmap face — gold fill/outline baked into the glyphs.
					     ResponsiveBitmapText shrinks to `maxWidth` so a 2-digit charge (up to 30)
					     stays inside the round plaque instead of overflowing it.
					     At GAZE MAXED the glyphs bloom with the sustained shimmer. -->
					<ResponsiveBitmapText
						anchor={0.5}
						maxWidth={plaqueR * 1.55}
						text={String(charge)}
						style={abyssalBitmapStyle({ fontSize: plaqueR * 1.34 })}
					/>
					{#if maxed && fx.overcharge > 0}
						<Container alpha={fx.overcharge * 0.7} blendMode="add">
							<ResponsiveBitmapText
								anchor={0.5}
								maxWidth={plaqueR * 1.55}
								text={String(charge)}
								style={abyssalBitmapStyle({ fontSize: plaqueR * 1.34 })}
							/>
						</Container>
					{/if}
				</Container>
			{/if}

			<!-- "+N" essence chips popping off the plaque as each cluster's orb lands (their
			     nesting cancels the meter's portrait rotation, so the rise is always screen-up) -->
			{#each chips as chip (chip.id)}
				{@const chipAge = Math.max(0, liquid.t - chip.bornT)}
				{#if chipAge < CHIP_LIFE}
					{@const chipP = chipAge / CHIP_LIFE}
					<Container x={plaqueTextX} y={plaqueTextY} rotation={multiplierTextRotation}>
						<Container
							y={-plaqueR * 1.45 - chipP * SYMBOL_SIZE * 0.42}
							scale={chipP < 0.18 ? 0.5 + (chipP / 0.18) * 0.65 : 1.15 - (chipP - 0.18) * 0.18}
							alpha={chipP > 0.68 ? Math.max(0, (1 - chipP) / 0.32) : 1}
						>
							<BitmapText
								anchor={0.5}
								text={chip.text}
								style={abyssalBitmapStyle({ fontSize: plaqueR * (0.58 + chip.tier * 0.14) })}
							/>
						</Container>
					</Container>
				{/if}
			{/each}
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
