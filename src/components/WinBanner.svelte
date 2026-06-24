<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { Container, Sprite } from 'pixi-svelte';

	// The win-tier banner sprite. Pops with a quick scale punch whenever the tier escalates
	// (big → mega → epic …) so the upgrade reads clearly as the count-up crosses thresholds.
	type Props = {
		tierKey: 'bigWin' | 'megaWin' | 'epicWin' | 'maxWin';
		width: number;
		height: number;
	};

	const props: Props = $props();
	const scale = new Tween(1, { duration: 240, easing: backOut });

	let prev: string | undefined;
	$effect(() => {
		const key = props.tierKey;
		if (prev !== undefined && prev !== key) {
			// each escalation (big → mega → epic → max) snaps bigger then settles
			scale.set(1.3, { duration: 0 });
			scale.set(1, { duration: 340, easing: backOut });
		}
		prev = key;
	});
</script>

<Container scale={scale.current}>
	<Sprite anchor={0.5} key={props.tierKey} width={props.width} height={props.height} />
</Container>
