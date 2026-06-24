<script lang="ts" module>
	import type { Position } from '../game/types';

	export type EmitterEventGazeMeter =
		| { type: 'gazeMeterShow' }
		| { type: 'gazeMeterHide' }
		| { type: 'gazeMeterReset' }
		// the connection's energy flows into the meter; `charge` is the new running total
		| { type: 'gazeMeterFill'; fromPositions: Position[]; charge: number }
		// the Eye connects: the meter empties its energy into the Eye cell
		| { type: 'gazeMeterToEye' }
		// near-miss: a winning spin resolved with no Eye → the charge is discarded
		| { type: 'gazeMeterDrain' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
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
		GAZE_METER_LAYOUT,
		GAZE_METER_MAX_CHARGE,
		GAZE_METER_MULTIPLIER_COLOR,
		getGazeMeterDisplayWidth,
		SYMBOL_SIZE,
	} from '../game/constants';
	import { getPositionX, getPositionY } from '../game/utils';

	const context = getContext();

	let show = $state(false);
	let charge = $state(0);
	let sourcePositions = $state<Position[]>([]);
	let eyeCell = $state({ reel: 3, row: 3 });
	let flying = $state(false);
	let eyeIdle = $state({ alpha: 0.92 });
	let fx = $state({
		eyeScale: 1,
		burst: 0,
		burstScale: 0.9,
		particle: 0,
		textScale: 1,
		overcharge: 0,
	});
	const animations = new Set<gsap.core.Animation>();

	const fill = new Tween(0, { duration: 320 });
	const energy = new Tween(0, { duration: 260 }); // board → meter on fill
	const toEye = new Tween(0, { duration: 1 }); // meter → eye on connect
	const skinAlpha = new Tween(1, { duration: 500 });
	let previousSkinFrame: string | undefined;

	const isMobile = $derived(context.stateLayoutDerived.layoutType() === 'portrait');
	const gazeSkin = $derived(
		context.stateGame.gameType === 'freegame'
			? {
					frame: 'gaze_meter_fs_frame_empty',
					eye: 'gaze_meter_fs_eye_top',
					glow: 'gaze_meter_fs_glow_soft',
					particle: 'gaze_meter_fs_particle_burst',
					liquidTop: 0xff6973,
					liquidMid: 0xb31f2d,
					liquidBottom: 0x38050a,
					chamber: 0x310509,
					meniscus: 0xffc3c9,
					bubble: 0xffccd0,
					energy: 0xd93646,
					rim: 0xffa2aa,
				}
			: {
					frame: 'gaze_meter_frame_empty',
					eye: 'gaze_meter_eye_top',
					glow: 'gaze_meter_glow_soft',
					particle: 'gaze_meter_particle_burst',
					liquidTop: 0x4fc4df,
					liquidMid: 0x237ca9,
					liquidBottom: 0x082946,
					chamber: 0x051d34,
					meniscus: 0xaeeeff,
					bubble: 0xa4e8f9,
					energy: 0x1677a8,
					rim: 0x3da7d8,
				},
	);

	$effect(() => {
		const nextFrame = gazeSkin.frame;
		if (previousSkinFrame && previousSkinFrame !== nextFrame) {
			skinAlpha.set(0, { duration: 0 });
			skinAlpha.set(1);
		}
		previousSkinFrame = nextFrame;
	});
	const gazeH = $derived(BOARD_SIZES.height * (isMobile ? 0.43 : 0.78));
	const gazeW = $derived(getGazeMeterDisplayWidth(gazeH));
	const position = $derived({
		x: isMobile ? -gazeW * 0.1 : -gazeW - SYMBOL_SIZE * 0.5,
		// Portrait HUD sits entirely above the reel bounds, with a small scaled gap.
		y: isMobile
			? -gazeH - SYMBOL_SIZE * 0.16
			: (BOARD_SIZES.height - gazeH) / 2 - SYMBOL_SIZE * 1.3,
	});

	// Gaze chamber geometry in local meter space. All ten segments share this one mask.
	const tubeX = $derived(gazeW * GAZE_METER_LAYOUT.inner.left);
	const tubeW = $derived(gazeW * (GAZE_METER_LAYOUT.inner.right - GAZE_METER_LAYOUT.inner.left));
	const tubeTop = $derived(gazeH * GAZE_METER_LAYOUT.inner.top);
	const tubeH = $derived(gazeH * (GAZE_METER_LAYOUT.inner.bottom - GAZE_METER_LAYOUT.inner.top));
	const tubeRadius = $derived(tubeW * GAZE_METER_LAYOUT.inner.radius);
	const segmentH = $derived(tubeH / GAZE_METER_MAX_CHARGE);
	const eyeX = $derived(gazeW * GAZE_METER_LAYOUT.eye.x);
	const eyeY = $derived(gazeH * GAZE_METER_LAYOUT.eye.y);
	// All FX slices were exported on an untrimmed 481×1061 canvas. Offset their canvas so
	// the visible artwork sits at the Eye's intended top-of-meter position.
	const eyeArtworkOffsetY = $derived(eyeY - gazeH * 0.5);
	const meterEnergyX = $derived(position.x + eyeX);
	const meterEnergyY = $derived(position.y + eyeY);
	// The plaque only has meaning while a Gaze charge is waiting to resolve. During the
	// transfer, the separate flying value owns the presentation instead.
	const showMultiplier = $derived(charge > 0 && !flying);
	const segmentFill = $derived(
		Array.from({ length: GAZE_METER_MAX_CHARGE }, (_, index) =>
			Math.min(Math.max(fill.current * GAZE_METER_MAX_CHARGE - index, 0), 1),
		),
	);

	const track = <T extends gsap.core.Animation>(animation: T) => {
		animations.add(animation);
		animation.eventCallback('onComplete', () => animations.delete(animation));
		return animation;
	};

	const playChargeFx = (overcharged = false) => {
		gsap.killTweensOf(fx);
		const timeline = gsap.timeline();
		track(timeline);
		timeline
			.set(fx, { eyeScale: 1, burst: 0, burstScale: 0.86, particle: 0, textScale: 0.9 })
			.to(fx, {
				eyeScale: overcharged ? 1.16 : 1.1,
				burst: 0.92,
				burstScale: 1.08,
				particle: 1,
				textScale: 1.12,
				duration: 0.14,
				ease: 'power2.out',
			})
			.to(fx, {
				eyeScale: 1,
				burst: 0,
				burstScale: overcharged ? 1.55 : 1.35,
				particle: 0,
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

	onMount(() => {
		track(
			gsap.to(eyeIdle, {
				alpha: 0.72,
				duration: 1.6,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut',
			}),
		);

		return () => {
			animations.forEach((animation) => animation.kill());
			animations.clear();
			gsap.killTweensOf(fx);
			gsap.killTweensOf(eyeIdle);
		};
	});

	const setCharge = async (value: number) => {
		charge = value;
		// Charge keeps counting for the multiplier label, but the artwork's bar has ten segments.
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
			Object.assign(fx, {
				eyeScale: 1,
				burst: 0,
				burstScale: 0.9,
				particle: 0,
				textScale: 1,
				overcharge: 0,
			});
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
		// remember where the Eye is so the connect energy knows its target
		eyeShow: (e) => (eyeCell = { reel: e.reel, row: e.row }),
		// the Eye connects: launch the charge from the meter into the Eye, then drain the bar
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

	// board cells → meter on fill (energy rising into the gem)
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
				color: gazeSkin.energy,
				alpha,
			});
		}
	};

	// meter → Eye on connect (a beam following the flying charge)
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
			.stroke({ width: 3, color: gazeSkin.rim, alpha: 0.5 * (1 - t * 0.4) });
	};

	// the flying charge number (meter → Eye)
	const flyT = $derived(toEye.current);
	const flyX = $derived(meterEnergyX + (getPositionX(eyeCell.reel) - meterEnergyX) * flyT);
	const flyY = $derived(
		meterEnergyY +
			(getPositionY(eyeCell.row) - meterEnergyY) * flyT -
			Math.sin(flyT * Math.PI) * SYMBOL_SIZE * 0.6,
	);
	const flyAlpha = $derived(flyT < 0.82 ? 1 : Math.max(0, 1 - (flyT - 0.82) / 0.18));

	const drawTubeMask = (g: import('pixi.js').Graphics) => {
		g.roundRect(tubeX, tubeTop, tubeW, tubeH, tubeRadius).fill(0xffffff);
	};

	const drawSegment = (g: import('pixi.js').Graphics) => {
		const outerRadius = Math.min(10, segmentH * 0.18);
		const innerRadius = Math.min(7, segmentH * 0.12);
		const innerX = 8;
		const innerY = 5;
		const innerW = tubeW - innerX * 2;
		const innerH = segmentH - innerY * 2;
		const liquid = new FillGradient({
			textureSpace: 'local',
			start: { x: 0, y: 0 },
			end: { x: 0, y: 1 },
			colorStops: [
				{ offset: 0, color: gazeSkin.liquidTop },
				{ offset: 0.24, color: gazeSkin.liquidMid },
				{ offset: 1, color: gazeSkin.liquidBottom },
			],
		});

		// Each charge is its own small liquid chamber. Scaling this container from its
		// bottom makes the meniscus climb through one step instead of filling one long bar.
		g.roundRect(2, 2, tubeW - 4, segmentH - 4, outerRadius).fill({
			color: gazeSkin.chamber,
			alpha: 0.88,
		});
		g.roundRect(innerX, innerY, innerW, innerH, innerRadius).fill(liquid);
		g.roundRect(innerX + 3, innerY + 3, innerW - 6, Math.min(5, innerH * 0.22), innerRadius).fill({
			color: gazeSkin.meniscus,
			alpha: 0.58,
		});
		g.circle(innerX + innerW * 0.3, innerY + innerH * 0.64, Math.min(3, innerW * 0.055)).fill({
			color: gazeSkin.bubble,
			alpha: 0.24,
		});
		g.circle(innerX + innerW * 0.68, innerY + innerH * 0.38, Math.min(2, innerW * 0.04)).fill({
			color: gazeSkin.meniscus,
			alpha: 0.36,
		});
	};

	const drawFrontDividers = (g: import('pixi.js').Graphics) => {
		for (let index = 1; index < GAZE_METER_MAX_CHARGE; index++) {
			const y = tubeTop + index * segmentH;
			g.roundRect(tubeX + 5, y - 2, tubeW - 10, 4, 2).fill({ color: 0xffd56b, alpha: 0.78 });
			g.roundRect(tubeX + 10, y - 0.75, tubeW - 20, 1.5, 0.75).fill({
				color: 0xffffff,
				alpha: 0.62,
			});
		}
	};
</script>

<FadeContainer {show}>
	<BoardContainer>
		<Graphics draw={drawEnergyIn} />
		<Graphics draw={drawEnergyOut} />

		<Container x={position.x} y={position.y}>
			<Container alpha={skinAlpha.current}>
				{#key gazeSkin.frame}
					<!-- Static skin: frame back, then a masked dynamic fill, then the front dividers. -->
					<Sprite key={gazeSkin.frame} anchor={0} width={gazeW} height={gazeH} />
					<Container>
						<Graphics draw={drawTubeMask} isMask />
						{#each segmentFill as amount, index}
							<Container
								x={tubeX}
								y={tubeTop + tubeH - index * segmentH}
								pivot={{ x: 0, y: segmentH }}
								scale={{ x: 1, y: amount }}
								alpha={0.76 + fx.overcharge * 0.2}
								blendMode="add"
							>
								<Graphics draw={drawSegment} />
							</Container>
						{/each}
					</Container>
					<Graphics draw={drawFrontDividers} />

					<!-- The Eye, glow and burst are separate sprites so they can react independently. -->
					<Container
						x={eyeX}
						y={eyeY}
						pivot={{ x: eyeX, y: eyeY }}
						scale={fx.eyeScale}
						alpha={eyeIdle.alpha}
					>
						<Sprite key={gazeSkin.eye} x={0} y={eyeArtworkOffsetY} width={gazeW} height={gazeH} />
					</Container>
					<Container
						x={eyeX}
						y={eyeY}
						pivot={{ x: eyeX, y: eyeY }}
						scale={fx.burstScale}
						alpha={fx.burst}
						blendMode="add"
					>
						<Sprite key={gazeSkin.glow} x={0} y={eyeArtworkOffsetY} width={gazeW} height={gazeH} />
					</Container>
					<Container
						x={eyeX}
						y={eyeY}
						pivot={{ x: eyeX, y: eyeY }}
						scale={fx.burstScale}
						alpha={fx.particle}
						blendMode="add"
					>
						<Sprite
							key={gazeSkin.particle}
							x={0}
							y={eyeArtworkOffsetY}
							width={gazeW}
							height={gazeH}
						/>
					</Container>

					{#if showMultiplier}
						<Container
							x={gazeW * GAZE_METER_LAYOUT.plaque.x}
							y={gazeH * GAZE_METER_LAYOUT.plaque.y}
							scale={fx.textScale}
						>
							<Text
								y={-gazeH * 0.015}
								anchor={0.5}
								text={`${charge}x`}
								style={{
									fontFamily: 'Cinzel, Georgia, serif',
									fontWeight: '900',
									fontSize: gazeH * 0.08,
									fill: GAZE_METER_MULTIPLIER_COLOR,
									stroke: { color: 0x071a2d, width: gazeH * 0.005 },
									dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 },
								}}
							/>
						</Container>
					{/if}
				{/key}
			</Container>
		</Container>

		{#if flying}
			<Text
				x={flyX}
				y={flyY}
				anchor={0.5}
				alpha={flyAlpha}
				text={`×${charge}`}
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
