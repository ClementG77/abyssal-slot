# Abyssal — Frontend Production Roadmap & Requirements

The single source of truth for taking the **Abyssal** slot from finished math to a
launched, RGS-integrated game on Stake Engine. It is a _companion_ to
[ABYSSAL_FRONTEND_GUIDE.md](ABYSSAL_FRONTEND_GUIDE.md) (the math/event contract) and
[ABYSSAL_MATH_SPEC.md](ABYSSAL_MATH_SPEC.md) (the design spec).

- **This file** = _how we build the client_ — stack, architecture, RGS wiring, the
  component/event map, the build/deploy pipeline, and a phased checklist roadmap.
- **The Frontend Guide** = _what the math emits_ — the exact event vocabulary, payloads,
  paytable, and per-spin ordering the client must render.

> Reference architecture: the official [`StakeEngine/web-sdk`](https://github.com/StakeEngine/web-sdk)
> (Svelte 5 + PixiJS 8 + TurboRepo). We mirror its `apps/scatter` example, which is the
> closest template — scatter-pays + tumbling/cascades, exactly Abyssal's base mechanic.

---

## 0. TL;DR — what "done" means

A static web build (HTML + JS + assets, no server) that:

1. Authenticates a player session against the RGS from URL query params.
2. Presents bet controls for all five modes (base, ante, bonus, superspins, superbonus).
3. Calls `play`, receives a **book**, and **renders its event list in order** (no client RNG).
4. Plays the full Abyssal show: board → cascades → Gaze charge → The Eye reveal/resolve →
   snowball → win settlement → free-spins lifecycle → win-cap celebration.
5. Calls `end-round` at the correct moment and reconciles balance.
6. Survives disconnect/refresh mid-round (resume) and supports replay mode.
7. Passes Stake Engine's review (responsive, all scenarios renderable, version/rules UI).

---

## 1. Tech stack (what we commit to)

We adopt the web-sdk stack as-is. Don't fight it; it's what the platform expects.

| Layer         | Choice                                    | Notes                                    |
| ------------- | ----------------------------------------- | ---------------------------------------- |
| UI framework  | **Svelte 5** (runes)                      | reactive components                      |
| Renderer      | **PixiJS 8** via `pixi-svelte`            | WebGL canvas; declarative Pixi           |
| Monorepo      | **TurboRepo** + **pnpm**                  | `--filter=abyssal` per-app commands      |
| State machine | **XState** (`utils-xstate`)               | bet lifecycle: idle/bet/autobet/resume   |
| Event bus     | `utils-event-emitter`                     | decouples book logic from rendering      |
| Layout        | `utils-layout`                            | responsive canvas, mobile/tablet/desktop |
| Audio         | **Howler.js** (`utils-sound`)             | sfx + music                              |
| i18n          | **Lingui** (`config-lingui`)              | currency + social-casino text            |
| Testing/dev   | **Storybook**                             | per-event and per-book story harness     |
| Build         | **Vite** + **SvelteKit** (static adapter) | output is a static site                  |

**Pinned tooling:** Node **22.16.0**, pnpm **10.5.0** (match the SDK or builds drift).

**Hard rule from the platform:** the game must compile to a **static website**. You _may_
use a different framework, but you lose the SDK's RGS plumbing, UI kit, and review-tested
patterns. Recommendation: **use the SDK.**

---

## 2. The data pipeline (how a round renders)

This is the heart of the architecture. Memorize it.

```
 RGS /wallet/play  ──>  Book { id, payoutMultiplier, events:[...] }
        │
        ▼
 playBookEvents()            iterate events in order via sequence()
        │
        ▼
 playBookEvent(event)        look up event.type in bookEventHandlerMap
        │
        ▼
 bookEventHandler(event)     translate ONE book event into one or more
        │                    emitterEvents (broadcast / broadcastAsync)
        ▼
 eventEmitter.broadcast()    fan out to whichever components care
        │
        ▼
 component.subscribeOnMount  run the animation / state update, await if async
        │
        ▼
 PixiJS render               the player sees it
```

Two non-negotiables:

- **Order matters.** Events are replayed **sequentially**; the book's order _is_ the
  choreography. Never parallelize across events.
- **No game logic on the client.** The outcome is predetermined in the book. The client
  only _interprets and animates_ it. The Eye "build-up and reveal" is a replay.

### Task-breakdown principle

A single book event is decomposed into several _atomic_ `emitterEvents`, each owned by a
component and independently testable in Storybook. Example for our `tumbleBoard`:

```
bookEvent: tumbleBoard
  └─ emitterEvents (in order):
       tumbleExplodeShow → tumbleExplode → tumbleRemoveExploded
       → tumbleSlideDown → tumbleRefill → tumbleSettle
```

Build each atomic step in isolation, then chain them. This is _the_ way to stay sane on
complex mechanics (the Eye, the snowball).

---

## 3. RGS integration contract

The RGS is the only backend. The client talks to it over HTTP using params from the
launch URL. (Endpoints/units below per the
[RGS docs](https://stakeengine.github.io/math-sdk/rgs_docs/RGS/); the SDK's
`utils-fetcher` / `Authenticate.svelte` wrap all of this — reuse them.)

### Launch URL query params (read on boot)

`rgs_url`, `sessionID`, `lang`, `currency`, `mode`, `device`, and for replay:
`replay=true`, `game`, `version`, `event`.

### Endpoints

| Endpoint                    | When                           | Body                          | Returns                                                                                             |
| --------------------------- | ------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST /wallet/authenticate` | on boot (must be first)        | `{ sessionID }`               | `balance`, `config` (minBet, maxBet, stepBet, defaultBetLevel, betLevels), `round` (active or last) |
| `POST /wallet/balance`      | periodic / on focus            | `{ sessionID }`               | `balance`                                                                                           |
| `POST /wallet/play`         | on spin/buy                    | `{ sessionID, amount, mode }` | `balance` (debited), `round` (contains the **book**)                                                |
| `POST /bet/event`           | during play (optional)         | `{ sessionID, event }`        | `event` — checkpoints progress for disconnect recovery                                              |
| `POST /wallet/end-round`    | after a winning round resolves | `{ sessionID }`               | `balance` (credited)                                                                                |

### Round lifecycle

1. **authenticate** → if `round` is **active**, _resume it_ (don't start fresh).
2. **play(amount, mode)** → debits, returns the book to render.
3. **(event)** → optional progress checkpoints (good for long free-spin features).
4. **end-round** → credits winnings. **Call timing depends on outcome:**
   - **No win (0×):** do **not** call end-round.
   - **Single-round win:** call **immediately** on settlement; update displayed balance
     _after_ the win animation finishes.
   - **Feature/bonus win:** call **after the final feature animation** completes.

### Money units — three different scales, do not mix them up

| Scale           | 1.00× bet =   | Where                                         |
| --------------- | ------------- | --------------------------------------------- |
| **API amount**  | `1,000,000`   | every RGS `amount`/`balance` (6 dp precision) |
| **Book amount** | `100`         | every value inside book events (cents-of-bet) |
| **Display**     | `× betAmount` | what the player sees                          |

Conversions (the SDK exposes these as constants):

- `API_AMOUNT_MULTIPLIER = 1_000_000`, `BOOK_AMOUNT_MULTIPLIER = 100`.
- Book `amount: 852` → `8.52× bet` → `(852/100) × betAmount` in currency.
- Max win `1,500,000` book-cents = `15,000× bet`.

### Bet sizing

`player debit = baseBet × modeCostMultiplier`. The mode cost multipliers are baked into the
math (`base 1.0, ante 1.25, bonus 100, superspins 20, superbonus 500`) and surfaced via
`index.json`. Base bet must be within `[minBet, maxBet]` and divisible by `stepBet`.

### Error codes to handle

`400`: `ERR_VAL` (bad request), `ERR_IPB` (insufficient balance), `ERR_IS` (invalid/expired
session), `ERR_ATE` (auth fail), `ERR_GLE` (gambling limits), `ERR_LOC` (geo).
`500`: `ERR_GEN`, `ERR_MAINTENANCE`. Map each to a user-facing message; `ERR_IPB` and
`ERR_GLE` especially need clean UX (block the bet, explain why).

---

## 4. Project structure (mirror `apps/scatter`)

Create the game as a new app in the web-sdk monorepo: `apps/abyssal/`. The scatter app is
the template (tumble + scatter-pays). Layout:

```
apps/abyssal/
├── package.json                 # name: "abyssal" → drives --filter=abyssal
├── svelte.config.js  vite.config.js  tsconfig.json  lingui.config.ts
├── .storybook/
├── static/                      # assets: symbol art, Eye spine, bg, audio, fonts
└── src/
    ├── app.html
    ├── hooks.server.ts
    ├── routes/+page.svelte      # entry: setContext(); render <Game/>
    ├── i18n/                    # Lingui catalogs (+ social-casino overrides)
    ├── game/
    │   ├── config.ts            # modes, bet levels, paytable mirror, constants
    │   ├── constants.ts         # symbol IDs, grid dims, padding, win-cap
    │   ├── context.ts           # setContext(): emitter, xstate, layout, app
    │   ├── eventEmitter.ts
    │   ├── actor.ts             # XState bet actor wiring
    │   ├── assets.ts            # asset manifest for preloading
    │   ├── sound.ts             # sound manifest + cues
    │   ├── stateApp.ts  stateGame.svelte.ts  stateLayout.ts  stateXstate.ts
    │   ├── typesBookEvent.ts    # union of ALL Abyssal book-event types (§5)
    │   ├── typesEmitterEvent.ts # union of ALL emitter events
    │   ├── bookEventHandlerMap.ts  # bookEvent.type → handler (THE core file)
    │   ├── winLevelMap.ts       # winLevel 1–10 → celebration tier
    │   └── utils.ts
    ├── components/              # see §6 inventory
    └── stories/
        ├── data/                # base_books.ts, bonus_books.ts, *_events.ts
        └── *.stories.svelte     # per-mode book + per-bookEvent harnesses
```

---

## 5. Abyssal book-event → handler → emitter map

This is the contract the client implements. Each row: the **book event** (from
[ABYSSAL_FRONTEND_GUIDE.md §6](ABYSSAL_FRONTEND_GUIDE.md)), the **emitterEvents** its handler
broadcasts (atomic steps), and the **owning component(s)**. Implement every one of these in
`bookEventHandlerMap.ts` and add each to `typesBookEvent.ts`.

| Book event          | Payload (key fields)                                    | Emitter steps (handler broadcasts)                                                         | Owner component(s)                 |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `reveal`            | `board`, `paddingPositions`, `gameType`, `anticipation` | `boardSettle`, `anticipationShow` (if scatter tease)                                       | Board, Anticipations               |
| `winInfo`           | `totalWin`, `wins[{symbol,count,win,positions,meta}]`   | `winShow`, `winAmountShow(per cluster)`, `winCount`                                        | Win, WinAmounts, WinCoins          |
| `updateTumbleWin`   | `amount`                                                | `tumbleWinUpdate`                                                                          | TumbleWinAmount                    |
| `gazeStep`          | `fromPositions`, `charge`                               | `gazeFlow(fromPositions)`, `gazeMeterUpdate(charge)`                                       | GazeMeter                          |
| `tumbleBoard`       | `explodingSymbols`, `newSymbols`                        | `tumbleExplode`, `tumbleRemoveExploded`, `tumbleSlideDown`, `tumbleRefill`, `tumbleSettle` | TumbleBoard                        |
| `eyeReveal`         | `position`, `eyeType`, `startValue`                     | `eyeShow(position)`, `eyeFlip(type,startValue)`                                            | Eye                                |
| `eyeResolve`        | `charge`, `eyeType`, `startValue`, `totalMult`          | `eyeCharge(charge)`, `eyeResolveBurst(totalMult)`                                          | Eye, GazeMeter                     |
| `setPersistentMult` | `mult`                                                  | `snowballShow`, `snowballUpdate(mult)`                                                     | PersistentMultiplier               |
| `setWin`            | `amount`, `winLevel`                                    | `winSettle(amount)`, `winLevelPlay(winLevel)`                                              | WinPresentation, WinCounter        |
| `setTotalWin`       | `amount`                                                | `totalWinUpdate(amount)`                                                                   | WinCounter / HUD                   |
| `wincap`            | `amount`                                                | `winCapTrigger`                                                                            | WinCapCelebration                  |
| `finalWin`          | `amount`, `capped`                                      | `roundSettle(amount)`, `winCapCelebrate` (if `capped`)                                     | WinCounter, WinCapCelebration      |
| `freeSpinTrigger`   | `totalFs`, `positions`                                  | `freeSpinIntroShow(totalFs)`, `transitionToFree`                                           | FreeSpinIntro, Transition          |
| `freeSpinRetrigger` | `totalFs`, `positions`                                  | `freeSpinRetriggerShow`, `freeSpinCounterUpdate(totalFs)`                                  | FreeSpinAnimation, FreeSpinCounter |
| `updateFreeSpin`    | `amount`(current), `total`                              | `freeSpinCounterUpdate(current,total)`                                                     | FreeSpinCounter                    |
| `freeSpinEnd`       | `amount`, `winLevel`                                    | `freeSpinOutroShow(amount)`, `transitionToBase`                                            | FreeSpinOutro, Transition          |

> Snowball note: `setPersistentMult` only appears in snowball modes (base/ante feature,
> bonus, superbonus) — **never in superspins** (single spin, no snowball). The handler must
> tolerate its absence.

> Near-miss note: most winning spins emit `gazeStep` (charge builds) but **no** `eyeReveal`
> (no Eye landed) — the discarded charge is the intended tension. The GazeMeter component
> must animate the _loss_ of charge when a spin resolves without an `eyeReveal`.

---

## 6. Component inventory

Adapted from `apps/scatter/src/components`. ✅ = reuse scatter near-as-is, 🔶 = adapt,
🆕 = Abyssal-specific build.

**Board & symbols**

- 🔶 `Game.svelte` — root; composes everything
- 🔶 `Board`, `BoardBase`, `BoardContainer`, `BoardFrame`, `BoardMask` — 6×5 grid (+padding)
- 🔶 `Symbol`, `SymbolSprite`, `SymbolSpine*`, `ReelSymbol`, `SymbolWrap` — symbol rendering
- ✅ `Anticipation`, `Anticipations` — scatter anticipation on near-trigger

**Cascades & wins**

- 🔶 `TumbleBoard`, `TumbleBoardBase`, `TumbleSymbol` — explode/drop/refill
- 🔶 `TumbleWinAmount*` (Frame/Text/Wrap), `ClusterWinAmount(s)` — per-cluster win labels
- 🔶 `Win`, `WinAnimation`, `WinCoins` — win celebration + coin shower

**The Eye & multipliers** (the signature work)

- 🆕 `Eye.svelte` — the EYE symbol on board: idle gaze, reveal (ADD/MUL + startValue),
  resolve burst that applies `totalMult`. (Start from scatter's `MultiplierSymbol`/
  `GlobalMultiplier` but it's largely bespoke — this is the brand moment.)
- 🆕 `GazeMeter.svelte` — the charge meter ("Gaze"); fills per `gazeStep`, drains on
  no-Eye resolve, feeds the Eye on `eyeResolve`.
- 🔶 `PersistentMultiplier.svelte` — the snowball `M` (adapt `MultiplierTotal`).

**Free spins**

- 🔶 `FreeSpinIntro`, `FreeSpinOutro`, `FreeSpinCounter`, `FreeSpinAnimation`
- 🔶 `Transition`, `TransitionAnimation` — base↔free swap

**Lifecycle / shell**

- ✅ `LoadingScreen`, `Background`, `ResumeBet`, `PressToContinue`
- ✅ `EnableGameActor`, `EnableSound`, `Sound`
- 🔶 `WinCapCelebration.svelte` (🆕-ish) — the 15,000× max-win moment

**UI** (from `components-ui-pixi` / `components-ui-html`, themed)

- Bet display, bet +/- & levels, spin button, autobet, turbo
- **Buy buttons** — bonus (100×), superspins (20×), superbonus (500×) + confirm modals
- Ante toggle (1.25×)
- Menu, paytable/rules modal, settings, game version, sound toggle

---

## 7. Asset checklist

**Symbols** (idle + win + explode states; spine or spritesheet):

- Highs: H1 Anglerfish, H2 Nautilus, H3 Diving Helmet, H4 Jellyfish
- Lows: L1–L4 gems (cyan/teal/sapphire/violet)
- Specials: **W Pearl (wild)**, **S Conch (scatter)**, **EYE The Eye** (idle gaze + ADD
  face + MUL face + 6 start-value states {2,5,10,25,50,100} + resolve burst)

**Scenes / UI:** base background, free-spins background, win-cap background, board frame,
Gaze meter art, snowball multiplier badge, free-spins intro/outro panels, buy-button art,
logo, loading screen, fonts.

**Audio:** base/free/superbonus music loops; reel drop; cascade explode; per-tier win
stings (map to `winLevel` 1–10 / `winLevelMap.ts`); Gaze charge tick; Eye reveal (ADD vs
MUL); Eye resolve; snowball increment; scatter land; free-spins trigger; win-cap fanfare.

> Theme anchors (from design): the **EYE symbol** and the **"Gaze" charge meter** are the
> two visual ties to the Leviathan. Confirm the meter's on-screen name with the client
> (candidates: Gaze / Wrath / Fury) before final art.

---

## 8. Build & deploy

```bash
# dev (expect RGS errors until you paste a real launch query string)
pnpm run dev --filter=abyssal

# component-driven dev (the productive loop — build each emitterEvent in isolation)
pnpm run storybook --filter=abyssal

# production build → static site
pnpm run build --filter=abyssal
# output: apps/abyssal/.svelte-kit/output/  → bundle index.html + client/* into a folder
```

**Launch on Stake Engine:**

1. Log in to the dashboard (engine.stake.com).
2. Game → **Files** → upload the build folder **and** the math upload set from
   `games/abyssal/library/publish_files/` (`books_<mode>.jsonl.zst`,
   `lookUpTable_<mode>_0.csv`, `index.json`).
3. **Publish Game** → select the Front End build.
4. Developer → **Start game session** → Launch in new tab.
5. Copy the launch **query string** into your local dev URL to test against the live RGS.

> ⚠️ Math/frontend version coupling: the on-disk books still need the **post-rename re-sim**
> (event strings `gazeStep/eyeReveal/eyeResolve` are baked into books). Upload only books
> regenerated _after_ the rename, or the client's handlers won't match the events. See the
> design-locks memo / run command below.

---

## 9. Phased roadmap (the checklist)

### Phase 0 — Foundations

- [ ] Fork/clone web-sdk; pin Node 22.16.0 / pnpm 10.5.0; `pnpm install`.
- [ ] Copy `apps/scatter` → `apps/abyssal`; rename package; `--filter=abyssal` runs.
- [ ] **Re-sim the math** with the renamed events; copy `publish_files/` locally.
- [ ] Wire `typesBookEvent.ts` to the full Abyssal event union (§5).

### Phase 1 — RGS plumbing

- [ ] Reuse `Authenticate` + `utils-fetcher`: authenticate → balance → config.
- [ ] Bet controls bound to `minBet/maxBet/stepBet/betLevels`; mode multipliers correct.
- [ ] `play` → receive book → run `playBookEvents`. `end-round` timing per §3.
- [ ] Resume active round on auth; replay mode (`replay=true`).
- [ ] Map all error codes to UX.

### Phase 2 — Core spin (base mode)

- [ ] `reveal` → board with padding; symbol rendering incl. wild/scatter/EYE flags.
- [ ] Cascade loop: `winInfo` → `updateTumbleWin` → `gazeStep` → `tumbleBoard` (atomic steps).
- [ ] `setWin`/`setTotalWin`/`finalWin`; `winLevel` celebration tiers.
- [ ] Losing spin path (reveal → 0 settle).

### Phase 3 — The Eye (signature feature)

- [ ] `GazeMeter`: fill per `gazeStep`; **drain on no-Eye resolve** (near-miss).
- [ ] `Eye`: `eyeReveal` (ADD/MUL + startValue) → `eyeResolve` burst applying `totalMult`.
- [ ] Verify ADD vs MUL math visually matches `totalMult`.

### Phase 4 — Free spins + snowball

- [ ] `freeSpinTrigger` (≥4 scatter) → intro + transition; `updateFreeSpin` counter.
- [ ] `setPersistentMult` snowball badge climbs; applies to subsequent wins.
- [ ] `freeSpinRetrigger` (≥3 scatter); `freeSpinEnd` outro + total; 50-spin cap holds.

### Phase 5 — Buy modes

- [ ] Buy buttons + confirm modals: bonus (100×), superspins (20×), superbonus (500×).
- [ ] Ante toggle (1.25×).
- [ ] Superspins: single guaranteed-Eye spin, **no** snowball (handle missing `setPersistentMult`).
- [ ] Superbonus: charge +2 cadence, MUL-common pacing.

### Phase 6 — Win-cap & polish

- [ ] `wincap` + `finalWin{capped:true}` → 15,000× celebration; round halts after.
- [ ] Audio pass; turbo/autobet; responsive (mobile/tablet/desktop via `utils-layout`).
- [ ] Social-casino text variants (`social=true`); i18n + currency formatting.
- [ ] Rules/paytable modal mirrors [ABYSSAL_FRONTEND_GUIDE.md §3](ABYSSAL_FRONTEND_GUIDE.md).

### Phase 7 — QA, review & launch

- [ ] Storybook stories: every mode `book/random` + every `bookEvent/<type>` in isolation.
- [ ] Force-file QA: drive specific outcomes via `library/forces/force.json`
      (`symbol:"eye"`, `chargeNoEye`, `scatter`, `criteria:"wincap"`).
- [ ] Generate game-review IDs (`find_scenarios.py`) for: normal win, big win, win cap,
      loss, bonus trigger — **per mode** (see Frontend Guide §11).
- [ ] Cross-device responsive + perf check; balance reconciliation correct on every path.
- [ ] Build, upload, publish, session-test, submit for review.

---

## 10. Testing strategy (Storybook-first)

The Windows storybook first-load is slow (15+ min); after that, story switching is fast.
Build **every emitterEvent as its own story** before wiring books — this is the SDK's core
workflow recommendation and it pays off on the Eye/snowball.

- `COMPONENTS/Abyssal/component` — full game
- `COMPONENTS/Eye/emitterEvent/<step>` — each Eye atomic step in isolation
- `COMPONENTS/GazeMeter/emitterEvent/<step>` — charge fill + drain
- `MODE_BASE/bookEvent/<type>` — each book event standalone
- `MODE_BASE/book/random`, `MODE_BONUS/book/random`, … — full books per mode

Story data lives in `src/stories/data/` (e.g. `base_books.ts`, `bonus_events.ts`); seed it
from real books pulled out of `books_<mode>.jsonl.zst` so stories match production exactly.

---

## 11. Open decisions (resolve before final art/build)

- [ ] **Gaze meter name** on screen (Gaze / Wrath / Fury / other) — affects art + audio.
- [ ] Eye reveal styling for ADD vs MUL — must read as clearly different at a glance.
- [ ] Snowball badge placement (HUD vs on-board) for the free-spins feature.
- [ ] Win-cap celebration length (it can interrupt fast autobet) — pick a duration.
- [ ] Turbo behaviour through cascades and the Eye resolve (skip vs speed-up).

---

## 12. Reference index

| Need                                                                                                    | Go to                                                                                          |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Exact event payloads & per-spin order                                                                   | [ABYSSAL_FRONTEND_GUIDE.md](ABYSSAL_FRONTEND_GUIDE.md) §6–§8                                   |
| Paytable, modes, constants                                                                              | [ABYSSAL_FRONTEND_GUIDE.md](ABYSSAL_FRONTEND_GUIDE.md) §3, §5, §10                             |
| Game-review scenario IDs                                                                                | [ABYSSAL_FRONTEND_GUIDE.md](ABYSSAL_FRONTEND_GUIDE.md) §11 + `games/abyssal/find_scenarios.py` |
| Math stats report (RTP, min/max win, volatility, unique payouts, win distribution, Eye/feature metrics) | `python games/abyssal/analyze_math.py [--books] [--json out.json]`                             |
| Design rationale / locked decisions                                                                     | [ABYSSAL_MATH_SPEC.md](ABYSSAL_MATH_SPEC.md)                                                   |
| AI art pipeline, style bible, asset list, VFX/juice checklist                                           | [ABYSSAL_ART_PIPELINE.md](ABYSSAL_ART_PIPELINE.md)                                             |
| SDK source & examples                                                                                   | https://github.com/StakeEngine/web-sdk (`apps/scatter`)                                        |
| RGS API contract                                                                                        | https://stakeengine.github.io/math-sdk/rgs_docs/RGS/                                           |
| Upload set                                                                                              | `games/abyssal/library/publish_files/`                                                         |

**Re-sim command (run from repo root):**

```powershell
Remove-Item -Recurse -Force games/abyssal/library -ErrorAction SilentlyContinue
$env:PYTHONPATH = (Get-Location); $env:ABYSSAL_THREADS = "8"; python games/abyssal/run.py
```
