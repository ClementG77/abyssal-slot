<script lang="ts">
	import { OnPressFullScreen } from 'components-layout';

	import { getContext } from '../game/context';
	import { armSkip } from '../game/skip.svelte';

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

<!-- cursor stays default — only the control bar's buttons advertise clickability -->
<OnPressFullScreen
	cursor="default"
	onpress={() => {
		if (owners > 0) return;
		// only while a round is playing (never pre-arm a skip for the next round)
		if (context.stateXstateDerived.isIdle()) return;
		// same treatment as holding the spacebar: everything accelerates to turbo (no snapping)
		armSkip();
		context.stateGameDerived.speedUpCurrentSpin();
	}}
/>
