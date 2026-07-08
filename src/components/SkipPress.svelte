<script lang="ts">
	import { OnPressFullScreen } from 'components-layout';

	import { getContext } from '../game/context';
	import { requestSkip } from '../game/skip.svelte';

	// Press-to-skip: any click on the game screen fast-forwards the current animation beat
	// (tumbles, gaze fill, eye reveal…). Pixi hit-testing already routes clicks to the topmost
	// interactive object, so overlays with their own press semantics (win takeover, free-spins
	// intro/outro) naturally shadow this layer — the `owners` gate below is belt-and-braces so
	// a skip window never opens while one of them is up.
	const context = getContext();

	let owners = $state(0);
	const acquire = () => (owners += 1);
	const release = () => (owners = Math.max(0, owners - 1));

	context.eventEmitter.subscribeOnMount({
		winShow: acquire,
		winHide: release,
		freeSpinIntroShow: acquire,
		freeSpinIntroHide: release,
		freeSpinOutroShow: acquire,
		freeSpinOutroHide: release,
	});
</script>

<OnPressFullScreen
	onpress={() => {
		if (owners > 0) return;
		if (requestSkip()) {
			// turbo speeds + every falling symbol snaps to its slot (columns settle together)
			context.stateGameDerived.skipCurrentSpin();
		}
	}}
/>
