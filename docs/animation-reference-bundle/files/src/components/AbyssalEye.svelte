<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { CanvasTextMetrics, TextStyle, type TextStyleOptions } from 'pixi.js';

	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';

	import {
		EYE_FRAME,
		EYE_ASPECT,
		EYE_LABEL_OFFSET,
		EYE_VALUE_FILL,
		eyeValueTextStyle,
		type EyeVariant,
	} from '../game/constants';

	export type EyeColorPreset = 'add' | 'mult' | 'close' | 'charged' | 'warning' | 'idle';
	export type { EyeVariant };

	export const EYE_COLORS: Record<EyeColorPreset, number> = {
		add: 0x22dfff,
		mult: 0xff2a1a,
		close: 0x3fa8ff,
		charged: 0x9a35ff,
		warning: 0xffaa22,
		idle: 0x3fa8ff,
	};

	type Props = {
		/** Eye height in board pixels. The baked art keeps its native 393:415 aspect ratio. */
		size: number;
		variant?: EyeVariant;
		preset?: EyeColorPreset;
		text?: string;
		textStyle?: TextStyleOptions;
		textY?: number;
		/** Play the board-impact drop and short shake. */
		land?: boolean;
		/** Reveal the assigned multiplier with a glow-and-scale pop. */
		reveal?: boolean;
		pulse?: boolean;
		burst?: boolean;
		idle?: boolean;
		showCore?: boolean;
		/** 0..1 tension level (e.g. the Gaze charge): brightens the glow + tightens the eye. */
		intensity?: number;
	};

	const props: Props = $props();

	const width = $derived(props.size * EYE_ASPECT);
	const height = $derived(props.size);
	const variant = $derived<EyeVariant>(
		props.variant ??
			(props.preset === 'mult' ? 'mult' : props.preset === 'close' ? 'close' : 'add'),
	);
	const frame = $derived(EYE_FRAME[variant]);
	const effectColor = $derived(EYE_COLORS[props.preset ?? variant]);
	// Sit the number on the iris (above the geometric centre), unless a caller overrides textY.
	const labelX = $derived(width * EYE_LABEL_OFFSET.x);
	const labelY = $derived(props.textY ?? height * EYE_LABEL_OFFSET.y);
	const isMultiplierEye = $derived(variant === 'mult');
	const intensity = $derived(Math.min(Math.max(props.intensity ?? 0, 0), 1));
	const labelStyle = $derived<TextStyleOptions>(
		props.textStyle ??
			eyeValueTextStyle({
				fontSize: props.size * 0.5,
				fill: isMultiplierEye ? EYE_VALUE_FILL.mul : EYE_VALUE_FILL.add,
			}),
	);
	const maxLabelWidth = $derived(width * 0.72);
	const labelFitScale = $derived.by(() => {
		if (!props.text) return 1;
		const measured = CanvasTextMetrics.measureText(props.text, new TextStyle(labelStyle));
		return Math.min(1, maxLabelWidth / Math.max(measured.width, 1));
	});

	const idleFx = $state({ alpha: 1 });
	const pulseFx = $state({ scale: 1, textScale: 1, flashAlpha: 0 });
	const burstFx = $state({ alpha: 0, scale: 0.55, glow: 0 });
	const landingFx = $state({ x: 0, y: 0, scale: 1, rotation: 0 });
	const revealFx = $state({ baseAlpha: 1, textAlpha: 1, textScale: 1, glow: 0 });
	const glowFx = $state({ scale: 1, alpha: 0.55 });
	// The eye is the only light source down here: an additive bloom halo + additive tinted layers.
	const haloFx = $state({ scaleBoost: 0, boost: 0 });
	// Idle "alive" motion — a slow look-around sway. The baked art is one sprite, so the sway
	// stands in for a drifting pupil.
	const swayFx = $state({ x: 0, y: 0, rotation: 0 });
	// Burst eruption — radial energy motes flung outward plus an expanding shockwave ring.
	const particleFx = $state({ progress: 0 });
	const shockFx = $state({ scale: 0.25, alpha: 0 });
	let burstParticles = $state<{ angle: number; speed: number; size: number }[]>([]);

	let glowPulse = $state(0);

	const rootScale = $derived(landingFx.scale * pulseFx.scale * (1 + intensity * 0.04));
	const labelScale = $derived(labelFitScale * revealFx.textScale * pulseFx.textScale);
	const haloScale = $derived(1 + intensity * 0.1 + haloFx.scaleBoost + burstFx.glow * 0.04);
	// All "light" lives in the additive halo (no GlowFilter — filters render to nothing inside the
	// board mask). Idle shimmer, tension, and the reveal/burst spikes all feed its brightness.
	const haloAlpha = $derived(
		Math.min(
			0.6,
			0.03 +
				glowPulse * 0.03 +
				intensity * 0.22 +
				haloFx.boost * 0.6 +
				revealFx.glow * 0.05 +
				burstFx.glow * 0.04,
		),
	);

	let landWasActive = false;
	let revealWasActive = false;
	let pulseWasActive = false;
	let burstWasActive = false;

	$effect(() => {
		if (!props.land) {
			landWasActive = false;
			return;
		}
		if (landWasActive) return;
		landWasActive = true;

		const shake = props.size * 0.045;
		const timeline = gsap
			.timeline()
			.set(landingFx, { x: 0, y: -props.size * 0.26, scale: 0.78, rotation: 0.06 })
			.to(landingFx, {
				y: props.size * 0.045,
				scale: 1.14,
				rotation: -0.05,
				duration: 0.14,
				ease: 'power3.in',
			})
			.to(landingFx, { x: -shake, y: -props.size * 0.025, rotation: 0.035, duration: 0.045 })
			.to(landingFx, { x: shake, y: props.size * 0.014, rotation: -0.025, duration: 0.05 })
			.to(landingFx, {
				x: 0,
				y: 0,
				scale: 1,
				rotation: 0,
				duration: 0.16,
				ease: 'back.out(2)',
			});

		return () => timeline.kill();
	});

	$effect(() => {
		if (!props.reveal) {
			revealWasActive = false;
			return;
		}
		if (revealWasActive) return;
		revealWasActive = true;

		// The multiplier Eye is the rare hero: it reveals bigger, slower and brighter than an adder.
		const mult = isMultiplierEye;
		const timeline = gsap
			.timeline()
			.set(revealFx, { baseAlpha: 0, textAlpha: 0, textScale: 0.35, glow: 0 })
			.set(glowFx, { scale: 0.72, alpha: 0.18 })
			.set(haloFx, { boost: 0, scaleBoost: 0 })
			.to(revealFx, { baseAlpha: 1, duration: 0.15, ease: 'power2.out' })
			.to(glowFx, { scale: mult ? 1.4 : 1.2, alpha: 0.95, duration: 0.18, ease: 'sine.out' }, '<')
			.to(
				haloFx,
				{
					boost: mult ? 0.6 : 0.38,
					scaleBoost: mult ? 0.6 : 0.35,
					duration: 0.2,
					ease: 'sine.out',
				},
				'<',
			)
			.to(revealFx, { glow: mult ? 4 : 2.4, duration: 0.18, ease: 'sine.out' }, '<')
			.to(revealFx, { textAlpha: 1, duration: 0.12, ease: 'power1.out' }, '<+0.05')
			.to(revealFx, { textScale: 1, duration: mult ? 0.4 : 0.28, ease: 'back.out(2.5)' }, '<')
			.to(glowFx, { scale: 1, alpha: 0.55, duration: 0.3, ease: 'sine.inOut' }, '<')
			.to(haloFx, { boost: 0, scaleBoost: 0, duration: mult ? 0.5 : 0.34, ease: 'sine.inOut' }, '<')
			.to(revealFx, { glow: 0, duration: mult ? 0.5 : 0.34, ease: 'sine.inOut' }, '<');

		return () => timeline.kill();
	});

	$effect(() => {
		if (!props.pulse) {
			pulseWasActive = false;
			return;
		}
		if (pulseWasActive) return;
		pulseWasActive = true;

		const timeline = gsap
			.timeline()
			.set(pulseFx, { scale: 0.94, textScale: 0.56, flashAlpha: 0 })
			.to(pulseFx, {
				scale: 1.1,
				textScale: 1.22,
				flashAlpha: 0.55,
				duration: 0.18,
				ease: 'back.out(2.6)',
			})
			.to(pulseFx, {
				scale: 1,
				textScale: 1,
				flashAlpha: 0,
				duration: 0.28,
				ease: 'power2.out',
			});

		return () => timeline.kill();
	});

	$effect(() => {
		if (!props.burst) {
			burstWasActive = false;
			return;
		}
		if (burstWasActive) return;
		burstWasActive = true;

		// Eruption: the Eye flares, throws a ring of energy motes and a shockwave. MULT is louder.
		const mult = isMultiplierEye;
		const count = mult ? 22 : 14;
		burstParticles = Array.from({ length: count }, (_, i) => ({
			angle: (i / count) * Math.PI * 2 + Math.random() * 0.35,
			speed: 0.65 + Math.random() * 0.7,
			size: props.size * (0.035 + Math.random() * 0.05),
		}));

		const timeline = gsap
			.timeline()
			.set(burstFx, { alpha: 0, scale: 0.55, glow: 0 })
			.set(particleFx, { progress: 0 })
			.set(shockFx, { scale: 0.25, alpha: 0 })
			.to(burstFx, { alpha: 0.92, glow: mult ? 6 : 3.5, duration: 0.08, ease: 'power1.out' })
			.to(
				burstFx,
				{ scale: mult ? 1.8 : 1.5, duration: mult ? 0.46 : 0.38, ease: 'power3.out' },
				'<',
			)
			.to(shockFx, { scale: mult ? 2.4 : 1.9, alpha: 0.7, duration: 0.12, ease: 'power2.out' }, '<')
			.to(particleFx, { progress: 1, duration: mult ? 0.62 : 0.5, ease: 'power2.out' }, '<')
			.to(burstFx, { glow: 0, duration: 0.3, ease: 'sine.out' }, '<+0.1')
			.to(shockFx, { alpha: 0, duration: 0.3, ease: 'power2.out' }, '<')
			.to(burstFx, { alpha: 0, duration: 0.3, ease: 'power2.out' }, '-=0.18');

		return () => timeline.kill();
	});

	onMount(() => {
		const running = props.idle !== false;

		const idle = gsap.to(idleFx, {
			alpha: 0.84,
			duration: 1.25,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut',
			paused: !running,
		});

		// Glow shimmer — the halo breathes so the eye never reads as a frozen sprite.
		const shimState = { v: 0 };
		const shimmer = gsap.to(shimState, {
			v: 1,
			duration: 1.45,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut',
			paused: !running,
			onUpdate: () => (glowPulse = shimState.v),
		});

		// Sway — the eye slowly looks around (stands in for a drifting pupil on the static art).
		let swayTl: gsap.core.Timeline | undefined;
		const scheduleSway = () => {
			swayTl = gsap.timeline({ onComplete: scheduleSway }).to(swayFx, {
				x: (Math.random() - 0.5) * props.size * 0.05,
				y: (Math.random() - 0.5) * props.size * 0.04,
				rotation: (Math.random() - 0.5) * 0.04,
				duration: 1.3 + Math.random() * 1.6,
				ease: 'sine.inOut',
			});
		};

		if (running) {
			scheduleSway();
		}

		return () => {
			idle.kill();
			shimmer.kill();
			swayTl?.kill();
			gsap.killTweensOf(landingFx);
			gsap.killTweensOf(revealFx);
			gsap.killTweensOf(glowFx);
			gsap.killTweensOf(haloFx);
			gsap.killTweensOf(pulseFx);
			gsap.killTweensOf(burstFx);
			gsap.killTweensOf(swayFx);
			gsap.killTweensOf(particleFx);
			gsap.killTweensOf(shockFx);
		};
	});

	// Radial bloom halo: stacked additive rings (bright core fading out at the rim). Drawn once;
	// only the Container's scale/alpha animate, so there is no per-frame geometry rebuild.
	const drawHalo = (g: import('pixi.js').Graphics) => {
		const r = width * 0.68;
		const steps = 5;
		for (let i = steps; i >= 1; i--) {
			const t = i / steps; // 1 = outer rim … 0.2 = core
			g.circle(0, 0, r * t).fill({ color: effectColor, alpha: 0.1 * (1 - t) + 0.03 });
		}
	};

	// Expanding shockwave ring — drawn once, animated via its Container transform.
	const drawShock = (g: import('pixi.js').Graphics) => {
		g.circle(0, 0, props.size * 0.5).stroke({
			width: Math.max(3, props.size * 0.04),
			color: effectColor,
			alpha: 1,
		});
	};

	// Energy motes flung outward during the burst (transient redraw, like the Gaze beams).
	const drawParticles = (g: import('pixi.js').Graphics) => {
		const p = particleFx.progress;
		if (p <= 0 || p >= 1) return;
		for (const part of burstParticles) {
			const dist = part.speed * props.size * 1.5 * p;
			g.circle(
				Math.cos(part.angle) * dist,
				Math.sin(part.angle) * dist,
				part.size * (1 - p * 0.6),
			).fill({ color: effectColor, alpha: 1 - p });
		}
	};
</script>

<!-- The resolved Eye is one layered Pixi container: additive bloom halo, atlas base + additive
     tinted layers, burst eruption and the centered number. -->
<Container
	x={landingFx.x + swayFx.x}
	y={landingFx.y + swayFx.y}
	rotation={landingFx.rotation + swayFx.rotation}
	scale={rootScale}
>
	<!-- Volumetric halo: real light that spreads beyond the eye silhouette. -->
	<Container scale={haloScale} alpha={haloAlpha} blendMode="add">
		<Graphics draw={drawHalo} />
	</Container>

	{#if props.showCore !== false}
		<!-- Core eye layers. -->
		<Container>
			<!-- The glow deliberately reuses the EYE_FRAME atlas art: there is no separate glow texture.
			     `scale` is baked into width/height — a `scale` prop alongside width/height would be
			     applied last and override the sizing (rendering at native texture size). -->
			<Sprite
				key={frame}
				anchor={0.5}
				width={width * glowFx.scale}
				height={height * glowFx.scale}
				alpha={idleFx.alpha * glowFx.alpha}
				tint={effectColor}
				blendMode="add"
			/>
			<Sprite key={frame} anchor={0.5} {width} {height} alpha={idleFx.alpha * revealFx.baseAlpha} />
			<Sprite
				key={frame}
				anchor={0.5}
				{width}
				{height}
				alpha={pulseFx.flashAlpha}
				tint={effectColor}
				blendMode="add"
			/>
		</Container>
	{/if}

	<!-- Resolve FX works on its own too, so the board-level overlay can avoid duplicating the core.
	     `scale` is baked into width/height (see note above). -->
	<Sprite
		key={frame}
		anchor={0.5}
		width={width * burstFx.scale}
		height={height * burstFx.scale}
		alpha={burstFx.alpha}
		tint={effectColor}
		blendMode="add"
	/>
	<Container scale={shockFx.scale} alpha={shockFx.alpha} blendMode="add">
		<Graphics draw={drawShock} />
	</Container>
	<Container blendMode="add">
		<Graphics draw={drawParticles} />
	</Container>

	{#if props.text}
		<Text
			anchor={0.5}
			x={labelX}
			y={labelY}
			text={props.text}
			alpha={revealFx.textAlpha}
			scale={labelScale}
			style={labelStyle}
		/>
	{/if}
</Container>
