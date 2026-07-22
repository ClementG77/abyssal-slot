<script lang="ts">
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolX, getSymbolInfo } from '../game/utils';
	import { REEL_CELL_HEIGHT } from '../game/constants';
	import type { TumbleSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		tumbleSymbol: TumbleSymbol;
	};

	const props: Props = $props();
	const symbolInfo = $derived(
		getSymbolInfo({
			rawSymbol: props.tumbleSymbol.rawSymbol,
			state: props.tumbleSymbol.symbolState,
		}),
	);
	// Per-cell phase for the win warp and the idle drift. Row is quantised from the live Y so it
	// stays constant while the symbol is settled (idle only runs when static, so the tumble's
	// moving Y never shifts it mid-effect).
	const phase = $derived(
		props.reelIndex * 2.3 +
			Math.round(props.tumbleSymbol.symbolY.current / REEL_CELL_HEIGHT) * 1.1,
	);
</script>

<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.tumbleSymbol.symbolY.current}
	animating={symbolInfo.type === 'spine'}
>
	<Symbol
		{phase}
		state={props.tumbleSymbol.symbolState}
		rawSymbol={props.tumbleSymbol.rawSymbol}
		oncomplete={props.tumbleSymbol.oncomplete}
	/>
</SymbolWrap>
