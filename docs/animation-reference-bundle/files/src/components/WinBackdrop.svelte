<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import { Container, Graphics } from 'pixi-svelte';

	// PixiJS animated backdrop behind the win banner: a slowly rotating sunburst of rays plus a
	// pulsing radial glow, tinted to the current win tier. The ray/glow geometry is drawn once;
	// only cheap Container transforms (rotation/alpha/scale) update per frame, so it's light.
	type Props = {
		radius: number;
		color?: number;
	};

	const props: Props = $props();
	const color = $derived(props.color ?? 0xffb13c);

	let rot = $state(0);
	let glow = $state(0.5);
	let raf = 0;

	onMount(() => {
		const loop = (t: number) => {
			rot = (t * 0.00016) % (Math.PI * 2);
			glow = 0.5 + 0.5 * Math.sin(t * 0.0022);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
	});
	onDestroy(() => cancelAnimationFrame(raf));

	const RAYS = 14;
	const raysDraw = (g: import('pixi.js').Graphics) => {
		const R = props.radius * 1.8;
		for (let i = 0; i < RAYS; i++) {
			const a0 = (i / RAYS) * Math.PI * 2;
			const a1 = a0 + ((Math.PI * 2) / RAYS) * 0.5;
			g.moveTo(0, 0)
				.lineTo(Math.cos(a0) * R, Math.sin(a0) * R)
				.lineTo(Math.cos(a1) * R, Math.sin(a1) * R)
				.fill({ color, alpha: 0.05 });
		}
	};
	const glowDraw = (g: import('pixi.js').Graphics) => {
		const R = props.radius;
		g.circle(0, 0, R).fill({ color, alpha: 0.16 });
		g.circle(0, 0, R * 0.6).fill({ color, alpha: 0.18 });
	};
</script>

<!-- rotating rays -->
<Container rotation={rot}>
	<Graphics draw={raysDraw} />
</Container>
<!-- pulsing glow -->
<Container alpha={0.45 + glow * 0.4} scale={0.9 + glow * 0.14}>
	<Graphics draw={glowDraw} />
</Container>
