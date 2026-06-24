<script lang="ts">
	import { onMount } from 'svelte';
	import { Application, Container, FillGradient, Text, type TextStyleOptions } from 'pixi.js';

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
			await document.fonts.load('900 96px "Arial Black"');
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
			const style: TextStyleOptions = {
				fontFamily: 'Arial Black, Impact, sans-serif',
				fontSize: 150,
				fontWeight: '900',
				letterSpacing: 2,
				padding: 28,
				align: 'center' as const,
			};
			const depth = new Text({
				text: props.title,
				style: {
					...style,
					fill: 0x230742,
					stroke: { color: 0x080014, width: 26 },
					dropShadow: { color: 0x000000, alpha: 0.95, blur: 7, distance: 11, angle: Math.PI / 2 },
				},
				anchor: 0.5,
			});
			const outline = new Text({
				text: props.title,
				style: {
					...style,
					fill: 0x53218f,
					stroke: { color: 0x7d26d8, width: 17 },
					dropShadow: { color: 0x6d21cc, alpha: 0.8, blur: 10, distance: 0 },
				},
				anchor: 0.5,
			});
			const gold = new FillGradient({
				end: { x: 0, y: 1 },
				colorStops: [
					{ offset: 0, color: 0xfff6ca },
					{ offset: 0.3, color: 0xffd879 },
					{ offset: 0.6, color: 0xb55d1c },
					{ offset: 1, color: 0xffd782 },
				],
			});
			const face = new Text({
				text: props.title,
				style: {
					...style,
					fill: gold,
					stroke: { color: 0x3b0b62, width: 8 },
					dropShadow: { color: 0xf5c268, alpha: 0.4, blur: 2, distance: 0 },
				},
				anchor: 0.5,
			});
			const highlight = new Text({
				text: props.title,
				style: {
					...style,
					fill: { color: 0xffffff, alpha: 0 },
					stroke: { color: 0xfff2b2, width: 1.5 },
				},
				anchor: 0.5,
			});

			logo.addChild(depth, outline, face, highlight);
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
