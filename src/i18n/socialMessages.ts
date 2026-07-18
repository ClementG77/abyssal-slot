import type { Messages } from '@lingui/core';

// Stake.US (social casino) vocabulary. Social mode only ever runs in English and forbids the
// wagering words. The replacements below are NOT invented — they follow Stake's official
// restricted-phrase list verbatim:
//
//   bet/bets → play/plays        buy → play              bought → instantly triggered
//   purchase → play              bonus buy → bonus       buy bonus → get bonus
//   pay/pays → win/wins          paid → won              pay out / pays out → win / won
//   stake → play amount          total bet → total play  betting → playing
//   cash / money → coins         fund → balance          credit → balance
//   currency → token             wager / gamble → play   deposit → get coins
//   withdraw → redeem            rebet → respin          at the cost of → for
//   cost of → can be played for  place your bets → come and play
//   win feature → play feature   payer → winner
//
// Applied at the MESSAGE level (see messagesMap/index.ts) rather than per-component, which
// buys us three things:
//
//  1. one English-only table, so no other locale file needs a social twin;
//  2. reach into strings owned by the SDK packages (the insufficient-funds modal, the bet menu)
//     — they merge on top of our map, so a component-level swap could not win against them;
//  3. no `social()` branch scattered through the components.
//
// Keys are whatever `stateI18nDerived.translate(key)` is called with — for the SDK packages the
// key IS the English sentence.
//
// ⚠️ The general disclaimer is mandated verbatim by Stake and keeps "wins and plays" — it must
// NOT be reworded here.
export const SOCIAL_MESSAGE_OVERRIDES: Messages = {
	// --- SDK package strings (key = the English source text) --------------------------------
	BET: 'PLAY',
	'BET MENU': 'PLAY MENU',
	'SELECT YOUR BET': 'SELECT YOUR PLAY AMOUNT',
	'BUY BONUS': 'GET BONUS',
	// the SDK's own paytable modal — our menu never opens it, but the string is one line to cover
	PAYTABLE: 'WIN TABLE',
	'INSUFFICIENT FUNDS TO PLACE THIS BET. PLEASE ADD FUNDS TO YOUR ACCOUNT OR LOWER THE BET LEVEL.':
		'NOT ENOUGH BALANCE FOR THIS PLAY. PLEASE GET MORE COINS OR LOWER THE PLAY AMOUNT.',

	// --- App-level UI ------------------------------------------------------------------------
	BUY: 'PLAY',
	CONFIRM_BUY: 'CONFIRM',
	DECREASE_BET: 'decrease play amount',
	INCREASE_BET: 'increase play amount',
	LOW_FUNDS: 'LOW BALANCE',
	ANTE_SWITCH_NOTE: '2x triggers & more Eyes - 1.25x play',
	LOADER_CARD_3_BODY:
		'Charged Eyes combine with Gaze\nfor massive wins.\nBuild power, then unleash it.',

	// --- Bet modes (cards, dialogs, tickers) -------------------------------------------------
	BET_MODE_BASE_TICKER_IDLE: 'COME AND PLAY',
	BET_MODE_ANTE_DIALOG:
		'Doubles the bonus trigger rate and raises the Eye frequency for 1.25x the play. ANTE stays active until disabled.',
	BET_MODE_ANTE_BET_AMOUNT_LABEL: 'ANTE PLAY',
	BET_MODE_ANTE_TICKER_IDLE: 'ANTE IS ACTIVE',
	BET_MODE_SUPERSPINS_DIALOG:
		'A single spin for 20x the play with the Eye guaranteed to land - and more can drop in mid-tumble. No snowball - one punchy build and release.',
	BET_MODE_BONUS_DESCRIPTION: 'Play straight into the Free Spins snowball feature.',
	BET_MODE_BONUS_DIALOG:
		'Triggers Free Spins for 100x the play - the trigger scatters win their instant coins too. The persistent multiplier (M) snowballs across the feature as Eyes land.',
	BET_MODE_BONUS_BUTTON: 'PLAY',
	BET_MODE_BONUS_TICKER_IDLE: 'COME AND PLAY',
	BET_MODE_BONUS_TICKER_SPIN: 'FREE SPINS INSTANTLY TRIGGERED',
	BET_MODE_ULTIMATE_DIALOG:
		'Always at least 2 Eyes on the board (2-5, and more can drop in) for 300x the play, combining their ADD and MUL values in one resolution.',
	BET_MODE_SUPERBONUS_DIALOG:
		'The Free Spins feature can be played for 500x the play. The Gaze charges at double Essence (+4/+6/+10 per cluster) and the trigger scatters win their instant coins. The mode that most often approaches the 15,000x cap.',
	BET_MODE_SUPERBONUS_BUTTON: 'PLAY',
	BET_MODE_SUPERBONUS_TICKER_IDLE: 'COME AND PLAY',
	BET_MODE_SUPERBONUS_TICKER_SPIN: 'SUPER BONUS INSTANTLY TRIGGERED',

	// --- Game info ---------------------------------------------------------------------------
	GAME_INFO_LEAD_HTML:
		'Symbols drop onto a <strong>6&times;5 board</strong>. You win whenever <strong>8 or more of the same symbol</strong> land <strong>anywhere</strong> &ndash; no fixed lines. Winners burst and new symbols tumble in, which can chain into more wins from a single spin. There is <strong>no wild</strong>; the <strong>Eye</strong> is the sole multiplier.',
	GAME_INFO_HOW_SPIN_PLAYS_STEP_4: 'Wins are checked again, repeating until a drop wins nothing.',
	GAME_INFO_KEY_FIGURES_MAX_WIN_HTML:
		'Maximum win: <strong>15,000x the play</strong>. The total wins of a round are capped at this amount; once the cap is reached the round ends instantly.',
	GAME_INFO_PAYTABLE_TITLE: 'Win table',
	GAME_INFO_PAYTABLE_NOTE:
		'Wins are a multiple of your play, by how many land - before any Eye multiplier.',
	GAME_INFO_SPECIAL_SCATTER_DESCRIPTION_HTML:
		'<strong>4+</strong> triggers Free Spins and wins instantly: <strong>4 = 3x</strong>, <strong>5 = 5x</strong>, <strong>6 = 100x</strong> &ndash; also on instantly triggered features.',
	GAME_INFO_EYE_GAZE_EXAMPLE_HTML:
		'Example: a 2x win from two ordinary clusters builds a Gaze of 4. An ADD Eye starting at 10 &rarr; x14 &rarr; wins 28x. A MULTIPLY Eye &rarr; x40 &rarr; wins 80x.',
	GAME_INFO_FREE_SPINS_BULLET_3_HTML:
		'A <strong>banked multiplier</strong> starts at x1 and only grows, winning for you on Eye spins.',
	GAME_INFO_MODE_BASE_COST: '1x play',
	GAME_INFO_MODE_ANTE_COST: '1.25x play',
	GAME_INFO_MODE_ANTE_TEXT: 'For 1.25x the play, twice the bonus triggers and more frequent Eyes.',
	GAME_INFO_MODE_BUY_FREE_SPINS_NAME: 'Free Spins',
	GAME_INFO_MODE_BUY_FREE_SPINS_COST: '100x play',
	GAME_INFO_MODE_BUY_FREE_SPINS_TEXT:
		'Play straight into the Free Spins feature - the trigger scatters win their instant coins too.',
	GAME_INFO_MODE_SUPER_SPINS_COST: '20x play',
	GAME_INFO_MODE_SUPER_BONUS_COST: '500x play',
	GAME_INFO_MODE_ULTIMATE_COST: '300x play',
	GAME_INFO_CONTROL_SPIN_TEXT:
		'Starts the round at your chosen play amount. While the round plays, the same button fast-forwards it.',
	GAME_INFO_CONTROL_BET_NAME: 'Play amount',
	GAME_INFO_CONTROL_BET_TEXT:
		'The - and + buttons step through the available play amounts; tapping the amount opens the full list.',
	GAME_INFO_CONTROL_MODES_TEXT:
		'Opens the game-mode panel. Any mode that needs a higher play amount than the regular spin always shows a confirmation with its total play before it starts.',
};
