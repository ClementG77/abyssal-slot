<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { BlurFilter, Rectangle as PixiRectangle } from 'pixi.js';
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
	import ScatterFx from './ScatterFx.svelte';
	import WinCapCelebration from './WinCapCelebration.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinRetrigger from './FreeSpinRetrigger.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import ScreenLightning from './ScreenLightning.svelte'; // SCREEN LIGHTNING (revertible)
	import SkipPress from './SkipPress.svelte';
	import ControlBar from './ControlBar.svelte';
	import GameHeader from './GameHeader.svelte';
	import ReplayControls from './ReplayControls.svelte';
	import GameInfo from './GameInfo.svelte';
	import BuyBonusModal from './BuyBonusModal.svelte';
	import ErrorModal from './ErrorModal.svelte';

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

	// DETACH the filter entirely when it isn't blurring, rather than leaving a disabled one on the
	// array. This container wraps the WHOLE scene, and a container carrying filters is the trigger
	// for Pixi's render-to-texture path — a full-screen target at the renderer's resolution, which
	// is uncapped devicePixelRatio, so ~12 MB and an extra pass per frame on a 3x phone. Relying on
	// `enabled = false` to avoid that means betting on an internal short-circuit; an empty array
	// cannot be misread. The free-spins intro is a few seconds of a session, so this is off
	// essentially always.
	const introBlurActive = $derived(introBlur.current > 0.05);

	// Clamp the blur's working area to the visible canvas. Without this, the filter texture is
	// sized to the container's BOUNDS — in portrait the cover-scaled background extends far past
	// the tall screen, and on high-DPR mobile that texture exceeds the GPU max size, so the
	// whole blurred scene renders BLACK behind the free-spins intro. Desktop bounds ≈ canvas.
	const introFilterArea = $derived.by(() => {
		const sizes = context.stateLayoutDerived.canvasSizes();
		return new PixiRectangle(0, 0, sizes.width, sizes.height);
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

	<Container
		filters={introBlurFilter && introBlurActive ? [introBlurFilter] : []}
		filterArea={introFilterArea}
	>
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

			<!-- SCREEN LIGHTNING: reel-window strike on Eye reveal. Dims + flashes the reel window
			     using the SAME full-window rectangle as Eye.svelte's combine dim, mounted here (above
			     the frame, just below the Eye) so it matches that effect exactly. Revert: delete this
			     block + ScreenLightning.svelte + game/screenLightning.svelte.ts + the
			     fireScreenLightning() call in AbyssalEye.svelte. -->
			<MainContainer>
				<ScreenLightning />
			</MainContainer>

			<MainContainer>
				<Eye />
			</MainContainer>

			<ScatterFx />

			<!-- press-to-skip: clicks on the open screen fast-forward the current beat; sits
			     BELOW the UI and overlays so their own click handling shadows it -->
			<SkipPress />

			{#if stateUrlDerived.replay()}
				<ReplayControls />
			{:else}
				<ControlBar />
			{/if}
			<!-- all layouts — the counter positions itself per layout (portrait: above the board) -->
			<FreeSpinCounter />
			<GameHeader />
			<!-- Celebration takeovers LAST. This container has no sortableChildren, so the zIndex
			     props on their FadeContainers do nothing — TREE ORDER is the layering. Being last
			     is what puts their dim + the tap-to-continue prompt ABOVE the HUD (counter/header);
			     when they sat before the HUD, the header and free-spin counter floated over the
			     celebration and could cover the prompt. -->
			<FreeSpinOutro />
			<Win />
			<WinCapCelebration />
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
	{#snippet error()}
		<ErrorModal />
	{/snippet}
</Modals>
