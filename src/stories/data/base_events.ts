import type { RawSymbol, SymbolName } from '../game/types';

// Hand-authored Abyssal base-spin fixtures (one per handled event), matching
// FRONTEND_GUIDE §6/§8. Replace with real slices from `books_base.jsonl.zst` once the
// math repo's books are copied over (the structure is identical).

const s = (name: SymbolName): RawSymbol => {
	const sym: RawSymbol = { name };
	if (name === 'S') sym.scatter = true;
	if (name === 'EYE') sym.eye = true;
	return sym;
};

const reel = (...names: SymbolName[]): RawSymbol[] => names.map(s);

// 6 reels × 7 rows (padded). Visible rows 1–5 carry an L2 cluster of 9 (pays in the 8–9
// band → 0.20× = 20 cents-of-bet).
const board: RawSymbol[][] = [
	reel('L4', 'L2', 'H1', 'L2', 'H3', 'L1', 'L4'),
	reel('H2', 'L2', 'H4', 'L1', 'L2', 'H3', 'L1'),
	reel('L3', 'H1', 'L2', 'L4', 'H2', 'L2', 'L3'),
	reel('L1', 'H3', 'L1', 'L2', 'H4', 'L1', 'H2'),
	reel('L4', 'H4', 'L3', 'H1', 'L2', 'H2', 'L4'),
	reel('H2', 'L1', 'H3', 'L2', 'L1', 'H1', 'L2'),
];

// the 9 L2 positions on the visible board (padded coords; rows 1–5 are visible)
const l2Positions = [
	{ reel: 0, row: 1 },
	{ reel: 0, row: 3 },
	{ reel: 1, row: 1 },
	{ reel: 1, row: 4 },
	{ reel: 2, row: 2 },
	{ reel: 2, row: 5 },
	{ reel: 3, row: 3 },
	{ reel: 4, row: 4 },
	{ reel: 5, row: 3 },
];

export default {
	reveal: {
		index: 0,
		type: 'reveal',
		gameType: 'basegame',
		board,
		paddingPositions: [0, 0, 0, 0, 0, 0],
		anticipation: [0, 0, 0, 0, 0, 0],
	},

	winInfo: {
		index: 1,
		type: 'winInfo',
		totalWin: 20,
		wins: [
			{
				symbol: 'L2',
				count: 9,
				win: 20,
				positions: l2Positions,
				meta: { globalMult: 1, clusterMult: 1, winWithoutMult: 20, overlay: { reel: 2, row: 2 } },
			},
		],
	},

	updateTumbleWin: {
		index: 2,
		type: 'updateTumbleWin',
		amount: 20,
	},

	gazeStep: {
		index: 3,
		type: 'gazeStep',
		fromPositions: l2Positions,
		// essence economy: the 9-symbol L2 cluster charges +2 (tiers: +2/+3/+5 by size, cap 30)
		charge: 2,
	},

	tumbleBoard: {
		index: 4,
		type: 'tumbleBoard',
		explodingSymbols: l2Positions,
		// per reel, the new symbols dropping in (top-down) — one per exploded cell on that reel
		newSymbols: [
			reel('H1', 'L4'),
			reel('L3', 'H2'),
			reel('L1', 'H4'),
			reel('H3'),
			reel('L1'),
			reel('H2'),
		],
	},

	setWin: {
		index: 5,
		type: 'setWin',
		amount: 20,
		winLevel: 2,
	},

	setTotalWin: {
		index: 6,
		type: 'setTotalWin',
		amount: 20,
	},

	// the 15,000× cap — arrives after setTotalWin; drives the MAX WIN trophy takeover
	wincap: {
		index: 7,
		type: 'wincap',
		amount: 1500000,
	},

	finalWin: {
		index: 8,
		type: 'finalWin',
		amount: 20,
		capped: false,
	},
} as const;
