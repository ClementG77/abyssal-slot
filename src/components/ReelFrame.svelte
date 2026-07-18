<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventReelFrame =
		| { type: 'reelFrameGlowShow' }
		| { type: 'reelFrameGlowHide' }
		| { type: 'reelFrameSpinLaunch' }
		| { type: 'reelFrameReelStop' }
		| { type: 'reelFrameScatterLand'; position?: Position }
		| { type: 'reelFrameEyeLand'; position?: Position }
		| { type: 'reelFrameScatterAnticipationStart' }
		| { type: 'reelFrameScatterAnticipationEnd' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { Container, Graphics, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import type { ReelFrameLayout } from '../game/constants';
	import {
		MOBILE_REEL_DISPLAY_SCALE,
		REEL_LAYOUT_BASE,
		REEL_LAYOUT_FREE_SPINS,
		getReelDisplayScale,
		getReelPosition,
	} from '../game/constants';

	type Props = {
		layer?: 'background' | 'overlay';
		debug?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const feature = $derived(context.stateGame.gameType === 'freegame');
	const featureMix = new Tween(0, { duration: 620 });

	const LAYER_KEYS = {
		background: 'frame_background.png',
		separator: 'frame_separator.png',
		border: 'frame_border.png',
	} as const;
	const LAYER_SOURCE = {
		background: { width: 494, height: 446 },
		separator: { width: 10, height: 350 },
		border: { width: 825, height: 524 },
	} as const;
	const BORDER_INNER_WINDOW = { x: 64, y: 43, width: 696, height: 443 } as const;
	const BACKGROUND_BLEED = 8;
	const frame = $derived({ glowColor: feature ? 0xff4d18 : 0x7f35ff });
	const frameVariants = $derived([
		{ layout: REEL_LAYOUT_BASE, alpha: 1 - featureMix.current },
		{ layout: REEL_LAYOUT_FREE_SPINS, alpha: featureMix.current },
	]);

	$effect(() => {
		featureMix.set(feature ? 1 : 0);
	});

	const layer = $derived(props.layer ?? 'background');
	const mobileReelScale = $derived(
		context.stateLayoutDerived.layoutType() === 'portrait' ? MOBILE_REEL_DISPLAY_SCALE : 1,
	);

	let now = $state(0);
	let rafId = 0;
	let boosted = $state(false);
	let launchStartedAt = $state(-1);
	let reelStopStartedAt = $state(-1);
	let scatterStartedAt = $state(-1);
	let eyeStartedAt = $state(-1);
	let scatterAnticipationStartedAt = $state(-1);
	let scatterAnticipationReleasedAt = $state(-1);
	let scatterAnticipationReleaseFrom = $state(0);
	const t = $derived(now / 1000);

	// Self-suspending clock (mounted twice — background + overlay layers): it only ticks while
	// something is actually animating — a burst window, an anticipation, the gaze-heat breathe,
	// or the feature glint boost. At true base idle it stops (the near-invisible idle glint just
	// freezes). `ensureClock`/`clockNeeded` are defined below, after `heat` is in scope.
	onMount(() => () => {
		if (rafId) cancelAnimationFrame(rafId);
	});

	context.eventEmitter.subscribeOnMount({
		reelFrameGlowShow: () => {
			boosted = true;
			ensureClock();
		},
		reelFrameGlowHide: () => (boosted = false),
		reelFrameSpinLaunch: () => {
			launchStartedAt = performance.now();
			ensureClock();
		},
		reelFrameReelStop: () => {
			reelStopStartedAt = performance.now();
			ensureClock();
		},
		reelFrameScatterLand: () => {
			scatterStartedAt = performance.now();
			ensureClock();
		},
		reelFrameEyeLand: () => {
			eyeStartedAt = performance.now();
			ensureClock();
		},
		reelFrameScatterAnticipationStart: () => {
			scatterAnticipationStartedAt = performance.now();
			scatterAnticipationReleasedAt = -1;
			ensureClock();
		},
		reelFrameScatterAnticipationEnd: () => {
			scatterAnticipationReleaseFrom = scatterAnticipationProgress;
			scatterAnticipationReleasedAt = performance.now();
			ensureClock();
		},
	});

	const getBurstEnergy = (startedAt: number, duration: number) => {
		const elapsed = startedAt < 0 ? Infinity : (now - startedAt) / 1000;
		return elapsed < duration ? Math.max(0, 1 - elapsed / duration) : 0;
	};
	const mixColor = (from: number, to: number, amount: number) => {
		const mix = Math.max(0, Math.min(1, amount));
		const fromR = (from >> 16) & 0xff;
		const fromG = (from >> 8) & 0xff;
		const fromB = from & 0xff;
		const toR = (to >> 16) & 0xff;
		const toG = (to >> 8) & 0xff;
		const toB = to & 0xff;
		const r = Math.round(fromR + (toR - fromR) * mix);
		const g = Math.round(fromG + (toG - fromG) * mix);
		const b = Math.round(fromB + (toB - fromB) * mix);

		return (r << 16) | (g << 8) | b;
	};
	// ---- Gaze-linked frame heat -----------------------------------------------------------
	// The frame is a tension gauge for the Eye: as the spin's Gaze charge climbs, an additive
	// copy of the border blooms from cool violet toward hot amber, breathing faster and
	// shallower the hotter it gets. Cools back down on reveal/eyeResolve (gazeCharge → 0).
	const FRAME_HEAT = {
		// Essence economy: one good tumble is +2..+10, cap 30 — full heat sits at the lap-3
		// doorstep so the ramp still tells a story across a whole cascade chain.
		fullCharge: 18,
		baseAlpha: 0.3, // glow floor at full heat
		breatheAmp: 0.22, // breathing depth when cool (flattens as heat rises)
		slowSpeed: 1.7, // rad/s of the cool, calm breathe
		fastSpeed: 5.2, // rad/s of the hot, urgent breathe
		coolColor: 0x7f35ff, // idle violet
		midColor: 0xd866ff, // eye purple
		hotColor: 0xffb46a, // hot amber at full charge
	};
	const heat = new Tween(0, { duration: 550 });

	// Clock is "needed" while any burst is inside its window, an anticipation is live, the gaze
	// heat is still visible (breathing/easing), or the feature glint is boosted.
	const clockNeeded = (ts: number) => {
		const within = (startedAt: number, ms: number) => startedAt >= 0 && ts - startedAt < ms;
		const anticipationActive =
			scatterAnticipationStartedAt >= 0 &&
			(scatterAnticipationReleasedAt < 0 || ts - scatterAnticipationReleasedAt < 200);
		return (
			within(launchStartedAt, 620) ||
			within(reelStopStartedAt, 240) ||
			within(scatterStartedAt, 520) ||
			within(eyeStartedAt, 760) ||
			anticipationActive ||
			heat.current > 0.01 ||
			boosted
		);
	};
	const ensureClock = () => {
		if (rafId) return;
		const loop = (ts: number) => {
			now = ts;
			rafId = clockNeeded(ts) ? requestAnimationFrame(loop) : 0;
		};
		rafId = requestAnimationFrame(loop);
	};

	$effect(() => {
		const target = Math.min(context.stateGame.gazeCharge / FRAME_HEAT.fullCharge, 1);
		heat.set(target);
		// wake the clock so the heat bloom breathes/eases; it self-suspends once heat < 0.01
		if (target > 0) ensureClock();
	});
	const heatColor = $derived(
		heat.current < 0.5
			? mixColor(FRAME_HEAT.coolColor, FRAME_HEAT.midColor, heat.current * 2)
			: mixColor(FRAME_HEAT.midColor, FRAME_HEAT.hotColor, (heat.current - 0.5) * 2),
	);
	const heatAlpha = $derived.by(() => {
		const h = heat.current;
		if (h <= 0.01) return 0;
		// crossfade slow → fast breathe by amplitude (frequency modulation would phase-jump)
		const wave =
			0.5 + 0.5 * (Math.sin(t * FRAME_HEAT.slowSpeed) * (1 - h) + Math.sin(t * FRAME_HEAT.fastSpeed) * h);
		return h * (FRAME_HEAT.baseAlpha + FRAME_HEAT.breatheAmp * (1 - h * 0.55) * wave);
	});

	const launchEnergy = $derived(getBurstEnergy(launchStartedAt, 0.62));
	const scatterEnergy = $derived(getBurstEnergy(scatterStartedAt, 0.52));
	const eyeEnergy = $derived(getBurstEnergy(eyeStartedAt, 0.76));
	const specialEnergy = $derived(Math.max(scatterEnergy, eyeEnergy));
	const effectEnergy = $derived(Math.max(launchEnergy, specialEnergy));
	// The bottom aura reacts to spin launch ONLY — scatter no longer lights it, and the Eye's
	// reaction is the puffs behind the frame (drawFrameBackPuffs), not the bottom rail.
	const bottomAuraEnergy = $derived(launchEnergy);
	const effectColor = $derived(
		eyeEnergy > scatterEnergy ? 0xd866ff : scatterEnergy > 0 ? 0x4cecff : frame.glowColor,
	);
	// border stays untinted — the Eye's frame reaction is the backglow puffs, not a border flash
	const borderTint = 0xffffff;
	const launchMotion = $derived(launchEnergy > 0 ? Math.sin((1 - launchEnergy) * Math.PI) : 0);
	// each reel stop dips the frame a touch — the column's weight hits the chassis
	const REEL_STOP_DIP = 6; // px at the dip's peak
	const stopEnergy = $derived(getBurstEnergy(reelStopStartedAt, 0.24));
	const stopMotion = $derived(stopEnergy > 0 ? Math.sin((1 - stopEnergy) * Math.PI) : 0);
	const scatterAnticipationProgress = $derived.by(() => {
		if (scatterAnticipationReleasedAt >= 0) {
			const releaseElapsed = (now - scatterAnticipationReleasedAt) / 1000;
			return Math.max(0, scatterAnticipationReleaseFrom * (1 - releaseElapsed / 0.2));
		}

		if (scatterAnticipationStartedAt < 0) return 0;
		const progress = Math.min(1, (now - scatterAnticipationStartedAt) / 1000);
		return progress * progress * (3 - 2 * progress);
	});
	const frameShakeY = $derived(launchMotion * 42 + stopMotion * REEL_STOP_DIP);
	const getFrameTransform = (layout: ReelFrameLayout) => {
		const position = getReelPosition(layout);
		const displayScale = getReelDisplayScale(layout);
		return {
			x: position.x + (layout.gridX + layout.gridWidth / 2) * displayScale,
			y: position.y + (layout.gridY + layout.gridHeight / 2) * displayScale + frameShakeY,
			pivot: { x: layout.gridX + layout.gridWidth / 2, y: layout.gridY + layout.gridHeight / 2 },
			scale:
				displayScale *
				mobileReelScale *
				(1 + launchMotion * 0.045 + scatterAnticipationProgress * 0.06),
		};
	};
	const getGlintX = (layout: ReelFrameLayout) =>
		layout.gridX + ((t * 180) % Math.max(layout.gridWidth, 1));

	const getBorderPlacement = (layout: ReelFrameLayout) => {
		const scaleX = layout.gridWidth / BORDER_INNER_WINDOW.width;
		const scaleY = layout.gridHeight / BORDER_INNER_WINDOW.height;

		return {
			x: layout.gridX - BORDER_INNER_WINDOW.x * scaleX,
			y: layout.gridY - BORDER_INNER_WINDOW.y * scaleY,
			width: LAYER_SOURCE.border.width * scaleX,
			height: LAYER_SOURCE.border.height * scaleY,
		};
	};

	const getSeparatorPlacement = (layout: ReelFrameLayout, index: number) => {
		const scale = layout.gridHeight / LAYER_SOURCE.separator.height;
		const width = LAYER_SOURCE.separator.width * scale;
		const columnWidth = layout.gridWidth / layout.columns;

		return {
			x: layout.gridX + columnWidth * (index + 1) - width / 2,
			y: layout.gridY,
			width,
			height: layout.gridHeight,
		};
	};

	const drawEffectMask = (g: import('pixi.js').Graphics, layout: ReelFrameLayout) => {
		g.rect(layout.gridX, layout.gridY, layout.gridWidth, layout.gridHeight).fill(0xffffff);
	};

	// A soft pool of light welling up from the bottom rail of the reel window (replaces the old
	// per-column blobs + hard bars). Tuned to read as a gentle aura, not a flash.
	const BOTTOM_AURA = {
		reach: 0.22, // how far up the glow reaches, as a fraction of the reel window height
		spread: 0.62, // half-width of the pool, as a fraction of the reel window width
		layers: 6, // stacked-ellipse radial falloff resolution
		glow: 0.5, // pool brightness at the core (before the effectEnergy fade)
		railAlpha: 0.18, // the hot white light rail hugging the very bottom edge
	};
	const drawBottomAura = (g: import('pixi.js').Graphics, layout: ReelFrameLayout) => {
		const bottom = layout.gridY + layout.gridHeight;
		const cx = layout.gridX + layout.gridWidth / 2;
		const reach = layout.gridHeight * BOTTOM_AURA.reach;
		const spread = layout.gridWidth * BOTTOM_AURA.spread;
		// stacked additive ellipses centred on the bottom-centre give a smooth radial falloff
		// (no per-frame gradient allocation); the effect mask clips the lower half so the pool
		// hugs the bottom rail and only its top half rises into the reels.
		for (let i = 0; i < BOTTOM_AURA.layers; i++) {
			const f = (i + 1) / BOTTOM_AURA.layers;
			g.ellipse(cx, bottom, spread * f, reach * f).fill({
				color: effectColor,
				alpha: BOTTOM_AURA.glow / BOTTOM_AURA.layers,
			});
		}
		// hot light rail hugging the bottom edge — the glow's apparent source
		g.ellipse(cx, bottom, spread * 0.7, reach * 0.14).fill({
			color: 0xffffff,
			alpha: BOTTOM_AURA.railAlpha,
		});
	};

	// The Eye's reaction: soft PUFFS of purple light seeping out from BEHIND the reel frame
	// (background layer, behind the panel/board/border). Instead of one centred ellipse (which
	// reads as a visible disc), a ring of overlapping soft puffs hugs the frame perimeter — each
	// puff has a heavily-tapered falloff so it has no hard edge, and they breathe gently so the
	// aura feels alive, like light diffusing through water. Only the part past the frame edge
	// peeks through.
	const FRAME_BACK_PUFFS = {
		colorA: 0xff2f4e, // red — puffs lerp red → purple around the ring (test colours)
		colorB: 0x9a3fff, // purple
		count: 18, // puffs distributed around the frame perimeter
		size: 0.34, // puff radius as a fraction of the reel-window width (bigger — easier to see)
		margin: 0.1, // placement ring, fraction outside the grid (≈ the frame's outer edge)
		softLayers: 5, // per-puff soft falloff — enough taper that no hard circle edge shows
		glow: 0.95, // overall brightness before the eyeEnergy fade
	};
	// a point at parameter u∈[0,1) around a rectangle's perimeter (clockwise from top-left)
	const perimeterPoint = (x: number, y: number, w: number, h: number, u: number) => {
		const per = 2 * (w + h);
		let d = (u - Math.floor(u)) * per;
		if (d < w) return { x: x + d, y };
		d -= w;
		if (d < h) return { x: x + w, y: y + d };
		d -= h;
		if (d < w) return { x: x + w - d, y: y + h };
		d -= w;
		return { x, y: y + h - d };
	};
	const drawFrameBackPuffs = (g: import('pixi.js').Graphics, layout: ReelFrameLayout) => {
		const clock = t; // reactive → the puffs breathe while the clock ticks (the eye window)
		const mx = layout.gridWidth * FRAME_BACK_PUFFS.margin;
		const my = layout.gridHeight * FRAME_BACK_PUFFS.margin;
		const rx = layout.gridX - mx;
		const ry = layout.gridY - my;
		const rw = layout.gridWidth + mx * 2;
		const rh = layout.gridHeight + my * 2;
		const baseR = layout.gridWidth * FRAME_BACK_PUFFS.size;
		const L = FRAME_BACK_PUFFS.softLayers;
		for (let i = 0; i < FRAME_BACK_PUFFS.count; i++) {
			// deterministic per-puff jitter so the ring is organic, not mechanical
			const jitter = Math.sin(i * 12.9898) * 0.5;
			const u = (i + 0.5 + jitter * 0.4) / FRAME_BACK_PUFFS.count;
			const p = perimeterPoint(rx, ry, rw, rh, u);
			const breathe = 0.78 + 0.24 * Math.sin(clock * 1.4 + i * 1.7) + jitter * 0.14;
			const puffR = baseR * breathe;
			// lerp each puff's hue red → purple around the ring
			const color = mixColor(
				FRAME_BACK_PUFFS.colorA,
				FRAME_BACK_PUFFS.colorB,
				FRAME_BACK_PUFFS.count > 1 ? i / (FRAME_BACK_PUFFS.count - 1) : 0,
			);
			for (let s = 1; s <= L; s++) {
				const f = s / L;
				g.circle(p.x, p.y, puffR * f).fill({
					color,
					// heavy taper: the outermost ring is near-zero alpha → no visible circle edge
					alpha: (FRAME_BACK_PUFFS.glow / FRAME_BACK_PUFFS.count) * Math.pow(1 - (s - 1) / L, 1.6),
				});
			}
		}
	};

	const drawGlint = (g: import('pixi.js').Graphics) => {
		g.moveTo(-13, 0).lineTo(13, 0).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
		g.moveTo(0, -8).lineTo(0, 8).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
		g.circle(0, 0, 3).fill({ color: effectColor, alpha: 1 });
	};

	const drawDebugGrid = (g: import('pixi.js').Graphics, layout: ReelFrameLayout) => {
		const border = getBorderPlacement(layout);

		g.rect(border.x, border.y, border.width, border.height).stroke({
			color: 0xffd36a,
			width: 2,
			alpha: 0.75,
		});
		g.rect(layout.gridX, layout.gridY, layout.gridWidth, layout.gridHeight).stroke({
			color: 0xff00ff,
			width: 3,
			alpha: 0.9,
		});

		const cellWidth = layout.gridWidth / layout.columns;
		const cellHeight = layout.gridHeight / layout.rows;

		for (let c = 1; c < layout.columns; c++) {
			const x = layout.gridX + c * cellWidth;
			g.moveTo(x, layout.gridY).lineTo(x, layout.gridY + layout.gridHeight);
		}

		for (let r = 1; r < layout.rows; r++) {
			const y = layout.gridY + r * cellHeight;
			g.moveTo(layout.gridX, y).lineTo(layout.gridX + layout.gridWidth, y);
		}

		g.stroke({
			color: 0x00ffff,
			width: 1,
			alpha: 0.65,
		});
	};
</script>

{#each frameVariants as variant}
	{@const transform = getFrameTransform(variant.layout)}
	<Container
		x={transform.x}
		y={transform.y}
		pivot={transform.pivot}
		scale={transform.scale}
		alpha={variant.alpha}
	>
		{#if layer === 'background'}
			<!-- Eye backglow: soft purple puffs behind the frame when an Eye lands (before the
			     panel, so the frame reads as back-lit; only the part past the frame edges peeks) -->
			{#if eyeEnergy > 0}
				<Graphics
					draw={(g) => drawFrameBackPuffs(g, variant.layout)}
					alpha={eyeEnergy}
					blendMode="add"
				/>
			{/if}
			<Sprite
				key={LAYER_KEYS.background}
				x={variant.layout.gridX - BACKGROUND_BLEED}
				y={variant.layout.gridY - BACKGROUND_BLEED}
				width={variant.layout.gridWidth + BACKGROUND_BLEED * 2}
				height={variant.layout.gridHeight + BACKGROUND_BLEED * 2}
			/>
		{:else}
			<Container>
				<Graphics draw={(g) => drawEffectMask(g, variant.layout)} isMask />
				<Graphics
					draw={(g) => drawBottomAura(g, variant.layout)}
					alpha={bottomAuraEnergy}
					blendMode="add"
				/>
				<Graphics
					x={getGlintX(variant.layout)}
					y={variant.layout.gridY + 12}
					draw={(g) => drawGlint(g)}
					alpha={0.08 + effectEnergy * 0.72 + (boosted ? 0.16 : 0)}
					blendMode="add"
				/>
			</Container>
			{#each Array.from({ length: variant.layout.columns - 1 }) as _, index}
				{@const separator = getSeparatorPlacement(variant.layout, index)}
				<Sprite
					key={LAYER_KEYS.separator}
					x={separator.x}
					y={separator.y}
					width={separator.width}
					height={separator.height}
				/>
			{/each}
			{@const border = getBorderPlacement(variant.layout)}
			<Sprite
				key={LAYER_KEYS.border}
				x={border.x}
				y={border.y}
				width={border.width}
				height={border.height}
				tint={borderTint}
			/>
			{#if heatAlpha > 0}
				<!-- gaze heat: additive bloom of the border itself, tinted by the charge ramp -->
				<Sprite
					key={LAYER_KEYS.border}
					x={border.x}
					y={border.y}
					width={border.width}
					height={border.height}
					tint={heatColor}
					alpha={heatAlpha}
					blendMode="add"
				/>
			{/if}
			{#if props.debug}
				<Graphics draw={(g) => drawDebugGrid(g, variant.layout)} />
			{/if}
		{/if}
	</Container>
{/each}
