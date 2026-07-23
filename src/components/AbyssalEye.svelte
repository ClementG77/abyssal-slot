<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import gsap from 'gsap';
	import { CanvasTextMetrics, TextStyle, type TextStyleOptions } from 'pixi.js';

	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';

	import {
		EYE_FRAME,
		EYE_ASPECT,
		EYE_LABEL_OFFSET,
		EYE_LABEL_OFFSET_PLAQUE,
		EYE_VALUE_FILL,
		type EyeVariant,
	} from '../game/constants';
	import { eyeValueTextStyle } from '../game/textStyles';
	import { fireScreenLightning } from '../game/screenLightning.svelte'; // SCREEN LIGHTNING (revertible)

	export type EyeColorPreset = 'add' | 'mult' | 'close' | 'charged' | 'warning' | 'idle';
	export type { EyeVariant };

	export const EYE_COLORS: Record<EyeColorPreset, number> = {
		add: 0x22dfff,
		mult: 0xff2a1a,
		close: 0x9a6bff, // the dormant eye art is purple (EYE_PURPLE_CLOSE)
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
	// The art actually on screen. It LAGS the `variant` prop during the reveal card-flip: when
	// the prop moves off `close`, the closed purple face stays up until the flip is edge-on,
	// then the revealed art takes over and the flip springs open. Any other variant change
	// (e.g. the spent awaken EMPTY → ACTIVE) swaps instantly. Because the trigger is the prop
	// EDGE on this live instance, the flip never depends on mount timing.
	let displayVariant = $state<EyeVariant>(
		props.variant ??
			(props.preset === 'mult' ? 'mult' : props.preset === 'close' ? 'close' : 'add'),
	);
	const frame = $derived(EYE_FRAME[displayVariant]);
	// the spent (empty) variants share the tint of their charged counterparts
	const baseColorKey = (v: EyeVariant): EyeColorPreset =>
		v === 'addEmpty' ? 'add' : v === 'multEmpty' ? 'mult' : v;
	const effectColor = $derived(EYE_COLORS[props.preset ?? baseColorKey(displayVariant)]);
	// Value placement follows the art on screen: on the EMPTY (closed) eye the number sits big
	// in the MIDDLE of the face; on the ACTIVE (open, awakened) eye it sits smaller in the
	// banner plaque below the iris. Callers can still override via textY/textStyle.
	const isActiveVariant = $derived(displayVariant === 'add' || displayVariant === 'mult');
	const labelOffset = $derived(isActiveVariant ? EYE_LABEL_OFFSET_PLAQUE : EYE_LABEL_OFFSET);
	const labelX = $derived(width * labelOffset.x);
	const labelY = $derived(props.textY ?? height * labelOffset.y);
	const isMultiplierEye = $derived(displayVariant === 'mult' || displayVariant === 'multEmpty');
	const intensity = $derived(Math.min(Math.max(props.intensity ?? 0, 0), 1));
	const labelStyle = $derived<TextStyleOptions>(
		props.textStyle ??
			eyeValueTextStyle({
				fontSize: props.size * (isActiveVariant ? 0.17 : 0.36),
				fill: isMultiplierEye ? EYE_VALUE_FILL.mul : EYE_VALUE_FILL.add,
			}),
	);
	const maxLabelWidth = $derived(width * (isActiveVariant ? 0.52 : 0.6));
	const labelFitScale = $derived.by(() => {
		if (!props.text) return 1;
		const measured = CanvasTextMetrics.measureText(props.text, new TextStyle(labelStyle));
		return Math.min(1, maxLabelWidth / Math.max(measured.width, 1));
	});

	const idleFx = $state({ alpha: 1 });
	// Card-flip on reveal: the core squashes horizontally to edge-on, the art swaps, it springs
	// back open. yBulge adds a touch of vertical stretch at the midpoint so it reads as a turn.
	const flipFx = $state({ scaleX: 1 });
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

	// --- REVEAL ARCS: bioluminescent energy discharge as the eye springs open --------------------
	// Jagged energy bolts thrown outward from the eye the instant the reveal flip settles — the
	// "charge releasing" beat the reveal was missing. Cyan/few/thin for ADD, red/many/thick/forked
	// for MUL, so the arcs widen the ADD-vs-MUL read the whole component is built around.
	//
	// MEMORY: this is exactly the pattern that must NOT leak — the iOS crash was FillGradient built
	// per frame. Arcs are plain additive Graphics strokes: no texture, no gradient, no filter. The
	// jagged paths are generated ONCE per reveal (below) and only their alpha/width animate, so the
	// per-frame cost is a handful of moveTo/lineTo and nothing is allocated while they play.
	const arcFx = $state({ progress: 0 });
	// each arc is a precomputed polyline in local space (eye centre = 0,0), plus a fork branch point
	let revealArcs = $state<{ points: { x: number; y: number }[]; branchAt: number }[]>([]);

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

	// One jagged bolt from the eye centre outward. Midpoint displacement gives the lightning kink:
	// each segment steps along the radius and jitters sideways, harder for MUL. Generated once per
	// reveal — never per frame — so the bolt is stable while it flashes and fades.
	const makeArc = (angle: number, reach: number, jag: number, forked: boolean) => {
		const SEGS = 5;
		const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
		const nx = Math.cos(angle);
		const ny = Math.sin(angle);
		// perpendicular, for sideways jitter
		const px = -ny;
		const py = nx;
		for (let i = 1; i <= SEGS; i++) {
			const t = i / SEGS;
			const dist = reach * t;
			// no jitter at the very tip so the bolt tapers to a point
			const j = (Math.random() - 0.5) * reach * jag * (1 - t * 0.5);
			points.push({ x: nx * dist + px * j, y: ny * dist + py * j });
		}
		return { points, branchAt: forked ? 2 + Math.floor(Math.random() * 2) : -1 };
	};

	const spawnRevealArcs = (mult: boolean) => {
		const count = mult ? 7 : 4;
		const reach = props.size * (mult ? 1.15 : 0.9);
		revealArcs = Array.from({ length: count }, (_, i) => {
			// spread around the eye with a little wobble so they don't look mechanically radial
			const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
			return makeArc(angle, reach * (0.75 + Math.random() * 0.45), mult ? 0.24 : 0.14, mult);
		});
	};

	// The reveal card-flip: closed purple face squeezes, flips edge-on, the art swaps to the
	// revealed variant, springs back open, and the glow + number land on the settle.
	let flipTl: gsap.core.Timeline | undefined;
	const playRevealFlip = (next: EyeVariant) => {
		// The multiplier Eye is the rare hero: it reveals bigger, slower and brighter than an adder.
		const mult = next === 'mult' || next === 'multEmpty';
		flipTl?.kill();
		flipTl = gsap
			.timeline()
			.set(revealFx, { baseAlpha: 1, textAlpha: 0, textScale: 0.35, glow: 0 })
			.set(glowFx, { scale: 1, alpha: 0.18 })
			.set(haloFx, { boost: 0, scaleBoost: 0 })
			.set(flipFx, { scaleX: 1 })
			// the closed purple eye squeezes… and flips edge-on
			.to(flipFx, { scaleX: 1.08, duration: 0.09, ease: 'power1.out' })
			.to(flipFx, { scaleX: 0.02, duration: 0.15, ease: 'power2.in' })
			// swap to the revealed art while nobody can see the face
			.add(() => (displayVariant = next))
			// energy discharges the instant the eye opens — arcs snap out bright, then fade
			.add(() => {
				spawnRevealArcs(mult);
				gsap.killTweensOf(arcFx);
				gsap.fromTo(
					arcFx,
					{ progress: 0 },
					{ progress: 1, duration: mult ? 0.52 : 0.4, ease: 'power2.out' },
				);
				// SCREEN LIGHTNING: full-canvas strike (game/screenLightning.svelte.ts). Revertible —
				// flip SCREEN_LIGHTNING_ENABLED, or remove this line to keep only the local arcs.
				fireScreenLightning(mult);
			})
			// …and spring back open as the charged eye
			.to(flipFx, { scaleX: 1, duration: mult ? 0.34 : 0.26, ease: 'back.out(2.6)' })
			// light + number land with the flip's settle
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
	};

	// Watch the variant prop on this LIVE instance: leaving `close` plays the reveal flip; any
	// other change (e.g. the spent awaken EMPTY → ACTIVE) swaps the art instantly (the caller's
	// `pulse` provides the awaken pop).
	$effect(() => {
		const next = variant;
		const shown = untrack(() => displayVariant);
		if (next === shown) return;
		if (shown === 'close') {
			playRevealFlip(next);
		} else {
			flipTl?.kill();
			flipFx.scaleX = 1;
			revealFx.textAlpha = 1;
			revealFx.textScale = 1;
			displayVariant = next;
		}
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
			flipTl?.kill();
			gsap.killTweensOf(landingFx);
			gsap.killTweensOf(flipFx);
			gsap.killTweensOf(revealFx);
			gsap.killTweensOf(glowFx);
			gsap.killTweensOf(haloFx);
			gsap.killTweensOf(pulseFx);
			gsap.killTweensOf(burstFx);
			gsap.killTweensOf(swayFx);
			gsap.killTweensOf(particleFx);
			gsap.killTweensOf(shockFx);
			gsap.killTweensOf(arcFx);
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

	// Reveal energy arcs. `progress` 0→1: the bolt extends fast to full length, its alpha snaps
	// bright then fades, and it thins as it dies — a discharge, not a persistent glow.
	const drawArcs = (g: import('pixi.js').Graphics) => {
		const p = arcFx.progress;
		if (p <= 0 || p >= 1 || revealArcs.length === 0) return;
		const mult = isMultiplierEye;
		// bright immediately, then ease out — max at ~15% in
		const alpha = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
		if (alpha <= 0) return;
		const extend = Math.min(1, p / 0.3); // bolt reaches full length in the first third
		const w = Math.max(1.5, props.size * (mult ? 0.03 : 0.018)) * (1 - p * 0.5);

		// Trace every bolt into the current path. Called once per stroke pass (coloured body, then a
		// thinner white-hot core over it) rather than relying on stroke() retaining the path across
		// two calls — the docs only promise fill→stroke reuse, so re-tracing is the safe form.
		const trace = () => {
			for (const arc of revealArcs) {
				const pts = arc.points;
				const last = 1 + Math.floor((pts.length - 1) * extend);
				g.moveTo(pts[0].x, pts[0].y);
				for (let i = 1; i < last && i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
				// a MUL bolt forks: a short branch splitting off a mid-point toward a random side
				if (arc.branchAt > 0 && arc.branchAt < last && arc.branchAt < pts.length - 1) {
					const b = pts[arc.branchAt];
					const tip = pts[Math.min(arc.branchAt + 2, pts.length - 1)];
					g.moveTo(b.x, b.y);
					g.lineTo(
						b.x + (tip.x - b.x) * 0.6 - (tip.y - b.y) * 0.5,
						b.y + (tip.y - b.y) * 0.6 + (tip.x - b.x) * 0.5,
					);
				}
			}
		};

		// coloured body — additive, so overlapping bolts read as hotter
		trace();
		g.stroke({ width: w, color: effectColor, alpha, cap: 'round', join: 'round' });
		// white-hot core along the same paths — what actually sells "electric"
		trace();
		g.stroke({ width: w * 0.4, color: 0xffffff, alpha: alpha * 0.7, cap: 'round', join: 'round' });
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
		<!-- Core eye layers. The x-scale is the reveal card-flip (with a slight vertical bulge at
		     the edge-on midpoint so it reads as a turn, not a squash). -->
		<Container scale={{ x: flipFx.scaleX, y: 1 + Math.max(0, 1 - flipFx.scaleX) * 0.07 }}>
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
	<!-- reveal energy arcs: additive, in the eye's local space so they radiate FROM the pupil -->
	<Container blendMode="add">
		<Graphics draw={drawArcs} />
	</Container>

	<!-- the multiplier NEVER shows on the closed purple face — only on revealed/awakened art -->
	{#if props.text && displayVariant !== 'close'}
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
