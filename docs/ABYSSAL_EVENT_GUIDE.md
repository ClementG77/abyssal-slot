# Abyssal — Event Rendering Guide (the renderer's bible)

**How to render a spin from start to finish, event by event.** This is the authoritative,
as-built mapping between the math's emitted _book events_ and what the frontend must draw.
Every event, its exact payload, the exact order they arrive, and the render duty for each.

Grounded in the actual emitters: [game_events.py](games/abyssal/game_events.py),
[src/events/events.py](src/events/events.py), and the spin/feature orchestration in
[gamestate.py](games/abyssal/gamestate.py). Architecture/stack/build is in
[ABYSSAL_FRONTEND_GUIDE.md](ABYSSAL_FRONTEND_GUIDE.md); the math itself in
[ABYSSAL_MATH_SPEC.md](ABYSSAL_MATH_SPEC.md).

---

## 0. The mental model in five sentences

1. A **round** = one entry in the lookup table → one **book** = an ordered `events[]` array.
2. The frontend **does not compute anything** — it replays `events[]` in order; the book is
   the single source of truth, the final win is already decided.
3. A spin is: **reveal → (winInfo → updateTumbleWin → gazeStep → tumbleBoard)\* → eyeReveal\* →
   eyeResolve → setPersistentMult? → setWin → setTotalWin**, then optionally scatter pay and
   the free-spins feature, then **finalWin**.
4. **The Eye is already on the board at `reveal`** (board cell has `eye:true`); it only _opens_
   (shows type + value) at the end of the tumble sequence via `eyeReveal`/`eyeResolve`.
5. The **Gaze** (charge) builds +1 per winning tumble and is the number the Eye multiplies.

---

## 1. Amount scales — read this first (the #1 source of bugs)

Three different scales exist. **Book events use cents-of-bet (×100).**

| Layer                                      | Unit                    | Example (a 2.5× win on a $1 bet) |
| ------------------------------------------ | ----------------------- | -------------------------------- |
| **RGS API** (`play`/`balance`)             | micro-units, ×1,000,000 | `2500000`                        |
| **Book events** (everything in `events[]`) | **cents of bet, ×100**  | `250`                            |
| **Display** (what you show)                | × bet (book ÷ 100)      | `2.50× = $2.50`                  |

So every `amount`, `win`, `totalWin`, `mult`-driven payout you read from a book event is an
**integer = (×-bet) × 100**. Divide by 100 for the multiplier, multiply by the bet for cash.
`mult`, `totalMult`, `charge`, `startValue`, `globalMult`, `count`, `totalFs` are **raw
integers** (not ×100). The cap is `wincap = 15000×` → appears as `1500000` in `amount` fields.

---

## 2. Coordinate system & the board

- **Playable board: 6 reels × 5 rows.** Pay-anywhere (8+ of a kind anywhere wins).
- **Padding is ON** (`include_padding = true`): the `board` in events is **6 × 7** — row `0`
  and row `6` are **display-only padding** (the symbols peeking above/below the frame). All
  event positions are **padding-indexed**: a playable cell at internal row `r` is reported as
  **`row = r + 1`** (so playable rows are `1..5`). Render padding rows outside the reel mask.
- A symbol cell is `{ "name": "H1", "eye": true? , "scatter": true?, "wild": true? ... }` —
  the special booleans only appear on special symbols (EYE carries `"eye": true`).
- Positions everywhere are `{ "reel": 0..5, "row": 1..5 }` (padding-indexed).
- **`board` shape:** because `include_padding = true`, the math **embeds the padding rows in the
  `board` array** → each reel has 7 entries (`[topPad, r1..r5, bottomPad]`). The SDK board/reel
  component must therefore be configured for **5 visible rows + 1 top + 1 bottom masked** (match
  the `/apps/scatter` board height config). All event positions are already 1-indexed to line up
  with that top padding row.
- **`paddingPositions`** is a per-reel array of **reel-strip stop indices** (e.g. `[216, 205, …]`,
  one per reel) — feed it to the SDK's `utils-slots` spin so each reel lands on the right strip
  window. It is **not** a list of coordinates.
- **`anticipation`** is a per-reel **array** of ints (e.g. `[0,0,0,2,0,0]`) — a non-zero value on
  a reel means "slow-roll / build suspense on this reel" (scatter teases). Not a scalar.

---

## 3. Complete event catalog

Every event type the math emits, with payload and render duty. **Bold** = Abyssal-custom
(defined in [game_events.py](games/abyssal/game_events.py)); the rest are engine-standard.

| #   | `type`                  | Payload                                                                                                                                             | When                                                                               | Render duty                                                                                                                                                                                                                      |
| --- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `reveal`                | `board` (6×7, padding embedded), `paddingPositions` (per-reel strip stops), `gameType` (`basegame`/`freegame`), `anticipation` (per-reel int array) | start of **every** spin (base + each free spin)                                    | Spin reels to `paddingPositions`, drop the new board. The **Eye is already here** (`eye:true` cell) — show it _closed/glowing_, value hidden. Slow-roll any reel whose `anticipation[reel] > 0`.                                 |
| 2   | `winInfo`               | `totalWin`, `wins:[{symbol,count,win,positions,meta:{winWithoutMult}}]`                                                                             | once per winning tumble (after the board settles, before it explodes)              | Highlight each winning cluster; show per-symbol win. `win`/`totalWin` are ×100. `count` = symbols in the cluster (incl. wilds).                                                                                                  |
| 3   | `updateTumbleWin`       | `amount`                                                                                                                                            | immediately after each `winInfo`                                                   | Update the running "tumble win" ticker for this spin (×100, cumulative across the spin's tumbles).                                                                                                                               |
| 4   | **`gazeStep`**          | `fromPositions:[{reel,row}]`, `charge`                                                                                                              | after each winning tumble (only if it won)                                         | Animate energy flowing from the winning cells into the **Gaze meter**; set meter = `charge`. This is the running cascade count this spin.                                                                                        |
| 5   | `tumbleBoard`           | `explodingSymbols:[{reel,row}]`, `newSymbols:[[...]]`                                                                                               | after `gazeStep`, if the sequence continues                                        | Explode the listed cells, drop `newSymbols` from the top per reel to refill. **Eye cells never explode** — they fall/stay. New scatters can arrive here (organic).                                                               |
| 6   | **`eyeReveal`**         | `position:{reel,row}`, `eyeType` (`ADD`/`MUL`), `startValue`                                                                                        | at end of sequence, **once per Eye**, only if an Eye is present _and_ the spin won | "Open" the Eye at `position`: flip it to show ADD/MUL + its number. Multiple in a row for the Ultimate (1–5).                                                                                                                    |
| 7   | **`eyeResolve`**        | `charge`, `totalMult`, **+** single-Eye: `eyeType`,`startValue` **or** multi: `eyes:[{eyeType,startValue}]`                                         | right after the `eyeReveal`(s)                                                     | Play the combine animation. `totalMult` = the multiplier **applied to this spin's raw win** (= new banked `M` in the feature; the combine value in basegame). See §6.2/§6.3.                                                     |
| 8   | **`setPersistentMult`** | `mult`                                                                                                                                              | **feature spins only, and only on Eye spins**                                      | The **compounding banked multiplier** `M` after this Eye (MUL Eyes multiply the whole `M`); this is the multiplier applied to _this_ spin. Update the persistent-multiplier badge. (Never emitted on Eye-less spins — see §6.3.) |
| 9   | `setWin`                | `amount`, `winLevel`                                                                                                                                | after the Eye resolves, if spin win > 0                                            | The **final win for this single spin** (post-Eye, post-snowball), ×100. Use `winLevel` to pick the win presentation (small/big/mega…).                                                                                           |
| 10  | `setTotalWin`           | `amount`                                                                                                                                            | after `setWin`, and again after a scatter pay                                      | The **round cumulative** win so far (×100). Drives the big round ticker.                                                                                                                                                         |
| 11  | **`scatterPay`**        | `count`, `amount`                                                                                                                                   | base/ante **trigger** spins only, after the Eye                                    | Instant scatter cash bonus: `count` 4/5/6 → `amount` 300/500/10000 (×100 = 3×/5×/100×). Pop a coin/scatter-pay banner. **Not** multiplied by the Eye. Followed by an updated `setTotalWin`.                                      |
| 12  | `wincap`                | `amount`                                                                                                                                            | once, the moment cumulative win hits 15,000×                                       | Trigger the MAX-WIN takeover sequence. Spin logic stops cascading after this.                                                                                                                                                    |
| 13  | `freeSpinTrigger`       | `totalFs`, `positions:[{reel,row}]`                                                                                                                 | when ≥4 scatters trigger the feature (from base/ante)                              | The feature-entry moment: show "15 Free Spins", highlight the trigger scatters, transition into the feature scene. `totalFs` = 15.                                                                                               |
| 14  | `updateFreeSpin`        | `amount` (current spin #), `total` (`totalFs`)                                                                                                      | at the **start of each free spin**, before its `reveal`                            | Update the "spin X / Y" counter.                                                                                                                                                                                                 |
| 15  | `freeSpinRetrigger`     | `totalFs`, `positions`                                                                                                                              | ≥3 scatters land _during_ the feature (not at 30-cap)                              | "+5 Free Spins" celebration; bump the counter to the new `totalFs` (capped 30).                                                                                                                                                  |
| 16  | `freeSpinEnd`           | `amount` (total feature win), `winLevel`                                                                                                            | once, when the feature finishes                                                    | Feature outro / total-feature-win summary (×100).                                                                                                                                                                                |
| 17  | **`finalWin`**          | `amount`, `capped`                                                                                                                                  | **last event of every book**                                                       | Settle the round: this is the authoritative total payout (×100). `capped:true` ⇒ a 15,000× max-win was hit (gate the max-win fanfare on this). Call RGS `endRound` after rendering.                                              |

> Events that exist in the engine but **Abyssal does not emit**: `enterBonus` (feature entry
> is signalled by `freeSpinTrigger`), `updateGlobalMult` (Abyssal's multiplier is the Eye /
> snowball, not the sample's per-tumble global mult), `setTumbleWin` banner variant. Don't
> wait on them.

---

## 4. Exact emission order — a base / ante spin

This is the precise sequence from [gamestate.py `run_spin`](games/abyssal/gamestate.py#L7).
`( … )*` = repeats per tumble; `[ … ]?` = conditional.

```
reveal                                  # new board; Eye(s) already present but closed
( winInfo → updateTumbleWin → gazeStep → tumbleBoard )?   # 1st connection (no tumbleBoard if it's the last)
( winInfo → updateTumbleWin → gazeStep → tumbleBoard )*   # further cascades; scatters may drop in
                                          # loop ends when a drop yields no win (or wincap / 20-tumble guard)
[ eyeReveal × N → eyeResolve ]?          # only if Eye present AND spin won
[ setPersistentMult ]?                   # feature spins only, Eye spins only (NOT in base/ante base spin)
[ setWin ]?                              # if spin win > 0
setTotalWin                              # round cumulative
[ wincap ]?                              # if 15,000× hit anywhere above
[ scatterPay → setTotalWin ]?            # base/ante trigger spins: 4/5/6 scatter cash
[ freeSpinTrigger → <FEATURE> → freeSpinEnd ]?   # if ≥4 scatters → feature (see §5)
finalWin                                 # settle (last event)
```

Key ordering facts the renderer must respect:

- **`reveal` already contains the Eye.** There is no "eye drops in" event — the Eye is a board
  cell from the first frame. It can be carried down by `tumbleBoard` (it never explodes). Show
  it as a closed/charging eye; only `eyeReveal` opens it.
- **Win → Gaze → Tumble, in that order, every cascade.** Highlight the win, flow energy into
  the Gaze, _then_ explode + refill.
- **The Eye resolves once, at the very end of the cascade chain** — not per tumble.
- **`scatterPay` comes after the Eye and is independent of it** (never multiplied).
- **`finalWin` is always last.** Treat it as commit + `endRound`.

---

## 5. The Free Spins feature flow

From [`run_freespin`](games/abyssal/gamestate.py#L62). Entry happens inside the _triggering_
base/ante spin (or immediately for buys), between that spin's `setTotalWin` and its `finalWin`:

```
freeSpinTrigger            # totalFs = 15; highlight trigger scatters; enter feature scene
  ┌── per free spin ──────────────────────────────────────────────┐
  │ updateFreeSpin          # "spin X / Y"                          │
  │ reveal                  # new feature board (gameType=freegame) │
  │ ( winInfo → updateTumbleWin → gazeStep → tumbleBoard )*         │
  │ [ eyeReveal × N → eyeResolve → setPersistentMult ]?  # Eye spin │
  │ [ setWin ]? → setTotalWin                                       │
  │ [ wincap ]?                                                     │
  │ [ freeSpinRetrigger ]?  # ≥3 scatters mid-feature → +5 (≤30)    │
  └────────────────────────────────────────────────────────────────┘
  … repeats until spins exhausted, wincap, or the 6-scatter re-roll …
freeSpinEnd                # total feature win + winLevel
finalWin                   # (back in the base round) settle + endRound
```

- **Flat 15 spins** every trigger (`base_freespins`). Scatter _count_ does **not** change the
  spin count — it pays the instant `scatterPay` instead (base/ante triggers only).
- **Retrigger** = ≥3 scatters in-feature → `freeSpinRetrigger`, `+5` spins, hard cap **30**.
- **No scatters after the 30-cap:** once `total` hits 30, the math draws scatter-free boards,
  so you will **not** see scatters (and no misleading "about to retrigger"). If you ever see a
  `reveal` with scatters while the counter shows 30/30, that's a bug in the books.
- **Max-win ends the feature immediately.** If a spin hits the 15,000× cap (say spin 5 of 15),
  the remaining spins are **never played** — there are **no more `updateFreeSpin`/`reveal`/spin
  events**. The book tail is exactly:
  `… wincap → freeSpinEnd → finalWin(capped:true)`. No stray `freeSpinRetrigger` is emitted on a
  capped spin. **Render duty:** on `wincap` (or `finalWin.capped`), stop the feature, skip the
  remaining counter spins (it may read e.g. `5/15`), and play the max-win takeover — accept
  `freeSpinEnd` even though `current < total`.

---

## 6. The Eye — rendering it correctly

The Eye is the whole game; get this exactly right.

### 6.1 Lifecycle within a spin

1. **`reveal`**: an Eye cell (`eye:true`) may already be on the board — render it **closed /
   slowly glowing**, value hidden.
2. **`gazeStep`** (each winning tumble): the **Gaze** meter climbs (`charge`). This is the
   number the Eye will use. Eye-less spins still build Gaze, then waste it (the near-miss).
3. **`eyeReveal`** (end of sequence, if it won): the Eye **opens** — flip to show `eyeType`
   (ADD/MUL) and `startValue`. One per Eye (Ultimate fires several).
4. **`eyeResolve`**: play the combine. `charge` is the Gaze used.
5. **`setWin`**: the spin's resolved win (already includes the Eye/snowball).

### 6.2 What `totalMult` means

`eyeResolve.totalMult` is **the multiplier actually applied to this spin's raw win** →
`setWin = rawWin × totalMult`. Its value depends on whether you're in the feature:

| Context                                                                  | `totalMult` =                                                                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **basegame** (base/ante non-feature spin, **Super Spins**, **Ultimate**) | `combine_eyes(eyes, charge) = (charge + Σ ADD starts) × Π MUL starts` (single ADD = `start+charge`; single MUL = `start×charge`) |
| **snowball feature** (`base`, `ante`, `bonus`, `superbonus`)             | the **new banked `M`** after compounding this Eye (see §6.3) — equal to `setPersistentMult.mult` on the same spin                |

### 6.3 The snowball — COMPOUNDING banked multiplier (Gates-of-Olympus style) ⭐

In the feature, the banked multiplier `M` **compounds multiplicatively**: a MUL Eye multiplies
your **whole** banked total, not just the Gaze. (ADD Eyes just add.) `M` banks across the
feature and only pays out on Eye spins:

- `M` starts at **×1** at feature start.
- **On a spin where an Eye lands AND wins:** the Gaze is added to `M`, then the MUL Eyes
  multiply the whole thing:
  ```
  M = (M + charge + Σ ADD starts) × Π MUL starts
  ```
  Single MUL Eye → `M = (M + charge) × startValue`. Single ADD Eye → `M = M + charge + startValue`.
  The spin pays `rawWin × M`; the math emits `setPersistentMult { mult: M }`. Animate the badge:
  `M` → `(M + gaze)` → `× MUL` → new `M`.
- **On an Eye-less spin (or an Eye spin that didn't win):** the spin pays its **raw win**; `M`
  is **not** applied and **no `setPersistentMult` is emitted**. The banked badge stays put.

> **MUL Eyes are the prized, rarer drop** (≈12% of feature Eyes in base/ante/bonus, 20% in
> superbonus) precisely because each one _multiplies the entire banked multiplier_ — `M` can
> rocket from tens to thousands in a couple of MUL hits. ADD Eyes are the common, gentle climb.
> The persistent multiplier **climbs only on Eye spins and pays off only on Eye spins**: a dry,
> Eye-less free spin pays its plain tumble win even if `M` is huge. **Do not** multiply Eye-less
> spins by `M` — the only signal to apply `M` is the presence of `setPersistentMult` on that spin.

### 6.4 The near-miss (no Eye)

Most winning spins build a Gaze but **no Eye lands** → no `eyeReveal`/`eyeResolve`, the Gaze is
simply discarded and the player keeps the raw win. Render the Gaze "fizzling out" for tension.
(The math records a `chargeNoEye` force-key when `charge ≥ 5`, but that's QA-only — not an
event.)

### 6.5 Multiple Eyes (Ultimate only)

`reveal` can show 1–5 Eye cells. At resolve: **N `eyeReveal` events** (open each) then **one
`eyeResolve` carrying `eyes:[…]`**. Render the combine: sum the ADD `startValue`s, multiply the
MUL `startValue`s, fold in the Gaze: `(charge + ΣADD) × ΠMUL = totalMult`. Ultimate is a
single basegame spin (no snowball), so there is **no `setPersistentMult`**.

---

## 7. Scatters — organic landing, anticipation, pays, triggers

- **Organic (Sweet-Bonanza style) in base/ante:** scatters are **not** force-placed. They
  appear on `reveal` and can **drop in during `tumbleBoard`** (they never explode → they
  accumulate). The feature triggers when **≥4 are on the board at the end of the sequence.**
  Keep a **live on-board scatter count** as `tumbleBoard` events arrive.
- **3 scatters = the "bait":** a base/ante spin can settle at 3 (a near-trigger). Use the
  `reveal.anticipation` field to slow-roll the reels when a trigger is close.
- **Scatter pays (`scatterPay`)** fire only on a base/ante **trigger** (count 4/5/6 →
  3×/5×/100×), added on top, **not** Eye-multiplied. Buys and the forced max-win corner don't
  pay scatter.
- **6-scatter hard cap:** the _playable_ board never keeps more than 6 scatters (pays top out
  at 6; spins are flat). A `scatterPay.count` is always 4, 5, or 6. **Padding rows may show a
  7th scatter** in the raw `board` array — it's display-only, doesn't count/pay/trigger; render
  it outside the frame.
- **Buys** (bonus/superbonus) show their scatters on the trigger `reveal` instead of dropping
  them in organically.

---

## 8. Mode-by-mode differences

| Mode           | Cost  | Entry / shape                                                                         | Eye               | Snowball                 | Scatter pay            |
| -------------- | ----- | ------------------------------------------------------------------------------------- | ----------------- | ------------------------ | ---------------------- |
| **base**       | 1×    | normal spins; organic scatter trigger → feature                                       | rare, mostly ADD  | yes (banked, in feature) | yes (on trigger)       |
| **ante**       | 1.25× | as base, more frequent Eyes/scatters                                                  | rare+             | yes                      | yes                    |
| **bonus**      | 100×  | buy → feature directly (`freeSpinTrigger` up front)                                   | feature Eyes      | yes                      | **no** (you bought it) |
| **superspins** | 20×   | **one direct basegame spin**, Eye guaranteed; no feature, no counter, **no snowball** | guaranteed        | **no**                   | no                     |
| **superbonus** | 500×  | buy → feature; Gaze builds **+2**/tumble; MUL Eyes common                             | feature Eyes, hot | yes                      | no                     |
| **ultimate**   | 300×  | **one direct basegame spin** with **1–5 combining Eyes**                              | multiple, combine | **no**                   | no                     |

Renderer implications:

- **Super Spins & Ultimate** emit **no** `freeSpinTrigger`/`updateFreeSpin`/`freeSpinEnd` — they
  are a single spin: `reveal → tumbles → eyeReveal(s) → eyeResolve → setWin → setTotalWin →
finalWin`. No feature scene.
- **Ultimate** is the only mode with multi-`eyeReveal` + an `eyes` array in `eyeResolve`.
- **Super Bonus** Gaze increments by **2** per tumble — your meter animation should reflect the
  faster charge.

---

## 9. Worked book examples (annotated)

Amounts are ×100 (cents-of-bet). Comments are not in the real JSON.

### 9.1 Base spin — single win, ADD Eye (no feature)

```jsonc
[
 { "type":"reveal", "board":[…6×7…], "paddingPositions":[216,205,195,16,65,40], "gameType":"basegame", "anticipation":[0,0,0,0,0,0] },
 { "type":"winInfo", "totalWin":120, "wins":[ {"symbol":"H1","count":9,"win":120,"positions":[…],"meta":{"winWithoutMult":120}} ] },
 { "type":"updateTumbleWin", "amount":120 },
 { "type":"gazeStep", "fromPositions":[…], "charge":1 },
 { "type":"tumbleBoard", "explodingSymbols":[…], "newSymbols":[[…]] },
 { "type":"winInfo", "totalWin":80, "wins":[ … ] },         // 2nd cascade
 { "type":"updateTumbleWin", "amount":200 },                // 120+80
 { "type":"gazeStep", "fromPositions":[…], "charge":2 },    // Gaze now 2
 // 3rd drop: no win → loop ends
 { "type":"eyeReveal", "position":{"reel":3,"row":2}, "eyeType":"ADD", "startValue":10 },
 { "type":"eyeResolve", "charge":2, "eyeType":"ADD", "startValue":10, "totalMult":12 },  // 10+2
 { "type":"setWin", "amount":2400, "winLevel":"big" },      // rawWin 200 × 12
 { "type":"setTotalWin", "amount":2400 },
 { "type":"finalWin", "amount":2400, "capped":false }
]
```

### 9.2 Base spin → triggers Free Spins (organic, 4 scatters, scatter pay)

```jsonc
[
 { "type":"reveal", … "anticipation":[0,0,2,0,0,0] },        // a reel slow-rolls near a scatter
 { "type":"winInfo", … }, { "type":"updateTumbleWin", … }, { "type":"gazeStep", "charge":1, … },
 { "type":"tumbleBoard", … },                               // a 3rd, then 4th scatter drop in here
 { "type":"winInfo", … }, { "type":"updateTumbleWin", … }, { "type":"gazeStep", "charge":2, … },
 // sequence ends with 4 scatters on board, no Eye this spin
 { "type":"setWin", "amount":300, "winLevel":"small" },
 { "type":"setTotalWin", "amount":300 },
 { "type":"scatterPay", "count":4, "amount":300 },          // 4 scatters = 3× = 300
 { "type":"setTotalWin", "amount":600 },                    // 300 tumble + 300 scatter
 { "type":"freeSpinTrigger", "totalFs":15, "positions":[…4 scatters…] },
   // ---- feature ----
   { "type":"updateFreeSpin", "amount":1, "total":15 },
   { "type":"reveal", "gameType":"freegame", … },           // spin 1: an ADD Eye (common)
   { "type":"winInfo", … }, { "type":"updateTumbleWin", … }, { "type":"gazeStep","charge":1,… },
   { "type":"eyeReveal", "eyeType":"ADD","startValue":5, … },
   { "type":"eyeResolve", "charge":1, "eyeType":"ADD","startValue":5, "totalMult":7 },  // (1+1+5)
   { "type":"setPersistentMult", "mult":7 },                // M: 1 → (1 + gaze1 + 5) = 7
   { "type":"setWin", "amount":2100, "winLevel":"big" },    // rawWin 300 × M(7)
   { "type":"setTotalWin", "amount":2700 },
   { "type":"updateFreeSpin", "amount":2, "total":15 },
   { "type":"reveal", "gameType":"freegame", … },           // spin 2: Eye-less winning spin
   { "type":"winInfo", … }, { "type":"updateTumbleWin", … }, { "type":"gazeStep","charge":1,… },
   // NO eyeReveal / NO setPersistentMult → M (7) is NOT applied
   { "type":"setWin", "amount":150, "winLevel":"small" },   // raw win only; M stays banked at 7
   { "type":"setTotalWin", "amount":2850 },
   { "type":"updateFreeSpin", "amount":3, "total":15 },
   { "type":"reveal", "gameType":"freegame", … },           // spin 3: a MUL Eye (rare, prized)
   { "type":"winInfo", … }, { "type":"updateTumbleWin", … }, { "type":"gazeStep","charge":2,… },
   { "type":"eyeReveal", "eyeType":"MUL","startValue":3, … },
   { "type":"eyeResolve", "charge":2, "eyeType":"MUL","startValue":3, "totalMult":27 },  // (7+2)×3
   { "type":"setPersistentMult", "mult":27 },               // M: (7 + gaze2) × 3 = 27  (COMPOUNDS!)
   { "type":"setWin", "amount":5400, "winLevel":"big" },    // rawWin 200 × M(27)
   { "type":"setTotalWin", "amount":8250 },
   // … more spins …
   { "type":"freeSpinEnd", "amount":7650, "winLevel":"endFeature" },
 { "type":"finalWin", "amount":8250, "capped":false }       // base 600 + feature 7650
]
```

> Spin 2: **Eye-less ⇒ no `setPersistentMult`, pays its raw 150**, even though `M` is 7 — only
> Eye spins cash the multiplier. Spin 3: the **MUL Eye multiplies the whole banked `M`**
> (`(7+2)×3 = 27`), not just the gaze — that's the compounding that makes MUL the prized drop.

### 9.3 Ultimate — multiple combining Eyes (single spin)

```jsonc
[
 { "type":"reveal", "gameType":"basegame", … },             // 3 Eye cells on board, closed
 { "type":"winInfo", … }, { "type":"updateTumbleWin", … }, { "type":"gazeStep","charge":1,… },
 { "type":"tumbleBoard", … },
 { "type":"winInfo", … }, { "type":"updateTumbleWin", … }, { "type":"gazeStep","charge":2,… },
 { "type":"eyeReveal", "position":{…}, "eyeType":"MUL", "startValue":50 },
 { "type":"eyeReveal", "position":{…}, "eyeType":"MUL", "startValue":25 },
 { "type":"eyeReveal", "position":{…}, "eyeType":"ADD", "startValue":10 },
 { "type":"eyeResolve", "charge":2, "totalMult":15000,      // (2+10) × 50 × 25 = 15000 → caps
   "eyes":[ {"eyeType":"MUL","startValue":50},{"eyeType":"MUL","startValue":25},{"eyeType":"ADD","startValue":10} ] },
 { "type":"setWin", "amount":1500000, "winLevel":"max" },
 { "type":"setTotalWin", "amount":1500000 },
 { "type":"wincap", "amount":1500000 },
 { "type":"finalWin", "amount":1500000, "capped":true }     // capped:true → MAX WIN takeover
]
```

### 9.4 No-win spin

```jsonc
[
 { "type":"reveal", "gameType":"basegame", … },             // no 8-of-a-kind
 { "type":"setTotalWin", "amount":0 },
 { "type":"finalWin", "amount":0, "capped":false }
]
```

> No `winInfo`/`gazeStep`/`eyeResolve`/`setWin` when nothing connects. (An Eye may be on the
> board but does nothing without a win — leave it closed, then fade.)

---

## 10. Renderer state machine (pseudo-code)

```ts
let roundWin = 0,
	gaze = 0,
	bankedMult = 1,
	onBoardScatters = 0,
	fsCurrent = 0,
	fsTotal = 0;

for (const ev of book.events)
	switch (ev.type) {
		case 'reveal':
			spinReelsTo(ev.paddingPositions); // utils-slots: land each reel on its strip stop
			drawBoard(ev.board); // 6×7 incl. padding; Eye cells shown closed
			onBoardScatters = countScatters(ev.board); // playable rows only (1..5)
			gaze = 0; // Gaze resets each spin
			ev.anticipation.forEach((a, reel) => a > 0 && slowRoll(reel, a));
			break;
		case 'winInfo':
			highlightWins(ev.wins);
			showTumbleWin(ev.totalWin);
			break;
		case 'updateTumbleWin':
			setTumbleTicker(ev.amount);
			break;
		case 'gazeStep':
			gaze = ev.charge;
			flowEnergyToGaze(ev.fromPositions, gaze);
			break;
		case 'tumbleBoard':
			explode(ev.explodingSymbols);
			refill(ev.newSymbols);
			onBoardScatters = recount(); // organic scatters may have dropped
			break;
		case 'eyeReveal':
			openEye(ev.position, ev.eyeType, ev.startValue);
			break;
		case 'eyeResolve':
			playCombine(ev.charge, ev.totalMult, ev.eyes ?? single(ev));
			break;
		case 'setPersistentMult':
			bankedMult = ev.mult;
			updateBankedBadge(bankedMult);
			break; // Eye spins only
		case 'setWin':
			presentSpinWin(ev.amount, ev.winLevel);
			break;
		case 'setTotalWin':
			roundWin = ev.amount;
			setRoundTicker(roundWin);
			break;
		case 'scatterPay':
			popScatterPay(ev.count, ev.amount);
			break;
		case 'wincap':
			startMaxWinTakeover(ev.amount);
			break;
		case 'freeSpinTrigger':
			fsTotal = ev.totalFs;
			enterFeature(ev.positions);
			bankedMult = 1;
			break;
		case 'updateFreeSpin':
			fsCurrent = ev.amount;
			fsTotal = ev.total;
			setFsCounter(fsCurrent, fsTotal);
			break;
		case 'freeSpinRetrigger':
			fsTotal = ev.totalFs;
			celebrateRetrigger(ev.positions, fsTotal);
			break;
		case 'freeSpinEnd':
			exitFeature(ev.amount, ev.winLevel);
			break;
		case 'finalWin':
			commitRound(ev.amount, ev.capped);
			rgs.endRound();
			break;
	}
```

---

## 11. Wiring it into the Stake web-sdk

This whole guide maps cleanly onto the official **StakeEngine/web-sdk** flow (see
[docs/fe_docs](docs/fe_docs)). Build Abyssal as **`apps/abyssal/`**, copied from **`apps/scatter`**
(the scatter-pays + tumbling template — the closest match). The SDK pipeline is:

```
RGS book.events[]  →  playBookEvents()  →  playBookEvent(ev)  →  bookEventHandlerMap[ev.type]
   →  eventEmitter.broadcast/broadcastAsync(emitterEvent)  →  component.subscribeOnMount(...)  →  render
```

Key SDK facts (from the docs) that make this guide directly implementable:

- **Order is honoured for you.** `playBookEvents()` resolves events **one at a time** with
  `sequence()` — our emission order (§4/§5) _is_ the playback order. Use `broadcastAsync` +
  `await` in a handler when an animation must finish before the next event (e.g. the Eye
  combine, the reel spin); use sync `broadcast` for instant state (counters, show/hide).
- **XState `gameActor`** drives bet/autobet/resume; UI reads `stateXstateDerived.isPlaying()` etc.
  You don't re-implement round flow — you only author handlers + components.
- **Storybook-first**: every bookEvent gets `MODE_<X>/bookEvent/<type>` and `MODE_<X>/book/random`
  stories fed from `src/stories/data/*_books.ts` / `*_events.ts` (paste real Abyssal books there).

### 11.1 The book wrapper (what RGS returns)

Each lookup row deserializes to a book; the FE reads `events`. Top-level fields the SDK uses:

```jsonc
{ "id": 1, "payoutMultiplier": 24.0, "events":[ … ], "criteria":"freegame",
  "baseGameWins": 6.0, "freeGameWins": 18.0 }
```

`payoutMultiplier` is the **raw** final multiplier (24× here). Inside `events[]`, every `amount`
is **×100** (so the matching `finalWin.amount` = `2400`). The scatter template's win utilities
already divide event amounts by 100 for display — keep using them; don't double-convert.

### 11.2 Event → handler → emitter → component map

**Standard** = already implemented in the `apps/scatter` template (reuse as-is). **CUSTOM** =
Abyssal-specific, you author the type + handler + emitterEvent(s) + component (per
[docs/fe_docs/steps.md](docs/fe_docs/steps.md)).

| bookEvent               | Std/Custom   | `bookEventHandlerMap` broadcasts →                                           | Component(s)                    |
| ----------------------- | ------------ | ---------------------------------------------------------------------------- | ------------------------------- |
| `reveal`                | Standard     | `boardSettle` / reel-spin emitters (uses `paddingPositions`, `anticipation`) | `Board` / `Reel` / `Symbol`     |
| `winInfo`               | Standard     | `winShow` per cluster (positions, amount/100)                                | `Board`, `WinAmount`            |
| `updateTumbleWin`       | Standard     | `tumbleWinUpdate`                                                            | `WinAmount`                     |
| `tumbleBoard`           | Standard     | `boardExplode` + `boardRefill` (await)                                       | `Board`, `Symbol`               |
| `setWin`                | Standard     | `winShow` (spin total, `winLevel`)                                           | `WinAmount`                     |
| `setTotalWin`           | Standard     | `totalWinUpdate`                                                             | `WinAmount` / UI                |
| `finalWin`              | Standard     | `winShow` final; resolve round; `capped` → max-win                           | `WinAmount`, `MaxWin`           |
| `freeSpinTrigger`       | Standard     | `freeSpinIntroUpdate` (await)                                                | `FreeSpinIntro`                 |
| `updateFreeSpin`        | Standard     | `freeSpinCounterShow` + `freeSpinCounterUpdate`                              | `FreeSpinCounter`               |
| `freeSpinRetrigger`     | Standard     | `freeSpinRetrigger` (+5 banner)                                              | `FreeSpinCounter` / `Retrigger` |
| `freeSpinEnd`           | Standard     | `freeSpinOutroUpdate` (await)                                                | `FreeSpinOutro`                 |
| `wincap`                | Standard-ish | `maxWinShow` (await)                                                         | `MaxWin`                        |
| **`gazeStep`**          | **CUSTOM**   | `gazeFlow` (fromPositions) + `gazeUpdate` (charge)                           | **`GazeMeter`**                 |
| **`eyeReveal`**         | **CUSTOM**   | `eyeOpen` (position, eyeType, startValue, await)                             | **`Eye`**                       |
| **`eyeResolve`**        | **CUSTOM**   | `eyeCombine` (charge, totalMult, eyes[], await)                              | **`Eye`**, `GazeMeter`          |
| **`setPersistentMult`** | **CUSTOM**   | `bankedMultUpdate` (mult, await)                                             | **`BankedMultiplier`**          |
| **`scatterPay`**        | **CUSTOM**   | `scatterPayShow` (count, amount/100, await)                                  | **`ScatterPay`**                |

> Custom emitterEvents are declared on their component (`export type EmitterEvent<Name> = …`),
> added to `typesEmitterEvent.ts` (`EmitterEventGame` union) and `eventEmitter.ts`, and the
> bookEvent types go in `typesBookEvent.ts` (`BookEvent` union). Mirror exactly the `steps.md`
> walkthrough for `updateGlobalMult`.

### 11.3 The four custom components to build (the Abyssal-specific work)

1. **`GazeMeter`** — the charge meter. `gazeUpdate{charge}` sets the value; `gazeFlow{fromPositions}`
   animates energy from winning cells. Resets to 0 on each `reveal`.
2. **`Eye`** — the board Eye. `eyeOpen` flips a closed Eye cell to show ADD/MUL + value;
   `eyeCombine` plays the Gaze×Eye math. Handles 1 (single) or many (`eyes[]`, Ultimate) at once.
3. **`BankedMultiplier`** — the snowball badge. `bankedMultUpdate{mult}` climbs `M`. **Only ever
   receives an update on Eye spins** (the handler only broadcasts when `setPersistentMult` is in
   the book) — so the badge climbs and pays off only on Eye spins, exactly the math. Reset on
   `freeSpinTrigger`.
4. **`ScatterPay`** — the instant 4/5/6 = 3×/5×/100× cash pop on a base/ante trigger.

Everything else (board, reels, symbols, tumble, free-spin counter/intro/outro, win amounts,
max-win) is **inherited from the scatter template** — you mostly re-skin it.

### 11.4 `bookEventHandlerMap` snippets (drop-in shape)

```ts
// apps/abyssal/src/game/bookEventHandlerMap.ts
export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	// … standard handlers reused from scatter (reveal, winInfo, tumbleBoard, …) …

	gazeStep: async (ev: BookEventOfType<'gazeStep'>) => {
		eventEmitter.broadcast({ type: 'gazeFlow', fromPositions: ev.fromPositions });
		eventEmitter.broadcast({ type: 'gazeUpdate', charge: ev.charge });
	},

	eyeReveal: async (ev: BookEventOfType<'eyeReveal'>) => {
		await eventEmitter.broadcastAsync({
			type: 'eyeOpen',
			position: ev.position,
			eyeType: ev.eyeType,
			startValue: ev.startValue,
		});
	},

	eyeResolve: async (ev: BookEventOfType<'eyeResolve'>) => {
		await eventEmitter.broadcastAsync({
			type: 'eyeCombine',
			charge: ev.charge,
			totalMult: ev.totalMult,
			eyes: ev.eyes ?? [{ eyeType: ev.eyeType!, startValue: ev.startValue! }], // normalise single→array
		});
	},

	setPersistentMult: async (ev: BookEventOfType<'setPersistentMult'>) => {
		await eventEmitter.broadcastAsync({ type: 'bankedMultUpdate', mult: ev.mult });
	},

	scatterPay: async (ev: BookEventOfType<'scatterPay'>) => {
		await eventEmitter.broadcastAsync({
			type: 'scatterPayShow',
			count: ev.count,
			amount: ev.amount,
		});
	},
};
```

### 11.5 Per-mode story sets

Create `MODE_<MODE>` story sets for **base, ante, bonus, superspins, superbonus, ultimate**
(the math's six bet modes). `superspins`/`ultimate` books have **no** free-spin events; `ultimate`
books carry the multi-`eyeReveal` + `eyes[]` `eyeResolve` — make sure the `Eye` component's story
covers the 1–5 Eye case.

---

## 12. Gotchas checklist (do not ship without these)

- [ ] **Amounts ÷100** to get the multiplier; multiply by bet for cash. `mult`/`charge`/
      `startValue`/`count`/`totalFs` are raw integers.
- [ ] **The Eye is on the `reveal` board already** — there is no separate "eye drop" event;
      open it only at `eyeReveal`.
- [ ] **Apply the snowball `M` only when `setPersistentMult` is present** on that spin. Eye-less
      feature spins pay raw — never multiply them by the banked `M`.
- [ ] `eyeResolve.totalMult` is **the multiplier applied to this spin's raw win** everywhere (=
      the new banked `M` in the feature, = the combine value in basegame). In the feature it
      equals `setPersistentMult.mult` — render `setWin = rawWin × totalMult`.
- [ ] **Snowball COMPOUNDS:** a MUL Eye multiplies the _whole_ banked `M`, not just the gaze
      (`M = (M + gaze + ΣaddStarts) × ΠmulStarts`). MUL is the rare/prized Eye; ADD is the common
      gentle climb.
- [ ] **Gaze resets each spin** (`charge` starts at 0 every `reveal`); the **banked `M` persists**
      across the feature and resets only at `freeSpinTrigger`/feature start.
- [ ] **6-scatter cap & padding 7th:** count scatters on playable rows (1..5) only.
- [ ] **No scatters after 30/30** — if you see them, the books are wrong.
- [ ] **`finalWin` is the source of truth** and the last event; settle + `endRound` on it.
      `capped:true` ⇒ max-win presentation.
- [ ] **Super Spins / Ultimate have no feature events** — single spin, no counter.
- [ ] **`anticipation` is a per-reel array**, `paddingPositions` is per-reel strip stops, and the
      `board` is **6×7 with padding embedded** — configure the SDK board for 5 visible + 2 masked
      rows (match `apps/scatter`).
- [ ] **`await` the async emitters** (`broadcastAsync`) for anything with an animation — Eye
      open/combine, banked-mult climb, scatter-pay, max-win — so `sequence()` paces correctly.
- [ ] **`BankedMultiplier` updates only on `setPersistentMult`** — never derive `M` from
      `eyeResolve` alone, or you'll apply it on Eye-less spins.
- [ ] **Normalise single vs multi Eye** in the `eyeResolve` handler (`eyes ?? [{…}]`) so the `Eye`
      component has one code path.

---

_This guide tracks the as-built emitters. If `game_events.py` or the `run_spin`/`run_freespin`
order changes, update this file in the same commit._
