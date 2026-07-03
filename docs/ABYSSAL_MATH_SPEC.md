# ABYSSAL — Math Specification (Stake Engine `math-sdk`)

> **As-built** spec for the **Abyssal** slot, implemented in the Stake Engine
> **math-sdk**. Everything is **precomputed**: the SDK simulates millions of rounds into
> _books_ (event lists) + a weighted _lookup table_ (CSV), and at spin time the RGS picks
> a simulation by weight and replays its events. **No live state, no player input** — the
> build-up/reveal of **The Eye** is a _render of a predetermined outcome_.
>
> **Status: built & shipped.** All five modes hit **96% RTP** and pass the RGS format /
> compliance checks (100k books/mode). This document reflects the code in
> `games/abyssal/`, which is the source of truth if anything here drifts.
>
> Companion docs (repo root):
>
> - [ABYSSAL_FRONTEND_GUIDE.md](ABYSSAL_FRONTEND_GUIDE.md) — the event vocabulary &
>   payloads the client renders (the integration contract).
> - [ABYSSAL_PRODUCTION_ROADMAP.md](ABYSSAL_PRODUCTION_ROADMAP.md) — the frontend
>   build/architecture/RGS roadmap.
> - `games/abyssal/analyze_math.py` — prints live RTP / win / volatility / feature stats
>   from the generated lookup tables & books.
>
> **Heritage:** Abyssal was started by copying the SDK **Scatter-Pays** (`0_0_scatter`)
> sample and adding The Eye. Reading that sample is still the fastest way to understand the
> board / tumble / scatter plumbing Abyssal reuses.

---

## 0. What changed from the original design (read if you knew the old spec)

| Was (design)                                             | Is (built)                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "The Lantern" mechanic, symbol `LN`                      | **"The Eye"** (Leviathan's Eye), symbol `EYE`; charge meter named **"Gaze"**                                       |
| Ship a 94% RTP variant too                               | **96% only** — 94% variant explicitly dropped                                                                      |
| Volatility **High**                                      | **MEDIUM** (base/ante); buys read LOW per-cost. HIGH is unreachable on a 15,000× game inside 2★ liability — see §7 |
| Super Spins: 3–5 spins, ~40×                             | **1 spin, cost 20×**, no snowball; reaches the cap via a dense **WCAP** reel + a tumble guard                      |
| Super Bonus ~500×                                        | **500×**, charge +2, MUL common                                                                                    |
| `LN` placed via reel strips                              | **EYE injected post-draw** (override), never on strips → guarantees max-1 and exact per-mode land probability      |
| Paytable seeds 0.25 / 0.16 / 0.32                        | **snapped to the 0.1× grid** (RGS requires every payout `cents % 10 == 0`)                                         |
| Events `chargeStep` / `lanternReveal` / `lanternResolve` | **`gazeStep` / `eyeReveal` / `eyeResolve`** (+ full vocab in §9)                                                   |

---

## 1. Game identity & targets

| Field               | Value                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| Game id / name      | `abyssal`                                                               |
| Grid                | 6 reels × 5 rows (30 cells); padded to 6×7 in events (visible rows 1–5) |
| Win model           | **Pay-anywhere** (count-based), **tumbling** (cascading)                |
| Min win cluster     | **8+ of a kind anywhere** (wilds count)                                 |
| Signature feature   | **The Eye** (cascade-charged single multiplier symbol)                  |
| Max win (all modes) | **15,000× bet** (flat hard cap)                                         |
| RTP                 | **96.0%** (all modes)                                                   |
| Volatility          | **MEDIUM** (base/ante); buy modes LOW per-cost                          |
| Reels               | independent strips per mode + a forced-cap strip                        |

---

## 2. Win model

Pay-anywhere tumbling, same structure as the SDK **Scatter-Pays** sample (6×5,
pay-anywhere, tumble). Abyssal reuses its `board`, `tumble`, and `scatter` calculation
modules (`Scatter.get_scatterpay_wins`).

**Per spin loop**

1. Reveal the board.
2. Evaluate pay-anywhere: for each paying symbol, `count = symbols_on_board + wilds`.
   `count ≥ 8` pays (banded paytable, §4). One evaluation can yield several winning symbols.
3. Winning symbols + participating wilds are removed → **one "connection"**.
4. Remaining symbols fall; empty cells refill from the top.
5. Re-evaluate; repeat until a tumble yields no win (bounded by `max_tumbles_per_spin = 20`).
6. Resolve **The Eye** (§5), then settle the spin.

`connection` = a tumble step that produced a win. The connection count drives the **Gaze
charge** (§5).

---

## 3. Symbols

| ID  | Name            | Class   | Notes                                                                                   |
| --- | --------------- | ------- | --------------------------------------------------------------------------------------- |
| H1  | Anglerfish      | High    | top payer                                                                               |
| H2  | Nautilus        | High    |                                                                                         |
| H3  | Diving Helmet   | High    |                                                                                         |
| H4  | Jellyfish       | High    |                                                                                         |
| L1  | Cyan gem        | Low     |                                                                                         |
| L2  | Teal gem        | Low     |                                                                                         |
| L3  | Sapphire gem    | Low     |                                                                                         |
| L4  | Violet gem      | Low     |                                                                                         |
| W   | Pearl (Wild)    | Special | substitutes paying symbols; counts toward clusters; never pays alone; never Eye/Scatter |
| S   | Conch (Scatter) | Special | triggers Free Spins (≥4); pays nothing; not in pay-anywhere counts                      |
| EYE | **The Eye**     | Special | the Gaze-charged multiplier; **max 1 on board**; not in pay-anywhere counts             |

`config.special_symbols = {"wild":["W"], "scatter":["S"], "eye":["EYE"]}`. The Wild is a
**pure substitute** — the Eye is the _only_ multiplier source.

---

## 4. Paytable (final, `× total bet`)

Pay-anywhere grouped into cluster-size bands. **Final values** (RGS-snapped to the 0.1×
grid; the Eye only ever multiplies by integers so a 0.1-grid base keeps every realized
payout legal). Defined in `game_config.py` as `pay_group`.

| Symbol        | 8–9  | 10–11 | 12–14 | 15–30 |
| ------------- | ---- | ----- | ----- | ----- |
| H1 Anglerfish | 1.50 | 3.00  | 8.00  | 25.00 |
| H2 Nautilus   | 1.00 | 2.00  | 5.00  | 15.00 |
| H3 Helmet     | 0.80 | 1.50  | 4.00  | 12.00 |
| H4 Jellyfish  | 0.60 | 1.20  | 3.00  | 10.00 |
| L1 Cyan       | 0.30 | 0.60  | 1.50  | 5.00  |
| L2 Teal       | 0.20 | 0.50  | 1.20  | 4.00  |
| L3 Sapphire   | 0.20 | 0.40  | 1.00  | 3.00  |
| L4 Violet     | 0.10 | 0.30  | 0.80  | 2.50  |

---

## 5. The Eye (core mechanic)

A **single** Eye carries the variety: the cascade builds a **Gaze** (`charge`); the Eye
then either **adds to** or **multiplies** it, and that multiplier is applied to the spin's
raw win.

### 5.1 Gaze (charge)

- Every **connection** adds to `charge`: **+1** in base/ante/free/superspins, **+2** in
  Super Bonus (`charge_per_connection` + `feature_charge_increment`).
- `charge` ≈ cascade length; rendered building via `gazeStep`.

### 5.2 The Eye symbol — post-draw injection

The Eye is **not on the reel strips**. After the normal board is drawn,
`game_override.maybe_place_eye()` injects (at most) one `EYE` symbol into a free cell, with
probability and attributes drawn from the active distribution's condition tables (§6.1).
This guarantees **max 1 Eye** and gives exact, per-mode control of `p(Eye)`. The Eye never
pays or explodes, so it persists to end-of-tumble. When present it carries:

- **type** ∈ `{ "ADD", "MUL" }`
- **startValue** ∈ `{ 2, 5, 10, 25, 50, 100 }`

### 5.3 Resolution (end of tumble sequence)

```
rawWin = sum of all connection wins this spin          # before the Eye
if Eye present AND rawWin > 0:
    totalMult = startValue + charge      if type == "ADD"
    totalMult = startValue × charge      if type == "MUL"
    spinWin   = min(rawWin × totalMult, 15000 × bet)   # hard cap
else:
    spinWin   = rawWin                                  # charge DISCARDED — no Eye
```

- **No Eye → charge is lost** (player keeps `rawWin`). Most winning spins build a charge
  but no Eye lands — the intended near-miss tension.
- **ADD** = common, modest combiner. **MUL** = rare max-win engine.

### 5.4 Value/rarity philosophy (sets personality; optimizer pins exact weights)

- ADD common with a wide start table; MUL rarer, big-start MUL = the max-win tail.
- Free-game Eyes start **smaller** (the snowball compounds them).
- Super modes use punchier start tables; Super Bonus's MUL tail is **moderately cooled**
  (charge +2 + snowball already run it hot) to keep the raw-cap rate in a range the
  optimizer can weight cleanly.

---

## 6. Bet modes

All modes: 96% RTP, 15,000× cap. Defined in `game_config.py` `bet_modes`.

| Mode           | Cost (× bet) | Type    | Eye / feature behaviour                                          |
| -------------- | ------------ | ------- | ---------------------------------------------------------------- |
| **base**       | 1.0          | default | Eye rare (~1/10 spins), mostly ADD; charge resets each spin      |
| **ante**       | 1.25         | toggle  | higher Eye (~1/7) + scatter frequency than base                  |
| **bonus**      | 100          | buy     | buys Free Spins (the snowball feature)                           |
| **superspins** | 20           | buy     | **one** guaranteed-Eye spin, **no snowball**; punchy single shot |
| **superbonus** | 500          | buy     | Free-Spins-like but **charge +2**, MUL common — the tail mode    |

### 6.1 How a distribution is shaped

Each mode is a `BetMode` with `Distribution` buckets keyed by **criteria**
(`wincap` / `freegame` / `0` / `basegame`), each carrying `conditions`:

- `reel_weights` — which strip per gametype.
- `scatter_triggers` — scatter-count weights used to force/΅shape Free-Spins entry.
- `force_wincap` / `force_freegame` — force a bucket's outcome class.
- **Eye condition tables** (custom): `eye_land_weights`, `eye_type_weights`,
  `eye_start_weights`, each `{basegame: …, freegame: …}`. `maybe_place_eye` reads these.

Two builders in `game_config.py`:

- `base_style_dists(...)` → base/ante: `wincap` (forced cap corner) + `freegame` +
  `0` (zero-win, quota 0.4) + `basegame` buckets.
- `buy_dists(...)` → buy modes: a forced-`freegame` bucket (trigger spin on `BR0`),
  optionally a small forced-`wincap` bucket on a dense reel.

### 6.2 Free Spins (the snowball)

- Trigger: **≥4 Scatter** → `4→10, 5→12, 6→14, …` spins (+2 per extra; `freespin_triggers`).
- **Organic scatters (Sweet-Bonanza style) in base/ante** (`organic_scatter_betmodes`):
  scatters are **not** force-placed on the trigger reveal. The trigger spin draws on the
  scatter-rich **BT0** reel and scatters land on the reveal **and during tumbles**,
  triggering when **≥4 are on board at the end of the sequence**. A spin can show 2–3
  scatters and **draw the 4th in during a cascade**. (Non-trigger books keep ≤3; a mid-tumble
  climb to ≥4 in a non-trigger book is rejected — see §6.5.) **Buy modes keep force-placement**
  (instant feature, fast generation), as does the tiny forced `wincap` corner.
- Persistent multiplier **`M`** starts ×1. Each spin an Eye lands, its resolved value
  **adds to `M`** (`M += totalMult`), and `M` multiplies all subsequent spin wins for the
  rest of the feature (`setPersistentMult`). Snowball runs in
  `snowball_betmodes = {base, ante, bonus, superbonus}`.
- Charge still builds each spin and feeds each Eye.
- **Retrigger:** ≥3 Scatter mid-feature → +5 spins (+2/extra), for
  `retrigger_betmodes = {base, ante, bonus, superbonus}`.
- Hard ceiling: **`max_freespins = 50`**.

### 6.3 Super Spins (single shot)

`fixed_feature_spins = {"superspins": 1}` → **exactly 1 spin**, Eye guaranteed present,
**no snowball**. A single spin can't naturally reach 15,000×, so a small forced **`wincap`**
bucket (`wincap_quota=0.003`) runs the spin on a dense **WCAP** reel (H1+Wild heavy) so one
cascade chain caps. The dense reel would otherwise cascade ~600× and bloat the book, so the
global **`max_tumbles_per_spin = 20`** guard bounds it (normal play peaks ~10, so the guard
never bites real spins).

### 6.4 Super Bonus (high ceiling)

Like Free Spins but **+2 charge/connection** and **MUL common** → both battery and
multiplier run hot. Snowball applies. The mode that most often approaches the cap.

### 6.5 Organic trigger / acceptance model (how base/ante stay consistent)

Bucket consistency is kept by the engine's accept/reject (`repeat`) mechanism rather than by
force-placing scatters:

- **`freegame` bucket** (`force_freegame=True`, `force_wincap=False`): `draw_board` draws
  naturally on **BT0**; the spin is **accepted only if ≥4 scatters land** by end of the
  tumble sequence, else the whole book is **re-rolled** (`gamestate.run_spin`). The realized
  scatter count drives the award (clamped to the table's max key in `update_freespin_amount`).
- **`basegame` / `0` buckets** (`force_freegame=False`): drawn on **BR0**; the initial board
  is redrawn if it already shows ≥4, and any **mid-tumble climb to ≥4 is rejected** via
  `check_freespin_entry` (so accepted non-trigger books carry ≤3 scatters — the 3-scatter
  "bait" near-miss lives here).
- **`wincap` corner & all buy modes** keep **force-placement** (`force_special_board`) — a
  forced-cap or bought feature must trigger deterministically, and organic capping is far too
  rare to generate efficiently.

Cost: the `freegame` bucket re-rolls a few times per accepted book (BT0 is scatter-rich, so
organic ≥4 is common) — modest, unlike the `wincap` corner which is intentionally left forced.

---

## 7. As-built results (shipped 100k/mode build)

Run `python games/abyssal/analyze_math.py` for live numbers; this snapshot is the shipped
build. RTP is exactly 96% in every mode.

Snapshot below = the **organic-scatter** build (2026-06-04), tail-retuned to keep 2★.

| Mode       | Cost | RTP    | Hit rate        | Median win | Volatility      | Max-win odds | Unique payouts |
| ---------- | ---- | ------ | --------------- | ---------- | --------------- | ------------ | -------------- |
| base       | 1.0  | 96.00% | 20.6% (≈1 in 5) | 0×         | **13.7 MEDIUM** | ≈1 in 7.5M   | ~2,700         |
| ante       | 1.25 | 96.00% | 22.6% (≈1 in 4) | 0×         | **14.0 MEDIUM** | ≈1 in 6.0M   | ~3,500         |
| bonus      | 100  | 96.00% | 100%            | ~33×       | 1.86 LOW        | ≈1 in 3.9M   | ~9,400         |
| superspins | 20   | 96.00% | 99.0%           | ~7×        | 1.54 LOW        | ≈1 in 0.75M  | ~1,800         |
| superbonus | 500  | 96.00% | 100%            | ~194×      | 1.45 LOW        | ≈1 in 6.2M   | ~30,200        |

> **Volatility** = std-dev of `payout / cost`. Buy modes are structurally LOW (a big fixed
> cost shrinks per-cost variance) — normal and expected for buys.
>
> **Why not HIGH on base/ante?** Pushing std past ~15–16 lifts the betlevel liability
> (Expected-Tail-Loss at 40×) past the **2★ limit (ETL ≈ 0.800)**. On a 15,000× game,
> **HIGH and 2★ liability are mutually exclusive.** Shipped MEDIUM keeps the game available
> at 2★/3★. (The 3★ door, ETL ≈ 0.900, could allow HIGH as 3★-only if ever revisited.)
>
> **Liability history (ETL 40×, 2★ limit 0.800):** pre-organic build sat at **0.780**; the
> organic-scatter change fattened the far tail to **0.802** (failed 2★); a tail re-tune
> (base/ante `freegame` RTP share 0.62→0.58 & 0.70→0.66, `(2000,15000)` scale 1.6→1.3,
> `max_m2m` 40→32) brought it to **0.791** (2★ "200×" + 3★ "1000×", both pass) **without
> dropping MEDIUM** (std stayed ~14). Margin is ~0.009 — **re-verify ETL 40× < 0.800 on any
> regen** (organic scatters correlate triggers with bigger cascades, so the tail runs hotter
> than the pre-organic build).

---

## 8. Reel strips (`games/abyssal/reels/`, generated by `make_reels.py`)

The Eye is **never** on a strip (it's injected). Strips use per-reel shuffles of a multiset.

| Strip  | Used by                                            | Character                                                                                                                                                                                         |
| ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BR0`  | base/ante non-trigger base spins; buy trigger spin | balanced; lows > highs; W 8, S 5                                                                                                                                                                  |
| `BT0`  | base/ante **freegame trigger** spins (organic)     | BR0 + scatter-rich (S 16) so scatters reach ≥4 across reveal + tumbles (verified: ~median 4 on triggered reveals, ~31% of triggers climb to ≥4 mid-cascade); **tune S vs. trigger/build-up feel** |
| `FR0`  | base/ante/bonus free game                          | a touch more wild (W 10); S **5** (kept low — scatters persist across tumbles so density compounds feature length)                                                                                |
| `SS0`  | Super Spins                                        | no scatter (short set never retriggers); richer highs                                                                                                                                             |
| `SB0`  | Super Bonus                                        | like FR0 (modest scatter for retriggers)                                                                                                                                                          |
| `WCAP` | forced-cap bucket only                             | dense `{H1:150, W:38, H2:20, H3:12, L1:10}` so a single forced spin caps; never in normal play                                                                                                    |

Regenerate with `python games/abyssal/make_reels.py`.

---

## 9. Events vocabulary (the book the frontend renders)

Full payloads, per-spin ordering, and a worked example are in
[ABYSSAL_FRONTEND_GUIDE.md §6–§8](ABYSSAL_FRONTEND_GUIDE.md). Summary of what the math emits
(`game_events.py`):

| Event                          | Key payload                                          | Purpose                                    |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------ |
| `reveal`                       | `board, paddingPositions, gameType, anticipation`    | new board (EYE carries `eye:true`)         |
| `winInfo`                      | `totalWin, wins:[{symbol,count,win,positions,meta}]` | one connection's wins                      |
| `updateTumbleWin`              | `amount`                                             | running cumulative tumble win              |
| `gazeStep` _(custom)_          | `fromPositions, charge`                              | connection energy → Gaze; new charge       |
| `tumbleBoard`                  | `explodingSymbols, newSymbols`                       | remove + refill                            |
| `eyeReveal` _(custom)_         | `position, eyeType, startValue`                      | the Eye flips                              |
| `eyeResolve` _(custom)_        | `charge, eyeType, startValue, totalMult`             | release math                               |
| `setPersistentMult` _(custom)_ | `mult`                                               | snowball `M` (snowball modes only)         |
| `setWin`                       | `amount, winLevel`                                   | single-spin win after the Eye              |
| `setTotalWin`                  | `amount`                                             | round cumulative                           |
| `wincap`                       | `amount`                                             | emitted once if the 15,000× cap is hit     |
| `finalWin` _(custom)_          | `amount, capped`                                     | final settlement; `capped` flags a max-win |
| `freeSpinTrigger`              | `totalFs, positions`                                 | enter feature                              |
| `freeSpinRetrigger`            | `totalFs, positions`                                 | +spins mid-feature                         |
| `updateFreeSpin`               | `amount(current), total`                             | feature spin counter                       |
| `freeSpinEnd`                  | `amount, winLevel`                                   | exit feature                               |

Force-record keys (for QA force files): `symbol:"eye"` (+`eyeType`/`startValue`/`charge`),
`symbol:"chargeNoEye"` (the deliberate near-miss), `symbol:"scatter"`, `criteria:"wincap"`.

---

## 10. SDK directory & files (`games/abyssal/`)

```
games/abyssal/
├─ game_config.py        # GameConfig: grid, paytable, symbols, Eye tables, betmodes/distributions, constants
├─ gamestate.py          # GameState: run_spin / run_freespin tumble loops (bounded), calls resolve_eye
├─ game_executables.py   # tumble + charge + resolve_eye (Eye math, snowball, cap, settle), freespin overrides
├─ game_calculations.py  # eye_total_mult, current_eye_position, free_board_positions
├─ game_override.py       # reset_book/fs, draw_board → maybe_place_eye (post-draw EYE injection + reveal)
├─ game_events.py         # all event constructors (gazeStep/eyeReveal/eyeResolve/setPersistentMult/finalWin/…)
├─ game_optimization.py   # OptimizationSetup: per-mode opt_params (RTP shares, scaling, m2m bands, fence bias)
├─ make_reels.py          # generates reels/BR0,FR0,SS0,SB0,WCAP.csv (EYE never on strips)
├─ reels/                 # the generated strips
├─ run.py                 # pipeline: sims → configs → Rust optimizer → analytics → format checks (+ timing)
├─ find_scenarios.py      # prints example book ids per review scenario, per mode
├─ analyze_math.py        # math stats report (RTP/win/volatility/distribution + Eye/feature metrics)
└─ library/               # GENERATED: books_*.jsonl.zst, lookUpTable_*_0.csv, configs/, forces/, publish_files/
```

Class chain: `GameConfig(Config)` → `GameState(GameStateOverride)` →
`GameStateOverride(GameExecutables)` → `GameExecutables(GameCalculations)` →
`GameCalculations(Executables)` → `Executables(Conditions, Tumble)`.

---

## 11. Key config constants (`game_config.py`)

| Field                             | Value                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| `wincap`                          | `15000.0`                                                    |
| `rtp`                             | `0.96`                                                       |
| `num_reels` / `num_rows`          | `6` / `[5]*6`                                                |
| `special_symbols`                 | `{wild:[W], scatter:[S], eye:[EYE]}`                         |
| `eye_symbol` / `eye_start_values` | `"EYE"` / `[2,5,10,25,50,100]`                               |
| `charge_per_connection`           | `{basegame:1, freegame:1}`                                   |
| `feature_charge_increment`        | `{superbonus:2}`                                             |
| `snowball_betmodes`               | `{base, ante, bonus, superbonus}`                            |
| `retrigger_betmodes`              | `{base, ante, bonus, superbonus}`                            |
| `fixed_feature_spins`             | `{superspins:1}`                                             |
| `organic_scatter_betmodes`        | `{base, ante}` (Sweet-Bonanza organic triggers; buys forced) |
| `max_freespins`                   | `50`                                                         |
| `max_tumbles_per_spin`            | `20`                                                         |
| `freespin_triggers` (base)        | `{4:10,5:12,6:14,7:16,8:18,9:20,10:22}`                      |
| `freespin_triggers` (free)        | `{3:5,4:7,5:9,6:11,7:13,8:15,9:17,10:19}`                    |

---

## 12. Distributions & optimization

- The SDK's **Rust optimizer** (`OptimizationExecution.run_all_modes`) assigns per-simulation
  lookup-table weights so realized RTP/volatility match targets. We set the _shape_; it pins
  the weights.
- `game_optimization.py` `opt_params` per mode (RTP shares must sum to the mode RTP;
  `verify_optimization_input` asserts this):
  - **base** — `wincap` 0.002 (av_win 15000), `0` 0, `freegame` 0.62 (hr 180),
    `basegame` 0.338 (hr 5.0); m2m band 8–40; scaling pulls weight off small base wins
    onto the tail; fence bias on basegame.
  - **ante** — `wincap` 0.002, `freegame` 0.70 (hr 120), `basegame` 0.258 (hr 4.6); m2m 8–40.
  - **bonus** — `freegame` 0.96.
  - **superspins** — `wincap` 0.001 (av_win 15000), `freegame` 0.959.
  - **superbonus** — `freegame` 0.96.
- Base/ante carry RTP into the feature tail (drier base game) to push volatility as high as
  the 2★ liability ceiling allows (§7).

---

## 13. Force files & testing

`library/forces/force.json` lets QA deterministically pick outcomes by recorded keys, per
mode (see §9 for the keys). Useful scenarios: a big-MUL/high-charge Eye (near-max-win
animation), a `chargeNoEye` near-miss, a 4-scatter Free-Spins trigger, a `wincap` book.

For game review, `find_scenarios.py` prints example **book ids** per scenario (normal win,
big win, win cap, loss, bonus trigger) for every mode — see
[ABYSSAL_FRONTEND_GUIDE.md §11](ABYSSAL_FRONTEND_GUIDE.md). **IDs are specific to the books
on disk; rerun after any regeneration.**

---

## 14. Build & run

Run from the repo root **with `PYTHONPATH` set to the repo root** (this machine has an
editable `src` install pointing at a sibling repo, so PYTHONPATH must win):

```powershell
# Windows PowerShell — full pipeline (sims → optimize → analytics → format checks)
$env:PYTHONPATH = (Get-Location); $env:ABYSSAL_THREADS = "8"; python games/abyssal/run.py
```

```bash
# bash
PYTHONPATH="$PWD" ABYSSAL_THREADS=8 python games/abyssal/run.py
```

`run.py` knobs: `num_sim_args` (books/mode; must divide `threads × 10000` for large runs),
`ABYSSAL_THREADS`, `run_conditions` (toggle sims / optimization / analysis / format checks).
Set `run_sims=False` to re-optimize existing books only. Outputs land in
`library/` and `library/publish_files/` (the upload set: `books_<mode>.jsonl.zst`,
`lookUpTable_<mode>_0.csv`, `index.json`). A timing summary prints at the end.

Analyze the result: `python games/abyssal/analyze_math.py [--books] [--json out.json]`.

---

## 15. Gotchas (fixed — don't reintroduce)

- **PYTHONPATH** must point at the repo root, or `import src` loads a sibling repo's editable
  install.
- **0.1× grid:** every lookup payout must satisfy `cents % 10 == 0`
  (`verify_lookup_format`). Paytable seeds 0.25/0.16/0.32 violated it → snapped to
  0.20/0.10/0.30. The Eye multiplies only by integers, so a 0.1-grid base keeps all payouts
  legal. **Any paytable/math change requires a full RE-SIM** (payouts are baked into books),
  not just a re-optimize.
- **Re-sim after the Lantern→Eye rename:** event-type strings are baked into books. Books
  generated before the rename carry `chargeStep`/`lantern*`; regenerate before upload.
  (`analyze_math.py --books` warns if it sees legacy event names.)
- **All modes must be simmed together:** `generate_configs` iterates every betmode expecting
  a lookup table for each.
- **Single-thread sidecar:** `src/state/state.py run_sims` resets `_payout_ints` per mode so
  single-thread multi-mode runs produce correct verification sidecars (multi-thread was
  always fine).
- **Max-win achievability:** base/ante need their forced `wincap` bucket, and Super Spins
  needs the `WCAP` reel + tumble guard, or the 15,000× max is statistically unreachable and
  the RGS check fails.
