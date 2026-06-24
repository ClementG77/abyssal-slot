<script lang="ts">
	import { Rectangle } from 'pixi-svelte';

	import { REEL_DISPLAY_GRID } from '../game/constants';

	type Props = { debug?: boolean };

	const props: Props = $props();
</script>

{#if props.debug}
	<Rectangle
		alpha={0.5}
		backgroundColor={0xffffff}
		width={REEL_DISPLAY_GRID.width}
		height={REEL_DISPLAY_GRID.height}
	/>
{/if}

<Rectangle
	isMask
	width={REEL_DISPLAY_GRID.width}
	height={REEL_DISPLAY_GRID.height}
/>
