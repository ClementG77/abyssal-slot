import gsap from 'gsap';

// =================================================================================================
// IDLE BOARD MOTION  —  added 2026-07-22, EASILY REVERTIBLE
//
// TO TURN IT OFF: set SYMBOL_IDLE_ENABLED to false below. That is the whole revert — every symbol
// falls back to sitting perfectly still and no other behaviour changes. To remove it entirely,
// delete this file plus the four `idle`-prefixed lines it feeds in components/Symbol.svelte
// (search: "SYMBOL IDLE").
//
// WHY IT EXISTS
// All four looping tweens in Symbol.svelte were scatter-only, so the nine PAY symbols were frozen
// between wins — the board was a still image until something won. Gates of Olympus (our stated
// benchmark) keeps every symbol subtly alive, and that difference is a large part of why one board
// reads as polished and the other as a screenshot. Review feedback called our animation "janky,
// missing in key moments, or falling short of expected polish"; a dead board is on screen 100% of
// the time, so it is the cheapest thing on that list to fix.
//
// WHY TRANSFORM-ONLY, NOT THE WIN MESH
// The win warp (game/symbolWarp.ts) deforms a MeshPlane. Mounting 30 meshes permanently would undo
// the batching care that system was built with, for motion nobody is meant to consciously notice.
// This is container transform only — effectively free — and it keeps a clear hierarchy: an idle
// symbol DRIFTS, a winning symbol FLEXES. If idle used the same mechanism the win would stop
// reading as an escalation.
// =================================================================================================

export const SYMBOL_IDLE_ENABLED = true;

// Amplitudes are FRACTIONS OF THE SYMBOL'S SIZE, so the drift is identical at every board scale and
// on every device. Deliberately tiny: this should be felt as the board breathing, never seen as
// symbols wobbling. Roughly a quarter of the win warp — if you can point at a symbol and say "that
// one is moving", it is too high.
// TUNED UP after the first pass read as nothing on device. The original 0.012 / 1.15 rad/s worked
// out to a ~1.8px drift over a ~5.5s cycle — a peak velocity under 2px/sec, which is below the
// threshold at which the eye registers movement at all. Motion this slow is not "subtle", it is
// invisible, and it cost the same as motion that reads. If it now feels too busy, lower FREQ before
// the amplitudes: slowing it down keeps the sense of scale, shrinking it just hides it again.
const FLOAT = 0.03; // vertical drift (~4.5px on a 150px symbol)
const DRIFT = 0.014; // horizontal, about half the vertical — water, not a pendulum
const BREATHE = 0.012; // scale pulse
const FREQ = 1.7; // radians/sec — a ~3.7s cycle. Slower reads as buoyancy; faster as bobbing.

// ONLY THE HIGH SYMBOLS DRIFT.
//
// Two reasons, and they reinforce each other. Physically: the highs are things that live in water —
// anglerfish, jellyfish, nautilus, a diving helmet — and drifting is what they would do. The five
// lows are faceted crystal, and a floating gem reads as a rendering bug rather than as life.
//
// Compositionally: thirty moving objects is noise, and noise is indistinguishable from jank. Four
// or five drifting creatures against a still field of gems reads as a living scene, and it gives
// the eye somewhere to rest. The gems still catch the light through the additive glow they already
// carry — they are not inert, they just do not float.
//
// Keyed by ATLAS FRAME, like game/symbolWarp.ts, because the question is about what the art depicts
// (see the SYMBOL_FRAME remap in Symbol.svelte — paytable H1 draws the H3 helmet frame, and so on).
// Scatter and the Eye are excluded automatically: their frames are not in this set.
const IDLE_FRAMES = new Set(['H1', 'H2', 'H3', 'H4']);

/** Whether this atlas frame drifts while settled. */
export const hasSymbolIdle = (frame: string) => SYMBOL_IDLE_ENABLED && IDLE_FRAMES.has(frame);

// ONE clock for the entire board. 30 symbols each running their own gsap tween would be 30 tweens
// and 30 reactive writes per frame; this is one tween, one write, and 30 cheap derived reads.
const clock = $state({ t: 0 });
export const symbolIdleClock = clock;

let ticking: ((time: number) => void) | undefined;

/**
 * Starts the clock once, on first use, and leaves it running for the session.
 *
 * NOT ref-counted, and that is deliberate — the obvious version of this is a bug. Symbols are
 * destroyed and rebuilt constantly during a tumble, so a reference count drops to zero the moment
 * a rebuild happens to tear down before it mounts. Killing the clock there (and resetting `t`)
 * makes every drifting symbol SNAP back to its phase-0 position mid-cascade.
 *
 * It reads gsap's own ticker time rather than tweening a value, which also removes a second, slower
 * version of the same glitch: a looping tween wraps `t` back to 0, and the wrap point is not a whole
 * number of sine cycles, so the whole board would jump once the loop came round. Ticker time is
 * monotonic, so the motion is continuous for as long as the session lasts.
 *
 * The cost of leaving it running is one callback writing one number per frame.
 */
export const ensureSymbolIdleClock = () => {
	if (ticking || !SYMBOL_IDLE_ENABLED) return;
	ticking = (time: number) => {
		clock.t = time;
	};
	gsap.ticker.add(ticking);
};

export type SymbolIdleOffset = { dx: number; dy: number; breathe: number };

export const NO_IDLE: SymbolIdleOffset = { dx: 0, dy: 0, breathe: 1 };

/**
 * The drift for one symbol at time `t`.
 *
 * `phase` desynchronises the board — it comes from the symbol's CELL, so neighbours never rise and
 * fall together. Without it the whole grid pulses in unison, which reads as a screen effect applied
 * over the board rather than as thirty individual things floating.
 *
 * The three components run at different frequencies (1x, 0.63x, 0.8x) so the motion never resolves
 * into an obvious loop; a symbol returns to where it started only rarely.
 */
export const symbolIdleOffset = (t: number, phase: number, size: number): SymbolIdleOffset => {
	const a = t * FREQ + phase;
	return {
		dx: Math.sin(a * 0.63 + phase * 1.7) * size * DRIFT,
		dy: Math.sin(a) * size * FLOAT,
		breathe: 1 + Math.sin(a * 0.8 + phase) * BREATHE,
	};
};
