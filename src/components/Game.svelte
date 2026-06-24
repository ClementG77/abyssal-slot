<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { BlurFilter } from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { App, Container } from 'pixi-svelte';
	import { stateModal, stateUrlDerived } from 'state-shared';

	import { GameVersion, Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import EnableSound from './EnableSound.svelte';
	import TurboSpaceHold from './TurboSpaceHold.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import ReelFrame from './ReelFrame.svelte';
	import Board from './Board.svelte';
	import Anticipations from './Anticipations.svelte';
	import ClusterWinAmounts from './ClusterWinAmounts.svelte';
	import TumbleBoard from './TumbleBoard.svelte';
	import BoardDebris from './BoardDebris.svelte';
	import TumbleWinAmount from './TumbleWinAmount.svelte';
	import GazeMeter from './GazeMeter.svelte';
	import Eye from './Eye.svelte';
	import PersistentMultiplier from './PersistentMultiplier.svelte';
	import ScatterFx from './ScatterFx.svelte';
	import ScatterPay from './ScatterPay.svelte';
	import WinCapCelebration from './WinCapCelebration.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinRetrigger from './FreeSpinRetrigger.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import ControlBar from './ControlBar.svelte';
	import GameHeader from './GameHeader.svelte';
	import ReplayControls from './ReplayControls.svelte';
	import GameInfo from './GameInfo.svelte';
	import BuyBonusModal from './BuyBonusModal.svelte';

	const context = getContext();
	const introBlur = new Tween(0, { duration: 300 });
	let introBlurFilter = $state<BlurFilter | null>(null);

	onMount(() => {
		context.stateLayout.showLoadingScreen = true;
		introBlurFilter = new BlurFilter({ strength: 0, quality: 3, kernelSize: 5 });
	});

	$effect(() => {
		introBlur.set(context.stateGame.freeSpinIntroActive ? 7 : 0);
	});

	$effect(() => {
		if (!introBlurFilter) return;
		introBlurFilter.strength = introBlur.current;
		introBlurFilter.enabled = introBlur.current > 0.05;
	});

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

<App>
	<EnableSound />
	<EnableHotkey />
	<TurboSpaceHold />
	<EnableGameActor />
	<EnablePixiExtension />

	<Container filters={introBlurFilter ? [introBlurFilter] : []}>
		<Background />

		{#if !context.stateLayout.showLoadingScreen}
			<ResumeBet />
			<!--
			The reason why <Sound /> is rendered after clicking the loading screen:
			"Autoplay with sound is allowed if: The user has interacted with the domain (click, tap, etc.)."
			Ref: https://developer.chrome.com/blog/autoplay
		-->
			<Sound />

			<MainContainer>
				<ReelFrame layer="background" />
			</MainContainer>

			<MainContainer>
				<Board />
				<TumbleBoard />
			</MainContainer>

			<MainContainer>
				<ReelFrame layer="overlay" />
			</MainContainer>

			<MainContainer>
				<BoardDebris />
				<Anticipations />
				<TumbleWinAmount />
				<GazeMeter />
				<ClusterWinAmounts />
			</MainContainer>

			<MainContainer>
				<Eye />
				<PersistentMultiplier />
			</MainContainer>

			<ScatterFx />

			{#if stateUrlDerived.replay()}
				<ReplayControls />
			{:else}
				<ControlBar />
			{/if}
			<Win />
			<ScatterPay />
			<WinCapCelebration />
			{#if ['desktop', 'landscape'].includes(context.stateLayoutDerived.layoutType())}
				<FreeSpinCounter />
			{/if}
			<FreeSpinOutro />
			<GameHeader />
		{/if}
	</Container>

	{#if !context.stateLayout.showLoadingScreen}
		<FreeSpinIntro />
		<FreeSpinRetrigger />
		<Transition />
	{/if}
</App>

<Modals>
	{#snippet version()}
		<GameVersion version="0.0.0" />
	{/snippet}
	{#snippet gameRules()}
		<GameInfo />
	{/snippet}
	{#snippet buyBonus()}
		<BuyBonusModal />
	{/snippet}
</Modals>
