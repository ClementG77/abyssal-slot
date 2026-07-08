<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { stateBet, stateBetDerived, stateConfig, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../../game/context';
	import NeonButton from './NeonButton.svelte';
	import Readout from './Readout.svelte';

	type Props = { x?: number; y?: number };
	const props: Props = $props();
	const context = getContext();

	const idle = $derived(context.stateXstateDerived.isIdle());
	const options = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const smallest = $derived(options[0]);
	const biggest = $derived(options[options.length - 1]);
	const decDisabled = $derived(!idle || stateBet.betAmount <= smallest);
	const incDisabled = $derived(!idle || stateBet.betAmount >= biggest);
	const betLabel = $derived(
		stateBetDerived.activeBetMode()?.text.betAmountLabel || context.i18nDerived.bet(),
	);
	const betValue = $derived(numberToCurrencyString(stateBetDerived.betCost()));

	const dec = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const next = [...options].reverse().find((o) => o < stateBet.betAmount);
		stateBetDerived.setBetAmount(next ?? smallest);
	};
	const inc = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const next = options.find((o) => o > stateBet.betAmount);
		stateBetDerived.setBetAmount(next ?? biggest);
	};
	const openMenu = () => {
		if (!idle) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'betAmountMenu' };
	};
</script>

<Container x={props.x} y={props.y}>
	<NeonButton x={-114} size={56} icon="minus" onpress={dec} disabled={decDisabled} />
	<Readout x={0} width={150} label={betLabel} value={betValue} onpress={openMenu} />
	<NeonButton x={114} size={56} icon="plus" onpress={inc} disabled={incDisabled} />
</Container>
