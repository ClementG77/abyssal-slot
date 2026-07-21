<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Application, Container, Text } from 'pixi.js';

	import { abyssalAmountTextStyle } from '../game/textStyles';

	type Props = {
		title: string;
	};

	const props: Props = $props();

	let host = $state<HTMLDivElement>();


	onMount(() => {
		if (!host) return;

		let active = true;
		let app: Application | undefined;
		let resizeObserver: ResizeObserver | undefined;
		let entrance: gsap.core.Timeline | undefined;
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

		const createLogo = async () => {
			if (!active || !host) return;

			app = new Application();
			await app.init({
				width: Math.max(host.clientWidth, 1),
				height: Math.max(host.clientHeight, 1),
				backgroundAlpha: 0,
				antialias: true,
				autoDensity: true,
				resolution: Math.min(window.devicePixelRatio, 2),
			});
			if (!active || !host) {
				app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
				return;
			}

			app.canvas.setAttribute('aria-hidden', 'true');
			host.appendChild(app.canvas);

			// Cinzel has no @font-face — it is registered from JS in game/loaderFonts.ts and loads
			// ASYNC, while this logo is one of the first things built on screen. Pixi rasterizes a
			// canvas Text ONCE and never re-rasterizes when a font arrives later, so building the
			// wordmark before the face is ready bakes in the Georgia fallback permanently.
			// Race it against a timeout so a font that never loads can't hang the loader.
			await Promise.race([
				document.fonts.load('900 150px Cinzel'),
				new Promise((resolve) => setTimeout(resolve, 1500)),
			]).catch(() => {});
			if (!active || !host) {
				app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
				return;
			}

			const logo = new Container();
			// Uppercase because the DISPLAY face is Cinzel — an inscriptional Roman serif, drawn
			// from carved capitals. Its caps are the point of it; lowercase would waste the face.
			const title = props.title.toUpperCase();
			// The display face (Cinzel), not the UI face. This is the wordmark — the one place in
			// the app that IS the brand — so it takes the serif directly rather than following
			// CELEBRATION_FACE, which is a switch about win presentation and nothing to do with a
			// logo. Layered depth/glow copies below give it the weight the old bitmap face baked in.
			const style = {
				...abyssalAmountTextStyle({ fontSize: 150, face: 'display' }),
				letterSpacing: 4,
			};
			// Depth: a dark solid copy dropped below the face (multiplicative tint turns the
			// glyphs into a clean silhouette).
			const depth = new Text({ text: title, style, anchor: 0.5, tint: 0x0a0616 });
			depth.position.set(0, 10);
			depth.alpha = 0.85;
			// The face itself — fill/stroke/shadow come from the shared style.
			const face = new Text({ text: title, style, anchor: 0.5 });
			// Glow: an additive warm copy blooms the face without washing out the stroke.
			const glow = new Text({ text: title, style, anchor: 0.5, tint: 0xffd879 });
			glow.alpha = 0.35;
			glow.blendMode = 'add';
			glow.scale.set(1.02);

			// TWO containers, and it matters: `layout` owns logo.scale/position and re-runs on every
			// resize, so the entrance has to animate a separate inner container or the two fight
			// and the wordmark snaps to full size the first time the ResizeObserver fires.
			const wordmark = new Container();
			wordmark.addChild(depth, glow, face);
			logo.addChild(wordmark);
			app.stage.addChild(logo);

			// Measured while the wordmark is still neutral — reading these after the entrance sets
			// its start scale would bake the shrunken size into the layout permanently.
			const intrinsicWidth = logo.width;
			const intrinsicHeight = logo.height;

			const layout = () => {
				if (!app || !host) return;
				const width = Math.max(host.clientWidth, 1);
				const height = Math.max(host.clientHeight, 1);
				app.renderer.resize(width, height);
				const scale = Math.min((width * 0.94) / intrinsicWidth, (height * 0.76) / intrinsicHeight);
				logo.scale.set(scale);
				logo.position.set(width / 2, height / 2);
			};

			layout();
			resizeObserver = new ResizeObserver(layout);
			resizeObserver.observe(host);

			// --- entrance -----------------------------------------------------------------------
			// The wordmark surfaces out of the dark rather than appearing: it rises, settles into
			// scale, and the additive glow blooms hot then cools to its resting 0.35 — so the last
			// thing that moves is light leaving the letters, not the letters themselves.
			if (reducedMotion.matches) return; // the loader's CSS makes the same concession
			entrance = gsap
				.timeline()
				.fromTo(wordmark, { alpha: 0 }, { alpha: 1, duration: 0.85, ease: 'power2.out' }, 0)
				.fromTo(wordmark, { y: 30 }, { y: 0, duration: 1.2, ease: 'power3.out' }, 0)
				.fromTo(
					wordmark.scale,
					{ x: 0.86, y: 0.86 },
					{ x: 1, y: 1, duration: 1.2, ease: 'power3.out' },
					0,
				)
				.fromTo(glow, { alpha: 1 }, { alpha: 0.35, duration: 1.6, ease: 'power2.out' }, 0.12);
		};

		void createLogo();

		return () => {
			active = false;
			// Kill the timeline BEFORE destroying the app: gsap holds references to the Pixi
			// containers, and a tween ticking against destroyed objects throws on the next frame.
			entrance?.kill();
			resizeObserver?.disconnect();
			app?.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
		};
	});
</script>

<div bind:this={host} class="abyssal-pixi-logo" role="img" aria-label={props.title}></div>

<style lang="scss">
	.abyssal-pixi-logo {
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.abyssal-pixi-logo :global(canvas) {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
