<script lang="ts">
	import { OnHotkey } from 'components-shared';
	import { stateBet, stateBetDerived } from 'state-shared';

	import { getContext } from '../game/context';

	const context = getContext();
	let turboEnabledBeforeHold = false;

	const enableHoldTurbo = () => {
		if (stateBet.isSpaceHold) return;
		turboEnabledBeforeHold = stateBet.isTurbo;
		stateBet.autoSpinsCounter = 0;
		stateBet.isSpaceHold = true;
		context.stateGameDerived.enableTurbo();
	};

	const disableHoldTurbo = () => {
		if (!stateBet.isSpaceHold) return;
		stateBet.isSpaceHold = false;
		stateBetDerived.updateIsTurbo(turboEnabledBeforeHold, { persistent: true });
	};
</script>

<OnHotkey hotkey="Space" onhold={enableHoldTurbo} onholdend={disableHoldTurbo} />
