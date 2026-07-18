<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	export type EmitterEventBoard =
		| { type: 'boardSettle'; board: RawSymbol[][] }
		| { type: 'boardShow' }
		| { type: 'boardHide' }
		// The Eye lands heavy enough to jolt the whole board (on its drop only — NOT on reveal).
		| { type: 'boardEyeImpact'; position?: Position }
		| {
				type: 'boardWithAnimateSymbols';
				// each winning cell may carry its cluster's essence tier (1/2/3 by size) so the win
				// glow ramps hotter for bigger clusters; absent for non-cluster wins (e.g. scatters)
				symbolPositions: (Position & { winTier?: 1 | 2 | 3 })[];
		  };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { waitForResolve } from 'utils-shared/wait';
	import { BoardContext } from 'components-shared';

	import { getContext } from '../game/context';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import BoardBase from './BoardBase.svelte';
	import { getPaddedRowIndex } from '../game/utils';

	const context = getContext();

	let show = $state(true);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => context.stateGameDerived.enhancedBoard.stop(),
		boardSettle: ({ board }) => context.stateGameDerived.enhancedBoard.settle(board),
		boardShow: () => (show = true),
		boardHide: () => (show = false),
		boardWithAnimateSymbols: async ({ symbolPositions }) => {
			// clusters can share a cell (e.g. a wild counted in two wins), so the same
			// position may appear twice — de-dupe or the duplicate overwrites `oncomplete`
			// and Promise.all never resolves (sequence hangs).
			const uniquePositions = _.uniqBy(symbolPositions, ({ reel, row }) => `${reel}-${row}`);
			const getPromises = () =>
				uniquePositions.map(async (position) => {
					const reelSymbol =
						context.stateGame.board[position.reel]?.reelState.symbols[
							getPaddedRowIndex(position.row)
						];
					if (!reelSymbol) return;
					// tag the cell with its cluster's essence tier so the win glow ramps hotter for
					// bigger clusters (Symbol.svelte). Cleared naturally when the cell explodes/resettles.
					if (position.winTier) {
						reelSymbol.rawSymbol = { ...reelSymbol.rawSymbol, winTier: position.winTier };
					}
					reelSymbol.symbolState = 'win';
					await waitForResolve((resolve) => (reelSymbol.oncomplete = resolve));
					reelSymbol.symbolState = 'postWinStatic';
				});

			await Promise.all(getPromises());
		},
	});

	context.stateGameDerived.enhancedBoard.readyToSpinEffect();
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<BoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<BoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
