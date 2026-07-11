# Abyssal Frontend — session rulebook

Abyssal — a deep-sea **tumbling slot** (6×5, pay-anywhere, 8+ of a kind). The client **renders
the math's book events**; it never computes outcomes. The math is final and shipped (6 modes,
96% RTP, max 15,000×). Benchmark for polish/feel: **Gates of Olympus**.

This file loads every turn — keep it lean. Deep detail lives in `docs/`; point to it, don't inline it.

## Sources of truth (read before coding)

- **`docs/ABYSSAL_EVENT_GUIDE.md`** — the renderer's bible: every book event, exact payload,
  emission order, worked examples, the bookEvent→handler→emitter→component map. **Read it before
  touching any handler or component.**
- `docs/ABYSSAL_FRONTEND_GUIDE.md` — architecture/stack/model overview.
- `docs/ABYSSAL_GAME_OVERVIEW.md` — plain-language game design.
- `docs/ABYSSAL_MATH_SPEC.md` — the math contract (modes, RTP, event semantics).
- `docs/ABYSSAL_ART_PIPELINE.md` — asset/atlas pipeline. `docs/ABYSSAL_PRODUCTION_ROADMAP.md` — phasing.
- The math repo's `games/abyssal/` is the contract owner. If an event shape is unclear, it's
  defined in that repo's `game_events.py` — do not guess.

---

## Architecture — the event-driven flow (non-negotiable)

```
RGS book.events[] → playBookEvents() → playBookEvent(ev) → bookEventHandlerMap[ev.type]
   → eventEmitter.broadcast / broadcastAsync(emitterEvent) → component.subscribeOnMount(...) → render
```

- **Order = playback order.** `playBookEvents()` (from `utils-book`, wired in `src/game/utils.ts`)
  resolves events one at a time. Use `broadcastAsync` + `await` for anything with an animation
  (Eye open/combine, banked-mult climb, scatter-pay, max-win); use sync `broadcast` for instant
  state (counters, show/hide).
- **One bookEvent can fan out to several components** via emitterEvents. Each component does
  **one job** (SOLID single-responsibility) and owns its emitterEvent types.
- The XState `gameActor` (from `utils-xstate`) drives bet/autobet/resume — we do **not**
  re-implement round flow; we author handlers + components only.

## Reuse policy (IMPORTANT — our way)

- **Use the SDK framework packages as-is:** `pixi-svelte`, `utils-event-emitter`, `utils-xstate`,
  `utils-book`, `utils-layout`, `state-shared`, `constants-shared`. These are the engine — never
  rebuild them.
- **Do NOT reuse another app's game/UI components** (don't fork `apps/scatter`'s components, don't
  depend on `components-ui-pixi` for our look). Generic, slot-agnostic UI graduates to a brand-neutral
  shared package (e.g. `packages/components-deepslots` — NOT "abyssal", so slot #2 can reuse it).
  `apps/abyssal` only _composes_ these components.
- Every reusable component is **prop-driven, Storybook-isolated, and slot-agnostic** (no Abyssal
  hardcoding in the shared package — theme via props/assets).
- Abyssal-specific feature visuals (`GazeMeter`, `Eye`, `PersistentMultiplier`/snowball,
  scatter-pay) may live in the app and graduate to the package once a second slot needs them.

## The registration chain — the #1 silent bug

A new bookEvent type must be registered in **every** spot, or it fails silently. Use
**`/new-bookevent`** so it's never partial. The spots:

1. `src/game/typesBookEvent.ts` — the `BookEvent<Name>` type **and** add it to the `BookEvent` union.
2. `src/game/bookEventHandlerMap.ts` — the handler keyed by `type`.
3. The component's `export type EmitterEvent<Name>` (in the `.svelte` `<script module>` block) +
   its `subscribeOnMount({...})` entries.
4. `src/game/typesEmitterEvent.ts` — import the component's `EmitterEvent<Name>` and add it to the
   `EmitterEventGame` union. (Only when introducing a _new_ component.)

- `src/game/eventEmitter.ts` only changes when adding a whole new emitter **category**
  (HotKey/Ui/Modal/Game) — not per-event.

## File / naming conventions

- Components: PascalCase `.svelte`, one component = one duty; `export type EmitterEvent<ComponentName>`
  in the module block; `subscribeOnMount` map near the top of the instance script.
- Emitter event names: `<thing><Verb>` (e.g. `gazeMeterFill`, `eyeFlip`, `snowballUpdate`).
- Assets registered in `src/game/assets.ts` with a consistent key convention; atlases via TexturePacker.

## Abyssal gotchas a fresh session must NOT re-derive

- Event `amount`/`win`/`totalWin` are **×100** (cents-of-bet); book top-level `payoutMultiplier`
  is raw. The win utils already ÷100 — don't double-convert. `charge`/`mult`/`totalMult`/
  `startValue`/`count`/`totalFs`/`winLevel` are **raw ints**.
- `board` is **6×7 with padding embedded**; positions are **1-indexed** (top pad = row 0, visible
  rows 1–5); `anticipation` is a **per-reel int array**; `paddingPositions` are **per-reel strip stops**.
- **Snowball = banked multiplier (Gates style):** apply `M` to a spin **only when
  `setPersistentMult` is present** on that spin. Eye-less feature spins pay raw. `M` resets at
  `freeSpinTrigger` (starts ×1); Gaze (`charge`) resets each `reveal`. Never derive `M` from `eyeResolve`.
- **Gaze = Essence (cap 30):** each winning **cluster** charges +2/+3/+5 by size (8–9/10–11/12+),
  ×2 in Super Bonus. The meter keeps a 10-wide track and LAPS it: teal 0–10 → purple 11–20 →
  ember 21–30 (`GAZE_LAPS` in GazeMeter); the plaque shows the true total.
- **Eyes arrive at `reveal` OR drop mid-cascade** inside `tumbleBoard.newSymbols` (`eyeDrop` is a
  non-placing cue — never spawn a sprite from it); every Eye only _opens_
  (`eyeReveal`/`eyeResolve`) at the end of a winning tumble sequence. ANY mode can accumulate
  several Eyes; **Ultimate always has 2–5 at reveal** and is the only mode with `ultimateResolve`.
  One `Eye` code path for 1..N.
- **`scatterPay` fires on ANY trigger** (base/ante organic + bonus/superbonus buy boards); only
  the forced max-win corner skips it — superspins/ultimate have no scatters at all.
- **Super Spins & Ultimate emit no free-spin events** (single spin, no counter).
- Only the events in the event guide exist — never invent event names. `createBonusSnapshot` is the
  one **client-only** event (mid-round resume; see `convertTorResumableBet` in `utils.ts`).

## The four Abyssal-custom feature components

`GazeMeter` (gazeStep), `Eye` (eyeReveal+eyeResolve, 1 or many), `PersistentMultiplier`/snowball
(setPersistentMult — updates only on Eye spins), scatter-pay (4/5/6 = 3×/5×/100×). Everything
else is generic slot UI.

## How we work (the loop)

- **Storybook is NO LONGER USED (2026-07-11).** Do NOT add or update `*.stories.svelte` /
  `src/stories/**`. Verify in the running app on **localhost:3002** (the user drives spins there
  themselves) — a bookEvent/component isn't done until it renders correctly in the live game.
- Run the app: `pnpm run dev --filter=abyssal`. Build packages first if imports don't resolve
  (`turbo run build --filter=./packages/*`).
- **The juice is code, not frames:** ~80% of "Gates feel" is PixiJS code (glow/particles/shaders/
  screen-shake/squash-pop on static sprites). Reserve AI spritesheets for hero moments (Eye reveal).
- Use the official **`pixijs`** skills (installed under `.agents/skills/pixijs-*`, e.g.
  `pixijs-scene-graphics`, `pixijs-filters`, `pixijs-ticker`, `pixijs-scene-particle-container`,
  `pixijs-performance`) before animating, so you use current PixiJS 8 APIs, not guessed/legacy ones.
- After edits, run `pnpm tsc` + lint — the registration chain is easy to leave inconsistent.

## Skills

- **`/new-bookevent <type>`** — full registration chain + handler stub (skip the story step —
  Storybook is retired).
- **`/new-component <Name>`** — pixi-svelte component (conventions + subscribeOnMount); skip the
  story step.
- **`/new-ui-component <Name>`** — same, but lands in the shared brand-neutral package.
- **`pixijs-*`** — official PixiJS 8 skills (`.agents/skills/`): scene graphics/sprite/text,
  filters, ticker, particle container, performance, migration. Reach for these before animating.
- **`/wire-asset <name>`** / **`/pack-spritesheet`** — asset registration + atlas pipeline.

## Guardrails (don'ts)

- Don't compute wins/outcomes in the client — replay the book.
- Don't hardcode bet/amounts — read from book/RGS.
- Don't put logic in a component beyond its single duty.
- Don't reuse other apps' game components — build ours in the shared package.
- Don't invent event names or change payload shapes (the math owns the contract).
