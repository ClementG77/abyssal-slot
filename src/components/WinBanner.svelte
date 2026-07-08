<script lang="ts" module>
	export type WinTierKey = 'bigWin' | 'hugeWin' | 'megaWin' | 'epicWin' | 'maxWin';
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	import { Container, Graphics, Sprite } from 'pixi-svelte';
	import { ResponsiveBitmapText } from 'components-pixi';

	import { abyssalBitmapStyle } from '../game/constants';
	import { i18nDerived } from '../i18n/i18nDerived';

	// The win-step screen: the tier's ornate plaque frame from the win_steps sheet (crest +
	// gem inlays baked in the art), the tier name in the branded AbyssalBitmap face inside the
	// plaque, and additive FX in the frame's own accent color — a soft halo behind, and a
	// tier-tinted copy of the frame that breathes so the gems/inlays glow. Every escalation
	// slams the new frame in with a white bloom. The amount is rendered by Win.svelte, inside
	// the plaque's lower half.
	type Props = {
		tierKey: WinTierKey;
		color: number; // the step's accent (matches the frame art's gems)
		width: number; // frame size — keep the art's 522:383 aspect
		height: number;
	};

	const props: Props = $props();

	// NOTE: the sheet's frame names follow the grid, not our ladder — the red dragon frame
	// (sheet: EPIC_WIN) is reserved for the win cap, and the purple eye frame (sheet: MAX_WIN)
	// dresses our EPIC step.
	const TIER_FRAMES: Record<WinTierKey, string> = {
		bigWin: 'BIG_WIN',
		hugeWin: 'HUGE_WIN',
		megaWin: 'MEGA_WIN',
		epicWin: 'MAX_WIN', // purple eye
		maxWin: 'EPIC_WIN', // red dragon
	};

	// ---- Tunable knobs ----------------------------------------------------------------------
	const SLAM_SCALE = 1.6; // how big the new frame lands before settling
	const BLOOM_IDLE = 0.22; // resting strength of the tier-colored frame glow
	const TITLE_Y = -0.82; // title centre — a headline ABOVE the frame (clear of the crest)
	const TITLE_SIZE = 0.22; // title font size, fraction of frame height
	const TITLE_PULSE = 0.055; // headline scale pulse depth (rides the idle glow rhythm)
	// shape aura: tier-tinted copies of the frame's own silhouette swelling outward
	const AURA_SCALES = [1.07, 1.17, 1.3]; // innermost → outermost shell
	const AURA_ALPHA = 0.55; // alpha of the innermost shell (outer shells fade)
	// soft drop shadow under the banner (dark silhouettes, offset down) for depth
	const SHADOW_LAYERS = [
		{ scale: 1.02, offset: 0.035, alpha: 0.4 },
		{ scale: 1.06, offset: 0.06, alpha: 0.22 },
	];

	const fx = $state({ scale: 1, flash: 0, bloom: BLOOM_IDLE });
	// gentle idle motion so the screen never freezes: breathe (scale) + glow (bloom swell)
	const idle = $state({ breathe: 1, glow: 0 });

	const slam = () => {
		gsap.killTweensOf(fx);
		gsap
			.timeline()
			.set(fx, { scale: SLAM_SCALE, flash: 0.95, bloom: 1 })
			.to(fx, { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)' })
			.to(fx, { flash: 0, duration: 0.4, ease: 'power2.out' }, 0)
			.to(fx, { bloom: BLOOM_IDLE, duration: 0.9, ease: 'power2.out' }, 0.15);
	};

	// escalation watcher: slam on every tier change after the first render
	let prev: string | undefined;
	$effect(() => {
		const key = props.tierKey;
		if (prev !== undefined && prev !== key) slam();
		prev = key;
	});

	onMount(() => {
		gsap.to(idle, {
			breathe: 1.02,
			glow: 1,
			duration: 1.2,
			yoyo: true,
			repeat: -1,
			ease: 'sine.inOut',
		});
		return () => {
			gsap.killTweensOf(fx);
			gsap.killTweensOf(idle);
		};
	});

	const frameKey = $derived(TIER_FRAMES[props.tierKey]);
	const title = $derived(i18nDerived.winTier(props.tierKey));
	const titleStyle = $derived(
		abyssalBitmapStyle({
			fontSize: props.height * TITLE_SIZE,
			letterSpacing: props.height * 0.01,
		}),
	);

	// dark panel filling the plaque interior (the frame art is hollow — without this the
	// dimmed board shows through behind the amount). Oversized on purpose: it tucks UNDER the
	// frame's opaque ivory border on every side, so the curvy plaque shape never shows gaps.
	const drawPlaqueBg = (g: import('pixi.js').Graphics) => {
		const w = props.width;
		const h = props.height;
		const x = -w * 0.45;
		const y = -h * 0.15;
		const pw = w * 0.9;
		const ph = h * 0.47;
		g.roundRect(x, y, pw, ph, h * 0.1).fill({ color: 0x081019, alpha: 0.94 });
		g.roundRect(x, y, pw, ph, h * 0.1).fill({ color: props.color, alpha: 0.07 });
	};

</script>

<Container scale={fx.scale * idle.breathe}>
	<!-- shape aura: the banner's own silhouette radiating the step color, breathing outward -->
	<Container alpha={(0.6 + fx.bloom * 0.4) * (0.75 + idle.glow * 0.25)} blendMode="add">
		{#each AURA_SCALES as shellScale, i}
			<Container scale={shellScale + idle.glow * 0.02 * (i + 1)}>
				<Sprite
					anchor={0.5}
					key={frameKey}
					width={props.width}
					height={props.height}
					tint={props.color}
					alpha={AURA_ALPHA * (1 - i / AURA_SCALES.length)}
				/>
			</Container>
		{/each}
	</Container>

	<!-- drop shadow: dark offset silhouettes ground the banner and give it depth -->
	{#each SHADOW_LAYERS as shadow}
		<Container y={props.height * shadow.offset} scale={shadow.scale}>
			<Sprite
				anchor={0.5}
				key={frameKey}
				width={props.width}
				height={props.height}
				tint={0x000000}
				alpha={shadow.alpha}
			/>
		</Container>
	{/each}

	<Graphics draw={drawPlaqueBg} />
	<Sprite anchor={0.5} key={frameKey} width={props.width} height={props.height} />

	<!-- the frame's own colors come alive: an additive tier-tinted copy breathes,
	     glowing the crest and gem inlays -->
	<Container alpha={fx.bloom * (0.4 + idle.glow * 0.3)} blendMode="add">
		<Sprite
			anchor={0.5}
			key={frameKey}
			width={props.width}
			height={props.height}
			tint={props.color}
		/>
	</Container>

	<!-- the headline pulses on its own rhythm (on top of the banner's gentle breathe) -->
	<Container y={props.height * TITLE_Y} scale={1 + idle.glow * TITLE_PULSE}>
		<ResponsiveBitmapText anchor={0.5} maxWidth={props.width * 1.05} text={title} style={titleStyle} />
		<!-- tier-colored bloom of the headline glyphs, swelling with the pulse -->
		<Container alpha={(0.35 + idle.glow * 0.3) * (0.5 + fx.bloom * 0.5)} blendMode="add">
			<ResponsiveBitmapText
				anchor={0.5}
				maxWidth={props.width * 1.05}
				text={title}
				style={titleStyle}
				tint={props.color}
			/>
		</Container>
	</Container>

	{#if fx.flash > 0}
		<!-- escalation flash: an additive white copy blooms the whole banner on each tier-up -->
		<Container alpha={fx.flash} blendMode="add">
			<Sprite anchor={0.5} key={frameKey} width={props.width} height={props.height} />
			<ResponsiveBitmapText
				anchor={0.5}
				y={props.height * TITLE_Y}
				maxWidth={props.width * 1.05}
				text={title}
				style={titleStyle}
			/>
		</Container>
	{/if}
</Container>
