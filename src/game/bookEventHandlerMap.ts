import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';
import { backOut } from 'svelte/easing';

import { stateBet, stateBetDerived } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import { REEL_CELL_HEIGHT } from './constants';

import { eventEmitter } from './eventEmitter';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';

// Only wins of this multiple of the bet get an on-screen celebration (banner + count-up + win
// sounds). Smaller wins are still tallied in the bottom bar and the per-cluster / tumble counters,
// but get no centre-screen takeover. Must match Win.svelte's lowest WIN_TIER (bigWin, 20×).
const WIN_PRESENT_MIN_MULTIPLIER = 20;

const winLevelSoundsPlay = ({ winLevelData }: { winLevelData: WinLevelData }) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	if (winLevelData?.sound?.sfx) {
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	if (winLevelData?.type === 'big') {
		eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });
	}
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	if (stateGame.gameType === 'freegame') {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
	} else {
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
	}
	eventEmitter.broadcastAsync({ type: 'uiShow' });
};

const animateSymbols = async ({ positions }: { positions: Position[] }) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		eventEmitter.broadcast({ type: 'tumbleWinAmountReset' });
		const isBonusGame = checkIsMultipleRevealEvents({ bookEvents });
		if (isBonusGame) {
			eventEmitter.broadcast({ type: 'stopButtonEnable' });
			recordBookEvent({ bookEvent });
		}

		// reset the spin's Gaze charge for the new board; clear any Eye from the prior spin
		stateGame.gazeCharge = 0;
		stateGame.eyeResolvedThisSpin = false;
		stateGame.eyeResolveCell = null;
		stateGame.eyeMultPending = false;
		stateGame.revealedEyes = [];
		eventEmitter.broadcast({ type: 'gazeMeterReset' });
		eventEmitter.broadcast({ type: 'gazeMeterShow' });
		eventEmitter.broadcast({ type: 'eyeHide' });

		// The Eye lands CLOSED and only opens at its own eyeReveal (the end of the winning tumble
		// sequence) — do NOT pre-resolve eyeType/startValue onto the settling board, or it lands
		// already coloured and numbered.
		const revealEvent = bookEvent;

		stateGame.gameType = bookEvent.gameType;
		await stateGameDerived.enhancedBoard.spin({ revealEvent });
		eventEmitter.broadcast({ type: 'reelFrameScatterAnticipationEnd' });
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
	},

	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		const promiseAnimate = async () => {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_small' });
			await animateSymbols({ positions: _.flatten(bookEvent.wins.map((win) => win.positions)) });
		};

		// Abyssal shows the *raw* cluster win — the Eye multiplies the spin total at
		// resolution, not per cluster (unlike scatter's per-tumble global multiplier).
		const promiseAmounts = async () => {
			await eventEmitter.broadcastAsync({
				type: 'showClusterWinAmounts',
				wins: bookEvent.wins.map((win) => ({
					win: win.win,
					reel: win.meta.overlay.reel,
					row: win.meta.overlay.row,
				})),
			});
		};

		await Promise.all([promiseAnimate(), promiseAmounts()]);
	},

	updateTumbleWin: async (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
		if (bookEvent.amount > 0) {
			eventEmitter.broadcast({ type: 'tumbleWinAmountShow' });
			eventEmitter.broadcast({
				type: 'tumbleWinAmountUpdate',
				amount: bookEvent.amount,
				animate: false,
			});
		}
	},

	gazeStep: async (bookEvent: BookEventOfType<'gazeStep'>) => {
		stateGame.gazeCharge = bookEvent.charge;
		await eventEmitter.broadcastAsync({
			type: 'gazeMeterFill',
			fromPositions: bookEvent.fromPositions,
			charge: bookEvent.charge,
		});
	},

	// Instant scatter pay (4 = 3×, 5 = 5×, 6 = 100× the bet). The amount is already rolled into
	// the round's running totals (setTotalWin / finalWin); here we celebrate it.
	scatterPay: async (bookEvent: BookEventOfType<'scatterPay'>) => {
		await eventEmitter.broadcastAsync({
			type: 'scatterPayShow',
			count: bookEvent.count,
			amount: bookEvent.amount,
		});
	},

	tumbleBoard: async (bookEvent: BookEventOfType<'tumbleBoard'>) => {
		eventEmitter.broadcast({ type: 'boardHide' });
		eventEmitter.broadcast({ type: 'tumbleBoardShow' });
		eventEmitter.broadcast({ type: 'tumbleBoardInit', addingBoard: bookEvent.newSymbols });
		await eventEmitter.broadcastAsync({
			type: 'tumbleBoardExplode',
			explodingPositions: bookEvent.explodingSymbols,
		});
		eventEmitter.broadcast({ type: 'tumbleBoardRemoveExploded' });
		await eventEmitter.broadcastAsync({ type: 'tumbleBoardSlideDown' });
		eventEmitter.broadcast({ type: 'reelFrameScatterAnticipationEnd' });
		eventEmitter.broadcast({
			type: 'boardSettle',
			board: stateGameDerived
				.tumbleBoardCombined()
				.map((tumbleReel) => tumbleReel.map((tumbleSymbol) => tumbleSymbol.rawSymbol)),
		});
		eventEmitter.broadcast({ type: 'tumbleBoardReset' });
		eventEmitter.broadcast({ type: 'tumbleBoardHide' });
		eventEmitter.broadcast({ type: 'boardShow' });
	},

	setWin: async (bookEvent: BookEventOfType<'setWin'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		if (stateGame.gazeCharge > 0 && !stateGame.eyeResolvedThisSpin) {
			await eventEmitter.broadcastAsync({ type: 'gazeMeterDrain' });
			stateGame.gazeCharge = 0;
		}

		// If an Eye resolved this spin, carry its multiplier to the tumble-win banner: the ×N flies
		// from the Eye cell into the banner, then the banner counts the raw win up to the multiplied
		// final (`bookEvent.amount`). Happens for every Eye win — before any win-tier celebration.
		if (stateGame.eyeMultPending && stateGame.eyeResolveCell) {
			stateGame.eyeMultPending = false;
			await eventEmitter.broadcastAsync({
				type: 'tumbleWinAmountMultiply',
				totalWin: bookEvent.amount,
				// the combine resolves the total at the board centre, so the ×N flies from there
				fromReel: 2.5,
				fromRow: 3,
			});
			// Gates-style: the Eyes have spent their multiplier into the win, so empty them — strip
			// the value/type back to a bare (closed) Eye symbol, leaving the icon but no number.
			stateGame.revealedEyes.forEach(({ reel, row }) => {
				const cell = stateGame.board[reel]?.reelState.symbols[row];
				if (cell?.rawSymbol.name === 'EYE') cell.rawSymbol = { name: 'EYE', eye: true };
			});
		}

		// Below the celebration threshold (<20×) there is no centre-screen win presentation or
		// win sounds — the amount is already reflected in the running counters. Keeps small wins
		// snappy and reserves the takeover for wins that earn it.
		if (bookEvent.amount < WIN_PRESENT_MIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER) return;

		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},

	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},

	finalWin: async (_bookEvent: BookEventOfType<'finalWin'>) => {
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		// the `capped` max-win takeover is driven by the separate `wincap` event below.
	},

	// --- The Eye (end of a winning tumble sequence) -----------------------------------
	// A fresh Eye drops onto the board mid-cascade (Ultimate). Place it CLOSED at its cell so it
	// shows, persists through the remaining tumbles, and is there for `eyeReveal` to open. The
	// board is on-screen at this point (the prior tumbleBoard re-showed it).
	eyeDrop: async (bookEvent: BookEventOfType<'eyeDrop'>) => {
		const cell =
			stateGame.board[bookEvent.position.reel]?.reelState.symbols[bookEvent.position.row];
		if (cell) {
			cell.rawSymbol = { name: 'EYE', eye: true };
			cell.symbolState = 'land'; // AbyssalEye settle shake
			// drop it in from just above the cell so it reads as a landing, not an in-place swap.
			// NOTE: the board is full at this point (eyeDrop arrives after the tumble settled), so the
			// Eye necessarily takes over this cell — a true gap-fill fall would need the math to send
			// the Eye inside the tumble's `newSymbols` refill instead of a standalone eyeDrop.
			const targetY = cell.symbolY.current;
			cell.symbolY.set(targetY - REEL_CELL_HEIGHT * 0.95, { duration: 0 });
			void cell.symbolY.set(targetY, { duration: 260 / stateBetDerived.timeScale(), easing: backOut });
		}
		// it slams onto the board
		eventEmitter.broadcast({ type: 'boardEyeImpact' });
		eventEmitter.broadcast({ type: 'reelFrameEyeLand' });
		await waitForTimeout(440 / stateBetDerived.timeScale());
	},

	eyeReveal: async (bookEvent: BookEventOfType<'eyeReveal'>) => {
		const landedEye =
			stateGame.board[bookEvent.position.reel]?.reelState.symbols[bookEvent.position.row];
		if (landedEye?.rawSymbol.name === 'EYE') {
			landedEye.rawSymbol = {
				...landedEye.rawSymbol,
				eye: true,
				eyeType: bookEvent.eyeType,
				startValue: bookEvent.startValue,
			};
		}
		// remember where the Eye sits — its multiplier flies from this cell to the tumble-win banner
		stateGame.eyeResolveCell = { reel: bookEvent.position.reel, row: bookEvent.position.row };
		// collect it for the combine reveal (Ultimate stacks several before a single eyeResolve)
		stateGame.revealedEyes.push({
			reel: bookEvent.position.reel,
			row: bookEvent.position.row,
			eyeType: bookEvent.eyeType,
			startValue: bookEvent.startValue,
		});
		eventEmitter.broadcast({
			type: 'eyeShow',
			reel: bookEvent.position.reel,
			row: bookEvent.position.row,
			eyeType: bookEvent.eyeType,
			startValue: bookEvent.startValue,
		});
	},

	eyeResolve: async (bookEvent: BookEventOfType<'eyeResolve'>) => {
		// The Gaze empties into the Eye(s), then the combine plays out the whole equation:
		//   (charge + Σ ADD starts) × Π MUL starts = totalMult
		// stepping through every opened Eye. The resulting multiplier is carried to the tumble-win
		// banner in `setWin` (see eyeMultPending). One code path for single + Ultimate (multi).
		stateGame.eyeResolvedThisSpin = true;
		stateGame.eyeMultPending = true;
		await eventEmitter.broadcastAsync({ type: 'gazeMeterToEye' });
		await eventEmitter.broadcastAsync({
			type: 'eyeBurst',
			charge: bookEvent.charge,
			totalMult: bookEvent.totalMult,
			eyes: stateGame.revealedEyes.map((eye) => ({ ...eye })),
		});
		eventEmitter.broadcast({ type: 'eyeHide' });
		stateGame.gazeCharge = 0;
		eventEmitter.broadcast({ type: 'gazeMeterReset' });
	},

	// Ultimate only: the math breakdown (rawWin/addSum/mulProduct/finalWin) arrives right after
	// `eyeResolve`, which already played the combine. Nothing extra to render here — `setWin` drives
	// the banner multiply — but it must be registered so the event isn't reported as unhandled.
	ultimateResolve: async (_bookEvent: BookEventOfType<'ultimateResolve'>) => {},

	// Snowball persistent multiplier (snowball features only; absent in superspins).
	setPersistentMult: async (bookEvent: BookEventOfType<'setPersistentMult'>) => {
		stateGame.persistentMult = bookEvent.mult;
		eventEmitter.broadcast({ type: 'snowballShow' });
		await eventEmitter.broadcastAsync({ type: 'snowballUpdate', mult: bookEvent.mult });
	},

	// --- Win-cap (15,000×) ------------------------------------------------------------
	wincap: async (bookEvent: BookEventOfType<'wincap'>) => {
		await eventEmitter.broadcastAsync({ type: 'winCapTrigger', amount: bookEvent.amount });
	},

	// --- Free Spins lifecycle ---------------------------------------------------------
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		// the scatters connect with energy and flash before we dive into the feature
		await eventEmitter.broadcastAsync({ type: 'scatterCelebrate', positions: bookEvent.positions });

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		await eventEmitter.broadcastAsync({ type: 'transition' });

		stateGame.freeSpinIntroActive = true;
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});

		// The player pressed the congratulations artwork. Swap the scene beneath its animated
		// exit so the new free-spins background, reel frame and Gaze skin are revealed smoothly.
		stateGame.gameType = 'freegame';
		await eventEmitter.broadcastAsync({ type: 'freeSpinIntroHide' });
		stateGame.freeSpinIntroActive = false;
		eventEmitter.broadcast({ type: 'reelFrameGlowShow' });

		// snowball starts at ×1 for the feature
		stateGame.persistentMult = 1;
		eventEmitter.broadcast({ type: 'snowballShow' });
		eventEmitter.broadcast({ type: 'snowballUpdate', mult: 1 });

		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: undefined,
			total: bookEvent.totalFs,
		});
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},

	updateFreeSpin: async (bookEvent: BookEventOfType<'updateFreeSpin'>) => {
		eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
		eventEmitter.broadcast({
			type: 'freeSpinCounterUpdate',
			current: bookEvent.amount,
			total: bookEvent.total,
		});
	},

	freeSpinRetrigger: async (bookEvent: BookEventOfType<'freeSpinRetrigger'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win_v2' });
		await animateSymbols({ positions: bookEvent.positions });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinRetriggerShow',
			totalFreeSpins: bookEvent.totalFs,
		});
		eventEmitter.broadcast({ type: 'freeSpinCounterUpdate', total: bookEvent.totalFs });
	},

	freeSpinEnd: async (bookEvent: BookEventOfType<'freeSpinEnd'>) => {
		const winLevelData = winLevelMap[bookEvent.winLevel as WinLevel];

		await eventEmitter.broadcastAsync({ type: 'uiHide' });
		eventEmitter.broadcast({ type: 'reelFrameGlowHide' });
		eventEmitter.broadcast({ type: 'snowballHide' });
		eventEmitter.broadcast({ type: 'freeSpinOutroShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			amount: bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		await eventEmitter.broadcastAsync({ type: 'freeSpinExitCover' });
		stateGame.gameType = 'basegame';
		await eventEmitter.broadcastAsync({ type: 'freeSpinExitReveal' });
		await eventEmitter.broadcastAsync({ type: 'uiShow' });
	},

	// customised — reconstruct the on-screen state at a mid-round resume point WITHOUT
	// re-animating everything that came before. We settle the last board instantly and
	// restore the feature HUD (counter / glow / snowball) + running total, then the
	// post-resume events (appended by `convertTorResumableBet`) play on from there.
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;

		function findLastBookEvent<T extends BookEvent['type']>(type: T) {
			return _.findLast(bookEvents, (event) => event.type === type) as
				| BookEventOfType<T>
				| undefined;
		}

		const lastReveal = findLastBookEvent('reveal');
		const lastFreeSpinTrigger = findLastBookEvent('freeSpinTrigger');
		const lastUpdateFreeSpin = findLastBookEvent('updateFreeSpin');
		const lastSetPersistentMult = findLastBookEvent('setPersistentMult');
		const lastSetTotalWin = findLastBookEvent('setTotalWin');

		// settle the board the player was last looking at (no spin animation)
		if (lastReveal) {
			stateGame.gameType = lastReveal.gameType;
			stateGameDerived.enhancedBoard.settle(lastReveal.board);
		}
		eventEmitter.broadcast({ type: 'gazeMeterReset' });
		eventEmitter.broadcast({ type: 'gazeMeterShow' });

		// if the player was inside the feature, restore its HUD directly (no intro/transition)
		if (lastFreeSpinTrigger) {
			stateGame.gameType = 'freegame';
			eventEmitter.broadcast({ type: 'reelFrameGlowShow' });
			eventEmitter.broadcast({ type: 'freeSpinCounterShow' });
			eventEmitter.broadcast({
				type: 'freeSpinCounterUpdate',
				current: lastUpdateFreeSpin?.amount,
				total: lastUpdateFreeSpin?.total ?? lastFreeSpinTrigger.totalFs,
			});
			stateGame.persistentMult = lastSetPersistentMult?.mult ?? 1;
			eventEmitter.broadcast({ type: 'snowballShow' });
			eventEmitter.broadcast({ type: 'snowballUpdate', mult: stateGame.persistentMult });
		}

		// restore the running round win so the counter continues from the right number
		if (lastSetTotalWin) stateBet.winBookEventAmount = lastSetTotalWin.amount;
	},
};
