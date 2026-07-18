import _ from 'lodash';

import { recordBookEvent, checkIsMultipleRevealEvents, type BookEventHandlerMap } from 'utils-book';

import { stateBet, stateBetDerived } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';
import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

import { eventEmitter } from './eventEmitter';
import { ESSENCE_TIER_VALUES, GAZE_METER_MAX_CHARGE, getEssenceTier } from './constants';
import { skippableWait } from './skip.svelte';
import { stateXstateDerived } from './stateXstate';
import { winLevelMap, type WinLevel, type WinLevelData } from './winLevelMap';
import { stateGame, stateGameDerived } from './stateGame.svelte';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';
import type { Position } from './types';

// Only wins of this multiple of the bet get an on-screen celebration (banner + count-up + win
// sounds). Smaller wins are still tallied in the bottom bar and the per-cluster / tumble counters,
// but get no centre-screen takeover. Must match Win.svelte's lowest WIN_TIER (bigWin, 20×).
const WIN_PRESENT_MIN_MULTIPLIER = 20;

// Turbo/autoplay leave a SETTLED spin no natural pause — a no-win ("no connection") spin snaps
// straight into the next, so a rushed round becomes an unreadable blur (worst in the feature,
// which auto-advances every spin). This is a small fixed beat after each board lands, applied
// ONLY when spins are being rushed. It is NOT divided by timeScale — it's the floor turbo can't
// compress — but a manual press still cuts through it (skippableWait).
const TURBO_SPIN_SETTLE_MS = 260;

const winLevelSoundsPlay = ({
	winLevelData,
	skipSfx = false,
}: {
	winLevelData: WinLevelData;
	skipSfx?: boolean;
}) => {
	if (winLevelData?.alias === 'max') eventEmitter.broadcastAsync({ type: 'uiHide' });
	// skipSfx: the wincap flow lets the trophy slam own the max stinger (no double fanfare)
	if (!skipSfx && winLevelData?.sound?.sfx) {
		// forcePlay: the same tier (or a re-presented win) can fire again while the previous
		// stinger is still ringing — each presentation must replay from the start, not be dropped.
		eventEmitter.broadcast({ type: 'soundOnce', name: winLevelData.sound.sfx, forcePlay: true });
	}
	if (winLevelData?.sound?.bgm) {
		eventEmitter.broadcast({ type: 'soundMusic', name: winLevelData.sound.bgm });
	}
	// the count-up loop runs for EVERY presented win (also covers scatter-pay takeovers that have
	// no tumble banner); small (<20×) tumble wins start it from updateTumbleWin instead. It's a
	// loop (idempotent) and stops at finalWin / winLevelSoundsStop / the next reveal.
	eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_countup_loop' });
};

const winLevelSoundsStop = () => {
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_countup_loop' });
	if (stateGame.gameType === 'freegame') {
		// mid-bonus interruption (bgm_win takeover) → the feature bed RESUMES where it paused.
		// It only restarts from 0:00 on a fresh bonus ENTRY (freeSpinTrigger / Super Spins reveal).
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

const animateSymbols = async ({
	positions,
}: {
	positions: (Position & { winTier?: 1 | 2 | 3 })[];
}) => {
	eventEmitter.broadcast({ type: 'boardShow' });
	await eventEmitter.broadcastAsync({
		type: 'boardWithAnimateSymbols',
		symbolPositions: positions,
	});
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	reveal: async (bookEvent: BookEventOfType<'reveal'>, { bookEvents }: BookEventContext) => {
		// a new spin starts — make sure the previous win's count-up loop is stopped
		eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_countup_loop' });
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
		stateGame.pendingGazeClusters = [];
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

		// Music bed for this spin. Free spins keep bgm_freespin (set by freeSpinTrigger — untouched
		// here). In the base scene, ride the FEATURE bed for a Super Spins buy (a single-spin feature
		// with no free-spin events, so nothing else would switch it) and the base bed otherwise. Both
		// calls are no-ops when that track is already playing, so this also self-corrects the music
		// back to base once the player leaves Super Spins. (bgm_betmode switching, since Abyssal
		// doesn't use components-ui-pixi's soundBetMode.)
		if (stateGame.gameType !== 'freegame') {
			const isSuperSpins = stateBet.activeBetModeKey === 'SUPERSPINS';
			if (isSuperSpins) {
				// each Super Spins buy is a fresh single-spin feature — the bed opens on its intro
				eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin', restart: true });
			} else {
				eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
			}
		}

		await stateGameDerived.enhancedBoard.spin({ revealEvent });
		eventEmitter.broadcast({ type: 'reelFrameScatterAnticipationEnd' });

		// keep rushed spins readable — a small settle after the board lands (see TURBO_SPIN_SETTLE_MS)
		const rushing = stateBetDerived.timeScale() > 1 || stateXstateDerived.isAutoBetting();
		if (rushing) await skippableWait(TURBO_SPIN_SETTLE_MS);
	},

	winInfo: async (bookEvent: BookEventOfType<'winInfo'>) => {
		// stash this tumble's clusters for the FOLLOWING gazeStep — it turns them into
		// per-cluster essence orbs (+2/+3/+5 by cluster size, flying from each overlay cell)
		stateGame.pendingGazeClusters = bookEvent.wins.map((win) => ({
			count: win.count,
			reel: win.meta.overlay.reel,
			row: win.meta.overlay.row,
		}));

		const promiseAnimate = async () => {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_cluster_win' });
			// tag each winning cell with its cluster's essence tier (8-9 / 10-11 / 12+) so the win
			// glow ramps hotter for bigger clusters
			const positions = bookEvent.wins.flatMap((win) =>
				win.positions.map((position) => ({ ...position, winTier: getEssenceTier(win.count) })),
			);
			await animateSymbols({ positions });
		};

		// Abyssal shows the *raw* cluster win — the Eye multiplies the spin total at
		// resolution, not per cluster (unlike scatter's per-tumble global multiplier).
		// `count` sizes the floating label by essence tier (8-9/10-11/12+).
		const promiseAmounts = async () => {
			await eventEmitter.broadcastAsync({
				type: 'showClusterWinAmounts',
				wins: bookEvent.wins.map((win) => ({
					win: win.win,
					count: win.count,
					reel: win.meta.overlay.reel,
					row: win.meta.overlay.row,
				})),
			});
		};

		await Promise.all([promiseAnimate(), promiseAmounts()]);
	},

	updateTumbleWin: async (bookEvent: BookEventOfType<'updateTumbleWin'>) => {
		if (bookEvent.amount > 0) {
			// NB: no count-up sound here — a plain tumble amount add just snaps the banner. The
			// count-up loop only runs when the banner actually COUNTS (an Eye multiply, see
			// TumbleWinAmount) or in the win-steps takeover (winLevelSoundsPlay).
			eventEmitter.broadcast({ type: 'tumbleWinAmountShow' });
			eventEmitter.broadcast({
				type: 'tumbleWinAmountUpdate',
				amount: bookEvent.amount,
				animate: false,
			});
		}
	},

	gazeStep: async (bookEvent: BookEventOfType<'gazeStep'>) => {
		// Per-cluster essence breakdown for the meter's hero orbs + "+N" chips, from the
		// clusters winInfo stashed. `charge` is the authoritative total; the per-cluster values
		// are presentation. The essence multiplier (Super Bonus charges ×2) is derived from the
		// actual charge delta when it divides cleanly; the cap at 30 can obscure the delta, so
		// the mode key is the fallback — chips then still show the TRUE essence earned while
		// the meter clamps.
		const tierValues = stateGame.pendingGazeClusters.map(
			(cluster) => ESSENCE_TIER_VALUES[getEssenceTier(cluster.count) - 1],
		);
		const tierSum = tierValues.reduce((a, b) => a + b, 0);
		const delta = bookEvent.charge - stateGame.gazeCharge;
		const essenceMult =
			tierSum > 0 && delta === tierSum * 2
				? 2
				: tierSum > 0 && delta === tierSum
					? 1
					: stateBet.activeBetModeKey.toUpperCase() === 'SUPERBONUS'
						? 2
						: 1;
		// OLD-MATH books (+1/tumble) can't reconcile with the essence tiers — when neither ×1
		// nor ×2 matches the actual climb (and the 30-cap isn't the reason), drop the breakdown
		// entirely so the "+N" chips never report numbers the plaque doesn't do; the meter then
		// falls back to its per-cell orbs. Current-build books always reconcile.
		const capped = bookEvent.charge >= GAZE_METER_MAX_CHARGE;
		const reconciles =
			tierSum > 0 && (delta === tierSum || delta === tierSum * 2 || capped);
		const clusters = reconciles
			? stateGame.pendingGazeClusters.map((cluster, index) => ({
					value: tierValues[index] * essenceMult,
					tier: getEssenceTier(cluster.count),
					reel: cluster.reel,
					row: cluster.row,
				}))
			: undefined;
		stateGame.pendingGazeClusters = [];

		stateGame.gazeCharge = bookEvent.charge;
		await eventEmitter.broadcastAsync({
			type: 'gazeMeterFill',
			fromPositions: bookEvent.fromPositions,
			charge: bookEvent.charge,
			clusters,
		});
	},

	// Instant scatter pay (4 = 3×, 5 = 5×, 6 = 100× the bet). Fires on ANY trigger spin —
	// base/ante organic triggers AND bonus/superbonus buy trigger boards (2026-07 math rework;
	// every buy pays at least the 3× trigger cash). Only the forced max-win corner skips it;
	// superspins/ultimate have no scatters so never emit it. The event arrives between the
	// trigger spin's setTotalWin and freeSpinTrigger, i.e. BEFORE the bonus starts.
	scatterPay: async (bookEvent: BookEventOfType<'scatterPay'>) => {
		// roll the pay into the bottom WIN readout IMMEDIATELY, so the round total is visible
		// from the very first free spin. Any following setTotalWin overwrites this with the
		// authoritative cumulative (which includes the pay), so nothing double-counts.
		stateBet.winBookEventAmount += bookEvent.amount;

		// A 6-scatter pay is 100× — that earns the full win-steps takeover, same gate as
		// setWin (≥20×). The takeover owns its sound (tier stinger + count-up loop via
		// winLevelSoundsPlay) — no extra flourish on top. 4/5 scatters (3×/5×) show on the
		// WIN readout with the same win pop a cluster makes (they're the same size of win).
		if (bookEvent.amount >= WIN_PRESENT_MIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER) {
			const mult = bookEvent.amount / BOOK_AMOUNT_MULTIPLIER;
			const winLevelData = mult >= 250 ? winLevelMap[9] : mult >= 100 ? winLevelMap[8] : winLevelMap[6];
			eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
			eventEmitter.broadcast({ type: 'winShow' });
			winLevelSoundsPlay({ winLevelData });
			await eventEmitter.broadcastAsync({
				type: 'winUpdate',
				amount: bookEvent.amount,
				winLevelData,
			});
			winLevelSoundsStop();
			eventEmitter.broadcast({ type: 'winHide' });
		} else {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_cluster_win', forcePlay: true });
			// 4/5 scatters: hold a beat so the pay visibly lands on the WIN readout before the
			// trigger celebration → intro takes the screen (a press skips the hold)
			await skippableWait(900 / stateBetDerived.timeScale());
		}
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
		// 20×+ wins get the centre-screen win-steps celebration. The Eye multiplier still lands
		// on the tumble banner first (see below) — the takeover then re-counts from zero as the
		// escalation ladder.
		const celebrate =
			bookEvent.amount >= WIN_PRESENT_MIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER;

		if (stateGame.gazeCharge > 0 && !stateGame.eyeResolvedThisSpin) {
			await eventEmitter.broadcastAsync({ type: 'gazeMeterDrain' });
			stateGame.gazeCharge = 0;
		}

		if (stateGame.eyeMultPending && stateGame.eyeResolveCell) {
			stateGame.eyeMultPending = false;
			// Carry the multiplier to the tumble-win banner: the ×N flies from the board centre
			// in, the banner shows "raw × mult" and counts up to the final. This now plays for
			// ALL Eye wins — including celebration (≥20×) ones — so the multiplier visibly lands
			// on the win amount BEFORE the win-steps takeover, instead of jumping straight to it.
			await eventEmitter.broadcastAsync({
				type: 'tumbleWinAmountMultiply',
				totalWin: bookEvent.amount,
				// the combine resolves the total at the board centre, so the ×N flies from there
				fromReel: 2.5,
				fromRow: 3,
				// celebration wins stop on the "raw × mult" equation — the win-steps takeover
				// reveals the final, so it isn't shown on the banner first
				countToFinal: !celebrate,
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
		if (!celebrate) return;

		// drop the tumble banner (still showing the pre-mult raw) so the takeover is the only
		// number on screen while it counts up to the final
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		eventEmitter.broadcast({ type: 'winShow' });
		winLevelSoundsPlay({ winLevelData });
		await eventEmitter.broadcastAsync({
			type: 'winUpdate',
			amount: bookEvent.amount,
			winLevelData,
		});
		// In practice capped books DON'T emit a max-level setWin — their cap is reached by the
		// round cumulative and only `wincap` fires (every setWin in them is a small sub-20× tumble
		// that returns early above). So the full MAX celebration lives in WinCapCelebration, not
		// here. This branch stays defensive: if a max-level setWin ever did arrive, keep the UI
		// hidden and the max-win music rolling so it hands straight off to the trophy.
		if (winLevelData?.alias !== 'max') winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'winHide' });
	},

	setTotalWin: async (bookEvent: BookEventOfType<'setTotalWin'>) => {
		stateBet.winBookEventAmount = bookEvent.amount;
	},

	finalWin: async (_bookEvent: BookEventOfType<'finalWin'>) => {
		// the round win is settled — stop the count-up loop
		eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_countup_loop' });
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
		// (skippableWait: a screen press releases the hold instantly — see game/skip.svelte)
		await skippableWait(700 / stateBetDerived.timeScale());
	},

	eyeResolve: async (bookEvent: BookEventOfType<'eyeResolve'>) => {
		// The Gaze empties into the Eye(s), then the combine plays out the whole equation:
		//   (charge + Σ ADD starts) × Π MUL starts = totalMult
		// stepping through every opened Eye. The resulting multiplier is carried to the tumble-win
		// banner in `setWin` (see eyeMultPending). One code path for single + Ultimate (multi).
		stateGame.eyeResolvedThisSpin = true;
		stateGame.eyeMultPending = true;
		// The combine consumes its pieces in reading order: the Gaze seed flies to the centre
		// FIRST; the Eye chips then fold in during eyeBurst, and (in the feature) the banked ×M
		// is the LAST arrival — eyeBurst awaits snowballToCombine right before the hero total
		// (see Eye.svelte), so the multiplier visibly joins the equation instead of pre-flying.
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
	// Fires on the ROUND cumulative hitting the cap. Capped books never emit a max-level
	// `setWin` (their setWins are all small sub-20× tumbles), so WinCapCelebration plays the
	// WHOLE escalation itself: the BIG → HUGE → MEGA → EPIC banner morphs, the ruby MAX slam,
	// the lock, then the indefinite click-to-continue hold. Hand off directly — do NOT also
	// run Win.svelte's ladder (winShow/winUpdate) here: the takeover already contains that
	// exact escalation, and running both plays the same ladder twice back to back.
	wincap: async (bookEvent: BookEventOfType<'wincap'>) => {
		const winLevelData = winLevelMap[10]; // alias 'max' → hides the UI + max-win music
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		// skipSfx: the takeover voices its own ladder (entry stinger, tier-ups, the max slam);
		// this call still owns uiHide + the max-win music + the count-up loop under the climb
		winLevelSoundsPlay({ winLevelData, skipSfx: true });
		await eventEmitter.broadcastAsync({ type: 'winCapTrigger', amount: bookEvent.amount });
		winLevelSoundsStop();
	},

	// --- Free Spins lifecycle ---------------------------------------------------------
	freeSpinTrigger: async (bookEvent: BookEventOfType<'freeSpinTrigger'>) => {
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fs_intro' });
		await animateSymbols({ positions: bookEvent.positions });
		// the scatters connect with energy and flash before we dive into the feature
		await eventEmitter.broadcastAsync({ type: 'scatterCelebrate', positions: bookEvent.positions });

		await eventEmitter.broadcastAsync({ type: 'uiHide' });

		stateGame.freeSpinIntroActive = true;
		eventEmitter.broadcast({ type: 'freeSpinIntroShow' });
		// (base music keeps playing over the intro card + the water-wall cover — the feature bed
		// only starts once we're actually inside the free game, below)
		await eventEmitter.broadcastAsync({
			type: 'freeSpinIntroUpdate',
			totalFreeSpins: bookEvent.totalFs,
		});

		// The player pressed the congratulations artwork → the water wall rises OVER the card…
		await eventEmitter.broadcastAsync({ type: 'transitionCover' });
		// …and while the screen is fully covered: swap to the free-spins scene (background, reel
		// frame, Gaze skin), drop the intro card and release the blur — all invisible under water.
		stateGame.gameType = 'freegame';
		// NOW switch to the feature bed — we've entered the bonus, under the water cover.
		// restart: every bonus opens on the track's intro, never resuming a previous bonus's spot.
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin', restart: true });
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
		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fs_intro' });
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
		// skipSfx: no tier stinger on the outro card — the bgm takeover + the count carry it
		winLevelSoundsPlay({ winLevelData, skipSfx: true });
		await eventEmitter.broadcastAsync({
			type: 'freeSpinOutroCountUp',
			// the ROUND total (latest setTotalWin), not just the feature's: it includes any
			// base-game wins + the scatter pay from the triggering spin
			amount: stateBet.winBookEventAmount || bookEvent.amount,
			winLevelData,
		});
		winLevelSoundsStop();
		eventEmitter.broadcast({ type: 'freeSpinOutroHide' });
		eventEmitter.broadcast({ type: 'freeSpinCounterHide' });
		eventEmitter.broadcast({ type: 'tumbleWinAmountHide' });
		// the same water-wall dive as the intro: the wave rises to full cover, the base scene is
		// swapped underneath, then the wave passes upward off the screen revealing it
		await eventEmitter.broadcastAsync({ type: 'transitionCover' });
		stateGame.gameType = 'basegame';
		resetCompletedBuyMode();
		await eventEmitter.broadcastAsync({ type: 'transitionReveal' });
		// back in the base game, the wave has passed — NOW resume the base bed where it left
		// off. (winLevelSoundsStop ran while gameType was still 'freegame', so it re-armed the
		// FEATURE bed; without this the feature music keeps playing forever after the bonus.)
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
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
			// resumed mid-bonus → the feature bed, not bgm_main (Sound.svelte's onMount also
			// checks gameType for the case where it mounts after this handler ran)
			eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
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
