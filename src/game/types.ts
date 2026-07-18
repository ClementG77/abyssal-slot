import { type CascadingReelSymbolState } from 'utils-slots';
import type config from './config';

export type SymbolName = keyof typeof config.symbols;
// Board symbols may carry special flags (see FRONTEND_GUIDE §2/§6). The EYE additionally
// reveals its `eyeType`/`startValue` via the `eyeReveal` event, not on the reveal board.
export type EyeType = 'ADD' | 'MUL';
export type RawSymbol = {
	name: SymbolName;
	scatter?: boolean;
	eye?: boolean;
	eyeType?: EyeType;
	startValue?: number;
	// client-only: set the moment the Eye's combine chip departs to the board centre — the
	// number leaves with the chip and the plain EMPTY eye art remains on the cell.
	spent?: boolean;
	// client-only: the winning cluster's essence tier (1 = 8-9 symbols, 2 = 10-11, 3 = 12+), set
	// on the cell while it animates a win so the win glow ramps hotter for bigger clusters.
	winTier?: 1 | 2 | 3;
};
export type BetMode = keyof typeof config.betModes;
export type GameType = keyof typeof config.paddingReels;

export const SYMBOL_STATES = [
	'static',
	'spin',
	'land',
	'win',
	'postWinStatic',
	'explosion',
] as const;

export type SymbolState = CascadingReelSymbolState | (typeof SYMBOL_STATES)[number];

export type Position = {
	reel: number;
	row: number;
};
