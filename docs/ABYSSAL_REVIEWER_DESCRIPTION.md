# Abyssal — Game Description for the Reviewing Team

## Overview

**Abyssal** is a deep-sea **tumbling (cascading) slot** on a **6×5 grid (6 columns, 5 rows),
pay-anywhere**. Wins pay whenever **8 or more of the same symbol** land anywhere on the board —
no lines, no ways. Winning symbols are removed, symbols above fall to fill the gaps, and new
symbols drop in from the top (a **tumble**), which can chain multiple wins from a single spin.
The benchmark for feel and pacing is **Gates of Olympus**.

- **RTP:** 96.00% on every mode (validated, fully compliant on the Stake Engine ACP — 2★ + 3★).
- **Max win:** 15,000× the bet, reachable on every mode.
- **Win spread:** continuous 0 → 15,000× on every mode (no gaps — intermediate amounts such as
  7,000× or 10,000× genuinely occur, not only the headline cap).
- **Volatility:** High on Base & Ante (~28% of base spins pay, ~30% on Ante); the buy modes are
  tail-heavy (small per-spin wins, rare very large ones).

## Symbols & paytable

- **4 high-pay symbols:** Anglerfish (top), Nautilus, Diving Helmet, Jellyfish.
- **5 low-pay symbols:** Cyan, Teal, Sapphire, Violet and Aqua gems.
- **Conch (Scatter):** does not pay a symbol win — triggers Free Spins (and pays instant cash).
- **The Eye:** the multiplier feature (below). **There is no Wild** — the Eye is the sole
  multiplier, in the Gates-of-Olympus structure.

Payouts use 3 size bands (8–9 / 10–11 / 12+ symbols); more symbols = larger pay. Top symbol
(Anglerfish) pays up to 50× at 12+; the paytable is a 4-high / 5-low Gates-of-Olympus layout.

## Core feature — The Gaze + The Eye

Two mechanics work together and are the heart of the game.

**The Gaze (charge meter).** Every winning **cluster** charges the Gaze with **Essence**, graded
by cluster size: **+2** (8–9), **+3** (10–11), **+5** (12+). Multiple clusters on one drop each
charge; every tumble in a chain keeps adding. The meter caps at **30**. Bigger and longer wins
build a bigger Gaze.

**The Eye.** An Eye can appear when the board fills **or drop in mid-tumble while cascading**
(like the orbs in Gates of Olympus). Several can gather on one spin and all combine at the end.
Each Eye has a **type** — **ADD** or **MULTIPLY** — and a **starting number** (2, 5, 10, 25, 50,
100; small values weighted, 100 is the rare jackpot Eye).

At the **end of a winning spin**, if at least one Eye is present, the Eye(s) combine with the
Gaze into a single multiplier applied to everything won that spin:

- **ADD Eye:** multiplier = starting number **+** Gaze (common, gentle).
- **MULTIPLY Eye:** multiplier = starting number **×** Gaze (rare, explosive — drives top wins).

**Near-miss tension:** a spin can build a Gaze but never catch an Eye, in which case the Gaze is
lost and the normal win stands. Because an Eye can still drop on any tumble, a spin is never
"dead" while it is still cascading.

## Free Spins (bonus round)

- **Trigger:** land **4+ Conch scatters**. Scatters can land as the board tumbles, so partial
  counts can complete mid-cascade (Sweet-Bonanza style); 3 scatters is a near-miss.
- **Instant scatter cash:** the trigger pays immediately by scatter count — **4 = 3×, 5 = 5×,
  6 = 100×** the bet — on top of the spin and unaffected by the Eye. This also applies when the
  feature is **bought**, so every buy pays at least its scatter floor.
- **Award:** a flat **15 free spins** regardless of scatter count.
- **The Snowball (banked multiplier, Gates-of-Olympus style):** starts at ×1 and carries across
  the whole feature, paying off on spins where an Eye lands. ADD Eyes add `(Gaze + number)` to
  the bank (gentle climb); MULTIPLY Eyes multiply the Gaze by their number and add that (big
  jumps). A spin with no Eye pays its normal win; the bank only ever grows. Eyes land ~1 spin in 5.
- **Retrigger:** 3+ scatters again during the feature awards **+5 spins** (feature max 30 spins).

## The six bet modes

| Mode | Cost | Summary |
|------|------|---------|
| **Base** | 1× | Standard game. ~2 in 7 spins pay; an Eye ~1 in 7 spins, mostly ADD. |
| **Ante** | 1.25× | Same game, +25% cost, bonus triggers ~2× as often, Eyes ~1 in 5. |
| **Buy Free Spins** | 100× | Buys the Free Spins feature directly; trigger scatters still pay their instant cash (every buy pays ≥3×). |
| **Super Spins** | 20× | One single spin with a guaranteed Eye (more can drop mid-tumble). No free-spins round, no counter. |
| **Super Bonus** | 500× | Supercharged Free Spins — Gaze charges at **double Essence** (+4/+6/+10), Eyes land often; the mode that most often chases the cap. Scatters pay their cash too. |
| **Ultimate** | 300× | One spin with **always 2–5 Eyes** (more can drop in) that all combine. High-variance: most spins net a loss, a big combine pays up to 15,000×. |

## Client / presentation notes

- The client is a pure **renderer of the math's book events** — it never computes outcomes.
  All results, RTP and the 15,000× cap are owned and fixed by the shipped math (6 modes).
- Built on the Stake Engine web SDK (`pixi-svelte` / PixiJS 8). Runs on the full Stake device
  matrix (desktop, laptop, popout, and mobile portrait); verified on iOS Safari.
- Custom feature visuals: the **Gaze meter**, **The Eye** (ADD/MULTIPLY reveal + combine), the
  **Snowball** banked multiplier, and the **scatter-pay** presentation. All numbers on screen are
  driven by the book; nothing is client-authored.
- Localised copy across all supported locales; a social-casino (Stake.US) build variant enforces
  English-only, restricted-word-free copy.

---

## Replay Event IDs (review requirement)

Book/simulation IDs for each required review scenario, per bet mode. The `id` value is the `id`
column of `lookUpTable_<mode>_0.csv` / the `id` field of the book in `books_<mode>.jsonl.zst`.

**Source build:** the 1,000,000-sims/mode production run of **2026-07-18** — 96.00% RTP per mode,
15,000× reachable, fully ACP-compliant. Every ID below was machine-verified (payout matches the
lookup row, optimizer weight > 0, and the scenario-defining event is present in the book).

| Mode | Scenario | Event ID | Payout |
|------|----------|---------:|-------:|
| **Base** (1×) | Loss (zero) | **0** | 0.00× |
| | Normal win | **16** | 3.40× |
| | Big win | **279** | 91.80× |
| | Bonus trigger | **8** | 56.20× |
| | Win cap (max win) | **4** | 15,000.00× |
| **Ante** (1.25×) | Loss (zero) | **1** | 0.00× |
| | Normal win | **16** | 3.40× |
| | Big win | **197** | 94.50× |
| | Bonus trigger | **0** | 21.10× |
| | Win cap (max win) | **260** | 15,000.00× |
| **Buy Free Spins / Bonus** (100×) | Loss (zero) | *N/A* | — |
| | Normal win | **6** | 101.60× |
| | Big win | **0** | 583.10× |
| | Bonus trigger | **6** | 101.60× |
| | Win cap (max win) | **1799** | 15,000.00× |
| **Super Spins** (20×) | Loss (zero) | **0** | 0.00× |
| | Normal win | **1** | 24.00× |
| | Big win | **3** | 300.00× |
| | Bonus trigger | *N/A* | — |
| | Win cap (max win) | **1816** | 15,000.00× |
| **Super Bonus** (500×) | Loss (zero) | *N/A* | — |
| | Normal win | **1** | 510.00× |
| | Big win | **41** | 5,341.90× |
| | Bonus trigger | **1** | 510.00× |
| | Win cap (max win) | **11027** | 15,000.00× |
| **Ultimate** (300×) | Loss (zero) | **0** | 0.00× |
| | Normal win | **48** | 313.20× |
| | Big win | **170** | 2,838.00× |
| | Bonus trigger | *N/A* | — |
| | Win cap (max win) | **4** | 15,000.00× |

**Notes on the "N/A" cells:**

- **Loss on Buy Free Spins / Super Bonus:** these buys cannot pay zero — the trigger board always
  lands ≥4 scatters, paying an instant minimum **3×** scatter cash. There is no zero-payout book.
- **Bonus trigger on Super Spins / Ultimate:** these are single-direct-spin buy modes with no
  free-spins round, so there is no separate bonus-trigger scenario.

Payouts above are the raw multiplier (× bet); in the lookup CSV / book `payoutMultiplier` they
appear ×100 (e.g. 3.40× = `340`).
