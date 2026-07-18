# Abyssal audio — how to add the sound clips

The code is fully wired to the **27-clip production set** (see `docs/ABYSSAL_SOUND_DESIGN.md §3`).
Everything below is prepared; the game runs **silently** until the packed sprite lands here.

## The pipeline

```
generate clips → assets/audio/src/<name>.wav → pack → audio.m4a + sounds.json → activate
```

## 1. Generate the clips
Author each clip and export as **WAV, 48 kHz** named **exactly** as the sound (prompts in the doc §3):

```
src/bgm_main.wav  src/bgm_freespin.wav  src/bgm_win.wav
src/sfx_btn_general.wav  src/sfx_btn_spin.wav  src/sfx_reel_stop.wav
src/sfx_scatter_land.wav  src/sfx_anticipation.wav  src/sfx_scatter_win.wav  src/sfx_fs_intro.wav
src/sfx_gaze_fill.wav  src/sfx_gaze_full.wav
src/sfx_eye_land.wav  src/sfx_eye_reveal_add.wav  src/sfx_eye_reveal_mul.wav
src/sfx_eye_combine_add.wav  src/sfx_eye_combine_mul.wav  src/sfx_eye_burst.wav  src/sfx_snowball_up.wav
src/sfx_cluster_win.wav  src/sfx_countup_loop.wav
src/sfx_win_nice.wav  src/sfx_win_big.wav  src/sfx_win_mega.wav  src/sfx_win_epic.wav  src/sfx_win_max.wav
src/sfx_transition.wav
src/amb_underwater.wav   # optional
```

The filename becomes the sprite key, so it must match the name in `src/game/sound.ts` exactly.
Loops (`bgm_*`, `sfx_anticipation`, `sfx_countup_loop`, `amb_underwater`) loop via the player lane —
no special export needed, but author them to **loop seamlessly** (no fade at the ends).

## 2. Pack into the sprite
Use the repo packer (`assets/audio/pack_sprite.py`). It converts every `src/*.mp3` (mp3 or wav) to a
sample-accurate sprite, writes the measured volume hierarchy into `config`, and emits straight to the
serving location. One-time prerequisite: `python -m pip install imageio-ffmpeg` (bundles ffmpeg — no
system install).

```bash
python assets/audio/pack_sprite.py
```

Output: **`static/assets/sounds/audio.m4a` + `static/assets/sounds/sounds.json`** (NOT assets/audio/ —
Howler resolves the JSON's `src` relative to the PAGE, so the m4a must be served from static/ at
`./assets/sounds/audio.m4a`; same pattern as Waylanders Forge).

Notes:
- New/renamed clip → add it to `ORDER` (and `VOLUMES`) in `pack_sprite.py`, then repack.
- `bgm_main` / `bgm_freespin` are currently **aliases of the `bgm_win` segment** (placeholders).
  When the real beds are authored, drop `bgm_main.mp3` / `bgm_freespin.mp3` into `src/`, add them to
  `ORDER`, remove the alias block at the bottom of the packer, and repack.

## 3. Activate — ✅ done
The `sound` entry in `src/game/assets.ts` is live and `EnableSound.svelte` loads it. After any repack
just reload the app and verify on **localhost:3002** (`pnpm run dev --filter=abyssal`).

## Notes
- **Single `.m4a` (AAC)** — matches shipped Stake Engine slots (Waylanders Forge). No webm/mp3 fallback.
- Keep source WAVs in `src/` (committed or not, your call) so clips can be re-cut and repacked.
- Adding/renaming a sound = update `src/game/sound.ts` first (closed union), then repack.
- Reference banks from other Stake Engine slots: `REFERENCE_waylanders.txt`, `REFERENCE_killswitch.txt`.
