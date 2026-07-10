import gsap from 'gsap';
import { stateBetDerived } from 'state-shared';

// Press-to-skip: a click fast-forwards the CURRENTLY PLAYING book event only — the rest of
// the beat plays exactly like holding the spacebar (TURBO), then the skip DISARMS and the
// next event plays at normal speed (click again to turbo that one too). NOTHING SNAPS —
// every animation finishes its motion at turbo pace. Mechanisms:
//   • timeScale patch — while armed, timeScale() reports at least the turbo value, so every
//     ts-based duration/hold created after the press runs at turbo pace.
//   • gsap acceleration — arming retimes every ACTIVE top-level gsap animation (except
//     infinite ambient loops) to turbo, so in-flight timelines (eye flip, chip flights,
//     token flights, impacts) speed up mid-motion instead of jumping to their end.
//   • skipActive()   — read by the reel/tumble drop code (pixel speeds, not timeScale) to
//     switch to the turbo spin options mid-beat.
//   • skippableWait  — scripted holds re-time their REMAINING time to turbo pace on skip.
//   • raceSkip       — svelte/motion tweens already in flight (they can't be retimed) race
//     the skip; on 'skipped' the caller re-issues the tween to FINISH FAST at turbo pace
//     (never duration-0 snaps).
// The arm/disarm boundary is the book event itself: `withSkipBoundaries` wraps every
// handler so finishing the current event always clears the skip.
export const SKIP_TIME_SCALE = 2; // = the turbo timeScale — "as if turbo" while armed

const skip = $state({ armed: false });
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

// Force the skip off. Called at the START of every new round (onNewGameStart) so a click that
// armed the skip near a round boundary can't leak into the NEXT spin's exit/drop: the exit
// fall-out reads `skipActive()` (see stateGame spinOptions), and it runs OUTSIDE the per-event
// withSkipBoundaries scope, so nothing else would clear a stale arm before it.
export const disarmSkip = () => {
	skip.armed = false;
};

// Bring every RUNNING top-level gsap animation up to turbo pace. Only top-level children
// (nested tweens inherit their timeline's scale — touching both would compound to 4×), and
// never the infinite ambient loops (idle sway, liquid clock) — those aren't event beats.
const accelerateGsap = () => {
	gsap.globalTimeline.getChildren(false, true, true).forEach((animation) => {
		if (!animation.isActive()) return;
		if (animation.repeat() === -1) return;
		animation.timeScale(Math.max(animation.timeScale(), SKIP_TIME_SCALE));
	});
};

// Arm the skip: the current beat (and, if pressed between events — e.g. during the pre-book
// spin-out — the NEXT one) plays at turbo until a book-event handler finishes and disarms it.
// Callers gate on "a round is playing" (xstate isIdle), NOT on a handler being mid-flight, so
// a click during the initial reveal drop works — that fall runs outside any handler.
export const armSkip = () => {
	skip.armed = true;
	// bring the whole in-flight beat up to turbo: gsap retimes, holds shorten, races fire
	accelerateGsap();
	resolvers.splice(0).forEach((accelerate) => accelerate());
	raceListeners.splice(0).forEach((fire) => fire());
};

// Race a running svelte/motion tween promise against the skip: resolves 'skipped' the moment
// a skip fires (or immediately if one is already armed). Svelte tweens can't be retimed in
// flight, so the caller re-issues the tween to its target with a SHORT turbo-pace duration —
// finishing the motion fast, never snapping it.
// NOTE: the original promise may never settle after a re-issue (superseded tweens don't
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

// A waitForTimeout that a skip press accelerates to turbo pace: the REMAINING time shrinks
// by SKIP_TIME_SCALE (it does not release instantly — the beat still reads, just fast).
// Holds created while a skip is already armed are turbo-paced via the timeScale patch.
export const skippableWait = (ms: number) =>
	new Promise<void>((resolve) => {
		const startedAt = performance.now();
		let timeout: ReturnType<typeof setTimeout>;
		const finish = () => {
			const index = resolvers.indexOf(accelerate);
			if (index >= 0) resolvers.splice(index, 1);
			resolve();
		};
		const accelerate = () => {
			clearTimeout(timeout);
			const remaining = Math.max(0, ms - (performance.now() - startedAt));
			timeout = setTimeout(finish, remaining / SKIP_TIME_SCALE);
		};
		timeout = setTimeout(finish, ms);
		resolvers.push(accelerate);
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
				try {
					await (handler as (...a: never[]) => Promise<unknown>)(...args);
				} finally {
					skip.armed = false;
				}
			},
		]),
	) as TMap;
