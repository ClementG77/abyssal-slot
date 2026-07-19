<script lang="ts">
	import { onMount } from 'svelte';
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
				app.destroy({ removeView: true }, { children: true });
				return;
			}

			app.canvas.setAttribute('aria-hidden', 'true');
			host.appendChild(app.canvas);

			const logo = new Container();
			// The face is uppercase-only (no lowercase glyphs).
			const title = props.title.toUpperCase();
			// Same canvas-text style as every number/caption in the game (see game/textStyles.ts),
			// so the wordmark and the HUD read as one typographic system. The layered depth/glow
			// copies below still do what the bitmap face used to bake into its glyphs.
			const style = { ...abyssalAmountTextStyle({ fontSize: 150 }), letterSpacing: 4 };
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

			logo.addChild(depth, glow, face);
			app.stage.addChild(logo);
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
		};

		void createLogo();

		return () => {
			active = false;
			resizeObserver?.disconnect();
			app?.destroy({ removeView: true }, { children: true });
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
