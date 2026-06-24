<script lang="ts">
	import { Container, Graphics, Rectangle, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';

	import { icons, type IconKey } from './icons';
	import { C, FONT } from './theme';

	type Props = {
		x?: number;
		y?: number;
		size?: number;
		icon?: IconKey;
		label?: string;
		onpress: () => void;
		disabled?: boolean;
		active?: boolean;
		primary?: boolean; // amber call-to-action treatment
		round?: boolean;
		flat?: boolean; // bare icon, no panel/rim (Gates-style top-bar icons)
	};

	const props: Props = $props();
	const size = $derived(props.size ?? 96);
</script>

<Button
	x={props.x}
	y={props.y}
	anchor={0.5}
	sizes={{ width: size, height: size }}
	disabled={props.disabled}
	onpress={props.onpress}
>
	{#snippet children({ center, hovered, pressed })}
		{#if props.flat}
			{@const fc = props.disabled
				? C.iconDisabled
				: props.active
					? C.cyan
					: hovered || pressed
						? C.white
						: C.textDim}
			<Container x={center.x} y={center.y}>
				<Rectangle
					anchor={0.5}
					width={size}
					height={size}
					backgroundColor={0x000000}
					backgroundAlpha={0.001}
				/>
				<Container scale={pressed ? 0.92 : hovered ? 1.08 : 1}>
					{#if props.icon}
						<Graphics draw={(g) => icons[props.icon!](g, size * 0.9, fc)} />
					{/if}
				</Container>
			</Container>
		{:else}
			{@const accent = props.primary ? C.amber : C.cyan}
			{@const filled = props.primary || props.active}
			{@const iconColor = props.disabled ? C.iconDisabled : filled ? C.navyDeep : accent}
			{@const s = size}
			{@const h = s / 2}
			{@const r = props.round ? h : s * 0.24}
			{@const fillAlpha = props.disabled
				? 0.3
				: filled
					? 0.95
					: pressed
						? 0.62
						: hovered
							? 0.52
							: 0.42}
			{@const rimAlpha = props.disabled ? 0.18 : filled || hovered || pressed ? 1 : 0.55}
			{@const draw = (g: import('pixi.js').Graphics) => {
				if (props.round)
					g.circle(0, 0, h + 3).stroke({ width: 1.5, color: accent, alpha: rimAlpha * 0.3 });
				else
					g.roundRect(-h - 3, -h - 3, s + 6, s + 6, r + 3).stroke({
						width: 1.5,
						color: accent,
						alpha: rimAlpha * 0.3,
					});
				const panelColor = filled ? accent : C.navy;
				if (props.round) g.circle(0, 0, h).fill({ color: panelColor, alpha: fillAlpha });
				else g.roundRect(-h, -h, s, s, r).fill({ color: panelColor, alpha: fillAlpha });
				if (!filled)
					g.roundRect(-h + 3, -h + 3, s - 6, h * 0.7, r).fill({ color: 0xffffff, alpha: 0.06 });
				if (props.round) g.circle(0, 0, h).stroke({ width: 2.5, color: accent, alpha: rimAlpha });
				else g.roundRect(-h, -h, s, s, r).stroke({ width: 2.5, color: accent, alpha: rimAlpha });
			}}

			<Container x={center.x} y={center.y}>
				<!-- constant full-size hit target (so press-scaling never moves the click area) -->
				<Rectangle
					anchor={0.5}
					width={size}
					height={size}
					backgroundColor={0x000000}
					backgroundAlpha={0.001}
				/>
				<Container scale={pressed ? 0.94 : hovered ? 1.04 : 1}>
					<Graphics {draw} />
					{#if props.icon}
						<Graphics draw={(g) => icons[props.icon!](g, size * 0.52, iconColor)} />
					{/if}
					{#if props.label}
						<Text
							anchor={0.5}
							text={props.label}
							style={{ fontFamily: FONT, fontWeight: '800', fontSize: size * 0.2, fill: iconColor }}
						/>
					{/if}
				</Container>
			</Container>
		{/if}
	{/snippet}
</Button>
