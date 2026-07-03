<script lang="ts" module>
	import type { RawSymbol, Position } from '../game/types';

	type AddingBoard = RawSymbol[][];
	type ExplodingPositions = Position[];

	export type EmitterEventTumbleBoard =
		| { type: 'tumbleBoardShow' }
		| { type: 'tumbleBoardHide' }
		| { type: 'tumbleBoardInit'; addingBoard: AddingBoard }
		| { type: 'tumbleBoardReset' }
		| { type: 'tumbleBoardExplode'; explodingPositions: ExplodingPositions }
		| { type: 'tumbleBoardRemoveExploded' }
		| { type: 'tumbleBoardSlideDown' };
</script>

<script lang="ts">
	import _ from 'lodash';
	import { Tween } from 'svelte/motion';
	import { backOut } from 'svelte/easing';

	import { BoardContext } from 'components-shared';
	import { stateBetDerived } from 'state-shared';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';

	import TumbleBoardBase from './TumbleBoardBase.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import { getPaddedRowIndex, getSymbolInfo, getSymbolY } from '../game/utils';
	import { getContext } from '../game/context';

	const context = getContext();

	let show = $state(false);

	const createTumbleSymbol = ({ initY, rawSymbol }: { initY: number; rawSymbol: RawSymbol }) => {
		const symbolY = new Tween(initY);
		const oncomplete = () => {};

		const tumbleSymbol = $state({
			symbolY,
			rawSymbol,
			symbolState: 'static' as const,
			oncomplete,
		});

		return tumbleSymbol;
	};

	const initTumbleBoardAdding = ({ addingBoard }: { addingBoard: AddingBoard }) => {
		return context.stateGameDerived.boardRaw().map((_, reelIndex) => {
			const addingReel = addingBoard[reelIndex] ?? [];

			const tumbleReelAdding = addingReel.map((rawSymbol, symbolIndex) => {
				const initY = getSymbolY(symbolIndex - 1 - addingReel.length);
				return createTumbleSymbol({ initY, rawSymbol });
			});

			return tumbleReelAdding;
		});
	};

	const initTumbleBoardBase = () => {
		return context.stateGameDerived.boardRaw().map((rawSymbolReel) => {
			const tumbleReelBase = rawSymbolReel.map((rawSymbol, symbolIndex) => {
				const initY = getSymbolY(symbolIndex - 1);
				return createTumbleSymbol({ initY, rawSymbol });
			});

			return tumbleReelBase;
		});
	};

	context.eventEmitter.subscribeOnMount({
		tumbleBoardShow: () => (show = true),
		tumbleBoardHide: () => (show = false),
		tumbleBoardInit: ({ addingBoard }) => {
			context.stateGame.tumbleBoardAdding = initTumbleBoardAdding({ addingBoard });
			context.stateGame.tumbleBoardBase = initTumbleBoardBase();
		},
		tumbleBoardReset: () => {
			context.stateGame.tumbleBoardAdding = [];
			context.stateGame.tumbleBoardBase = [];
		},
		tumbleBoardExplode: async ({ explodingPositions }) => {
			// the same cell can be listed twice (shared wild across two clusters); de-dupe so a
			// duplicate doesn't overwrite `oncomplete` and stall Promise.all.
			const uniquePositions = _.uniqBy(explodingPositions, ({ reel, row }) => `${reel}-${row}`);

			// hand the flying shards to the board-level debris layer (coloured per symbol)
			context.eventEmitter.broadcast({
				type: 'boardDebris',
				cells: uniquePositions.flatMap((position) => {
					const tumbleSymbol =
						context.stateGame.tumbleBoardBase[position.reel]?.[getPaddedRowIndex(position.row)];
					if (!tumbleSymbol) return [];
					return [
						{
							reel: position.reel,
							row: position.row,
							color: getSymbolInfo({ rawSymbol: tumbleSymbol.rawSymbol, state: 'explosion' }).color,
						},
					];
				}),
			});

			const getPromises = () =>
				uniquePositions.map(async (position) => {
					const tumbleSymbol =
						context.stateGame.tumbleBoardBase[position.reel]?.[getPaddedRowIndex(position.row)];
					if (!tumbleSymbol) return;
					tumbleSymbol.symbolState = 'explosion';
					await waitForResolve((resolve) => (tumbleSymbol.oncomplete = resolve));
				});

			await Promise.all(getPromises());
		},
		tumbleBoardRemoveExploded: () => {
			context.stateGame.tumbleBoardBase.forEach((tumbleReel, reelIndex) => {
				context.stateGame.tumbleBoardBase[reelIndex] = tumbleReel.filter(
					(tumbleSymbol) => tumbleSymbol.symbolState !== 'explosion',
				);
			});
		},
		tumbleBoardSlideDown: async () => {
			// Drop the refill reel-by-reel (left → right), like the initial spin, instead of every
			// column at once.
			const COLUMN_STAGGER = 80;
			const ts = stateBetDerived.timeScale();
			const getPromises = () =>
				context.stateGameDerived.tumbleBoardCombined().map(async (tumbleReel, reelIndex) => {
					if (reelIndex > 0) await waitForTimeout((reelIndex * COLUMN_STAGGER) / ts);

					await Promise.all(
						tumbleReel.map(async (tumbleSymbol, symbolIndex) => {
							const targetY = getSymbolY(symbolIndex - 1); // Refer to initTumbleBoardBase
							if (targetY === tumbleSymbol.symbolY.current) return;

							await tumbleSymbol.symbolY.set(targetY, { duration: 200, easing: backOut });

							const isInner = symbolIndex > 0 && symbolIndex < tumbleReel.length - 1;
							// The Eye only animates on its real land (the initial drop). During cascade
							// refills it just slides into place — no bounce, no re-trigger.
							if (isInner && tumbleSymbol.rawSymbol.name !== 'EYE') {
								tumbleSymbol.symbolState = 'land';
								context.stateGameDerived.onSymbolLand({ rawSymbol: tumbleSymbol.rawSymbol });
								await waitForResolve((resolve) => {
									tumbleSymbol.oncomplete = () => {
										tumbleSymbol.symbolState = 'static';
										resolve();
									};
								});
							}
						}),
					);
				});

			await Promise.all(getPromises());
		},
	});
</script>

{#if show}
	<BoardContext animate={false}>
		<BoardContainer>
			<BoardMask />
			<TumbleBoardBase />
		</BoardContainer>
	</BoardContext>

	<BoardContext animate={true}>
		<BoardContainer>
			<TumbleBoardBase />
		</BoardContainer>
	</BoardContext>
{/if}
