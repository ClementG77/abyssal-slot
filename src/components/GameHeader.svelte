<script lang="ts">
	import { onMount } from 'svelte';

	import { Container, Text } from 'pixi-svelte';
	import { stateModal } from 'state-shared';

	import { getContext } from '../game/context';
	import config from '../game/config';
	import { C, FONT } from './controls/theme';

	// Very subtle header — live HH:MM clock on the top-left, slot name on the top-right.
	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());

	const nameText = config.gameName.toUpperCase();

	let now = $state(new Date());
	onMount(() => {
		const id = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(id);
	});
	const timeText = $derived(
		now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
	);

	const scale = $derived(Math.max(0.6, Math.min(1, canvas.width / 1200)));
	const pad = $derived(Math.round(26 * scale));
	const fontSize = $derived(Math.round(18 * scale));

	// ONE colour for both header elements. They previously ran a pale cyan clock against a warm
	// gold name — two competing hues at the top of the screen, and neither was an actual palette
	// value (each was a near-miss of one). They now share C.chrome and are separated by WEIGHT and
	// ALPHA instead of by hue, which keeps the slot name reading as the more important of the two
	// without introducing a second colour temperature up there.
	//
	// Gold is left to the control bar's readouts, where it means "this is a number that matters".
	// Spending it on a static title dilutes that.
	const baseTextStyle = $derived({
		fontFamily: FONT,
		fontSize,
		letterSpacing: 4,
		fill: C.chrome,
	});
	const timeStyle = $derived({
		...baseTextStyle,
		fontWeight: '500' as const,
	});
	const nameStyle = $derived({
		...baseTextStyle,
		fontWeight: '700' as const,
	});
</script>

<!-- hidden while any popup/modal is open (buy bonus, game rules, bet menu, …) -->
{#if !stateModal.modal}
	<Container>
		<!-- alpha carries the hierarchy now that hue no longer does: the clock is ambient, the slot
		     name is the header's one piece of identity. 0.95 vs 1 read as the same weight. -->
		<Text x={pad} y={pad} anchor={{ x: 0, y: 0 }} alpha={0.6} text={timeText} style={timeStyle} />
		<Text
			x={canvas.width - pad}
			y={pad}
			anchor={{ x: 1, y: 0 }}
			alpha={0.85}
			text={nameText}
			style={nameStyle}
		/>
	</Container>
{/if}
