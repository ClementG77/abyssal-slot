<script lang="ts">
	import { OnMount } from 'components-shared';

	import { getContext } from '../game/context';
	import Anticipation from './Anticipation.svelte';

	const context = getContext();

	// Math-driven scatter anticipation. The reveal event carries a per-reel `anticipation` array;
	// the SDK uses it to set `reelState.anticipating` on a reel ONLY while another scatter can still
	// land to complete the feature, and the flag is cleared once that reel stops (Anticipation
	// below). So a 3rd scatter on the last reel — with no reel left to land a 4th — never sets it.
	//
	// We bridge that flag to the board darken + zoom: broadcast start when anticipation begins and
	// end the moment it resolves (the 4th lands / the anticipated reel stops). ScatterFx owns the
	// dim + audio, BoardContainer / ReelFrame own the zoom-hold.
	const hasAnticipation = $derived(
		context.stateGame.board.some((reel) => reel.reelState.anticipating),
	);
</script>

{#if hasAnticipation}
	<OnMount
		onmount={() => {
			context.eventEmitter.broadcast({ type: 'reelFrameScatterAnticipationStart' });
			return () => context.eventEmitter.broadcast({ type: 'reelFrameScatterAnticipationEnd' });
		}}
	/>
{/if}

{#each context.stateGame.board as reel, reelIndex}
	{#if reel.reelState.anticipating}
		<Anticipation {reel} {reelIndex} oncomplete={() => (reel.reelState.anticipating = false)} />
	{/if}
{/each}
