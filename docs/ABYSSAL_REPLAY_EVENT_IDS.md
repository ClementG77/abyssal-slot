# Abyssal — Replay Event IDs for Game Review

Book/simulation IDs (the `id` column of `lookUpTable_<mode>_0.csv` = the `id` field of the
book in `books_<mode>.jsonl.zst`) for each required review scenario, per bet mode.

**Source build:** the **1,000,000-sims/mode PRODUCTION run of 2026-07-18** — fully compliant
on the Stake Engine ACP (2★ + 3★), 96.00% RTP per mode, 15,000× reachable. Includes the
max-win **story-flavor system** (each forced cap rolls one archetype).

**Every ID below was machine-verified against the published artifacts:** payout matches the
lookup row, optimizer weight > 0 (genuinely reachable in play), and the scenario-defining
event is present in the book's event stream.

## Required scenarios

| Mode | Scenario | Event ID | Payout | Verified contents |
|------|----------|---------:|-------:|-------------------|
| **base** (1×) | Loss (zero payout) | **0** | 0.00× | no win events |
| | Normal win | **16** | 3.40× | simple tumble win, no feature, no Eye |
| | Big win | **279** | 91.80× | Eye-multiplied win (1 Eye + 1 drop) |
| | Bonus trigger | **8** | 56.20× | `freeSpinTrigger` + `scatterPay` + 15-spin feature |
| | Win cap (max win) | **4** | 15,000.00× | RAIN flavor — 4 Eyes, 3 drops, Gaze 28 |
| **ante** (1.25×) | Loss (zero payout) | **1** | 0.00× | no win events |
| | Normal win | **16** | 3.40× | simple tumble win |
| | Big win | **197** | 94.50× | Eye-multiplied win (2 Eyes) |
| | Bonus trigger | **0** | 21.10× | `freeSpinTrigger` + `scatterPay` |
| | Win cap (max win) | **260** | 15,000.00× | NUKE flavor — 3 pure-MUL Eyes, Gaze 2, instant |
| **bonus** (100×) | Loss (zero payout) | *N/A* | — | min win 3.00× (scatter floor); no zero books |
| | Normal win | **6** | 101.60× | full feature + `scatterPay`, 5 Eyes |
| | Big win | **0** | 583.10× | feature, 3 Eyes + 3 drops |
| | Bonus trigger | **6** | 101.60× | every buy triggers — same as normal win |
| | Win cap (max win) | **1799** | 15,000.00× | RAIN flavor — 6 Eyes, 3 drops, Gaze 30 |
| **superspins** (20×) | Loss (zero payout) | **0** | 0.00× | no win events |
| | Normal win | **1** | 24.00× | single spin, Eye resolved |
| | Big win | **3** | 300.00× | single spin, Eye-multiplied |
| | Bonus trigger | *N/A* | — | single-spin mode, no feature |
| | Win cap (max win) | **1816** | 15,000.00× | TWIN flavor — 4 Eyes (3 MUL), Gaze 30 |
| **superbonus** (500×) | Loss (zero payout) | *N/A* | — | min win 3.00× (scatter floor); no zero books |
| | Normal win | **1** | 510.00× | full feature + `scatterPay`, 3 Eyes |
| | Big win | **41** | 5,341.90× | full feature, snowball-driven, 2 Eyes |
| | Bonus trigger | **1** | 510.00× | every buy triggers — same as normal win |
| | Win cap (max win) | **11027** | 15,000.00× | NUKE flavor — 4 Eyes (3 MUL), Gaze 30 |
| **ultimate** (300×) | Loss (zero payout) | **0** | 0.00× | ≥2 Eyes shown, no cluster win → pays 0 |
| | Normal win | **48** | 313.20× | single spin, 3-Eye combine |
| | Big win | **170** | 2,838.00× | single spin, big 3-Eye combine |
| | Bonus trigger | *N/A* | — | single-spin mode, no feature |
| | Win cap (max win) | **4** | 15,000.00× | MEGA flavor — 5-Eye mega-combine, Gaze 30 |

## Extra: max-win STORY FLAVORS (multiple distinct max-win scenarios per mode)

Each mode's forced cap rolls one weighted archetype, so the same mode reaches 15,000× via
visibly different routes. Any of these can be replayed as that mode's max win:

| Mode | Flavor | ID | Signature (Eyes / MUL / drops / Gaze) |
|------|--------|---:|----------------------------------------|
| **base** | RAIN | **4** | 4 Eyes / 2 MUL / 3 drops / Gaze 28 — Eyes pour in mid-cascade |
| | CASCADE | **1010** | 4 Eyes / 1 MUL / 3 drops / Gaze 30 — Gaze + connections carry it |
| | NUKE | **4013** | 2 Eyes / 2 MUL / 0 drops / Gaze 30 — big MULs detonate |
| **ante** | RAIN | **4** | 4 Eyes / 2 MUL / 3 drops / Gaze 28 |
| | NUKE | **260** | 3 Eyes / 3 MUL / 0 drops / Gaze 2 — instant pure-MUL detonation |
| | MARATHON | **1010** | 5 Eyes / 1 MUL / 4 drops / Gaze 30 — many small Eyes |
| **bonus** | NUKE | **4** | 2 Eyes / 2 MUL / 0 drops / Gaze 5 |
| | RAIN | **1799** | 6 Eyes / 2 MUL / 3 drops / Gaze 30 |
| | CASCADE | **4229** | 3 Eyes / 1 MUL / 0 drops / Gaze 30 |
| **superspins** | LONE | **164** | 3 Eyes / 3 MUL / 2 drops / Gaze 30 — few big Eyes |
| | RAIN | **378** | 3 Eyes / 0 MUL / 2 drops / Gaze 30 — all-ADD |
| | TWIN | **1816** | 4 Eyes / 3 MUL / 2 drops / Gaze 30 |
| **superbonus** | RAIN | **4** | 4 Eyes / 2 MUL / 3 drops / Gaze 30 |
| | MARATHON | **1799** | 7 Eyes / 3 MUL / 3 drops / Gaze 30 — many small Eyes, caps spin 3 |
| | NUKE | **11027** | 4 Eyes / 3 MUL / 1 drop / Gaze 30 |
| **ultimate** | MEGA | **4** | 5 Eyes / 1 MUL / 0 drops / Gaze 30 — the mega-combine |
| | NUKE | **260** | 4 Eyes / 4 MUL / 1 drop / Gaze 30 — all-MUL |
| | RAIN | **787** | 3 Eyes / 2 MUL / 2 drops / Gaze 30 |

## Notes for the reviewer

- **"Loss" on bonus/superbonus:** these buys structurally cannot pay zero — the trigger board
  always lands ≥4 scatters, paying an instant minimum **3×** cash bonus.
- **"Bonus trigger" on superspins/ultimate:** single-direct-spin buy modes, no free-spins round.
- Payouts are the raw multiplier (× bet). In the lookup CSV / book `payoutMultiplier` they
  appear ×100 (e.g. 3.40× = `340`).

## Re-extracting after a math change

```
PYTHONPATH=$PWD python games/abyssal/replay_event_ids.py <mode> [min_cap_eyes]   # standard scenarios
```
Per-flavor cap IDs come from `library/forces/force_record_<mode>.json` (search key
`wincapFlavor` → `bookIds`); verify each with `games/abyssal/cap_stories.py` /
`verify_flavors`. Run once per mode; update this file with the output.
