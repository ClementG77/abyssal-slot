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
	let boosted = $state(false);
	let launchStartedAt = $state(-1);
	let reelStopStartedAt = $state(-1);
	let scatterStartedAt = $state(-1);
	let eyeStartedAt = $state(-1);
	let scatterAnticipationStartedAt = $state(-1);
	let scatterAnticipationReleasedAt = $state(-1);
	let scatterAnticipationReleaseFrom = $state(0);
	const t = $derived(now / 1000);

	onMount(() => {
		let raf = 0;
		const loop = (timestamp: number) => {
			now = timestamp;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});

	context.eventEmitter.subscribeOnMount({
		reelFrameGlowShow: () => (boosted = true),
		reelFrameGlowHide: () => (boosted = false),
		reelFrameSpinLaunch: () => (launchStartedAt = performance.now()),
		reelFrameReelStop: () => (reelStopStartedAt = performance.now()),
		reelFrameScatterLand: () => (scatterStartedAt = performance.now()),
		reelFrameEyeLand: () => (eyeStartedAt = performance.now()),
		reelFrameScatterAnticipationStart: () => {
			scatterAnticipationStartedAt = performance.now();
			scatterAnticipationReleasedAt = -1;
		},
		reelFrameScatterAnticipationEnd: () => {
			scatterAnticipationReleaseFrom = scatterAnticipationProgress;
			scatterAnticipationReleasedAt = performance.now();
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
	$effect(() => {
		heat.set(Math.min(context.stateGame.gazeCharge / FRAME_HEAT.fullCharge, 1));
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
	const eyeColorPopEnergy = $derived(getBurstEnergy(eyeStartedAt, 0.18));
	const specialEnergy = $derived(Math.max(scatterEnergy, eyeEnergy));
	const effectEnergy = $derived(Math.max(launchEnergy, specialEnergy));
	const effectColor = $derived(
		eyeEnergy > scatterEnergy ? 0xd866ff : scatterEnergy > 0 ? 0x4cecff : frame.glowColor,
	);
	const borderTint = $derived(mixColor(0xffffff, 0xd866ff, eyeColorPopEnergy));
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

	const drawBottomSurge = (g: import('pixi.js').Graphics, layout: ReelFrameLayout) => {
		const bottom = layout.gridY + layout.gridHeight;
		const cellWidth = layout.gridWidth / layout.columns;

		for (let index = 0; index < layout.columns; index++) {
			const x = layout.gridX + cellWidth * (index + 0.5);
			const height = 26 + ((index * 11) % 18);
			const y = bottom + 10;
			g.ellipse(x, y, cellWidth * 0.46, height).fill({ color: effectColor, alpha: 0.28 });
			g.ellipse(x + cellWidth * 0.1, y - height * 0.22, cellWidth * 0.24, height * 0.62).fill({
				color: 0xffffff,
				alpha: 0.2,
			});
			g.roundRect(x - cellWidth * 0.32, bottom - 9, cellWidth * 0.64, 8, 4).fill({
				color: effectColor,
				alpha: 0.7,
			});
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
					draw={(g) => drawBottomSurge(g, variant.layout)}
					alpha={effectEnergy}
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
