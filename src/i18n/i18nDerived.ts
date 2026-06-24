import { stateI18nDerived } from 'state-shared';

import { i18nDerived as i18nDerivedUiPixi } from 'components-ui-pixi';
import { i18nDerived as i18nDerivedUiHtml } from 'components-ui-html';

export const i18nDerived = {
	...i18nDerivedUiPixi,
	...i18nDerivedUiHtml,
	home: () => stateI18nDerived.translate('HOME'),
	notTranslated: () => stateI18nDerived.translate('NOT TRANSLATED'),
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
};
