<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	const { Story } = defineMeta({
		title: 'Components/<GazeBar>',
		component: GazeBar,
	});
</script>

<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { StoryPixiApp } from 'components-storybook';

	import GazeBar from '../components/GazeBar.svelte';
	import assets from '../game/assets';

	const LEVELS = [0, 0.25, 0.5, 0.75, 1];
	const W = 56;
	const H = 380;
	const GAP = 130;
</script>

<Story name="levels">
	{#snippet template()}
		<StoryPixiApp {assets}>
			<Container x={140} y={90}>
				{#each LEVELS as level, i}
					<GazeBar x={i * GAP} y={0} width={W} height={H} fill={level} />
					<Text
						x={i * GAP + W / 2}
						y={H + 24}
						anchor={0.5}
						text={`${Math.round(level * 10)}`}
						style={{ fontFamily: 'sans-serif', fontWeight: '800', fontSize: 22, fill: 0xeaf6ff }}
					/>
				{/each}
			</Container>
		</StoryPixiApp>
	{/snippet}
</Story>
