<script lang="ts">
	import type { Reel } from '../game/stateGame.svelte';

	// The per-reel scatter-anticipation column highlight was removed (both base game and free
	// spins). This now only clears the reel's `anticipating` flag once it stops, so the board /
	// anticipation-sound lifecycle still resolves exactly as before.
	type Props = {
		reel: Reel;
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
</script>
