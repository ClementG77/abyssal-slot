# Abyssal — Replay Event IDs for Game Review

Book/simulation IDs (the `id` column of `lookUpTable_<mode>_0.csv` = the `id` field of the
book in `books_<mode>.jsonl.zst`) for each required review scenario, per bet mode.

**Source build:** the 1M-sims/mode production run of 2026-07-11 (bonus/superspins lookup
tables from the same-day re-optimize). **These IDs are tied to that exact set of publish
files** — any re-sim or re-optimize changes the books/weights, so re-extract with
[games/abyssal/replay_event_ids.py](games/abyssal/replay_event_ids.py) after any math change.

**Every ID below was machine-verified against the published artifacts:** payout matches the
lookup row, the optimizer weight is > 0 (the outcome is genuinely reachable in play), and the
scenario-defining event is present in the book's event stream (`freeSpinTrigger` for triggers,
`wincap` for max win, zero `finalWin` for losses).

| Mode | Scenario | Event ID | Payout | Verified contents |
|------|----------|---------:|-------:|-------------------|
| **base** (1×) | Loss (zero payout) | **0** | 0.00× | no win events, `finalWin: 0` |
| | Normal win | **16** | 3.40× | simple tumble win, no feature |
| | Big win | **279** | 91.80× | Eye-multiplied win (`eyeResolve`), no feature |
| | Bonus trigger | **8** | 56.20× | `freeSpinTrigger` + `scatterPay` + full 15-spin feature |
| | Win cap (max win) | **4** | 15,000.00× | `wincap` event, capped `finalWin` (via feature) |
| **ante** (1.25×) | Loss (zero payout) | **1** | 0.00× | no win events |
| | Normal win | **16** | 3.40× | simple tumble win, no feature |
| | Big win | **197** | 94.50× | Eye-multiplied win, no feature |
| | Bonus trigger | **0** | 21.10× | `freeSpinTrigger` + `scatterPay` + feature |
| | Win cap (max win) | **4** | 15,000.00× | `wincap` event (via feature) |
| **bonus** (100×) | Loss (zero payout) | *N/A* | — | mode minimum is **3.00×** (guaranteed scatter trigger cash); zero-payout books do not exist |
| | Normal win | **6** | 101.60× | full 15-spin feature + `scatterPay` |
| | Big win | **0** | 583.10× | feature + `scatterPay`, Eye-driven |
| | Bonus trigger | **6** | 101.60× | every bonus book triggers — same ID as normal win (`freeSpinTrigger` verified) |
| | Win cap (max win) | **4** | 15,000.00× | `wincap` inside the feature |
| **superspins** (20×) | Loss (zero payout) | **0** | 0.00× | no win events |
| | Normal win | **1** | 24.00× | single spin, Eye resolved |
| | Big win | **3** | 300.00× | single spin, Eye-multiplied |
| | Bonus trigger | *N/A* | — | no bonus round in this mode (single direct spin by design) |
| | Win cap (max win) | **160** | 15,000.00× | `wincap` on the single spin |
| **superbonus** (500×) | Loss (zero payout) | *N/A* | — | mode minimum is **3.00×** (scatter trigger cash); zero-payout books do not exist |
| | Normal win | **1** | 510.00× | full feature + `scatterPay` |
| | Big win | **41** | 5,341.90× | full feature, snowball-driven |
| | Bonus trigger | **1** | 510.00× | every superbonus book triggers — same ID as normal win |
| | Win cap (max win) | **4** | 15,000.00× | `wincap` inside the feature |
| **ultimate** (300×) | Loss (zero payout) | **0** | 0.00× | ≥2 Eyes shown but no cluster win → pays 0 |
| | Normal win | **48** | 313.20× | single spin, multi-Eye combine (`eyeResolve`) |
| | Big win | **170** | 2,838.00× | single spin, big multi-Eye combine |
| | Bonus trigger | *N/A* | — | no bonus round in this mode (single direct spin by design) |
| | Win cap (max win) | **4** | 15,000.00× | `wincap` on the combine |

## Notes for the reviewer

- **"Loss" on bonus/superbonus:** these buys structurally cannot pay zero — the buy's trigger
  board always lands ≥4 scatters, which pays an instant minimum **3×** cash bonus. The lowest
  possible outcomes are 3.00× books (present in the lookup tables in quantity).
- **"Bonus trigger" on superspins/ultimate:** these are single-direct-spin buy modes with no
  free-spins round, by design; there is no trigger scenario to show.
- Payouts are the raw payout multiplier (× bet). In the lookup CSV / book `payoutMultiplier`
  they appear ×100 (e.g. 3.40× = `340`).

## Re-extracting after a math change

```
PYTHONPATH=$PWD python games/abyssal/replay_event_ids.py <mode>
```
Scans `library/publish_files/lookUpTable_<mode>_0.csv`, picks scenario candidates by payout
band with weight > 0, then streams `books_<mode>.jsonl.zst` and verifies the defining events
before printing the IDs. Run once per mode; update this file with the output.
