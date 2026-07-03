import type { EmitterEventBoard } from '../components/Board.svelte';
import type { EmitterEventReelFrame } from '../components/ReelFrame.svelte';
import type { EmitterEventClusterWinAmounts } from '../components/ClusterWinAmounts.svelte';
import type { EmitterEventTumbleBoard } from '../components/TumbleBoard.svelte';
import type { EmitterEventTumbleWinAmount } from '../components/TumbleWinAmount.svelte';
import type { EmitterEventBoardDebris } from '../components/BoardDebris.svelte';
import type { EmitterEventScatterFx } from '../components/ScatterFx.svelte';
import type { EmitterEventGazeMeter } from '../components/GazeMeter.svelte';
import type { EmitterEventEye } from '../components/Eye.svelte';
import type { EmitterEventPersistentMultiplier } from '../components/PersistentMultiplier.svelte';
import type { EmitterEventWinCapCelebration } from '../components/WinCapCelebration.svelte';
import type { EmitterEventFreeSpinIntro } from '../components/FreeSpinIntro.svelte';
import type { EmitterEventFreeSpinRetrigger } from '../components/FreeSpinRetrigger.svelte';
import type { EmitterEventFreeSpinCounter } from '../components/FreeSpinCounter.svelte';
import type { EmitterEventFreeSpinOutro } from '../components/FreeSpinOutro.svelte';
import type { EmitterEventWin } from '../components/Win.svelte';
import type { EmitterEventSound } from '../components/Sound.svelte';
import type { EmitterEventTransition } from '../components/Transition.svelte';

export type EmitterEventGame =
	| EmitterEventBoard
	| EmitterEventReelFrame
	| EmitterEventClusterWinAmounts
	| EmitterEventTumbleBoard
	| EmitterEventTumbleWinAmount
	| EmitterEventBoardDebris
	| EmitterEventScatterFx
	| EmitterEventGazeMeter
	| EmitterEventEye
	| EmitterEventPersistentMultiplier
	| EmitterEventWinCapCelebration
	| EmitterEventWin
	| EmitterEventFreeSpinIntro
	| EmitterEventFreeSpinRetrigger
	| EmitterEventFreeSpinCounter
	| EmitterEventFreeSpinOutro
	| EmitterEventSound
	| EmitterEventTransition;
