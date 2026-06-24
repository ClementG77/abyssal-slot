<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Components/<AbyssalEye>',
		component: AbyssalEye,
	});
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Text } from 'pixi-svelte';
	import { StoryPixiApp } from 'components-storybook';

	import AbyssalEye from '../components/AbyssalEye.svelte';
	import assets from '../game/assets';

	const SIZE = 150;
	const label = (text: string, x: number, y: number) => ({ text, x, y });

	// A self-restarting cycle so reveal/burst keep replaying for side-by-side comparison.
	let cycle = $state(0);
	onMount(() => {
		const id = setInterval(() => (cycle += 1), 2600);
		return () => clearInterval(id);
	});

	const INTENSITY = [0, 0.25, 0.5, 0.75, 1];
</script>

<!-- Idle, alive: blink + sway + breathing glow, no reveal/burst. -->
<Story name="idle">
	{#snippet template()}
		<StoryPixiApp {assets}>
			<Container x={180} y={220}>
				<AbyssalEye size={SIZE} variant="close" />
				<Text {...label('CLOSE', 0, 130)} anchor={0.5} style={{ fill: 0xeaf6ff, fontSize: 20 }} />
			</Container>
			<Container x={420} y={220}>
				<AbyssalEye size={SIZE} variant="add" text="5" reveal />
				<Text {...label('ADD', 0, 130)} anchor={0.5} style={{ fill: 0xeaf6ff, fontSize: 20 }} />
			</Container>
			<Container x={660} y={220}>
				<AbyssalEye size={SIZE} variant="mult" text="8" reveal />
				<Text {...label('MULT', 0, 130)} anchor={0.5} style={{ fill: 0xeaf6ff, fontSize: 20 }} />
			</Container>
		</StoryPixiApp>
	{/snippet}
</Story>

<!-- Tension build-up: the closed Eye brightens as the Gaze charge (intensity) climbs. -->
<Story name="intensity">
	{#snippet template()}
		<StoryPixiApp {assets}>
			<Container x={130} y={200}>
				{#each INTENSITY as value, i}
					<Container x={i * 180}>
						<AbyssalEye size={SIZE} variant="close" intensity={value} />
						<Text
							{...label(`${Math.round(value * 100)}%`, 0, 130)}
							anchor={0.5}
							style={{ fill: 0xeaf6ff, fontSize: 20 }}
						/>
					</Container>
				{/each}
			</Container>
		</StoryPixiApp>
	{/snippet}
</Story>

<!-- The full resolve beat replayed on a loop: land → reveal → pulse → burst. -->
<Story name="reveal+burst">
	{#snippet template()}
		<StoryPixiApp {assets}>
			{#key cycle}
				<Container x={300} y={230}>
					<AbyssalEye size={SIZE * 1.2} variant="add" text="12" land reveal pulse burst />
					<Text {...label('ADD', 0, 150)} anchor={0.5} style={{ fill: 0xeaf6ff, fontSize: 22 }} />
				</Container>
				<Container x={560} y={230}>
					<AbyssalEye size={SIZE * 1.2} variant="mult" text="40" land reveal pulse burst />
					<Text {...label('MULT', 0, 150)} anchor={0.5} style={{ fill: 0xeaf6ff, fontSize: 22 }} />
				</Container>
			{/key}
		</StoryPixiApp>
	{/snippet}
</Story>
