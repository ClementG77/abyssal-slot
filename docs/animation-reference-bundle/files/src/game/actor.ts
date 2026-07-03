import _ from 'lodash';

import { stateBet } from 'state-shared';
import { checkIsMultipleRevealEvents } from 'utils-book';
import { createPrimaryMachines, createIntermediateMachines, createGameActor } from 'utils-xstate';

import type { Bet } from './typesBookEvent';
import { eventEmitter } from './eventEmitter';
import { stateXstateDerived } from './stateXstate';
import { playBet, convertTorResumableBet } from './utils';
import { stateGameDerived } from './stateGame.svelte';

const STICKY_BET_MODE_KEYS = new Set(['ANTE', 'SUPERSPINS']);
let stickyBetModeKey: string | null = null;

const rememberStickyBetMode = () => {
	const modeKey = stateBet.activeBetModeKey.toUpperCase();
	stickyBetModeKey = STICKY_BET_MODE_KEYS.has(modeKey) ? stateBet.activeBetModeKey : null;
};

const restoreStickyBetMode = () => {
	if (stickyBetModeKey) stateBet.activeBetModeKey = stickyBetModeKey;
};

const primaryMachines = createPrimaryMachines<Bet>({
	onResumeGameActive: (betToResume) => convertTorResumableBet(betToResume),
	onResumeGameInactive: (betToResume) => {
		const lastRevealEvent = _.findLast(
			betToResume.state,
			(bookEvent) => bookEvent?.type === 'reveal',
		);

		if (lastRevealEvent) stateGameDerived.enhancedBoard.settle(lastRevealEvent.board);
	},
	onNewGameStart: async () => {
		rememberStickyBetMode();
		if ((stateBet.isTurbo && stateXstateDerived.isAutoBetting()) || stateBet.isSpaceHold) return;
		stateBet.winBookEventAmount = 0;
		eventEmitter.broadcast({ type: 'reelFrameSpinLaunch' });
		await stateGameDerived.enhancedBoard.preSpin({});
	},
	onNewGameError: () => {
		restoreStickyBetMode();
		stateGameDerived.enhancedBoard.settle();
	},
	onPlayGame: async (bet) => {
		restoreStickyBetMode();
		await playBet(bet);
	},
	checkIsBonusGame: (bet) => checkIsMultipleRevealEvents({ bookEvents: bet.state }),
});

const intermediateMachines = createIntermediateMachines(primaryMachines);

export const gameActor = createGameActor(intermediateMachines);
