// Minimal FE-side mirror of the Abyssal math config.
//
// Only the *shape* of `symbols`, `betModes`, and `paddingReels` is consumed by the
// client (see `types.ts`, which derives `SymbolName` / `BetMode` / `GameType` from the
// keys here). Reel strips, paytable values and weights live in the math repo and reach
// the client exclusively through book events — they are intentionally NOT mirrored.
//
// Phase 1 will replace the `betModes` cost/feature flags with the real values surfaced by
// `library/publish_files/index.json`; the symbol/gameType keys are stable.

export default {
	providerName: 'stake_engine',
	gameName: 'abyssal',
	gameID: 'abyssal',
	rtp: 0.96,
	numReels: 6,
	numRows: [5, 5, 5, 5, 5, 5],
	maxWin: 15000.0,
	betModes: {
		base: {
			cost: 1.0,
			feature: true,
			buyBonus: false,
			rtp: 0.96,
			max_win: 15000.0,
			description: 'default game entry type',
		},
		ante: {
			cost: 1.25,
			feature: true,
			buyBonus: false,
			rtp: 0.96,
			max_win: 15000.0,
			description: 'ante toggle — higher Eye + scatter frequency',
		},
		bonus: {
			cost: 100,
			feature: false,
			buyBonus: true,
			rtp: 0.96,
			max_win: 15000.0,
			description: 'buy free spins (snowball feature)',
		},
		superspins: {
			cost: 20,
			feature: false,
			buyBonus: true,
			rtp: 0.96,
			max_win: 15000.0,
			description: 'one guaranteed-Eye spin, no snowball',
		},
		superbonus: {
			cost: 500,
			feature: false,
			buyBonus: true,
			rtp: 0.96,
			max_win: 15000.0,
			description: 'free-spins-like, charge +2, MUL common',
		},
		ultimate: {
			cost: 300,
			feature: false,
			buyBonus: true,
			rtp: 0.96,
			max_win: 15000.0,
			description: 'multi-Eye finale — several Eyes resolve at once',
		},
	},
	symbols: {
		H1: { paytable: [] }, // Anglerfish
		H2: { paytable: [] }, // Nautilus
		H3: { paytable: [] }, // Diving Helmet
		H4: { paytable: [] }, // Jellyfish
		L1: { paytable: [] }, // Cyan gem
		L2: { paytable: [] }, // Teal gem
		L3: { paytable: [] }, // Sapphire gem
		L4: { paytable: [] }, // Violet gem
		L5: { paytable: [] }, // Aqua gem
		S: { special_properties: ['scatter'] }, // Leviathan
		EYE: { special_properties: ['eye'] }, // The Eye
	},
	paddingReels: {
		basegame: [],
		freegame: [],
	},
} as const;
