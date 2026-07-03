<script lang="ts" module>
	export type RawWin = {
		win: number; // raw cluster win (cents-of-bet); the Eye multiplies the spin total later
		reel: number; // 0..5
		row: number; // 1..5 (visible rows; excludes the padded top/bottom)
	};
	export type Win = RawWin & { oncomplete: () => void };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { Text } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { SECOND } from 'constants-shared/time';
	import { FadeContainer } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { SYMBOL_SIZE } from '../game/constants';
	import { getPositionX, getPositionY } from '../game/utils';

	type Props = { win: Win };

	const props: Props = $props();
	const y = new Tween(0);
	const scale = new Tween(0.4, { duration: 150, easing: backOut });
	let show = $state(true);

	// snappy: pop in, a SHORT float up, then fade — this is awaited by winInfo, so its length
	// directly paces the whole win → tumble rhythm. Keep it tight.
	onMount(async () => {
		scale.set(1);
		await y.set(-SYMBOL_SIZE * 0.62, { duration: (SECOND * 0.42) / stateBetDerived.timeScale() });
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
	<Text
		x={getPositionX(props.win.reel)}
		y={getPositionY(props.win.row) + y.current}
		scale={scale.current}
		text={bookEventAmountToCurrencyString(props.win.win)}
		anchor={0.5}
		style={{
			fontFamily: 'sans-serif',
			fontWeight: '800',
			fontSize: SYMBOL_SIZE * 0.5,
			fill: 0xffd27a,
		}}
	/>
</FadeContainer>
