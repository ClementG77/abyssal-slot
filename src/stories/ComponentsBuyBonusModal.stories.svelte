<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'COMPONENTS/<BuyBonusModal>',
	});
</script>

<script lang="ts">
	import { StoryLocale } from 'components-storybook';
	import { stateBet, stateModal } from 'state-shared';

	import BuyBonusModal from '../components/BuyBonusModal.svelte';
	import { setContext } from '../game/context';

	// setContext() wires the shared event-emitter context the modal broadcasts on AND publishes
	// Abyssal's bet modes to stateMeta.betModeMeta (so the activate/buy cards populate).
	setContext();

	// give the story a fat balance + a sensible bet so every card is affordable / steppable
	stateBet.balanceAmount = 100000;
	stateBet.betAmount = 1;
	stateBet.activeBetModeKey = 'BASE';
	stateModal.modal = { name: 'buyBonus' };
</script>

<Story name="open">
	<StoryLocale lang="en">
		<BuyBonusModal />
	</StoryLocale>
</Story>
