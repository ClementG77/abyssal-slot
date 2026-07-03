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
	import { onDestroy } from 'svelte';
	import gsap from 'gsap';
	import { FillGradient } from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import {
		BOARD_SIZES,
		GAZE_METER_IMAGE_SIZE,
		GAZE_METER_LAYOUT,
		GAZE_METER_MAX_CHARGE,
		GAZE_METER_MULTIPLIER_COLOR,
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
	let sourcePositions = $state<Position[]>([]);
	let eyeCell = $state({ reel: 3, row: 3 });
	let flying = $state(false);
	let fx = $state({
		burst: 0,
		textScale: 1,
		overcharge: 0,
	});
	const animations = new Set<gsap.core.Animation>();

	const fill = new Tween(0, { duration: 520, easing: cubicOut });
	const energy = new Tween(0, { duration: 260 });
	const toEye = new Tween(0, { duration: 1 });

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
			sourcePositions = [];
			flying = false;
			gsap.killTweensOf(fx);
			resetFx();
			fill.set(0, { duration: 0 });
			energy.set(0, { duration: 0 });
			toEye.set(0, { duration: 0 });
		},
		gazeMeterFill: async (emitterEvent) => {
			show = true;
			sourcePositions = emitterEvent.fromPositions;
			context.eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBetDerived.isContinuousBet(),
			});
			energy.set(1, { duration: 0 });
			await setCharge(emitterEvent.charge);
			playChargeFx(emitterEvent.charge > GAZE_METER_MAX_CHARGE);
			await energy.set(0);
		},
		eyeShow: (e) => (eyeCell = { reel: e.reel, row: e.row }),
		gazeMeterToEye: async () => {
			if (charge <= 0) return;
			flying = true;
			toEye.set(0, { duration: 0 });
			await toEye.set(1, { duration: 540, easing: cubicOut });
			await fill.set(0, { duration: 300 });
			flying = false;
			toEye.set(0, { duration: 0 });
		},
		gazeMeterDrain: async () => {
			await fill.set(0, { duration: 420 });
			await waitForResolve((resolve) => setTimeout(resolve, 120));
			charge = 0;
			sourcePositions = [];
		},
	});

	const drawEnergyIn = (g: import('pixi.js').Graphics) => {
		if (energy.current <= 0) return;
		const alpha = energy.current * 0.5;
		for (const source of sourcePositions.slice(0, 18)) {
			const sx = getPositionX(source.reel);
			const sy = getPositionY(source.row);
			const midX = sx + (meterEnergyX - sx) * 0.6;
			const midY = sy + (meterEnergyY - sy) * 0.45 - SYMBOL_SIZE * 0.35;
			g.moveTo(sx, sy).quadraticCurveTo(midX, midY, meterEnergyX, meterEnergyY).stroke({
				width: 2.4,
				color: GAZE_COLORS.energy,
				alpha,
			});
		}
	};

	const drawEnergyOut = (g: import('pixi.js').Graphics) => {
		if (!flying) return;
		const t = toEye.current;
		const ex = getPositionX(eyeCell.reel);
		const ey = getPositionY(eyeCell.row);
		const headX = meterEnergyX + (ex - meterEnergyX) * t;
		const headY =
			meterEnergyY + (ey - meterEnergyY) * t - Math.sin(t * Math.PI) * SYMBOL_SIZE * 0.6;
		g.moveTo(meterEnergyX, meterEnergyY)
			.quadraticCurveTo(
				(meterEnergyX + ex) / 2,
				Math.min(meterEnergyY, ey) - SYMBOL_SIZE * 0.6,
				headX,
				headY,
			)
			.stroke({ width: 3, color: GAZE_COLORS.rim, alpha: 0.5 * (1 - t * 0.4) });
	};

	const flyT = $derived(toEye.current);
	const flyX = $derived(meterEnergyX + (getPositionX(eyeCell.reel) - meterEnergyX) * flyT);
	const flyY = $derived(
		meterEnergyY +
			(getPositionY(eyeCell.row) - meterEnergyY) * flyT -
			Math.sin(flyT * Math.PI) * SYMBOL_SIZE * 0.6,
	);
	const flyAlpha = $derived(flyT < 0.82 ? 1 : Math.max(0, 1 - (flyT - 0.82) / 0.18));

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
		const edgeW = 3 * nativeScale;
		const edgeInset = 2 * nativeScale;
		const bubbleR = Math.max(1.4, 2.6 * nativeScale);
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

		g.rect(
			segment.x - edgeInset,
			fillY - edgeInset,
			segment.w + edgeInset * 2,
			fillH + edgeInset * 2,
		).fill({
			color: GAZE_COLORS.fillGlow,
			alpha: 0.16 + fx.overcharge * 0.16,
		});
		g.rect(segment.x, fillY, segment.w, fillH).fill(progressGradient);
		g.rect(segment.x, fillY, segment.w, fillH).fill({ fill: fadeGradient, alpha: 0.16 });
		g.rect(segment.x + segment.w * 0.36, fillY + inset, segment.w * 0.34, innerH).fill({
			color: GAZE_COLORS.fillTop,
			alpha: 0.12,
		});
		g.rect(segment.x + inset, fillY + inset, shineW, innerH).fill({
			color: GAZE_COLORS.edge,
			alpha: 0.28,
		});
		if (fillH > edgeW) {
			g.rect(
				segment.x + edgeInset,
				fillY + edgeInset,
				segment.w - edgeInset * 2,
				edgeW * 1.35,
			).fill({
				color: GAZE_COLORS.fillTop,
				alpha: 0.58,
			});
		}
		if (fillH > segment.w * 1.4) {
			g.circle(segment.x + segment.w * 0.66, fillY + fillH * 0.26, bubbleR).fill({
				color: GAZE_COLORS.fillTop,
				alpha: 0.24,
			});
			g.circle(segment.x + segment.w * 0.38, fillY + fillH * 0.58, bubbleR * 0.72).fill({
				color: GAZE_COLORS.edge,
				alpha: 0.18,
			});
			g.circle(segment.x + segment.w * 0.6, fillY + fillH * 0.78, bubbleR * 0.5).fill({
				color: GAZE_COLORS.fillTop,
				alpha: 0.16,
			});
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
		<Graphics draw={drawEnergyIn} />
		<Graphics draw={drawEnergyOut} />

		<Container x={position.x} y={position.y} rotation={meterRotation} alpha={flying ? 0 : 1}>
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
					<Text
						anchor={0.5}
						text={String(charge)}
						style={{
							fontFamily: 'Georgia, "Times New Roman", serif',
							fontWeight: '700',
							fontSize: plaqueR * 1.34,
							fill: 0xfff3d4,
							align: 'center',
							stroke: {
								color: 0x2a0e4a,
								width: Math.max(2, 4 * nativeScale),
								join: 'round',
							},
							dropShadow: {
								color: 0x000000,
								alpha: 0.45,
								blur: 3 * nativeScale,
								distance: nativeScale,
								angle: Math.PI / 2,
							},
						}}
					/>
				</Container>
			{/if}
		</Container>

		{#if flying}
			<Text
				x={flyX}
				y={flyY}
				anchor={0.5}
				alpha={flyAlpha}
				text={`x${charge}`}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '900',
					fontSize: SYMBOL_SIZE * 0.34,
					fill: GAZE_METER_MULTIPLIER_COLOR,
					stroke: { color: 0x2a0d4f, width: 5 },
					dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 },
				}}
			/>
		{/if}
	</BoardContainer>
</FadeContainer>
