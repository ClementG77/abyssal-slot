import { stateBetDerived } from 'state-shared';

// Press-to-skip: a click skips the CURRENTLY PLAYING book event only — the rest of the beat
// plays exactly like TURBO MODE, then the skip DISARMS and the next event plays at normal
// speed (click again to skip that one too). Mechanisms:
//   • timeScale patch — while armed, timeScale() reports at least the turbo value, so every
//     ts-based duration/hold runs at turbo pace.
//   • skipActive()   — read by the reel/tumble drop code (pixel speeds, not timeScale) to
//     switch to the turbo spin options mid-beat.
//   • skippableWait  — scripted holds (eye flip beat) resolve immediately on skip.
//   • raceSkip       — long single tweens ALREADY in flight (the tumble-win count-up) race
//     the skip and snap to their end value when it fires.
// The arm/disarm boundary is the book event itself: `withSkipBoundaries` wraps every
// handler so finishing the current event always clears the skip.
const SKIP_TIME_SCALE = 2; // = the turbo timeScale — "as if turbo" while armed

const skip = $state({ armed: false });
let playingDepth = 0;
const resolvers: (() => void)[] = [];
const raceListeners: (() => void)[] = [];

// patch guard survives HMR module reloads (a second wrap would compound the boost)
const PATCHED = Symbol.for('abyssal.skipTimeScalePatched');
type PatchableTimeScale = (() => number) & { [PATCHED]?: boolean };
const base = stateBetDerived.timeScale as PatchableTimeScale;
if (!base[PATCHED]) {
	const wrapped: PatchableTimeScale = () =>
		skip.armed ? Math.max(SKIP_TIME_SCALE, base()) : base();
	wrapped[PATCHED] = true;
	stateBetDerived.timeScale = wrapped;
}

export const skipActive = () => skip.armed;

export const requestSkip = () => {
	// nothing is playing — don't pre-arm a skip for the NEXT event
	if (playingDepth <= 0) return false;
	skip.armed = true;
	// release skippable holds and fire the in-flight races
	resolvers.splice(0).forEach((resolve) => resolve());
	raceListeners.splice(0).forEach((fire) => fire());
	return true;
};

// Race a running animation promise against the skip: resolves 'skipped' the moment a skip
// fires (or immediately if one is already armed) so the caller can snap to the end state.
// NOTE: the original promise may never settle after a snap (superseded tweens don't
// resolve) — callers must not await it afterwards.
export const raceSkip = <T>(promise: Promise<T>): Promise<'done' | 'skipped'> => {
	if (skip.armed) return Promise.resolve('skipped');
	return new Promise((resolve) => {
		let settled = false;
		const settle = (result: 'done' | 'skipped') => {
			if (settled) return;
			settled = true;
			const index = raceListeners.indexOf(onskip);
			if (index >= 0) raceListeners.splice(index, 1);
			resolve(result);
		};
		const onskip = () => settle('skipped');
		raceListeners.push(onskip);
		void Promise.resolve(promise).then(() => settle('done'));
	});
};

// a waitForTimeout that a skip click releases instantly — for long scripted holds
// (e.g. the eye-flip beat) that can't be shortened once their timer is running
export const skippableWait = (ms: number) =>
	new Promise<void>((resolve) => {
		const done = () => {
			clearTimeout(timeout);
			resolve();
		};
		const timeout = setTimeout(() => {
			const index = resolvers.indexOf(done);
			if (index >= 0) resolvers.splice(index, 1);
			resolve();
		}, ms);
		resolvers.push(done);
	});

// Wraps every book-event handler so the skip is scoped to ONE event: it can only be armed
// while a handler is running, and it always disarms when the current handler finishes.
export const withSkipBoundaries = <
	TMap extends Record<string, (...args: never[]) => Promise<unknown> | unknown>,
>(
	handlerMap: TMap,
): TMap =>
	Object.fromEntries(
		Object.entries(handlerMap).map(([type, handler]) => [
			type,
			async (...args: never[]) => {
				playingDepth += 1;
				try {
					await (handler as (...a: never[]) => Promise<unknown>)(...args);
				} finally {
					playingDepth -= 1;
					skip.armed = false;
				}
			},
		]),
	) as TMap;
