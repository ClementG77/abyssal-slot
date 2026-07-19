<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import type { TextStyleOptions } from 'pixi.js';

	// Canvas-Text counterpart of components-pixi's ResponsiveBitmapText: renders `text` and scales
	// it DOWN (never up) so it never exceeds `maxWidth`. Without this, a long amount — a big win in
	// a 0-decimal currency, or one with a wide symbol like "CFA" — overflows its plaque instead of
	// shrinking to fit, which is what the bitmap version was doing for us.
	//
	// Measure-then-scale needs the natural width, so an invisible copy is measured and the visible
	// one is scaled. Same two-pass trick ResponsiveBitmapText uses.
	// `tint` MUST be forwarded. pixi-svelte's own <Text> takes arbitrary PIXI.TextOptions and syncs
	// them onto the object, so callers reasonably expect tint to work here too — but this is our
	// component with its own Props, and an unknown prop is silently dropped rather than erroring.
	// WinBanner's additive headline bloom passed `tint` for months and got an UNTINTED white copy,
	// which additively blew the title's gradient out to white while the amount beside it kept its
	// colour. That is why the celebration title never matched the amount.
	type Props = {
		text: string;
		style: TextStyleOptions;
		maxWidth: number;
		anchor?: number;
		x?: number;
		y?: number;
		tint?: number;
	};

	const props: Props = $props();

	let naturalWidth = $state(0);
	const scale = $derived(naturalWidth > 0 ? Math.min(props.maxWidth / naturalWidth, 1) : 1);
</script>

<Container visible={false}>
	<Text
		text={props.text}
		style={props.style}
		anchor={props.anchor ?? 0.5}
		onresize={(sizes) => (naturalWidth = sizes.width)}
	/>
</Container>

<Container x={props.x ?? 0} y={props.y ?? 0} {scale}>
	<!-- tint only on the visible copy; the measuring pass above is invisible and colour-blind -->
	<Text
		text={props.text}
		style={props.style}
		anchor={props.anchor ?? 0.5}
		tint={props.tint ?? 0xffffff}
	/>
</Container>
