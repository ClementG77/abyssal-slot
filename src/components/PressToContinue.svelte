<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// Code-drawn prompt (replaces the cloned pressToContinueText sprite).
	type Props = {
		onpress: () => void;
		// Spacebar handler. Defaults to `onpress`. Pass a separate one to give the keyboard
		// different behaviour than a screen tap (Win uses this so a HELD spacebar — turbo — can't
		// skip through the win steps, while a screen tap still can).
		onspace?: () => void;
		// Whether to render the "tap to continue" prompt text. Defaults to true; Win only shows it
		// once the count-up has finished, so it's not on screen during the celebration.
		showPrompt?: boolean;
	};

	const props: Props = $props();
	const context = getContext();
	const showPrompt = $derived(props.showPrompt ?? true);
</script>

<!-- The prompt must be the LAST child of its takeover (Win / WinCapCelebration / FreeSpinOutro
     render in tree order — no sortableChildren anywhere up this tree), and the takeovers are in
     turn the last children of the game container, so this text is guaranteed topmost on screen.
     The dark shadow keeps it readable over the bubble fountain that sprays from the bottom —
     exactly where this sits. -->
{#if showPrompt}
	<MainContainer alignVertical="bottom">
		<Text
			anchor={{ x: 0.5, y: 1 }}
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height - 60}
			text={context.i18nDerived.tapToContinue()}
			style={{
				fontFamily: 'sans-serif',
				fontWeight: '800',
				fontSize: 38,
				fill: 0xeaf6ff,
				letterSpacing: 3,
				dropShadow: { color: 0x000000, blur: 8, distance: 2, alpha: 0.85 },
			}}
		/>
	</MainContainer>
{/if}
<OnHotkey hotkey="Space" onpress={() => (props.onspace ?? props.onpress)()} />
<OnPressFullScreen onpress={() => props.onpress()} />
