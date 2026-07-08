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
	import { backOut, quadIn, quadOut } from 'svelte/easing';

	import { BoardContext } from 'components-shared';
	import { stateBet, stateBetDerived } from 'state-shared';
	import { waitForResolve } from 'utils-shared/wait';

	import TumbleBoardBase from './TumbleBoardBase.svelte';
	import BoardContainer from './BoardContainer.svelte';
	import BoardMask from './BoardMask.svelte';
	import {
		REEL_CELL_HEIGHT,
		SPIN_OPTIONS_DEFAULT,
		SPIN_OPTIONS_FAST,
		VISIBLE_ROW_START,
	} from '../game/constants';
	import { raceSkip, skipActive, skippableWait } from '../game/skip.svelte';
	import { getPaddedRowIndex, getSymbolInfo, getSymbolY } from '../game/utils';
	import { getContext } from '../game/context';

	const context = getContext();

	let show = $state(false);

	const createTumbleSymbol = ({
		initY,
		rawSymbol,
		isRefill = false,
	}: {
		initY: number;
		rawSymbol: RawSymbol;
		isRefill?: boolean;
	}) => {
		const symbolY = new Tween(initY);
		const oncomplete = () => {};

		const tumbleSymbol = $state({
			symbolY,
			rawSymbol,
			symbolState: 'static' as const,
			oncomplete,
			isRefill,
		});

		return tumbleSymbol;
	};

	const initTumbleBoardAdding = ({ addingBoard }: { addingBoard: AddingBoard }) => {
		return context.stateGameDerived.boardRaw().map((_, reelIndex) => {
			const addingReel = addingBoard[reelIndex] ?? [];

			const tumbleReelAdding = addingReel.map((rawSymbol, symbolIndex) => {
				const initY = getSymbolY(symbolIndex - 1 - addingReel.length);
				return createTumbleSymbol({ initY, rawSymbol, isRefill: true });
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
			// Cascade settles reuse the `land` state but are NOT landings — flag them so land-only
			// fanfare (scatter flare/ring/rays, board jolts) stays quiet during refills.
			context.stateGame.cascading = true;
			// Drop the refill reel-by-reel (left → right), like the initial spin, instead of every
			// column at once.
			const COLUMN_STAGGER = 80;
			// read per tween start — an armed skip (press-to-skip) drops like turbo, mid-beat
			const getSpinOptions = () =>
				skipActive() || stateBet.isTurbo ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;
			const getPromises = () =>
				context.stateGameDerived.tumbleBoardCombined().map(async (tumbleReel, reelIndex) => {
					// no stagger while a skip is armed — every column drops together; a click
					// mid-stagger releases the remaining columns at once (skippableWait)
					if (reelIndex > 0 && !skipActive())
						await skippableWait((reelIndex * COLUMN_STAGGER) / stateBetDerived.timeScale());
					const reelLengthInBoard = tumbleReel.length - 2;
					// the deepest cell that actually lands in this column → one contact puff
					let deepestLandedRow = -1;

					await Promise.all(
						tumbleReel.map(async (tumbleSymbol, symbolIndex) => {
							const spinOptions = getSpinOptions();
							const symbolIndexOfBoard = symbolIndex - 1; // Refer to initTumbleBoardBase
							const targetY = getSymbolY(symbolIndexOfBoard);
							if (targetY === tumbleSymbol.symbolY.current) return;

							const distance = targetY - tumbleSymbol.symbolY.current;
							const delay =
								spinOptions.symbolFallInInterval * (reelLengthInBoard - symbolIndexOfBoard);
							const isInner = symbolIndex > 0 && symbolIndex < tumbleReel.length - 1;
							const isExistingEye = tumbleSymbol.rawSymbol.name === 'EYE' && !tumbleSymbol.isRefill;
							let landComplete: Promise<void> | undefined;

							const land = () => {
								// Land reactions fire at the same contact point as the first board draw.
								if (!isInner || isExistingEye) return;
								if (symbolIndexOfBoard > deepestLandedRow) deepestLandedRow = symbolIndexOfBoard;
								tumbleSymbol.symbolState = 'land';
								context.stateGameDerived.onSymbolLand({
									rawSymbol: tumbleSymbol.rawSymbol,
									reel: reelIndex,
									row: symbolIndexOfBoard,
								});
								landComplete = waitForResolve((resolve) => {
									tumbleSymbol.oncomplete = () => {
										tumbleSymbol.symbolState = 'static';
										resolve();
									};
								});
							};

							if (spinOptions.symbolFallInEasing && spinOptions.symbolFallInReboundMulti) {
								// gravity feel — same model as the reveal drop: accelerate all the way
								// to contact, then a small rebound settle (see createReelForCascading).
								// A press-to-skip snaps the slide (delay included) straight home.
								const duration = distance / spinOptions.symbolFallInSpeed;
								const reboundDistance = REEL_CELL_HEIGHT * spinOptions.symbolFallInReboundMulti;
								const reboundDuration = reboundDistance / spinOptions.symbolFallInBounceSpeed;

								const raced = await raceSkip(
									tumbleSymbol.symbolY.set(targetY, {
										duration,
										delay,
										easing: spinOptions.symbolFallInEasing,
									}),
								);
								if (raced === 'skipped') {
									void tumbleSymbol.symbolY.set(targetY, { duration: 0 });
									land();
									await landComplete;
									return;
								}
								land();
								await tumbleSymbol.symbolY.set(targetY - reboundDistance, {
									duration: reboundDuration,
									easing: quadOut,
								});
								await tumbleSymbol.symbolY.set(targetY, {
									duration: reboundDuration,
									easing: quadIn,
								});
							} else {
								const bounceDistance = REEL_CELL_HEIGHT * spinOptions.symbolFallInBounceSizeMulti;
								const bounceDuration = bounceDistance / spinOptions.symbolFallInBounceSpeed;
								const landDuration = Math.max(
									0,
									(distance - bounceDistance) / spinOptions.symbolFallInSpeed,
								);

								await tumbleSymbol.symbolY.set(targetY - bounceDistance, {
									duration: landDuration,
									delay,
								});
								land();
								await tumbleSymbol.symbolY.set(targetY, {
									duration: bounceDuration,
									easing: backOut,
								});
							}
							await landComplete;
						}),
					);

					if (deepestLandedRow >= 0) {
						context.eventEmitter.broadcast({
							type: 'boardLandPuff',
							cells: [{ reel: reelIndex, row: VISIBLE_ROW_START + deepestLandedRow }],
						});
					}
				});

			await Promise.all(getPromises());
			context.stateGame.cascading = false;
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
