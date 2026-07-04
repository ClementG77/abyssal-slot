<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { FillGradient } from 'pixi.js';

	import { Container, Graphics } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';
	import type { Reel } from '../game/stateGame.svelte';
	import { BOARD_SIZES, REEL_CELL_HEIGHT, REEL_CELL_WIDTH } from '../game/constants';

	// Scatter-anticipation column marker: the lane is simply a bit MORE LUMINOUS than the rest
	// of the (dimmed) board — a soft edge-faded brightness lift with a barely-there breathe, so
	// it's obvious which reel we're waiting on. Also clears the reel's `anticipating` flag once
	// it stops, which resolves the board/audio lifecycle.
	//
	// Column geometry (board space, so it scales with the board on every layout):
	//   x = reelIndex × REEL_CELL_WIDTH, width = exactly one reel lane,
	//   y = 0 … BOARD_SIZES.height (the visible 5-row grid).
	type Props = {
		reel: Reel;
		reelIndex: number;
		oncomplete: () => void;
	};

	const props: Props = $props();
	let completed = false;

	$effect(() => {
		if (props.reel.reelState.motion === 'stopped' && !completed) {
			completed = true;
			props.oncomplete();
		}
	});

	// pulse clock + fade-in so the wash doesn't pop on
	const wash = $state({ t: 0, alpha: 0 });

	onMount(() => {
		const clock = gsap.to(wash, { t: 3600, duration: 3600, ease: 'none', repeat: -1 });
		const fadeIn = gsap.to(wash, { alpha: 1, duration: 0.45, ease: 'power2.out' });
		return () => {
			clock.kill();
			fadeIn.kill();
		};
	});

	// Horizontal edge falloff, cached — transparent → celestial → transparent, so the lane reads
	// as a soft light wash with no hard borders. `local` space = relative to the filled rect.
	const laneWash = new FillGradient({
		textureSpace: 'local',
		start: { x: 0, y: 0 },
		end: { x: 1, y: 0 },
		colorStops: [
			{ offset: 0, color: 'rgba(190, 232, 255, 0)' },
			{ offset: 0.5, color: 'rgba(214, 242, 255, 0.85)' },
			{ offset: 1, color: 'rgba(190, 232, 255, 0)' },
		],
	});

	// The wash overshoots the grid vertically (into the padding-row zones) so the light clearly
	// STARTS above the column and FINISHES below it, dissolving at both extremes.
	const OVERSHOOT = REEL_CELL_HEIGHT * 0.85;

	const drawColumnWash = (g: import('pixi.js').Graphics) => {
		const laneX = props.reelIndex * REEL_CELL_WIDTH;
		const w = REEL_CELL_WIDTH;
		const h = BOARD_SIZES.height;
		// a barely-there breathe so it feels alive without drawing attention to itself
		const pulse = 0.9 + Math.sin(wash.t * 2.2) * 0.1;

		// the lane itself, gently lifted out of the surrounding dim (edge-faded)
		g.rect(laneX, 0, w, h).fill({ fill: laneWash, alpha: 0.16 * pulse });
		g.rect(laneX + w * 0.16, 0, w * 0.68, h).fill({ fill: laneWash, alpha: 0.12 * pulse });

		// soft extensions above and below: sliced, fading to nothing outward
		const slices = 4;
		const sliceH = OVERSHOOT / slices;
		for (let i = 0; i < slices; i++) {
			const fade = 1 - (i + 0.5) / slices;
			const alpha = 0.16 * pulse * fade;
			g.rect(laneX, -(i + 1) * sliceH, w, sliceH).fill({ fill: laneWash, alpha });
			g.rect(laneX, h + i * sliceH, w, sliceH).fill({ fill: laneWash, alpha });
		}
	};
</script>

<BoardContainer>
	<Container blendMode="add" alpha={wash.alpha}>
		<Graphics draw={drawColumnWash} />
	</Container>
</BoardContainer>
