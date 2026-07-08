import type { BetModeData, BetModeMeta } from 'state-shared';

import { i18nDerived } from '../i18n/i18nDerived';

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

const t = (mode: string, field: string) => i18nDerived.betMode(mode, field);

const modeText = (
	modeKey: string,
	options: { description?: boolean; betAmountLabel?: boolean } = {},
) =>
	({
		get title() {
			return t(modeKey, 'TITLE');
		},
		get description() {
			return options.description ? t(modeKey, 'DESCRIPTION') : undefined;
		},
		get betAmountLabel() {
			return options.betAmountLabel ? t(modeKey, 'BET_AMOUNT_LABEL') : undefined;
		},
		get dialog() {
			return t(modeKey, 'DIALOG');
		},
		get button() {
			return t(modeKey, 'BUTTON');
		},
		get tickerIdle() {
			return t(modeKey, 'TICKER_IDLE');
		},
		get tickerSpin() {
			return t(modeKey, 'TICKER_SPIN');
		},
	}) as BetModeData['text'];

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
	text: modeText(data.mode),
	...data,
});

export const ABYSSAL_BET_MODE_META: BetModeMeta = {
	BASE: mode({
		mode: 'BASE',
		costMultiplier: 1.0,
		type: 'default',
		text: modeText('BASE'),
	}),
	ANTE: mode({
		mode: 'ANTE',
		costMultiplier: 1.25,
		type: 'activate',
		assets: { ...baseAssets, dialogImage: HERO.ANTE, volatility: '2' },
		text: modeText('ANTE', { description: true, betAmountLabel: true }),
	}),
	SUPERSPINS: mode({
		mode: 'SUPERSPINS',
		costMultiplier: 20,
		type: 'activate',
		assets: { ...baseAssets, dialogImage: HERO.SUPERSPINS, volatility: '3' },
		text: modeText('SUPERSPINS', { description: true }),
	}),
	BONUS: mode({
		mode: 'BONUS',
		costMultiplier: 100,
		type: 'buy',
		assets: { ...baseAssets, dialogImage: HERO.BONUS, volatility: '4' },
		text: modeText('BONUS', { description: true }),
	}),
	ULTIMATE: mode({
		mode: 'ULTIMATE',
		costMultiplier: 300,
		type: 'activate',
		assets: { ...baseAssets, dialogImage: HERO.ULTIMATE, volatility: '4' },
		text: modeText('ULTIMATE', { description: true }),
	}),
	SUPERBONUS: mode({
		mode: 'SUPERBONUS',
		costMultiplier: 500,
		type: 'buy',
		assets: { ...baseAssets, dialogImage: HERO.SUPERBONUS, volatility: '5' },
		text: modeText('SUPERBONUS', { description: true }),
	}),
};
