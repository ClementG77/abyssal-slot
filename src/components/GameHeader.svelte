<script lang="ts">
	import { onMount } from 'svelte';

	import { Container, Text } from 'pixi-svelte';

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

	const baseTextStyle = $derived({
		fontFamily: FONT,
		fontWeight: '600' as const,
		fontSize,
		letterSpacing: 4,
	});
	const timeStyle = $derived({
		...baseTextStyle,
		fill: 0xd8fbff,
	});
	const nameStyle = $derived({
		...baseTextStyle,
		fill: 0xffdf91,
	});
</script>

<Container>
	<Text x={pad} y={pad} anchor={{ x: 0, y: 0 }} alpha={0.95} text={timeText} style={timeStyle} />
	<Text
		x={canvas.width - pad}
		y={pad}
		anchor={{ x: 1, y: 0 }}
		alpha={1}
		text={nameText}
		style={nameStyle}
	/>
</Container>
