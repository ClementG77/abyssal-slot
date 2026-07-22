<script lang="ts" module>
	export type Props = {
		/** already-formatted currency string */
		text: string;
	};
</script>

<script lang="ts">
	import { Graphics, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		drawGlassPanel,
		readoutLabelStyle,
		readoutValueStyle,
		WIN_PANEL,
	} from './controls/glass';

	// ---------------------------------------------------------------------------------------------
	// THE win panel — one component, rendered by both the main control bar and the replay bar.
	//
	// It exists as a component rather than as shared constants because "identical" is a promise that
	// two call sites cannot keep on their own: the replay bar previously had its own hand-built plate
	// that matched in colour but not in alpha, and its own label/value colours that matched the
	// replay bar rather than the game's readout identity. Rendering the same component makes the two
	// impossible to tell apart, and impossible to drift.
	//
	// Positioning and visibility belong to the CALLER — each bar places this where its own layout
	// needs it. This owns only what the panel looks like.
	// ---------------------------------------------------------------------------------------------

	const props: Props = $props();
	const context = getContext();
</script>

<Graphics
	draw={(g) => drawGlassPanel(g, WIN_PANEL.width, WIN_PANEL.height, WIN_PANEL.radius)}
/>
<!-- same readout identity as Balance / Bet: warm gold label, white value -->
<Text
	anchor={0.5}
	y={WIN_PANEL.labelY}
	text={context.i18nDerived.win()}
	style={{ ...readoutLabelStyle, fontSize: WIN_PANEL.labelFontSize }}
/>
<Text
	anchor={0.5}
	y={WIN_PANEL.valueY}
	text={props.text}
	style={{ ...readoutValueStyle, fontSize: WIN_PANEL.valueFontSize }}
/>
