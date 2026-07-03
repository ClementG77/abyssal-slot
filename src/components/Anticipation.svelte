<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	import { Container, Graphics } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';
	import type { Reel } from '../game/stateGame.svelte';
	import { BOARD_SIZES, REEL_CELL_WIDTH } from '../game/constants';

	// Scatter-anticipation reel spotlight: while this reel can still land the scatter that
	// completes the trigger, its lane glows as a soft golden light column (the rest of the board
	// is dimmed by ScatterFx) — so the player's eye knows exactly where to look. Also clears the
	// reel's `anticipating` flag once it stops, which resolves the board/audio lifecycle.
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

	// ambient clock for the pulse + a fade-in so the beam doesn't pop on
	const beam = $state({ t: 0, alpha: 0 });

	onMount(() => {
		const clock = gsap.to(beam, { t: 3600, duration: 3600, ease: 'none', repeat: -1 });
		const fadeIn = gsap.to(beam, { alpha: 1, duration: 0.45, ease: 'power2.out' });
		return () => {
			clock.kill();
			fadeIn.kill();
		};
	});

	const drawSpotlight = (g: import('pixi.js').Graphics) => {
		const x = props.reelIndex * REEL_CELL_WIDTH;
		const w = REEL_CELL_WIDTH;
		const h = BOARD_SIZES.height;
		const pulse = 0.7 + Math.sin(beam.t * 3.2) * 0.3;

		// layered vertical light column (brighter toward the core)
		g.rect(x + w * 0.06, 0, w * 0.88, h).fill({ color: 0xffc964, alpha: 0.05 * pulse });
		g.rect(x + w * 0.18, 0, w * 0.64, h).fill({ color: 0xffe2a0, alpha: 0.05 * pulse });
		g.rect(x + w * 0.32, 0, w * 0.36, h).fill({ color: 0xfff3cf, alpha: 0.045 * pulse });
		// glowing edge rims
		g.rect(x + w * 0.04, 0, 2.5, h).fill({ color: 0xffe6a6, alpha: 0.32 * pulse });
		g.rect(x + w * 0.96 - 2.5, 0, 2.5, h).fill({ color: 0xffe6a6, alpha: 0.32 * pulse });
	};
</script>

<BoardContainer>
	<Container blendMode="add" alpha={beam.alpha}>
		<Graphics draw={drawSpotlight} />
	</Container>
</BoardContainer>
