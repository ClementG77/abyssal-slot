# Abyssal Frontend — session rulebook (DRAFT for `apps/abyssal/CLAUDE.md`)

**This file is a draft.** When the frontend repo (StakeEngine/web-sdk monorepo) is set up,
copy it to **`apps/abyssal/CLAUDE.md`** so Claude auto-loads it every session. Also copy the
reference docs into `apps/abyssal/docs/` (see Sources of truth). Keep this lean — it loads every
turn; put deep detail in the docs and point to them.

---

## What we're building
Abyssal — a deep-sea **tumbling slot** (6×5, pay-anywhere, 8+ of a kind). The client **renders
the math's book events**; it never computes outcomes. The math is final and shipped (6 modes,
96% RTP, max 15,000×). Benchmark for polish/feel: **Gates of Olympus**.

## Sources of truth (read before coding)
- **`docs/ABYSSAL_EVENT_GUIDE.md`** — the renderer's bible: every book event, exact payload,
  emission order, worked examples, the bookEvent→handler→emitter→component map. **Read it before
  touching any handler or component.**
- `docs/ABYSSAL_FRONTEND_GUIDE.md` — architecture/stack/model overview.
- `docs/ABYSSAL_GAME_OVERVIEW.md` — plain-language game design.
- The math repo's `games/abyssal/` is the contract owner. If an event shape is unclear, it's
  defined in that repo's `game_events.py` — do not guess.

---

## Architecture — the event-driven flow (non-negotiable)
```
RGS book.events[] → playBookEvents() → playBookEvent(ev) → bookEventHandlerMap[ev.type]
   → eventEmitter.broadcast / broadcastAsync(emitterEvent) → component.subscribeOnMount(...) → render
```
- **Order = playback order.** `playBookEvents()` resolves events one at a time via `sequence()`.
  Use `broadcastAsync` + `await` for anything with an animation (Eye open/combine, banked-mult
  climb, scatter-pay, max-win); use sync `broadcast` for instant state (counters, show/hide).
- **One bookEvent can fan out to several components** via emitterEvents. Each component does
  **one job** (SOLID single-responsibility) and owns its emitterEvent types.
- The XState `gameActor` (from `utils-xstate`) drives bet/autobet/resume — we do **not**
  re-implement round flow; we author handlers + components only.

## Reuse policy (IMPORTANT — our way)
- **Use the SDK framework packages as-is:** `pixi-svelte`, `utils-event-emitter`, `utils-xstate`,
  `utils-book`, `utils-layout`, `state-shared`, `constants-shared`. These are the engine — never
  rebuild them.
- **Do NOT reuse another app's game/UI components** (don't fork `apps/scatter`'s components, don't
  depend on `components-ui-pixi` for our look). **Build our OWN reusable component library** in
  **`packages/components-<brand>`** (brand-neutral, e.g. `components-deepslots` — NOT "abyssal", so
  the next slot can reuse it). `apps/abyssal` only *composes* these components.
- Every reusable component is **prop-driven, Storybook-isolated, and slot-agnostic** (no Abyssal
  hardcoding inside the shared package — theme via props/assets).
- Build for slot #2: ControlBar, BetButton, AutoplayMenu, WinDisplay, Board, Reel, Symbol,
  FreeSpinCounter/Intro/Outro, MaxWin — all live in the shared package. Abyssal-specific feature
  visuals (GazeMeter, Eye, BankedMultiplier, ScatterPay) can start in the app and graduate to the
  package once a second slot needs them.

## File / naming conventions
- New bookEvent type → register in **all** of: `typesBookEvent.ts` (BookEvent union),
  `bookEventHandlerMap.ts`, the component's `EmitterEvent<Name>` type, `typesEmitterEvent.ts`
  (EmitterEventGame union), `eventEmitter.ts`. Missing one of these five is the #1 silent bug —
  use `/new-bookevent` so it's never partial.
- Components: PascalCase `.svelte`, one component = one duty, `subscribeOnMount` map at top,
  emitterEvent types `export type EmitterEvent<ComponentName>` in the component's module block.
- Emitter event names: `<thing><Verb>` (e.g. `gazeUpdate`, `eyeOpen`, `bankedMultUpdate`).
- Assets registered in `assets.ts` with a consistent key convention; atlases via TexturePacker.

## Abyssal gotchas a fresh session must NOT re-derive
- Event `amount`s are **×100** (cents-of-bet); book top-level `payoutMultiplier` is raw. The win
  utils already ÷100 — don't double-convert. `charge`/`mult`/`startValue`/`count`/`totalFs` are
  raw ints.
- `board` is **6×7 with padding embedded**; positions are **1-indexed** (top pad = row 0);
  `anticipation` is a **per-reel int array**; `paddingPositions` are **per-reel strip stops**.
- **Snowball = banked multiplier (Gates style):** apply `M` to a spin **only when
  `setPersistentMult` is present** on that spin. Eye-less feature spins pay raw. `M` resets at
  `freeSpinTrigger`; Gaze (`charge`) resets each `reveal`. Never derive `M` from `eyeResolve`.
- **Normalize single vs multi Eye** (`eyes ?? [{eyeType,startValue}]`) so `Eye` has one code path.
  Ultimate is the only multi-Eye mode.
- **Super Spins & Ultimate emit no free-spin events** (single spin, no counter).
- Only the **17 events** in the event guide exist — never invent event names.

## The four Abyssal-custom feature components
`GazeMeter` (gazeStep), `Eye` (eyeReveal+eyeResolve, 1 or many), `BankedMultiplier`
(setPersistentMult — updates only on Eye spins), `ScatterPay` (4/5/6 = 3×/5×/100×). Everything
else is generic slot UI in the shared package.

## How we work (the loop)
- **Storybook-first.** Every bookEvent gets `MODE_<X>/bookEvent/<type>` + `MODE_<X>/book/random`
  stories fed from real Abyssal books (`src/stories/data/*_books.ts` / `*_events.ts`). A bookEvent
  isn't done until its story resolves. Every component gets a `COMPONENTS/<Name>` story.
- Run the app: `pnpm run dev --filter=abyssal`. Test components in isolation first.
- **The juice is code, not frames:** ~80% of "Gates feel" is PixiJS code (glow/particles/shaders/
  screen-shake/squash-pop on static sprites). Reserve AI spritesheets for hero moments (Eye reveal).
- Use the **`/pixi`** skill (PixiJS 8 + pixi-svelte API + animation recipes) before animating, so
  you use current APIs (Tween/ticker, filters, particle emitter), not guessed/legacy ones.
- After edits, run `pnpm tsc` + lint (a hook can enforce this) — the 5-spot event registration is
  easy to leave inconsistent.

## Skills (author these in `.claude/skills/`)
- **`/new-bookevent <type>`** — full registration chain (5 spots) + handler stub + both stories.
- **`/new-component <Name>`** — pixi-svelte component (conventions + subscribeOnMount) + its story.
- **`/new-ui-component <Name>`** — same, but lands in the shared `packages/components-<brand>`.
- **`/pixi`** — load authoritative PixiJS 8 + pixi-svelte docs + animation recipes (the "always
  correct API" skill).
- **`/wire-asset <name>`** / **`/pack-spritesheet`** — asset registration + atlas pipeline.
- **`/verify-feel`** — run dev/Storybook, drive a book, confirm a spin renders end-to-end.

## Guardrails (don'ts)
- Don't compute wins/outcomes in the client — replay the book.
- Don't hardcode bet/amounts — read from book/RGS.
- Don't put logic in a component beyond its single duty.
- Don't reuse other apps' game components — build ours in the shared package.
- Don't invent event names or change payload shapes (the math owns the contract).
