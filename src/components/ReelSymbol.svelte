<script lang="ts">
	import Symbol from './Symbol.svelte';
	import SymbolWrap from './SymbolWrap.svelte';
	import { getSymbolInfo, getSymbolX } from '../game/utils';
	import { REEL_CELL_HEIGHT } from '../game/constants';
	import type { ReelSymbol } from '../game/stateGame.svelte';

	type Props = {
		reelIndex: number;
		reelSymbol: ReelSymbol;
	};

	const props: Props = $props();
	const symbolInfo = $derived(
		getSymbolInfo({ rawSymbol: props.reelSymbol.rawSymbol, state: props.reelSymbol.symbolState }),
	);
	// Per-cell phase for the win warp and the idle drift. Row is quantised from the live Y so it
	// stays constant while the symbol is settled (idle only runs when static, so the tumble's
	// moving Y never shifts it mid-effect).
	const phase = $derived(
		props.reelIndex * 2.3 +
			Math.round(props.reelSymbol.symbolY.current / REEL_CELL_HEIGHT) * 1.1,
	);
</script>

<SymbolWrap
	x={getSymbolX(props.reelIndex)}
	y={props.reelSymbol.symbolY.current}
	animating={symbolInfo.type === 'spine' &&
		(props.reelSymbol.symbolState === 'land' || props.reelSymbol.symbolState === 'win')}
>
	<Symbol
		{phase}
		state={props.reelSymbol.symbolState}
		rawSymbol={props.reelSymbol.rawSymbol}
		oncomplete={() => {
			if (props.reelSymbol.symbolState === 'win') props.reelSymbol.oncomplete();
			if (props.reelSymbol.symbolState === 'land') {
				props.reelSymbol.oncomplete();
				props.reelSymbol.symbolState = 'static';
			}
		}}
	/>
</SymbolWrap>
