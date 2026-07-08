import { stateBet } from 'state-shared';
import { createPlayBookUtils } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import {
	REEL_CELL_HEIGHT,
	REEL_CELL_WIDTH,
	SYMBOL_INFO_MAP,
	BOARD_DIMENSIONS,
	VISIBLE_ROW_START,
} from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';
import { withSkipBoundaries } from './skip.svelte';
import type { RawSymbol, SymbolState } from './types';

// general utils
export const { getEmptyBoard } = createGetEmptyPaddedBoard({ reelsDimensions: BOARD_DIMENSIONS });
// handlers are wrapped so a screen press skips exactly the CURRENT book event (see skip.svelte)
export const { playBookEvent, playBookEvents } = createPlayBookUtils({
	bookEventHandlerMap: withSkipBoundaries(bookEventHandlerMap),
});
export const playBet = async (bet: Bet) => {
	stateBet.winBookEventAmount = 0;
	await playBookEvents(bet.state);
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

// resume bet — reserve the events needed to reconstruct the on-screen state at the resume
// point (`round.event`), so play can continue precisely from where the player left off:
//   reveal           → the board + gameType to settle behind the continuation
//   freeSpinTrigger  → whether we're inside the feature (counter/glow/snowball)
//   updateFreeSpin   → the spin counter (current / total)
//   setPersistentMult→ the snowball multiplier M
//   setTotalWin      → the running round win
const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'reveal',
	'setPersistentMult',
	'freeSpinTrigger',
	'updateFreeSpin',
	'setTotalWin',
];

export const convertTorResumableBet = (betToResume: Bet) => {
	const resumingIndex = Number(betToResume.event);
	const bookEventsBeforeResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex < resumingIndex,
	);
	const bookEventsAfterResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex >= resumingIndex,
	);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter((bookEvent) =>
			BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type),
		),
	};

	const stateToResume = [bookEventToCreateSnapshot, ...bookEventsAfterResume];

	return { ...betToResume, state: stateToResume };
};

// other utils
export const getSymbolX = (reelIndex: number) => REEL_CELL_WIDTH * (reelIndex + 0.5);
export const getSymbolY = (symbolIndexOfBoard: number) =>
	(symbolIndexOfBoard + 0.5) * REEL_CELL_HEIGHT;
export const getVisibleRowIndex = (row: number) => row - VISIBLE_ROW_START;
export const getPaddedRowIndex = (row: number) => row;
export const getPositionX = (reel: number) => getSymbolX(reel);
export const getPositionY = (row: number) => getSymbolY(getVisibleRowIndex(row));

export const getSymbolKey = ({ rawSymbol }: { rawSymbol: RawSymbol }) =>
	rawSymbol.name as keyof typeof SYMBOL_INFO_MAP;

export const getSymbolInfo = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}) => {
	const symbolKey = getSymbolKey({ rawSymbol });
	return SYMBOL_INFO_MAP[symbolKey][state];
};
