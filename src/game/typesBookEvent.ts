import type { BetType } from 'rgs-requests';

import type { SymbolName, RawSymbol, GameType, Position, EyeType } from './types';

// Full Abyssal book-event vocabulary (FRONTEND_GUIDE §6). Phases 0–2 only *handle* a
// subset, but the whole union is typed up front so later phases (Eye, snowball, free
// spins, win-cap) slot in without churn. All `amount`/`win` values are cents-of-bet
// (÷100 = × bet); all positions use the padded 6×7 coordinate system (visible rows 1–5).

// --- Reveal / board -------------------------------------------------------------------
type BookEventReveal = {
	index: number;
	type: 'reveal';
	board: RawSymbol[][];
	paddingPositions: number[];
	anticipation: number[];
	gameType: GameType;
};

type BookEventTumbleBoard = {
	index: number;
	type: 'tumbleBoard';
	explodingSymbols: Position[];
	newSymbols: RawSymbol[][];
};

// --- Wins & charge (one block per connection) -----------------------------------------
type BookEventWinInfo = {
	index: number;
	type: 'winInfo';
	totalWin: number;
	wins: {
		symbol: SymbolName;
		count: number; // symbols in the cluster (incl. wilds)
		win: number; // raw cluster win (the Eye multiplies the spin total at resolution)
		positions: Position[];
		meta: {
			// Abyssal applies the Eye at resolution, so globalMult/clusterMult are always 1
			// here (the fields exist in the books for parity with the scatter pipeline).
			globalMult: number;
			clusterMult: number;
			winWithoutMult: number;
			overlay: Position; // suggested cell to float the amount label
		};
	}[];
};

type BookEventUpdateTumbleWin = {
	index: number;
	type: 'updateTumbleWin';
	amount: number;
};

type BookEventGazeStep = {
	index: number;
	type: 'gazeStep';
	fromPositions: Position[];
	charge: number; // new running Gaze total (≈ cascade length)
};

// --- Scatter pay (instant cash when 4+ scatters land) ---------------------------------
type BookEventScatterPay = {
	index: number;
	type: 'scatterPay';
	count: number; // number of scatters that landed (4 / 5 / 6)
	amount: number; // instant pay, cents-of-bet (÷100 = × bet): 4 = 3×, 5 = 5×, 6 = 100×
};

// --- The Eye (end of tumble sequence, only when it lands on a winning spin) ------------
// A fresh Eye dropping onto the board mid-cascade (Ultimate adds Eyes during the tumble run).
// It lands CLOSED at `position`; a later `eyeReveal` at the same cell opens it.
type BookEventEyeDrop = {
	index: number;
	type: 'eyeDrop';
	position: Position;
};

type BookEventEyeReveal = {
	index: number;
	type: 'eyeReveal';
	position: Position;
	eyeType: EyeType;
	startValue: number;
};

type BookEventEyeResolve = {
	index: number;
	type: 'eyeResolve';
	charge: number;
	totalMult: number;
	// Single-Eye spins carry the Eye inline; Ultimate (multi-Eye) carries them in `eyes` instead.
	eyeType?: EyeType;
	startValue?: number;
	eyes?: { eyeType: EyeType; startValue: number }[];
};

// Ultimate only: the full combine breakdown, emitted right after `eyeResolve`.
// totalMult = (charge + addSum) × mulProduct ; finalWin = rawWin × totalMult.
type BookEventUltimateResolve = {
	index: number;
	type: 'ultimateResolve';
	rawWin: number;
	charge: number;
	eyes: { eyeType: EyeType; startValue: number }[];
	addSum: number;
	mulProduct: number;
	totalMult: number;
	finalWin: number;
};

type BookEventSetPersistentMult = {
	index: number;
	type: 'setPersistentMult';
	mult: number; // snowball M after this spin's Eye was added (snowball features only)
};

// --- Spin / round settlement ----------------------------------------------------------
type BookEventSetWin = {
	index: number;
	type: 'setWin';
	amount: number;
	winLevel: number; // 1–10 celebration tier (winLevelMap)
};

type BookEventSetTotalWin = {
	index: number;
	type: 'setTotalWin';
	amount: number;
};

type BookEventWincap = {
	index: number;
	type: 'wincap';
	amount: number;
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
	capped: boolean; // true = 15,000× max-win hit → cap celebration
};

// --- Free Spins lifecycle -------------------------------------------------------------
type BookEventFreeSpinTrigger = {
	index: number;
	type: 'freeSpinTrigger';
	totalFs: number;
	positions: Position[];
};

type BookEventFreeSpinRetrigger = {
	index: number;
	type: 'freeSpinRetrigger';
	totalFs: number; // new running total
	positions: Position[];
};

type BookEventUpdateFreeSpin = {
	index: number;
	type: 'updateFreeSpin';
	amount: number; // current spin #
	total: number;
};

type BookEventFreeSpinEnd = {
	index: number;
	type: 'freeSpinEnd';
	amount: number; // total feature win
	winLevel: number;
};

// --- Customised (client-only, for resume) ---------------------------------------------
type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type BookEvent =
	| BookEventReveal
	| BookEventTumbleBoard
	| BookEventWinInfo
	| BookEventUpdateTumbleWin
	| BookEventGazeStep
	| BookEventScatterPay
	| BookEventEyeDrop
	| BookEventEyeReveal
	| BookEventEyeResolve
	| BookEventUltimateResolve
	| BookEventSetPersistentMult
	| BookEventSetWin
	| BookEventSetTotalWin
	| BookEventWincap
	| BookEventFinalWin
	| BookEventFreeSpinTrigger
	| BookEventFreeSpinRetrigger
	| BookEventUpdateFreeSpin
	| BookEventFreeSpinEnd
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
