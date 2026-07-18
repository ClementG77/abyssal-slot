<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import { stateUrlDerived } from 'state-shared';
	import Game from '../components/Game.svelte';
	import AbyssalLoader from '../components/AbyssalLoader.svelte';
	import AbyssalBootLoader from '../components/AbyssalBootLoader.svelte';
	import { getContext, setContext } from '../game/context';

	import messagesMap, { socialMessagesMap } from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	setContext();
	const context = getContext();

	// Social casino (Stake.US, `?social=true`): swap in the English-only, restricted-word-free
	// table. Read once at mount like the rest of the URL config — the jurisdiction can't change
	// mid-session, and LoadI18n only reads this on mount anyway.
	const activeMessagesMap = stateUrlDerived.social() ? socialMessagesMap : messagesMap;

	// The boot splash owns the asset preload; the card loader only mounts at handoff, so its
	// entrance animations play underneath the splash's dissolve (a real cross-fade) instead of
	// running invisibly at app start.
	let showMainLoader = $state(false);

	// Bet Replay must "auto-load without interaction" — a shared replay link can be opened cold,
	// with no session, straight off a chat/social link. The branded AbyssalLoader screen (hacksaw
	// card carousel + a deliberate click-to-continue gate) is the right first impression for a
	// NEW player choosing to play, but it's pure friction in front of someone just watching a
	// shared result. So in replay mode, skip it: once the boot splash's asset preload finishes,
	// go straight to `showLoadingScreen = false` (the flag Game.svelte / ReplayControls gate on)
	// instead of mounting AbyssalLoader. The splash's own ~0.9s dissolve (AbyssalBootLoader.svelte)
	// still plays either way, so the reveal is never an abrupt cut.
	const onBootHandoff = () => {
		if (stateUrlDerived.replay()) {
			context.stateLayout.showLoadingScreen = false;
		} else {
			showMainLoader = true;
		}
	};
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n messagesMap={activeMessagesMap}>
			<Game />
			<!-- Both loader screens read localized copy, so they must mount after the locale is
			     active. The boot splash sits on top (z 1100 vs 1000) until it fades. -->
			{#if showMainLoader}
				<AbyssalLoader />
			{/if}
			<AbyssalBootLoader onhandoff={onBootHandoff} />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

{@render props.children()}
