import type { BetModeData, BetModeMeta } from 'state-shared';

// Provider logo, shown as the small brand mark on each card. Resolved via `new URL(..., import.meta.url)`
// like every other asset — files in `static/` are served from the ROOT (`/assets/...`, NOT
// `/static/assets/...`), and this form also respects the deploy base path on Stake.
const providerLogo = new URL('../../assets/provider_logo.png', import.meta.url).href;

// Per-mode hero art for each buy-bonus card, from static/assets/bonus/. Static literals so Vite
// emits them. (`utlimate.png` is the on-disk filename — keep the typo.)
const HERO = {
	ANTE: new URL('../../assets/bonus/ante.png', import.meta.url).href,
	SUPERSPINS: new URL('../../assets/bonus/superspins.png', import.meta.url).href,
	BONUS: new URL('../../assets/bonus/bonus.png', import.meta.url).href,
	ULTIMATE: new URL('../../assets/bonus/utlimate.png', import.meta.url).href,
	SUPERBONUS: new URL('../../assets/bonus/superbonus.png', import.meta.url).href,
};

// Abyssal's bet modes, surfaced to the SDK bet UI via `stateMeta.betModeMeta`.
// The UI is data-driven off this: `type: 'default'` = the normal spin, `'activate'` = the
// ante toggle, `'buy'` = a buy card in the buy-bonus modal (BuyBonusModal filters by type).
//
// Mode keys are UPPERCASE per SDK convention (ButtonBetProvider/ButtonBuyBonus hardcode
// 'BASE'; `activeBetMode()` does a case-insensitive lookup). The key is also the `mode`
// string sent to the RGS `/wallet/play`. Costs mirror index.json
// (base 1.0 / ante 1.25 / superspins 20 / bonus 100 / ultimate 300 / superbonus 500).
//
// ⚠️ Verify against the live RGS: index.json lists modes lowercase ("base", …) while the
// SDK sends the uppercase key. If the live RGS is case-sensitive, normalise the sent mode.

const WIN_CAP = 15000;

const baseAssets = {
	icon: providerLogo, // Celest Studios mark on every bet-mode / buy-bonus card
	volatility: '',
	button: '',
	dialogImage: '',
	dialogVolatility: '',
};

const mode = (
	data: Partial<BetModeData> & Pick<BetModeData, 'mode' | 'costMultiplier' | 'type'>,
): BetModeData => ({
	parent: '',
	children: '',
	maxWin: WIN_CAP,
	assets: baseAssets,
	text: {
		title: data.mode,
		dialog: '',
		button: '',
		tickerIdle: '',
		tickerSpin: 'GOOD LUCK',
	},
	...data,
});

export const ABYSSAL_BET_MODE_META: BetModeMeta = {
	BASE: mode({
		mode: 'BASE',
		costMultiplier: 1.0,
		type: 'default',
		text: {
			title: 'BASE',
			dialog: 'The standard Abyssal spin. The Eye is rare and mostly ADD.',
			button: '',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'GOOD LUCK',
		},
	}),
	ANTE: mode({
		mode: 'ANTE',
		costMultiplier: 1.25,
		type: 'activate',
		assets: { ...baseAssets, dialogImage: HERO.ANTE, volatility: '2' },
		text: {
			title: 'ANTE',
			description: 'Raise the tide — more frequent Eyes and Scatters.',
			dialog:
				'Increases the Eye and Scatter frequency for 1.25× the bet. ANTE BET stays active until disabled.',
			button: 'ACTIVATE',
			betAmountLabel: 'ANTE BET',
			tickerIdle: 'ANTE BET IS ACTIVE',
			tickerSpin: 'GOOD LUCK',
		},
	}),
	SUPERSPINS: mode({
		mode: 'SUPERSPINS',
		costMultiplier: 20,
		type: 'activate',
		assets: { ...baseAssets, dialogImage: HERO.SUPERSPINS, volatility: '3' },
		text: {
			title: 'EYE SPINS',
			description: 'One guaranteed-Eye spin — a single build-and-release.',
			dialog:
				'A single spin for 20× the bet with the Eye guaranteed to land. No snowball — one punchy build and release.',
			button: 'ACTIVATE',
			tickerIdle: 'SUPER SPINS IS ACTIVE',
			tickerSpin: 'GOOD LUCK',
		},
	}),
	BONUS: mode({
		mode: 'BONUS',
		costMultiplier: 100,
		type: 'buy',
		assets: { ...baseAssets, dialogImage: HERO.BONUS, volatility: '4' },
		text: {
			title: 'BONUS',
			description: 'Buy straight into the Free Spins snowball feature.',
			dialog:
				'Triggers Free Spins for 100× the bet. The persistent multiplier (M) snowballs across the feature as the Eye lands.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'FREE SPINS PURCHASED',
		},
	}),
	ULTIMATE: mode({
		mode: 'ULTIMATE',
		costMultiplier: 300,
		type: 'activate',
		assets: { ...baseAssets, dialogImage: HERO.ULTIMATE, volatility: '4' },
		text: {
			title: 'ULTIMATE',
			description: 'The multi-Eye finale — several Eyes resolve at once.',
			dialog:
				'The only mode where multiple Eyes open together for 300× the bet, combining their ADD and MUL values in one resolution.',
			button: 'ACTIVATE',
			tickerIdle: 'ULTIMATE IS ACTIVE',
			tickerSpin: 'GOOD LUCK',
		},
	}),
	SUPERBONUS: mode({
		mode: 'SUPERBONUS',
		costMultiplier: 500,
		type: 'buy',
		assets: { ...baseAssets, dialogImage: HERO.SUPERBONUS, volatility: '5' },
		text: {
			title: 'SUPER BONUS',
			description: 'The tail mode — charge +2 and MUL common.',
			dialog:
				'Buys the Free Spins feature for 500× the bet with +2 Gaze charge per connection and MUL Eyes common. The mode that most often approaches the 15,000× cap.',
			button: 'BUY',
			tickerIdle: 'PLACE YOUR BET',
			tickerSpin: 'SUPER BONUS PURCHASED',
		},
	}),
};
