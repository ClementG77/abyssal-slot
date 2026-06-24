<script lang="ts">
	import { Container, Graphics, Text } from 'pixi-svelte';

	import { C, FONT } from './theme';

	type Props = {
		x?: number;
		y?: number;
		width?: number;
		label: string;
		value: string;
		accent?: boolean;
		onpress?: () => void;
	};

	const props: Props = $props();
	const width = $derived(props.width ?? 220);
	const height = 62;

	const draw = (g: import('pixi.js').Graphics) => {
		g.roundRect(-width / 2, -height / 2, width, height, 12).fill({ color: C.navy, alpha: 0.4 });
		g.roundRect(-width / 2, -height / 2, width, height, 12).stroke({
			width: 1.5,
			color: C.cyan,
			alpha: 0.28,
		});
	};
</script>

<Container
	x={props.x}
	y={props.y}
	eventMode={props.onpress ? 'static' : 'auto'}
	cursor={props.onpress ? 'pointer' : 'default'}
	onpointerup={props.onpress}
>
	<Graphics {draw} />
	<Text
		anchor={0.5}
		y={-13}
		text={props.label}
		style={{
			fontFamily: FONT,
			fontWeight: '700',
			fontSize: 12,
			fill: C.textDim,
			letterSpacing: 1.5,
		}}
	/>
	<Text
		anchor={0.5}
		y={11}
		text={props.value}
		style={{
			fontFamily: FONT,
			fontWeight: '800',
			fontSize: 22,
			fill: props.accent ? C.amber : C.text,
		}}
	/>
</Container>
