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
