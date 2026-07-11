<script lang="ts" module>
	export type RawWin = {
		win: number; // raw cluster win (cents-of-bet); the Eye multiplies the spin total later
		count: number; // symbols in the cluster — sizes the label by essence tier (8-9/10-11/12+)
		reel: number; // 0..5
		row: number; // 1..5 (visible rows; excludes the padded top/bottom)
	};
	export type Win = RawWin & { oncomplete: () => void };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { BitmapText, Container } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { SECOND } from 'constants-shared/time';
	import { FadeContainer } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { abyssalBitmapStyle, getEssenceTier, SYMBOL_SIZE } from '../game/constants';
	import { getPositionX, getPositionY } from '../game/utils';

	type Props = { win: Win };

	const props: Props = $props();
	const y = new Tween(0);
	const scale = new Tween(0.4, { duration: 150, easing: backOut });
	let show = $state(true);

	// The branded gold bitmap face (same as the tumble-win banner / takeover amounts), SIZED BY
	// THE CLUSTER'S ESSENCE TIER — a 10-11 or 12+ cluster visibly outranks an ordinary 8-9,
	// matching the +2/+3/+5 essence it charges. The 12+ hero also floats a touch further.
	const TIER_LABEL_SCALE = [1, 1.22, 1.5] as const;
	const TIER_FLOAT_SCALE = [1, 1.1, 1.25] as const;
	const tier = $derived(getEssenceTier(props.win.count ?? 8));
	const labelStyle = $derived(
		abyssalBitmapStyle({ fontSize: SYMBOL_SIZE * 0.34 * TIER_LABEL_SCALE[tier - 1] }),
	);

	// snappy: pop in, a SHORT float up, then fade — this is awaited by winInfo, so its length
	// directly paces the whole win → tumble rhythm. Keep it tight.
	onMount(async () => {
		scale.set(1);
		await y.set(-SYMBOL_SIZE * 0.6 * TIER_FLOAT_SCALE[tier - 1], {
			duration: (SECOND * 0.36) / stateBetDerived.timeScale(),
		});
		show = false;
	});
</script>

<FadeContainer
	{show}
	duration={130}
	oncomplete={() => {
		if (!show) props.win.oncomplete();
	}}
>
	<Container
		x={getPositionX(props.win.reel)}
		y={getPositionY(props.win.row) + y.current}
		scale={scale.current}
	>
		<BitmapText
			anchor={0.5}
			text={bookEventAmountToCurrencyString(props.win.win)}
			style={labelStyle}
		/>
	</Container>
</FadeContainer>
