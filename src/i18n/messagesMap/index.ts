import { mergeMessagesMaps } from 'utils-shared/i18n';
import { messagesMap as messagesMapUiPixi } from 'components-ui-pixi';
import { messagesMap as messagesMapUiHtml } from 'components-ui-html';

import { SOCIAL_MESSAGE_OVERRIDES } from '../socialMessages';

import ar from './ar';
import de from './de';
import en from './en';
import es from './es';
import fi from './fi';
import fr from './fr';
import hi from './hi';
import id from './id';
import ja from './ja';
import ko from './ko';
import pl from './pl';
import po from './po';
import pt from './pt';
import ru from './ru';
import tr from './tr';
import vi from './vi';
import zh from './zh';

const messagesMapGame = {
	ar,
	de,
	en,
	es,
	fi,
	fr,
	hi,
	id,
	ja,
	ko,
	pl,
	po,
	pt,
	ru,
	tr,
	vi,
	zh,
};

const messagesMap = mergeMessagesMaps([messagesMapGame, messagesMapUiPixi, messagesMapUiHtml]);

// Social casino (Stake.US) build of the same table, selected in `+layout.svelte` when the URL
// carries `social=true`. It enforces the two jurisdiction rules at once:
//
//  - **English only.** EVERY locale is pointed at the English messages, so whatever `lang` the
//    URL asks for, Lingui activates that locale but renders English copy.
//  - **No restricted words.** `SOCIAL_MESSAGE_OVERRIDES` is layered on top. Because it is applied
//    AFTER the package maps were merged in, it also reaches strings the SDK owns (the
//    insufficient-funds modal, the bet menu) — those merge over ours, so they can't be reworded
//    any earlier than this.
//
// Keyed off the merged map (not `config-lingui`'s `locales`) so aliases that only exist here,
// like `po`, are covered too.
export const socialMessagesMap = Object.fromEntries(
	Object.keys(messagesMap).map((locale) => [
		locale,
		{ ...messagesMap.en, ...SOCIAL_MESSAGE_OVERRIDES },
	]),
) as typeof messagesMap;

export default messagesMap;
