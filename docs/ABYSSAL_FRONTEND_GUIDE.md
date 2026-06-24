# Abyssal — Frontend Integration Guide

This document describes the **Abyssal** slot as built in the Stake Engine math-sdk,
for the team building the game client. It covers the game model, symbols, paytable,
bet modes, the Eye mechanic, and — most importantly — the **event vocabulary**
the frontend renders.

> Source of truth for the math is `games/abyssal/`. This guide reflects the shipped
> 100k build (96% RTP, all modes RGS-compliant).

---

## 1. How the math model works (read this first)

Everything is **precomputed**. The math engine simulated millions of rounds into:

- **Books** — `books_<mode>.jsonl.zst`: each "book" is one predetermined round = an
  ordered list of **events**.
- **Lookup table** — `lookUpTable_<mode>_0.csv`: `simId, weight, payout` — the
  weights the RGS uses to pick a book.

At play time the **RGS picks a book** (by weight) and streams its events to the
client. **The frontend's job is to render the event list** — there is no live game
logic, no RNG on the client. The Eye "build-up and reveal" is a *replay of a
predetermined outcome*.

Files for upload / integration live in `games/abyssal/library/publish_files/`:
```
books_<mode>.jsonl.zst        # event lists
lookUpTable_<mode>_0.csv       # weights
index.json                     # manifest (mode -> files, cost)
```
Plus `library/configs/` (config.json, FE/BE configs, per-mode event_config) and
`library/forces/force.json` (QA: deterministically select specific outcomes).

### Amounts & units
All monetary values in events are **integers in "cents of bet"**, i.e.
`value = win_multiplier × 100`.
- `amount: 1500000` → `15000.00 × bet` (the max win).
- To show a bet-multiple: `amount / 100`.
- To show currency: `(amount / 100) × betAmount`.

`payoutMultiplier` on the book is the round total in the same cents-of-bet units.

---

## 2. Grid & symbols

- **Grid:** 6 reels × 5 rows (30 cells). **Pay-anywhere** (cluster-by-count) with
  **tumbling/cascades**.
- **Win rule:** a paying symbol wins when **8 or more** of its kind are anywhere on
  the board (wilds included in the count). Winning symbols are removed, the rest fall,
  empty cells refill from the top, and the board is re-evaluated. Each winning tumble
  is one **connection**.

| ID | Name | Class | Notes |
|----|------|-------|-------|
| H1 | Anglerfish | High | top payer |
| H2 | Nautilus | High | |
| H3 | Diving Helmet | High | |
| H4 | Jellyfish | High | |
| L1 | Cyan gem | Low | |
| L2 | Teal gem | Low | |
| L3 | Sapphire gem | Low | |
| L4 | Violet gem | Low | |
| W  | Pearl (Wild) | Special | substitutes paying symbols; counts toward clusters; does not pay alone; never Eye/Scatter |
| S  | Conch (Scatter) | Special | triggers Free Spins (≥4); pays nothing; not part of pay-anywhere counts |
| EYE | **The Eye** (Leviathan's Eye) | Special | the Gaze-charged multiplier; **max 1 on board**; not part of pay-anywhere counts |

### Board coordinates & padding
The `reveal` board includes **padding rows**: each reel array has **7 entries** —
index `0` = top padding, indices `1–5` = the 5 **visible** rows, index `6` = bottom
padding. **All `reel`/`row` positions in every event use this padded coordinate
system** (so visible cells are rows 1–5). Reels are `0–5` left→right.

---

## 3. Paytable (× total bet)

Pay grouped into cluster-size bands. Values are final (RGS-snapped to a 0.1 grid).

| Symbol | 8–9 | 10–11 | 12–14 | 15–30 |
|--------|-----|-------|-------|-------|
| H1 | 1.50 | 3.00 | 8.00 | 25.00 |
| H2 | 1.00 | 2.00 | 5.00 | 15.00 |
| H3 | 0.80 | 1.50 | 4.00 | 12.00 |
| H4 | 0.60 | 1.20 | 3.00 | 10.00 |
| L1 | 0.30 | 0.60 | 1.50 | 5.00 |
| L2 | 0.20 | 0.50 | 1.20 | 4.00 |
| L3 | 0.20 | 0.40 | 1.00 | 3.00 |
| L4 | 0.10 | 0.30 | 0.80 | 2.50 |

A single board evaluation can yield **multiple** winning symbols at once (each is its
own entry in `winInfo.wins`).

---

## 4. The Eye (core mechanic)

A single **Eye (EYE)** — the Leviathan's Eye — carries the variety. The cascade
builds the Eye's **Gaze** (a `charge` counter); the Eye then either **adds to** or
**multiplies** it, and that multiplier is applied to the spin's raw win.

### Gaze (charge)
- Every **connection** (winning tumble) adds to the spin's **Gaze**, reported as the
  `charge` field: **+1** in Base / Ante / Free Spins / Super Spins, **+2** in Super Bonus.
- `charge` is effectively the cascade length. Render it building up via `gazeStep`.
  (Internally and in all event payloads the value is named `charge`; "Gaze" is its
  on-screen name.)

### The Eye symbol
At most **one** Eye can be on the board. When present, it reveals:
- **type** ∈ `{ "ADD", "MUL" }`
- **startValue** ∈ `{ 2, 5, 10, 25, 50, 100 }`

(Both are predetermined in the book — the reveal is cosmetic.)

### Resolution (end of the tumble sequence)
```
rawWin = sum of all connection wins this spin        (before the Eye)
if an Eye is present AND rawWin > 0:
    totalMult = startValue + charge      if type == "ADD"
    totalMult = startValue × charge      if type == "MUL"
    spinWin   = min(rawWin × totalMult, 15000 × bet)
else:
    spinWin   = rawWin                   (charge is DISCARDED — no Eye landed)
```
- **No Eye → the charge is lost** and the player just keeps `rawWin`. Most
  winning spins build a charge but **no Eye lands** — this is the intended
  near-miss tension. Render the discarded charge accordingly.
- **ADD** is the common, modest combiner. **MUL** is the rare max-win engine.
- Hard cap: **15,000 × bet**, all modes.

---

## 5. Bet modes

| Mode | Cost (× bet) | Type | Eye / feature behaviour |
|------|--------------|------|------------------------------|
| **base** | 1.0 | default | Eye rare, mostly ADD; charge resets each spin |
| **ante** | 1.25 | toggle | higher Eye + scatter frequency than base |
| **bonus** | 100 | buy | buys Free Spins (the snowball feature) |
| **superspins** | 20 | buy | **one** guaranteed-Eye spin; punchy single shot |
| **superbonus** | 500 | buy | Free-Spins-like but **charge +2**, MUL common — the tail mode |

All modes share the **15,000× max win** and **96% RTP**. (Base/Ante read MEDIUM
volatility; the buy modes read LOW per-cost, which is normal for buys.)

### Free Spins (bonus, and the base/ante feature)
- Triggered by **≥4 Scatter (S)**: 4→10 spins, +2 per extra scatter (5→12, 6→14, …).
- **Scatters land organically (Sweet-Bonanza style) in base/ante.** They appear on the
  initial `reveal` **and inside `tumbleBoard.newSymbols` during cascades**, and they
  **persist** (scatters never explode). The trigger fires when **≥4 are on the board at the
  end of the tumble sequence** — so a spin can show 2–3 scatters and **drop the 4th in mid-
  cascade**. Render scatters dropping in during tumbles, keep a live on-board scatter count,
  and play the trigger when the cascade settles at ≥4. **3 scatters = the anticipation
  "bait"** (see `anticipation`); base/ante spins that don't trigger end at ≤3.
  *(Buy modes show their scatters on the trigger reveal instead.)*
- **Persistent multiplier `M`** starts at ×1. Each spin an Eye lands, its resolved
  value **adds to `M`** (`M += totalMult`), and `M` multiplies **all** subsequent spin
  wins for the rest of the feature (the "snowball"). Surfaced via `setPersistentMult`.
- Charge still builds each spin and feeds each Eye release.
- **Retrigger:** ≥3 Scatter during the feature → +5 spins (+2 per extra).
- Safety cap: a feature never exceeds **50 spins**.

### Super Spins (superspins)
- **Exactly 1 spin**, Eye **guaranteed present**, **no snowball**. A single
  build-and-release. Can still reach 15,000× in the extreme tail.

### Super Bonus (superbonus)
- Like Free Spins but **+2 charge per connection** and **MUL common** → both the
  battery and the multiplier run hot. Snowball `M` applies. The mode that most often
  approaches the cap.

> Per-spin cascades are capped at **20 tumbles** (a safety bound; normal play peaks
> ~10). Frontend doesn't need special handling — it just won't see longer chains.

---

## 6. Event vocabulary (the core of the integration)

Each book is `{ id, payoutMultiplier, criteria, baseGameWins, freeGameWins, events:[…] }`.
Every event has `index` (order) and `type`, plus the fields below. Render them in
order. **All amounts are cents-of-bet (÷100 for ×bet).** All positions are in the
padded coordinate system (§2).

### Reveal / board
| Event | Payload | Meaning |
|-------|---------|---------|
| `reveal` | `board`, `paddingPositions`, `gameType`, `anticipation` | New board drawn. `board` = 6 reels × 7 rows of `{name, …flags}`; symbols may carry `wild:true` / `scatter:true` / `eye:true`. `gameType` = `"basegame"` or `"freegame"`. `anticipation` = per-reel scatter-anticipation hints. |
| `tumbleBoard` | `explodingSymbols:[{reel,row}]`, `newSymbols:[[{name,…}]]` | Remove the exploding cells, drop, and fill with `newSymbols` (per reel, top-down). |

### Wins & charge (one block per connection)
| Event | Payload | Meaning |
|-------|---------|---------|
| `winInfo` | `totalWin`, `wins:[{symbol,count,win,positions:[{reel,row}],meta}]` | The winning symbols of this connection. `count` = symbols in the cluster (incl. wilds), `win` = this symbol's win (cents-of-bet), `meta.overlay` = suggested {reel,row} to show the amount. |
| `updateTumbleWin` | `amount` | Running cumulative win for the current tumble sequence. |
| `gazeStep` | `fromPositions:[{reel,row}]`, `charge` | This connection's energy flows into the Eye's Gaze meter; `charge` is the new total. |

### Eye (end of tumble sequence, only if it lands on a winning spin)
| Event | Payload | Meaning |
|-------|---------|---------|
| `eyeReveal` | `position:{reel,row}`, `eyeType`, `startValue` | The Eye flips to show its type (`ADD`/`MUL`) and start value. `position` is its current (post-tumble) cell. |
| `eyeResolve` | `charge`, `eyeType`, `startValue`, `totalMult` | The release math: `totalMult` = the multiplier applied to the raw win. |
| `setPersistentMult` | `mult` | (Snowball features only.) The persistent multiplier `M` after this spin's Eye was added. Absent in Super Spins. |

### Spin / round settlement
| Event | Payload | Meaning |
|-------|---------|---------|
| `setWin` | `amount`, `winLevel` | Win for this single spin (after the Eye). `winLevel` 1–10 = a band for win-celebration tiers. |
| `setTotalWin` | `amount` | Cumulative round win (equals `setWin` in base; accumulates across a feature). |
| `wincap` | `amount` | Emitted once if the round hits the 15,000× cap; spin/feature stops after. |
| `finalWin` | `amount`, `capped` | Final round payout. `capped:true` flags a 15,000× max-win hit (use for the cap celebration). Always the last money event. |

### Free Spins lifecycle
| Event | Payload | Meaning |
|-------|---------|---------|
| `freeSpinTrigger` | `totalFs`, `positions:[{reel,row}]` | Feature entered. `totalFs` = spins awarded; `positions` = the triggering scatters. |
| `freeSpinRetrigger` | `totalFs`, `positions` | More spins awarded mid-feature; `totalFs` = new running total. |
| `updateFreeSpin` | `amount`, `total` | Spin counter at the start of each feature spin: `amount` = current spin #, `total` = total spins. |
| `freeSpinEnd` | `amount`, `winLevel` | Feature finished; `amount` = total feature win. |

---

## 7. Per-spin event order (what to expect)

**A single base/ante spin:**
```
reveal
  ── per connection (repeats while there's a win, up to 20 tumbles) ──
  winInfo → updateTumbleWin → gazeStep → tumbleBoard
  ────────────────────────────────────────────────────
[ eyeReveal → eyeResolve ]        # only if an Eye landed on a winning spin
setWin
setTotalWin
[ wincap ]                                 # only if 15,000× reached
finalWin                                   # capped: true/false
```
(On a losing spin you get `reveal` then straight to `setTotalWin`/`finalWin` with 0.)

**A buy / feature round** (bonus, superbonus; superspins is the same with one spin):
```
reveal … setWin/setTotalWin            # the trigger spin
freeSpinTrigger (totalFs = N)
  ── for each feature spin ──
  updateFreeSpin (amount=i, total=N)
  reveal … winInfo/gazeStep/tumbleBoard …
  [ eyeReveal → eyeResolve ]
  [ setPersistentMult ]                # snowball features only
  setWin → setTotalWin
  [ freeSpinRetrigger ]                # if ≥3 scatters this spin
  ────────────────────────────
freeSpinEnd (amount = feature total)
finalWin (capped: …)
```

The HUD "TOTAL WIN" counter is driven by `winInfo` / `gazeStep` /
`eyeResolve` / `setTotalWin`.

---

## 8. Worked example (a Base spin that lands an ADD Eye)

```jsonc
{ "type": "reveal", "gameType": "basegame", "board": [...], "anticipation": [...] }
{ "type": "winInfo", "totalWin": 41, "wins": [
    { "symbol": "L2", "count": 9, "win": 18, "positions": [...], "meta": {...} },
    { "symbol": "H4", "count": 8, "win": 23, "positions": [...], "meta": {...} } ] }
{ "type": "updateTumbleWin", "amount": 41 }
{ "type": "gazeStep", "fromPositions": [...], "charge": 1 }
{ "type": "tumbleBoard", "explodingSymbols": [...], "newSymbols": [...] }
{ "type": "winInfo", "totalWin": 30, "wins": [ ... ] }    // 2nd connection
{ "type": "updateTumbleWin", "amount": 71 }
{ "type": "gazeStep", "fromPositions": [...], "charge": 2 }
{ "type": "tumbleBoard", ... }
// no more wins → resolve the Eye
{ "type": "eyeReveal", "position": {"reel":3,"row":3}, "eyeType": "ADD", "startValue": 10 }
{ "type": "eyeResolve", "charge": 2, "eyeType": "ADD", "startValue": 10, "totalMult": 12 }
{ "type": "setWin", "amount": 852, "winLevel": 5 }        // rawWin 0.71 × 12 = 8.52× → 852 cents
{ "type": "setTotalWin", "amount": 852 }
{ "type": "finalWin", "amount": 852, "capped": false }
```
`totalMult = startValue + charge = 10 + 2 = 12`; `spinWin = 0.71 × 12 = 8.52× bet`.

---

## 9. QA / force files

`library/forces/force.json` lets QA deterministically select outcomes by recorded
keys, per mode. Useful keys we record:
- `symbol: "eye"` + `eyeType` + `startValue` + `charge` → a specific Eye
  outcome (e.g. `MUL` / `100` / high charge for the near-max-win animation).
- `symbol: "chargeNoEye"` → the deliberate "big charge, no Eye" near-miss.
- `symbol: "scatter"` + `kind` → a Free Spins trigger with N scatters.
- `criteria: "wincap"` → a 15,000× max-win book.

---

## 10. Quick reference — constants

| Thing | Value |
|-------|-------|
| Grid | 6×5 (positions reported on a 6×7 padded board, visible rows 1–5) |
| Min cluster to pay | 8 of a kind (wilds count) |
| Max win | 15,000× bet (all modes) |
| RTP | 96% (all modes) |
| Eye types | `ADD` (start+charge), `MUL` (start×charge) |
| Eye start values | 2, 5, 10, 25, 50, 100 |
| Charge per connection | +1 (base/ante/bonus/superspins), +2 (superbonus) |
| Free Spins trigger | ≥4 scatter → 10 spins (+2/extra) |
| Free Spins retrigger | ≥3 scatter → +5 spins |
| Max feature length | 50 spins |
| Max cascades / spin | 20 |
| Mode costs | base 1.0, ante 1.25, bonus 100, superspins 20, superbonus 500 |
| Amount units | integer cents-of-bet (÷100 = × bet) |

---

## 11. Game-review scenario event IDs

During game review you'll be asked for an **event ID per scenario, per bet mode**:
*normal win, big win, win cap (max win), loss (zero payout), bonus trigger.*

An "event ID" is simply a **book `id`** — the integer at the top of each book
(`{ "id": N, ... }`), which is the same `simId` listed in
`lookUpTable_<mode>_0.csv`. The RGS replays a round by this id, so you submit a
`(mode, id)` pair for each scenario.

### How to get them
Run the bundled extractor — it scans the current books and prints example ids per
scenario for every mode:
```bash
PYTHONPATH="$PWD" python games/abyssal/find_scenarios.py
```
Win-band thresholds (`NORMAL_MIN/MAX`, `BIG_MIN`) are editable at the top of that
script if the reviewer wants different definitions of "normal" vs "big".

> ⚠️ **IDs are specific to the books currently on disk.** Every fresh simulation run
> produces a new set, so always pull the ids from the exact books you are uploading
> (rerun the script after any regeneration).

### Snapshot (from the shipped 100k build — regenerate for your actual upload)

| Mode | Loss (0×) | Normal win | Big win | Win cap (15,000×) | Bonus trigger |
|------|-----------|-----------|---------|-------------------|---------------|
| base | 0, 3, 4 | 13, 17, 21 | 266 (135×), 1567 (50×), 1767 (60×) | 1020, 1875, 2312 | 1 (9.1×), 11, 19 (46×) |
| ante | 0, 5, 6 | 13, 17, 22 | 266 (135×), 1567 (50×), 1767 (60×) | 1020, 1875, 2312 | 1, 3, 4 |
| bonus | — (always pays) | 0, 1, 3 | 6 (70×), 14 (1067×), 24 (1428×) | 628, 744, 820 | n/a — buy |
| superspins | 1, 24, 29 | 0, 5, 6 | 2 (1170×), 15 (66×), 35 | 1020, 1072, 1875 | n/a — buy |
| superbonus | 34075, 63788 | 3, 5, 9 | 1 (6181×), 6 (10706×), 8 | 2, 7, 66 | n/a — buy |

Notes for the submission:
- **bonus / superbonus have no genuine zero-payout** outcome (buy features always pay
  out), so there is no "loss" scenario to provide for them.
- **Buy modes have no separate "bonus trigger"** — every book *is* a bonus round, so
  any id qualifies.

### Reading a book directly (if you need the raw events for an id)
Books are `.jsonl.zst` (one JSON book per line). Example in Python:
```python
import io, json, zstandard as zstd
def load_book(path, target_id):
    with open(path, "rb") as f:
        with zstd.ZstdDecompressor().stream_reader(f) as r:
            for line in io.TextIOWrapper(r, encoding="utf-8"):
                b = json.loads(line)
                if b["id"] == target_id:
                    return b
# load_book("games/abyssal/library/publish_files/books_base.jsonl.zst", 1020)
```
