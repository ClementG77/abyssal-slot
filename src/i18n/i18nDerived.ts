import { stateI18nDerived } from 'state-shared';

import { i18nDerived as i18nDerivedUiPixi } from 'components-ui-pixi';
import { i18nDerived as i18nDerivedUiHtml } from 'components-ui-html';

const WIN_TIER_KEYS = {
	bigWin: 'WIN_TIER_BIG',
	superWin: 'WIN_TIER_SUPER',
	hugeWin: 'WIN_TIER_HUGE',
	megaWin: 'WIN_TIER_MEGA',
	epicWin: 'WIN_TIER_EPIC',
	maxWin: 'WIN_TIER_MAX',
} as const;

export const i18nDerived = {
	...i18nDerivedUiPixi,
	...i18nDerivedUiHtml,
	// Both SDK packages ship a `bet`, and ui-pixi additionally hardcodes its own social swaps
	// (bet → 'SPIN', buyBonus → 'PLAY BONUS') instead of reading the message table. Stake.US's
	// official phrase list maps bet → play and buy bonus → get bonus, so route both through our
	// table (see i18n/socialMessages.ts) to get the mandated wording. Declared explicitly rather
	// than relying on the spread order above to settle which package's `bet` wins.
	bet: () => stateI18nDerived.translate('BET'),
	buyBonus: () => stateI18nDerived.translate('BUY BONUS'),
	home: () => stateI18nDerived.translate('HOME'),
	notTranslated: () => stateI18nDerived.translate('NOT TRANSLATED'),
	gameInfo: (key: string) => stateI18nDerived.translate(`GAME_INFO_${key}`),
	loaderSubtitle: () => stateI18nDerived.translate('LOADER_SUBTITLE'),
	loaderLogo: () => stateI18nDerived.translate('LOADER_LOGO'),
	loaderCard1Title: () => stateI18nDerived.translate('LOADER_CARD_1_TITLE'),
	loaderCard1Body: () => stateI18nDerived.translate('LOADER_CARD_1_BODY'),
	loaderCard2Title: () => stateI18nDerived.translate('LOADER_CARD_2_TITLE'),
	loaderCard2Body: () => stateI18nDerived.translate('LOADER_CARD_2_BODY'),
	loaderCard3Title: () => stateI18nDerived.translate('LOADER_CARD_3_TITLE'),
	loaderCard3Body: () => stateI18nDerived.translate('LOADER_CARD_3_BODY'),
	loaderCta: () => stateI18nDerived.translate('LOADER_CTA'),
	loaderLoading: () => stateI18nDerived.translate('LOADER_LOADING'),
	loaderCardsLabel: () => stateI18nDerived.translate('LOADER_CARDS_LABEL'),
	loaderPreviousCard: () => stateI18nDerived.translate('LOADER_PREVIOUS_CARD'),
	loaderNextCard: () => stateI18nDerived.translate('LOADER_NEXT_CARD'),
	freeSpinsTapToPlay: () => stateI18nDerived.translate('FREE_SPINS_TAP_TO_PLAY'),
	freeSpinsTapToSkip: () => stateI18nDerived.translate('FREE_SPINS_TAP_TO_SKIP'),
	active: () => stateI18nDerived.translate('ACTIVE'),
	activate: () => stateI18nDerived.translate('ACTIVATE'),
	deactivate: () => stateI18nDerived.translate('DEACTIVATE'),
	buy: () => stateI18nDerived.translate('BUY'),
	bonus: () => stateI18nDerived.translate('BONUS'),
	lowFunds: () => stateI18nDerived.translate('LOW_FUNDS'),
	perSpin: () => stateI18nDerived.translate('PER_SPIN'),
	total: () => stateI18nDerived.translate('TOTAL'),
	cancel: () => stateI18nDerived.translate('CANCEL'),
	confirmBuy: () => stateI18nDerived.translate('CONFIRM_BUY'),
	decreaseBet: () => stateI18nDerived.translate('DECREASE_BET'),
	increaseBet: () => stateI18nDerived.translate('INCREASE_BET'),
	music: () => stateI18nDerived.translate('MUSIC'),
	sfx: () => stateI18nDerived.translate('SFX'),
	play: () => stateI18nDerived.translate('PLAY'),
	playAgain: () => stateI18nDerived.translate('PLAY_AGAIN'),
	loadingReplay: () => stateI18nDerived.translate('LOADING_REPLAY'),
	replayUnavailable: () => stateI18nDerived.translate('REPLAY_UNAVAILABLE'),
	replay: () => stateI18nDerived.translate('REPLAY'),
	speed: () => stateI18nDerived.translate('SPEED'),
	tumbleWin: () => stateI18nDerived.translate('TUMBLE_WIN'),
	totalMult: () => stateI18nDerived.translate('TOTAL_MULT'),
	gaze: () => stateI18nDerived.translate('GAZE'),
	tapToContinue: () => stateI18nDerived.translate('TAP_TO_CONTINUE'),
	on: () => stateI18nDerived.translate('ON'),
	off: () => stateI18nDerived.translate('OFF'),
	anteSwitchNote: () => stateI18nDerived.translate('ANTE_SWITCH_NOTE'),
	auto: () => stateI18nDerived.translate('AUTO'),
	all: () => stateI18nDerived.translate('ALL'),
	start: () => stateI18nDerived.translate('START'),
	winTier: (tierKey: keyof typeof WIN_TIER_KEYS) =>
		stateI18nDerived.translate(WIN_TIER_KEYS[tierKey]),
	betMode: (mode: string, field: string) =>
		stateI18nDerived.translate(`BET_MODE_${mode}_${field}`),
};
