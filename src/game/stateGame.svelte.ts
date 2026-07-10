import _ from 'lodash';
import type { Tween } from 'svelte/motion';

import { stateBet, stateBetDerived } from 'state-shared';
import { createEnhanceBoard, createReelForCascading } from 'utils-slots';
import { createGetWinLevelDataByWinLevelAlias } from 'utils-shared/winLevel';

import type { EyeType, GameType, Position, RawSymbol, SymbolState } from './types';
import { winLevelMap } from './winLevelMap';
import { eventEmitter } from './eventEmitter';
import { skipActive } from './skip.svelte';
import {
	REEL_CELL_HEIGHT,
	INITIAL_BOARD,
	BOARD_DIMENSIONS,
	SPIN_OPTIONS_DEFAULT,
	SPIN_OPTIONS_FAST,
	INITIAL_SYMBOL_STATE,
	SCATTER_LAND_SOUND_MAP,
	VISIBLE_ROW_START,
	REEL_LAYOUT_BASE,
	REEL_LAYOUT_FREE_SPINS,
	getReelDisplayGrid,
	getReelPosition,
} from './constants';

const getScatterLandSoundIndex = (scatterCount: number) => {
	if (scatterCount > 5) return 5;
	if (scatterCount < 1) return 1;
	return scatterCount as 1 | 2 | 3 | 4 | 5;
};

const getVisibleLandPosition = ({ reel, row }: { reel?: number; row?: number }) => {
	const position: Position | undefined =
		reel === undefined || row === undefined ? undefined : { reel, row };
	const isVisiblePosition =
		position === undefined ||
		(position.reel >= 0 &&
			position.reel < BOARD_DIMENSIONS.x &&
			position.row >= 0 &&
			position.row < BOARD_DIMENSIONS.y);
	return isVisiblePosition ? position : undefined;
};

const onSymbolLand = ({
	rawSymbol,
	reel,
	row,
}: {
	rawSymbol: RawSymbol;
	reel?: number;
	row?: number;
}) => {
	const position = getVisibleLandPosition({ reel, row });
	if (reel !== undefined && row !== undefined && position === undefined) return;

	if (rawSymbol.name === 'S') {
		const scatterCountAfterLand = stateGame.scatterCounter + 1;

		// No board jolt on a scatter land. A base book caps at 3 scatters (a near-miss that pays
		// and triggers nothing — the feature needs ≥4), so jolting the whole board on the 3rd was
		// all promise and no payoff. Tension is owned entirely by the math's per-reel `anticipation`
		// array via the reels' `anticipating` flag (see Anticipations.svelte → ScatterFx): it darkens
		// + zooms only while another scatter can still land, and the trigger celebration
		// (freeSpinTrigger → scatterCelebrate) owns the payoff. The scatter still gets its own
		// land flare (Symbol) + frame-glow surge below.
		eventEmitter.broadcast({ type: 'reelFrameScatterLand', position });
		eventEmitter.broadcast({ type: 'soundScatterCounterIncrease' });
		// the anticipation releases the moment the TRIGGERING scatter lands: the 4th in the
		// basegame (bonus), the 3rd in the feature (retrigger only needs 3)
		const triggerCount = stateGame.gameType === 'freegame' ? 3 : 4;
		if (scatterCountAfterLand >= triggerCount && stateGame.scatterAnticipating) {
			eventEmitter.broadcast({ type: 'reelFrameScatterAnticipationEnd' });
		}
		eventEmitter.broadcast({
			type: 'soundOnce',
			name: SCATTER_LAND_SOUND_MAP[getScatterLandSoundIndex(scatterCountAfterLand)],
		});
	}

	if (rawSymbol.name === 'EYE') {
		eventEmitter.broadcast({ type: 'boardEyeImpact', position });
		eventEmitter.broadcast({ type: 'reelFrameEyeLand', position });
	}
};

const board = _.range(BOARD_DIMENSIONS.x).map((reelIndex) => {
	const reel = createReelForCascading({
		reelIndex,
		symbolHeight: REEL_CELL_HEIGHT,
		initialSymbols: INITIAL_BOARD[reelIndex],
		initialSymbolState: INITIAL_SYMBOL_STATE,
		onReelStopping: () => {
			eventEmitter.broadcast({
				type: 'soundOnce',
				name: 'sfx_reel_stop_1',
				forcePlay: !stateBet.isTurbo,
			});
			// contact feedback: the column's weight lands — a tiny frame dip + a bubble puff
			// at the bottom row (the reel stop fires at the bottom symbol's contact)
			eventEmitter.broadcast({ type: 'reelFrameReelStop' });
			eventEmitter.broadcast({
				type: 'boardLandPuff',
				cells: [{ reel: reelIndex, row: VISIBLE_ROW_START + BOARD_DIMENSIONS.y - 1 }],
			});
		},
		onSymbolLand,
	});

	// read at each tween's start — an armed skip drops exactly like turbo, mid-beat
	reel.reelState.spinOptions = () =>
		skipActive() || reel.reelState.spinType === 'fast' ? SPIN_OPTIONS_FAST : SPIN_OPTIONS_DEFAULT;

	return reel;
});

export type Reel = (typeof board)[number];
export type ReelSymbol = Reel['reelState']['symbols'][number];

export type TumbleSymbol = {
	symbolY: Tween<number>;
	rawSymbol: RawSymbol;
	symbolState: SymbolState;
	oncomplete: () => void;
	isRefill?: boolean;
};

export const stateGame = $state({
	board,
	gameType: 'basegame' as GameType,
	tumbleBoardAdding: [] as TumbleSymbol[][],
	tumbleBoardBase: [] as TumbleSymbol[][],
	scatterCounter: 0,
	// True while the board is anticipating the free-spins trigger (3+ scatters down). Scatters
	// pulse harder and the board dims/holds while we wait for the next one.
	scatterAnticipating: false,
	// The Eye's Gaze charge for the current spin (driven by `gazeStep`); reset each reveal.
	gazeCharge: 0,
	// The clusters of the tumble that is about to charge the Gaze — stashed by `winInfo`
	// (count + overlay cell per cluster) and consumed by the NEXT `gazeStep`, which turns them
	// into per-cluster essence orbs (+2/+3/+5 by size). Cleared on consume and each reveal.
	pendingGazeClusters: [] as { count: number; reel: number; row: number }[],
	// Tracks whether the current spin already resolved an Eye. If charge exists and this
	// stays false by settlement, the meter drains as the intended no-Eye near miss.
	eyeResolvedThisSpin: false,
	// Every Eye opened this spin (with its board cell + value), in reveal order. Drives the combine
	// reveal at `eyeResolve` (gaze + each Eye → final multiplier). Reset each reveal. Ultimate has
	// 1–5; base/feature exactly 1.
	revealedEyes: [] as { reel: number; row: number; eyeType: EyeType; startValue: number }[],
	// The board cell of the Eye that resolved this spin — the origin the multiplier flies from
	// when it travels to the tumble-win banner. Set at `eyeReveal`, cleared each reveal.
	eyeResolveCell: null as { reel: number; row: number } | null,
	// True between an Eye resolving and its multiplier being applied to the tumble-win banner
	// (consumed in `setWin`). Guards a second setWin from re-triggering the multiply.
	eyeMultPending: false,
	// Snowball persistent multiplier `M` during a feature (driven by `setPersistentMult`).
	persistentMult: 1,
	// Keeps the game scene blurred while the free-spins congratulations banner is awaiting a press.
	freeSpinIntroActive: false,
	// True while a tumble refill slides symbols into place. Cascade settles reuse the `land`
	// symbol state, but they are settles, not landings — components use this to skip the
	// landing fanfare (e.g. the scatter's flare/ring/rays only fire on real reel-stop lands).
	cascading: false,
});

const reelLayout = () =>
	stateGame.gameType === 'freegame' ? REEL_LAYOUT_FREE_SPINS : REEL_LAYOUT_BASE;

const boardLayout = () => {
	const layout = reelLayout();
	const grid = getReelDisplayGrid(layout);
	const position = getReelPosition(layout);

	return {
		x: position.x + grid.x + grid.width / 2,
		y: position.y + grid.y + grid.height / 2,
		anchor: { x: 0.5, y: 0.5 },
		pivot: { x: grid.width / 2, y: grid.height / 2 },
		width: grid.width,
		height: grid.height,
	};
};

const boardRaw = () =>
	board.map((reel) => reel.reelState.symbols.map((reelSymbol) => reelSymbol.rawSymbol));

const tumbleBoardCombined = () => {
	const tumbleBoardCombined = stateGame.tumbleBoardBase.map((tumbleReelBase, reelIndex) => {
		const tumbleReelAdding = stateGame.tumbleBoardAdding[reelIndex] ?? [];
		return [...tumbleReelAdding, ...tumbleReelBase];
	});

	return tumbleBoardCombined;
};

const scatterLandIndex = () => getScatterLandSoundIndex(stateGame.scatterCounter);

const { enhanceBoard } = createEnhanceBoard();
const enhancedBoard = enhanceBoard({ board: stateGame.board });

// One treatment for the spacebar hold AND press-to-skip: reels flip to the fast spin
// options, the scatter tease (zoom + slow-roll) is cancelled, pending holds release, and
// every fall already in flight FINISHES at the fast drop speed (finishFall re-times, it does
// not snap — see createReelForCascading). Order matters: spinType must be 'fast' BEFORE
// finishFall so the re-timed falls read the fast options.
const speedUpCurrentSpin = () => {
	enhancedBoard.board.forEach((reel) => {
		reel.reelState.spinType = 'fast';
		// drop the scatter anticipation on this reel — clearing every flag makes
		// Anticipations' `hasAnticipation` false, which releases the board zoom-hold too
		reel.reelState.anticipating = false;
	});
	enhancedBoard.stop();
	enhancedBoard.board.forEach((reel) => reel.finishFall());
};

const enableTurbo = () => {
	stateBetDerived.updateIsTurbo(true, { persistent: true });
	speedUpCurrentSpin();
};

// win levels

export const { getWinLevelDataByWinLevelAlias } = createGetWinLevelDataByWinLevelAlias({
	winLevelMap,
});

export const stateGameDerived = {
	onSymbolLand,
	reelLayout,
	boardLayout,
	boardRaw,
	tumbleBoardCombined,
	scatterLandIndex,
	enhancedBoard,
	speedUpCurrentSpin,
	enableTurbo,
	getWinLevelDataByWinLevelAlias,
};
