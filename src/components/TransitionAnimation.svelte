<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';

	import { Rectangle } from 'pixi-svelte';

	import { getContext } from '../game/context';

	// Code-drawn dark "dive" cover that replaces the cloned `transition` spine: fade to
	// opaque, fire `oncomplete` under cover (so the loading→game swap is hidden), then clear.
	type Props = {
		oncomplete: () => void;
	};

	const props: Props = $props();
	const context = getContext();
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const alpha = new Tween(0, { duration: 320 });

	onMount(async () => {
		await alpha.set(1);
		props.oncomplete();
		await alpha.set(0);
	});
</script>

<Rectangle {...sizes} backgroundColor={0x05080f} backgroundAlpha={alpha.current} />
