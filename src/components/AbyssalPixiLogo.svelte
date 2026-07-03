<script lang="ts">
	import { onMount } from 'svelte';
	import { Application, Assets, BitmapText, Container } from 'pixi.js';

	type Props = {
		title: string;
	};

	const props: Props = $props();

	let host = $state<HTMLDivElement>();

	// Same URL form as game/assets.ts `abyssalFont`, so Pixi's Assets cache resolves both to one
	// entry — whichever loads first wins, the other reuses it.
	const abyssalFontUrl = new URL(
		'../../assets/fonts/abyssal_bitmap_font_package/abyssal_font.fnt',
		import.meta.url,
	).href;

	onMount(() => {
		if (!host) return;

		let active = true;
		let app: Application | undefined;
		let resizeObserver: ResizeObserver | undefined;

		const createLogo = async () => {
			// The branded AbyssalBitmap face — gold fill, bevel and outline baked into the glyphs.
			await Assets.load(abyssalFontUrl);
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
			const style = {
				fontFamily: 'AbyssalBitmap',
				fontSize: 150,
				letterSpacing: 4,
				align: 'center',
			} as const;
			// Depth: a dark solid copy dropped below the face (multiplicative tint turns the
			// glyphs into a clean silhouette).
			const depth = new BitmapText({ text: title, style, anchor: 0.5, tint: 0x0a0616 });
			depth.position.set(0, 10);
			depth.alpha = 0.85;
			// The gold face itself — fill/bevel/outline live in the glyph art.
			const face = new BitmapText({ text: title, style, anchor: 0.5 });
			// Glow: an additive warm copy blooms the gold without washing out the bevel.
			const glow = new BitmapText({ text: title, style, anchor: 0.5, tint: 0xffd879 });
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
