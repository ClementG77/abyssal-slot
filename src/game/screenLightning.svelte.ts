// =================================================================================================
// SCREEN LIGHTNING  —  added 2026-07-22, EXPERIMENTAL, EASILY REVERTIBLE
//
// A lightning STRIKE on the Eye reveal, SCOPED TO THE REEL WINDOW (not the whole screen): the reel
// window dims, a jagged bolt cracks down through it with a stark flash, flickers like the real
// thing, then fades. Bigger and redder for a MULTIPLY Eye. The strike is masked to the reels in
// ScreenLightning.svelte, so nothing spills onto the rest of the screen.
//
// TO TURN IT OFF: set SCREEN_LIGHTNING_ENABLED to false. `fireScreenLightning` becomes a no-op and
// the overlay never animates.
// TO REMOVE ENTIRELY: delete this file, components/ScreenLightning.svelte, the <ScreenLightning/>
// line in Game.svelte, and the fireScreenLightning() call in AbyssalEye.svelte. All four are tagged
// "SCREEN LIGHTNING".
//
// This is the WHOLE-SCREEN alternative to the local energy arcs already on the Eye
// (game/symbolWarp is unrelated; the arcs live in AbyssalEye's drawArcs). The two can run together,
// but if the strike is kept, the local arcs are probably redundant — disable them by gating
// spawnRevealArcs in AbyssalEye. Decide after seeing this on device.
//
// WHY A MODULE SIGNAL, NOT AN EMITTER EVENT
// The Eye lives deep in the board; the strike must cover the whole canvas, so it is a screen-level
// component. A shared reactive signal connects them without threading a new event through the
// registration chain (typesBookEvent / handlerMap / typesEmitterEvent) — which also keeps the whole
// feature to four clearly-tagged touch points that delete cleanly.
//
// MEMORY: the crash we spent days on was FillGradient-per-frame. The component draws only additive
// Graphics strokes and solid rects — no texture, no gradient, no filter — and generates the bolt
// path ONCE per strike, not per frame.
// =================================================================================================

export const SCREEN_LIGHTNING_ENABLED = true;

// Bumping `key` is the trigger; the component watches it. `mult` selects the ADD (cool, thin) vs
// MUL (red, thick, forked, longer) character.
export const screenLightning = $state({ key: 0, mult: false });

export const fireScreenLightning = (mult: boolean) => {
	if (!SCREEN_LIGHTNING_ENABLED) return;
	screenLightning.mult = mult;
	screenLightning.key++;
};
