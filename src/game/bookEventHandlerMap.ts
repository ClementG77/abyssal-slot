import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';

import { stateBet, stateBetDerived } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

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

const resetCompletedBuyMode = () => {
	if (stateBetDerived.activeBetMode()?.type === 'buy') {
		stateBet.activeBetModeKey = 'BASE';
	}
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

		// defensive: never let an interrupted cascade leave the settle flag stuck on
		stateGame.cascading = false;
		// The live scatter count is PER SPIN (reveal lands + cascade drops accumulate toward the
		// trigger; escalating land sounds/glow read it). Clear it BEFORE the reels spin — clearing
		// after would make the new spin's first scatter continue the previous spin's escalation.
		eventEmitter.broadcast({ type: 'soundScatterCounterClear' });
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

	// Instant scatter pay (4 = 3×, 5 = 5×, 6 = 100× the bet). No dedicated celebration: the
	// amount is already rolled into the round's running totals (setTotalWin / finalWin), the
	// trigger moment is owned by scatterCelebrate → free-spins intro, and 20×+ totals still get
	// the Win presentation via setWin. Registered so the event isn't reported as unhandled.
	scatterPay: async (_bookEvent: BookEventOfType<'scatterPay'>) => {},

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
			// The Eyes have fired their multiplier into the win — mark them `spent`: the number
			// leaves the eye (Symbol hides it, with a pop) and the plain EMPTY art remains.
			stateGame.revealedEyes.forEach(({ reel, row }) => {
				const cell = stateGame.board[reel]?.reelState.symbols[row];
				if (cell?.rawSymbol.name === 'EYE') {
					cell.rawSymbol = { ...cell.rawSymbol, spent: true };
				}
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
	// The Eye arrives ON the board via the tumble refill (`tumbleBoard.newSymbols`): it falls in
	// and lands with the cascade like any other symbol (drop animation + eye land reactions play
	// there). `eyeDrop` is therefore NON-PLACING — it only confirms the cell's closed-Eye flag.
	// Re-placing or re-dropping here would play the arrival animation twice.
	eyeDrop: async (bookEvent: BookEventOfType<'eyeDrop'>) => {
		const { position } = bookEvent;
		const cell = stateGame.board[position.reel]?.reelState.symbols[position.row];
		if (cell?.rawSymbol.name === 'EYE') {
			cell.rawSymbol = { ...cell.rawSymbol, eye: true };
		}
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
		// Let the reveal card-flip finish before the book proceeds (AbyssalEye plays it off the
		// rawSymbol change above — there's no emitter handshake to await). Squeeze + edge-on +
		// spring-open + number pop runs ~0.7s; only then may eyeResolve fly the Gaze seed to the
		// centre. Also paces Ultimate nicely: several Eyes flip one after another.
		await waitForTimeout(700 / stateBetDerived.timeScale());
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

		stateGame.freeSpinIntroActive = true;
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});

		// The player pressed the congratulations artwork → the water wall rises OVER the card…
		await eventEmitter.broadcastAsync({ type: 'transitionCover' });
		// …and while the screen is fully covered: swap to the free-spins scene (background, reel
		// frame, Gaze skin), drop the intro card and release the blur — all invisible under water.
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
		// the water passes upward off the screen, revealing the feature ready to play
		await eventEmitter.broadcastAsync({ type: 'transitionReveal' });
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
		// same stakes as the initial trigger — give it the same celebration (sequential scatter
		// ignites → flash → shockwave) before the retrigger banner
		await eventEmitter.broadcastAsync({ type: 'scatterCelebrate', positions: bookEvent.positions });
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
		resetCompletedBuyMode();
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
