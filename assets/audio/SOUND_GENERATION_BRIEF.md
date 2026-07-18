# Abyssal — Sound-Prompt Generation Brief (meta-prompt)

Paste everything below into an LLM. It will return ready-to-use ElevenLabs Text-to-Sound-Effects
prompts for every sound in the game.

---

You are an expert game sound designer writing prompts for the **ElevenLabs Text-to-Sound-Effects**
model. Your job: for each sound in the list at the end, output **3 short prompt variations** plus a
recommended **duration** and whether it **loops**. First read all the context and rules — they are
non-negotiable and were learned the hard way.

## 1. The game

**Abyssal** is a deep-sea online slot (a "tumbling"/cascade slot, 6×5 grid, pay-anywhere, clusters of
8+). It's a real-money commercial casino game. Visual/quality benchmark: *Gates of Olympus*. Max win
15,000×. The world is the **crushing deep ocean and an ancient LEVIATHAN / sea-dragon** that slumbers
there. Mood: mysterious, awe-inspiring, treasure-hunting adventure — **wonder and excitement, not
horror**. Bioluminescence, pressure, ancient magic, gold, and a giant watching **Eye**.

**Sound-world reference feel:** modern premium slot studios — **Hacksaw Gaming, Valkyrie, Terminal
Games**. That means **punchy, juicy, crisp, snappy, satisfying, slightly electronic/arcade** game
feedback — NOT long cinematic orchestral scores. Think "video game", not "movie trailer". But keep it
**warm and deep** (it lives underwater), tuned to the Abyssal theme.

## 2. The features (what makes noise, and why it matters)

- **Tumbling cascades:** winning symbol clusters burst and new symbols drop in. Happens constantly.
- **The Gaze / Essence meter:** winning clusters charge a meter that laps through colour bands
  (teal → purple → ember). Reaching/lapping a band is a rewarding milestone.
- **The Eye (the hero feature):** a giant magical Eye **drops onto the board like a BOMB** — it must
  grab the player's attention. It then **opens** as one of two types:
  - **ADD eye (cyan/blue)** — adds to the multiplier. Common, smaller, **less important** → lighter sound.
  - **MUL eye (red)** — multiplies. Rare, the **big valuable payoff** → bigger, more dramatic sound.
  In the "Ultimate" mode **2–5 Eyes** appear and open one after another (~0.7 s apart), then all their
  values **combine** into one multiplier that **bursts** onto the win. Each eye must be individually audible.
- **Snowball multiplier:** during free spins a banked multiplier climbs each Eye spin.
- **Scatter symbols = the Leviathan.** Landing them builds toward the bonus; 4/5/6 pay 3×/5×/100×.
  While another trigger scatter can still land, the screen **dims and zooms in** (anticipation).
- **Free Spins / Super Spins / Ultimate / Super Bonus** modes, and win-tier celebrations
  (nice → big → mega → epic → **max**; max = the 15,000× **ruby-dragon** moment).

## 3. Prompt-writing RULES (these were learned by trial and error — obey them)

1. **KEEP PROMPTS SHORT AND NATURAL — 3 to 12 words.** Format: *material/instrument + gesture + mood*
   (e.g. "juicy bubble pop, bright and satisfying"). **Long, over-specified prompts (hertz values,
   millisecond counts, "no bass no highs" lists) make the model output ROBOTIC, synthetic garbage.**
   Do not do that. Duration is controlled by a separate slider, never state it inside the text.
2. **Prefer CONCRETE, physical/foley gestures** — "bomb drop", "dragon breath", "water whoosh", "coin
   pop", "monster bell", "power-up". These render far better than abstract musical descriptions like
   "warm major seventh chord", which come out lifeless.
3. **One coherent sound WORLD.** Everything shares a palette: deep water, bubbles, glass/crystal,
   bioluminescence, ancient magic, treasure/coins, low drums — rendered with **arcade punch**.
4. **Punchy & juicy, never harsh or shrill.** Big moments get bigger by being **deeper, longer, and
   more layered — not sharper or more piercing.** Reserve genuine darkness/menace for the **red MUL
   eye** only; even it is deep, not a scream.
5. **ADD < MUL** everywhere (reveal and combine): ADD = small, soft, light, quick; MUL = big, deep,
   dramatic, the payoff.
6. **Mixing hierarchy** (note it, the human sets levels later): impacts/wins are loud and forward; UI
   clicks and count-up ticks are quiet and thin (they fire constantly); ambience is nearly silent.
7. **Loops** (marked below) must be **seamless** — say "seamless loop, no fade" and avoid a hard
   transient at the start.
8. Each sound must be **identifiable blind** — distinct character per event.

## 4. OUTPUT FORMAT

For every sound below output exactly:

```
sfx_name  —  duration: X s  ·  loop: yes/no
  1. <prompt variation one>
  2. <prompt variation two>
  3. <prompt variation three>
```

Do not add commentary. Just the blocks.

## 5. THE SOUNDS TO CREATE

> Already finalized — DO NOT generate (listed for context only): `bgm_main`, `bgm_freespin`, `bgm_win`
> (music, made separately), and the validated `sfx_btn_general`, `sfx_btn_spin`, `sfx_reel_stop`.

Generate prompts for these:

**UI / feedback**
- `sfx_cluster_win` — a winning cluster bursts (fires on most spins, very often) — juicy abyssal
  bubble/coin pop, bright and satisfying, short. dur ~0.4 s.

**Scatter & feature (Leviathan)**
- `sfx_scatter_land` — a Leviathan scatter symbol lands — deep punchy monster bell / stirring sea
  beast, ominous but exciting. dur ~1 s.
- `sfx_anticipation` — LOOP while another trigger scatter can still land, under a screen dim + zoom —
  a rumbling **dragon-breath / giant-beast-breathing** tension riser, building. dur ~6 s, loop.
- `sfx_scatter_win` — the scatter cash pay lands (3×/5×/100×) — bright juicy rewarding treasure hit.
  dur ~1.2 s.
- `sfx_fs_intro` — the bonus triggers, fanfare over the intro card — exciting punchy feature-start
  jingle rising up. dur ~3.5 s.

**The Eye & Gaze (the hero feature)**
- `sfx_eye_land` — an Eye **DROPS onto the board like a bomb** — whistling fall into a deep punchy
  booming impact; must grab attention. dur ~1 s.
- `sfx_eye_reveal_add` — the cyan **ADD** eye opens — SMALL, light, quick, friendly. dur ~0.5 s.
- `sfx_eye_reveal_mul` — the red **MUL** eye opens — BIG, deep, dramatic, powerful (the rare valuable
  one). dur ~0.8 s.
- `sfx_eye_combine_add` — an ADD value folds into the running multiplier — small quick juicy pop. dur ~0.4 s.
- `sfx_eye_combine_mul` — a MUL value folds in — bigger, deep, heavy punchy hit. dur ~0.5 s.
- `sfx_eye_burst` — all the eyes' values resolve into the final multiplier and burst onto the win —
  the biggest SFX in the game, a huge juicy magical explosion. dur ~1.2 s.
- `sfx_gaze_full` — the Gaze meter laps into its next colour band (a milestone; can fire a few times
  in a big step) — a bright satisfying "charge complete" power-up. dur ~0.8 s.
- `sfx_snowball_up` — the banked multiplier climbs a step (free spins) — quick juicy rising power-up
  blip. dur ~0.4 s.

**Wins & transitions**
- `sfx_countup_loop` — the win amount rolls up — a fast arcade coin tally that **rises in pitch** as
  the number climbs; light, no heavy bass. dur ~8 s (one-shot that resolves; not a seamless loop).
- `sfx_win_nice` — smallest win-tier stinger — short bright cheerful arcade win. dur ~1.2 s.
- `sfx_win_big` — big win — punchy triumphant juicy win. dur ~1.5 s.
- `sfx_win_mega` — mega win — energetic exciting bigger fanfare. dur ~2 s.
- `sfx_win_epic` — epic win — huge over-the-top arcade victory. dur ~2.5 s.
- `sfx_win_max` — the 15,000× MAX WIN, the ruby-**dragon** moment — a massive triumphant jackpot
  fanfare with a **dragon roar**, nothing bigger. dur ~3.2 s. (The five win tiers should feel like ONE
  escalating family — same character, each bigger/deeper/longer than the last.)
- `sfx_transition` — a wall of water sweeps the screen on a scene change — quick deep water whoosh /
  arcade swipe. dur ~1.5 s.

**Atmosphere (optional)**
- `amb_underwater` — a near-silent ambient bed under the base music — calm deep-ocean bubbling with
  faint distant Leviathan groans, seamless loop. dur ~25 s, loop.

Now output the prompt blocks for every sound in section 5 (except the finalized ones).
