# Abyssal — Sound/Music Implementation Handoff

Paste this into a new chat to continue the sound work with full context.

---

You are continuing the **audio implementation** for **Abyssal**, a deep-sea *tumbling* slot in a
`pixi-svelte` monorepo. Working dir: `apps/abyssal` inside `.../lantern/front/web-sdk`. Verify changes
in the running app on **localhost:3002** (`pnpm run dev --filter=abyssal`). Read
`docs/ABYSSAL_SOUND_DESIGN.md` and `assets/audio/SOUND_GENERATION_BRIEF.md` for the full spec.

## The game (context for sound design)
Deep ocean + an ancient **Leviathan / sea-dragon**. Mood: mysterious, awe, treasure adventure — wonder,
NOT horror. Features that make sound: tumbling cascades; a **Gaze/Essence meter** (orbs charge it, laps
colour bands); **the Eye** (a giant Eye **drops like a bomb**, opens as **ADD (cyan, small/common)** or
**MUL (red, big/rare payoff)**, Ultimate has 2–5 eyes that combine + burst); snowball multiplier;
**scatter = the Leviathan** (dim+zoom anticipation, 4/5/6 pay 3×/5×/100×); win tiers nice→big→mega→epic→
**max** (max = 15,000× ruby-dragon). Reference feel: **Hacksaw / Valkyrie / Terminal Games** — punchy,
juicy, arcade, but warm & deep (underwater).

## Architecture (how sound is wired)
```
book event → bookEventHandlerMap → eventEmitter.broadcast({soundOnce|soundLoop|soundMusic|soundStop})
   → components/Sound.svelte → (enable-list gate) → Howler plays a segment of ONE audio sprite
```
- **`src/game/sound.ts`** — the `SoundName` union (28 names) + **`ENABLED_SOUNDS` allowlist**.
- **`src/components/Sound.svelte`** — maps emitter events to the Howler players; **gates every play by
  `isSoundEnabled()`** (soundStop is never gated). Music starts in `onMount` (gated), only after the
  loading-screen tap (`<Sound/>` is behind `!showLoadingScreen` in Game.svelte — the audio-unlock gesture).
- **`src/components/EnableSound.svelte`** — loads the sprite asset (guarded; no-ops if absent).
- **`src/game/assets.ts`** — the `sound` asset entry (`type:'audio'`, points at the sprite JSON).
- Three player lanes: **music** (one bed at a time; replay of a playing track = no-op, switch = pause/
  resume — never restarts), **loop** (needs soundStop), **once** (`forcePlay` retriggers before the
  clip ends — REQUIRED for any sound that fires several times within its own length).

## The sprite + pipeline
- Shipped sprite: **`static/assets/sounds/audio.m4a` + `sounds.json`** (Howler offset map). Must live in
  `static/` — Howler resolves the JSON `src` PAGE-relative (`./assets/sounds/audio.m4a`).
- Source clips: **`assets/audio/src/<name>.mp3`** (one per sound name). Music beds included there too.
- **Repack:** `python assets/audio/pack_sprite.py` (uses imageio-ffmpeg — `python -m pip install
  imageio-ffmpeg` once). It sets per-sound `config` volumes (measured mixing hierarchy) and prints the
  segment count. Always keep the sprite ↔ union 1:1 (a name in code but not the sprite makes Howler
  blast the whole 100 s file). Verify:
  `python -c "import json,re;u=set(re.findall(r\"'((?:sfx_|bgm_|amb_)[a-z0-9_]+)'\",open('src/game/sound.ts').read()));s=set(json.load(open('static/assets/sounds/sounds.json'))['sprite']);print('OK' if u==s else (u^s))"`

## Where sounds come from (LICENSING — important)
1. **Scatter SDK template** (`apps/scatter/static/assets/audio/sounds.ogg`) — the reference app in OUR
   monorepo; legal to reuse. Its names ARE Abyssal's pre-rename originals, so mapping is 1:1.
   `assets/audio/from_scatter.py` extracts each mapped segment with **per-event pitch (semitones) +
   warmth EQ** (bass+4@110, treble-3@5200) toward Valkyrie's measured profile. Tune the MAP, re-run,
   repack. `assets/audio/make_cluster_win.py` builds a composite (glow→explode) example.
2. **User-generated ElevenLabs clips** — user drops files into the served folder; import them to
   `src/` (convert wav→mp3, fix names) and repack.
3. **Royalty-free packs** (Sonniss GDC etc.) — fine, same workflow.
4. **NEVER extract audio from third-party production slots** (Valkyrie / Terminal / Hacksaw live games).
   Copyright — pitching doesn't launder it, and Abyssal ships commercially on the same platform. Only
   MEASURE them (FFT) to learn targets. This line is firm.

## Prompt rules for ElevenLabs (learned the hard way)
- **Short & natural, 3–12 words**: instrument/material + gesture + mood. Over-specified prompts
  (hertz, ms, "no bass no highs") render ROBOTIC. Duration = the slider, never in text. Influence ~0.4–0.5.
- **Concrete foley gestures** ("bomb drop", "dragon breath", "water whoosh", "coin pop", "monster bell")
  beat abstract musical descriptions.
- Warm/deep/underwater; punchy not shrill; big = deeper+longer+layered, not sharper; ADD<MUL; reserve
  menace for the red MUL eye.

## Validation workflow (current method)
**One sound at a time.** Only names in `ENABLED_SOUNDS` play. To test: add a name, reload, judge in game,
keep if good, move on. Currently ENABLED: `bgm_main`, `bgm_freespin`, `bgm_win`, `sfx_btn_general`,
`sfx_btn_spin`, `sfx_reel_stop`, `sfx_cluster_win`, `sfx_anticipation`, `sfx_countup_loop`,
`sfx_eye_burst`, `sfx_eye_land`, `sfx_fs_intro`, `sfx_scatter_land`, `sfx_transition`. Everything else is
wired+packed but muted.

## Wiring rules/fixes already applied (keep them)
- `forcePlay:true` on every multi-fire sound: eye reveal (add/mul), eye combine (add/mul + snowball
  fold), gaze lap, scatter land, eye land, buttons, win tier-ups, reel stop (!turbo).
- Music: `bgm_main` for base + Super Spins uses `bgm_freespin` (reveal handler sets the bed when
  gameType!=='freegame'); `bgm_freespin` starts only AFTER the fs-intro water transition (in
  freeSpinTrigger, after gameType='freegame'); `bgm_main` restored on freeSpinEnd. Music halved
  (bgm_main .175 / freespin .25 / win .3 in pack_sprite.py VOLUMES).
- Count-up loop: NOT on plain tumble amount adds; ONLY during an Eye-multiply count on the tumble banner
  (TumbleWinAmount) and looping through the whole win-steps takeover (winLevelSoundsPlay→winLevelSoundsStop);
  stopped at finalWin + next reveal.
- Spin sound only broadcasts when starting a spin (SpinButton, isIdle) — not when clicking to stop/skip.
- Loader tap sound removed. Per-orb `sfx_gaze_fill` removed (too noisy; only `sfx_gaze_full` lap remains).

## Known open items
- **Replay bug:** `onSymbolLand` re-fires land sounds (scatter_land/eye_land) for symbols that just SHIFT
  during a cascade, not only fresh lands — fix (distinguish new land vs shift) when validating those two.
- `sfx_countup_loop` is on the loop lane — if the user's clip is a one-shot rise-and-resolve, it restarts
  oddly; may need loop-trim or a one-shot trigger.
- Music beds are user-authored (`bgm_main/freespin/win`, ~2/2/1 min); sprite ~5.9 MB.

## Reference files
- `docs/ABYSSAL_SOUND_DESIGN.md` — full name→trigger→intent catalog + measured pro patterns.
- `assets/audio/SOUND_GENERATION_BRIEF.md` — meta-prompt for generating ElevenLabs prompts.
- `assets/audio/REFERENCE_waylanders.txt`, `REFERENCE_killswitch.txt` — measured pro-slot banks.
- `assets/audio/{pack_sprite,from_scatter,make_cluster_win}.py` — the toolchain.
- `assets/audio/src/_backup_*` — backups of prior sound sets (revert = copy back + repack).

**Your task:** continue validating/tuning sounds one at a time per the workflow, apply the user's
feedback (adjust pitch/warmth/source/volume or import new ElevenLabs clips), keep the sprite↔union 1:1,
repack after every audio change, and never use third-party production-slot audio.
