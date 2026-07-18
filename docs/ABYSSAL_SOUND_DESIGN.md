# Abyssal — Sound Design Bible

Every sound the Abyssal slot needs, where it's triggered, and a copy-paste prompt to generate it.

> **Status (2026-07-12): code is prepared for audio — only the sprite is missing.** All 27 names in
> `sound.ts` are final; every trigger across the handlers/components has been renamed to them; the
> loader (`EnableSound.svelte`) is written and **guarded** (no-ops while silent); the `assets.ts`
> `sound` entry is ready-but-commented; and `assets/audio/` is scaffolded (`src/` + `README.md`
> packing guide). **To go live:** drop the WAVs in `assets/audio/src/`, pack them (README), then
> uncomment the `assets.ts` entry. Full set in [§3](#3-the-production-set--27-clips-valkyrie-lean).

## Reference: two shipped Stake Engine slots (measured live)

Inspected two live slots on **our own SDK** (`*.stake-engine.com`, `demo=true`, no login) to calibrate.
They reveal the platform's two valid audio patterns:

| | **Waylanders Forge** (Valkyrie) — #1 most-played | **Kill Switch** (Terminal Games) |
|---|---|---|
| Packaging | **One `audio.m4a` sprite + `sounds.json`** (49 segments) | 73 **individual** `.m4a` files in `/assets/sounds/` |
| Size | ~7.2 MB | ~6.2 MB |
| Naming | **`bgm_*` / `sfx_*`** | `tg_<studio/game>_<cat>_<variant>` |
| Format | `.m4a` (AAC) **only** — not dual-format | `.m4a` (AAC) **only** |
| vs Abyssal | **Identical to our `utils-sound` setup** | Different (per-file) |

**Decisions this settles for Abyssal:**
- **Keep the Howler sprite.** The #1 game ships the *exact* `audio.m4a` + `sounds.json` sprite our
  `utils-sound` already implements — `sprite: { name: [offsetMs, durationMs] }`, `config: { name:
  { volume } }`. Don't switch to per-file (see §2).
- **Ship a single `.m4a` (AAC).** Both games ship one `.m4a`, no `.webm`/`.mp3` fallback — AAC is
  universally supported. (Corrected: earlier drafts said dual-format.)
- **Our `bgm_*`/`sfx_*` names + per-sound `config.volume` already match Valkyrie** — no renaming needed.
- **49 segments is our model.** Even the #1 game stays lean (2 reel stops, 2 win sounds, 2
  multipliers). It spends its budget on *theme*, not brute variation.

**Scope decision (agreed): go Valkyrie-lean — the 27-clip production set in §3, one sprite.** Reuse
over variation. Principles baked into that list:
- **One reel-stop** for every column (no per-column variations).
- **One shared win bed** (`bgm_win`) under per-tier `sfx_win_*` stingers — not five win-tier songs.
- **One free-spin bed** (`bgm_freespin`) — no feature-music variants or stems (`l0/l1/l2`).
- **Cluster/tumble = one pop** (`sfx_cluster_win`) — no cascade-depth variation layers.
- **Spend the budget on the hero feature:** the Eye + Gaze gets 9 dedicated clips (§3.4).

Grow toward Valkyrie's ~49 only where a live beat feels thin — never toward Kill Switch's 73.

Reference file lists archived in `assets/audio/REFERENCE_killswitch.txt` and
`assets/audio/REFERENCE_waylanders.txt` for the audio designer.

---

## 1. Pipeline (how a sound fires)

```
book event / UI action → eventEmitter.broadcast({ type:'soundOnce'|'soundMusic'|'soundLoop'|'soundStop', name })
   → Sound.svelte → sound.players.{once|loop|music}.play({ name })  → Howler plays that segment of the sprite
```

- **`sound.ts`** — the name union (`MusicName` + `SoundEffectName`). A name must exist here to play.
- **`Sound.svelte`** — the only file that touches `sound.players`; owns the emitter events + scatter counter.
- **`EnableSound.svelte`** — loads the asset (currently inert).
- Three lanes: **`music`** (looping bed, one at a time), **`loop`** (looping SFX, needs `soundStop`),
  **`once`** (one-shots; `forcePlay` retriggers before the prior instance ends).

## 2. Delivery format — one Howler audio sprite (matches the #1 Stake Engine slot)

Author individual clips → pack into **one `.m4a`** + a `sounds.json` offset map. This is verbatim what
Waylanders Forge (the most-played Stake Engine slot) ships, and exactly what our `utils-sound` loads.

```jsonc
// static/assets/sounds/sounds.json  →  registered in assets.ts as  { type:'audio', preload:true }
{
  "src": ["./assets/sounds/audio.m4a"],          // single AAC file, PAGE-relative (Howler resolves vs the page,
  "sprite": {                                    //  so both files live in static/ — Waylanders pattern)
    "bgm_main":        [0,     42000],           // [offsetMs, durationMs]  (looping is per-lane, not per-sprite)
    "sfx_btn_spin":    [43000, 380],
    "sfx_reel_stop":   [44000, 260]
  },
  "config": { "bgm_main": { "volume": 0.6 } }    // per-sound volume trim (we encode the measured hierarchy here)
}
```

- The **`music`** and **`loop`** player lanes loop automatically (see `createSound`), so beds need **no**
  per-sprite loop flag — just put them on those lanes. (The `[…, true]` 3rd element is supported but unused.)
- Keep source clips in `assets/audio/src/`; pack with **`python assets/audio/pack_sprite.py`**
  (one-time: `python -m pip install imageio-ffmpeg`) — it emits both files to `static/assets/sounds/`
  with sample-accurate offsets and the measured `config` volumes baked in.
- Beds must **loop seamlessly**. Mix ~**-16 LUFS**; SFX peaks ~**-1 dBTP**; win-tier beds a touch hotter.
- SFX house voice: **deep-sea, bioluminescent, magical, wet/muffled, tight (no long tail)** — author
  dry, add one shared reverb in the DAW. Generate 3–5 variants per sound, pick the best.
- **Win-tier stingers** (`sfx_win_nice/big/mega/epic/max`) should feel like **one escalating family** —
  same instrument palette, each tier bigger/higher, so the ladder reads as a single rising arc.

---

## 3. The production set — 27 clips (Valkyrie-lean)

This is the **definitive v1 sound list**. One `audio.m4a` sprite, ~27 segments (Cup ships 31, Forge 49).
Names are **final and already wired in code** (see §4.1).

> **🐉 CREATIVE IDENTITY v6 (2026-07-14) — the Abyssal sound world = ANCIENT LEVIATHAN / DRAGON in
> the DEEP.** Per-sound intent (actual short prompts live in `assets/audio/src/manifest.json`):
> - **Eye LAND = a BOMB drop** — whistling fall into a deep booming impact; must grab attention.
> - **Gaze fill = an ORB** whooshing in and dropping into the meter; **gaze full** = the meter charging complete.
> - **Eye reveal/combine: ADD < MUL.** MUL eyes are the big rare payoff — dramatic, deep, dark;
>   ADD eyes are small, soft, light. Same hierarchy for the combine folds.
> - **Scatter land = Leviathan** — a deep resonant monster bell / stirring sea beast.
> - **Anticipation = DRAGON BREATH** — a low rumbling breath swelling and receding (loop).
> - **Cluster win = abyssal** — a soft glowing bioluminescent bubble pop underwater.
> - **Max win = DRAGON ROAR** fanfare (matches the ruby-dragon max-win frame).
> - Everything warm/deep/underwater, following Valkyrie/Terminal register (250–2500 Hz, warm low chords).
> Backup of the previous scatter-template pitched set: `assets/audio/src/_backup_scatter/` (revert = copy back + repack).

> **⚠️ PROMPT LAW v4 (2026-07-13, supersedes the long prompts below): keep generation prompts
> SHORT and natural — 3 to 12 words, `instrument + gesture + mood` (e.g. "gentle rising harp
> arpeggio", "deep soft drum boom, something huge landing"). Over-specified prompts (registers,
> milliseconds, "no X no Y" lists) make ElevenLabs render robotic instead of played. Duration comes
> from the API parameter, not the text; prompt_influence ~0.5. The long prompts below are kept as
> DESIGN INTENT documentation (what each sound must express + the measured mixing constraints); the
> actual generation prompts live in the packer-side manifest (`assets/audio/src/manifest.json`).**

**How to use these prompts:**
- **SFX → ElevenLabs Text-to-Sound-Effects.** Set the **duration slider to the spec** (don't leave it
  on auto — it pads), **prompt influence high (~80–100%)**, and generate **each of the 2–3 variants
  below** (they attack the sound from different angles — different material/metaphor, not rewordings).
  Pick the best take; 3–4 generations per variant is plenty.
- **Music → Suno/Udio.** Always instrumental. Generate 2 takes per variant, keep the one whose loop
  point is cleanest (you'll still trim the seam in a DAW).
- **Durations are matched to the actual animation timings in the code** (eye flip holds 700 ms, hero
  total punch holds 750 ms, water-wall covers in 620 ms…). Staying inside the spec keeps sound and
  motion locked together without editing.
- Every one-shot: **hard transient start, tight decay, NO reverb tail, no fade-in** — author dry, add
  one shared reverb in the DAW so all clips sit in the same space.
- **THE ABYSSAL ORCHESTRA (the sound universe).** Every sound in the game is *performed* on one
  consistent ensemble — like a video game score, not a collection of foley impacts. The instruments:
  **harp, music box/celesta, marimba & kalimba** (wooden, watery), **vibraphone with soft mallets**,
  **warm synth plucks**, **soft choir**, **padded taiko/frame drums** (felt mallets — all "weight"
  comes from these, never hard impacts), plus **bubbles and gentle water swirls** as texture.
  SFX are **musical notes and chords, pitched around D** (D minor mystery / D major joy) so they
  harmonize with the beds. Reference feel: **Ori, Zelda, Journey — cozy-epic adventure.**
- **Timbre law (this is what kills "too severe / too acute"):** every prompt asks for **soft rounded
  attacks, warm body, smooth rolled-off highs** and explicitly bans the harsh stuff — *no metallic
  ring, no piercing highs, no distortion, no glass shatter, no cracks*. Big moments get bigger by
  getting **deeper, longer and more layered — never sharper or louder in the treble.**
- **Start every ElevenLabs prompt with "Video game sound effect,"** — genre framing steers the model
  away from real-world foley harshness and toward produced game audio.
- The measured rules below are **mixing engineering** (levels, bands, envelopes); the *emotion* is
  always warm game-fun. True menace belongs to the red MUL eye alone — and even it is deep, not harsh.

**Measured DNA — decoded and FFT-analyzed the actual clips from Waylanders Forge + Kill Switch
(envelope, frequency bands, loudness). The rules the pros actually follow:**
1. **Strict loudness hierarchy.** Hero hits (multiplier, reel stop, win) peak at **-5…-8 dBFS**; UI
   clicks and count-up ticks sit at **-18…-23 dBFS** — 12–15 dB under the hits. Recreate this in the
   sprite `config` volumes (hits ≈ 1.0, clicks/ticks ≈ 0.4).
2. **Reel stop = pure low end.** >90% of its energy is below 250 Hz, instant attack, dead by 40% of
   its length. **UI clicks are the exact opposite** — ~80% of energy in 2.5–8 kHz, tiny and bright,
   so they never mask the game.
3. **Anticipation loops contain NO sub-bass** (0% below 80 Hz in Kill Switch). Tension lives in
   250 Hz–8 kHz and *breathes* (slow swell up/down) — the sub band stays free so reel thuds still land.
4. **Win/cluster pops are warm, not bright.** Forge's win pops carry 66–84% of energy in 80–250 Hz
   — rounded low thumps with only a sparkle crest. Bright pings fatigue at repetition; warm doesn't.
5. **Count-up loops are thin, high and quiet** — pure 2.5–16 kHz ticking, zero low end, the quietest
   SFX in the mix. The final resolve punch (their `counting_end`) is bass-heavy — that's our stinger's job.
6. **Win tiers escalate by LENGTH + riser + air.** Forge: 2.8→3.7 s with attack stretching 0.02→1.6 s
   (bigger tier = longer build into the hit); Kill Switch: 1.7→9.7 s adding brightness/air each tier,
   with the max tier bringing back a deep sub floor. All keep a dark low-end body.
7. **"Magic" = the top octave.** Their transform/star sparkles put ~50% of energy above 8 kHz.
   Ask for "glassy air, very high shimmer" explicitly on reveals and charge sounds.
8. **Multiplier hits are a whoosh INTO a punch** — 300–600 ms rising swell that slams into a heavy
   low impact (their loudest SFX at -5 dBFS). That's our Eye combine/burst blueprint.
9. **Feature intros are long risers** cresting near the end (attack 0.8–3.2 s), then a clean stop.
10. **The win music bed runs ~4 dB hotter** than the base bed with constant, never-resolving energy;
    ambience beds are nearly silent (-29 dBFS peak — felt, not heard) and pure sub/low.

**MEASURED PATTERNS v3 — decoded Knight Watch (Paperclip, 65 clips) + Larry's Cake (PartyhatPlay, 27
clips) and FFT-analyzed the exact categories we care about. The cross-studio rules:**
- **Every sound is a NOTE.** Spectral flatness < 0.1 almost everywhere — UI clicks, reel stops, win
  hits are *pitched musical tones*, not noise. Larry's ui_click is literally one pure ~1.6 kHz note.
- **The game lives in 250–2500 Hz** (warm low-mid/mid). Highs above 2.5 kHz appear ONLY in the
  count-up sparkle and tiny UI blips. Nothing screams.
- **UI = one clean quiet note** (~1.5–3.6 kHz, 90–300 ms, -16…-23 dBFS — far under game sounds).
- **Reel stop = a pitched low DRUM note** (fundamental 70–120 Hz, like a soft kick/tom), loud (-6 dB),
  instant attack, quick decay. A drum hit, not a rumble.
- **Scatter land = a warm mid-register chime note (~550–1000 Hz) with a long natural ring (~3.5 s
  tail)** — and Knight Watch pitches each successive land DIFFERENTLY (fs_land_0…5 = an escalating
  melody). The collect IS music.
- **Anticipation = a held string-tremolo CHORD, swelling and receding** — strongly tonal (flat .02),
  mid register, no sub, no bright air, quiet-ish. Musical suspense, not a drone or shimmer.
- **Count-up = "pitched"**: Knight Watch's `p_counting_pitched` is a 12 s sparkle tally that RISES IN
  PITCH as it runs (their name says it), with a bass thump at start and a clean musical resolve note
  (~1.3 kHz) at stop — the resolve job is our win stinger's.
- **Win tiers = warm LOW-register orchestral chords** (peaks 94–516 Hz!, tonal, loud, 2.5→6 s per
  tier). Rich and round; almost zero treble content. Bigger = longer + lower + fuller.
- **Feature intro = a slow warm riser** (~2 s build cresting near the end), low/low-mid, then clean stop.
- **Transition = a warm LOW whoosh** (energy 20–800 Hz), round, ~2 s.
- Knight Watch also splits studio banks (`shared_` / `p_` provider / `knwa_` game) and pairs noisy
  hits with a separate musical `_tone` layer — noise for impact, tone for the universe.

### 3.1 Music (3) — Suno / Udio

**`bgm_main`** — base game bed · 60–90 s · seamless loop · a REAL TUNE players can rely on for hours:
a gentle, memorable melody in the mid register (leaves lows for reel thuds, highs for sparkles)
1. "Enchanting underwater slot game theme, gentle harp and celesta melody with a memorable recurring motif, warm string pads, soft watery textures and rising bubbles, mysterious but inviting and pleasant, relaxed 85 bpm, instrumental, seamless loop"
2. "Melodic deep-sea adventure loop, curious marimba and kalimba hook over lush warm pads, light unobtrusive rhythmic pulse, bioluminescent sparkle accents, sense of wonder and calm treasure-hunting, 90 bpm, instrumental, loopable with no intro or outro"
3. "Mysterious aquatic fantasy theme with a soft flute melody you can hum, warm cinematic pads, gentle harp arpeggios, distant whale song as texture, magical and welcoming with a hint of depth and secrets, instrumental, seamless loop"

**`bgm_freespin`** — feature bed · 60–90 s · seamless loop · the "you made it into the bonus!" high —
clearly more energy AND more joy than base, with its own catchy hook, same aquatic world
1. "Epic underwater bonus theme, driving percussion with a heroic catchy melody on strings and horns, rising choir accents, adventurous and celebratory, the thrill of diving deeper for treasure, 120 bpm, instrumental, seamless loop"
2. "Energetic aquatic feature music, punchy drums, an exciting melodic hook traded between strings and bright bells, playful epic momentum, uplifting and fun, never grim, 115 bpm, instrumental, loopable with no intro or outro"
3. "Fast-flowing deep-sea quest theme, galloping rhythm, bold brass melody answered by sparkling mallets, choir swells, heroic and rewarding, big-win-is-coming energy, 125 bpm, instrumental, seamless loop"

**`bgm_win`** — the ONE shared win bed (all tiers ride `sfx_win_*` stingers over it) · 15–25 s · loop ·
measured: runs ~4 dB HOTTER than the base bed, constant never-resolving energy (mix it up in `config`)
1. "Triumphant orchestral celebration loop, 100 bpm, D major, warm brass fanfare figures, cascading harp glissandi, choir sustains, glittering percussion rolls, oceanic grandeur, joyful and rich, instrumental, seamless loop with no ending"
2. "Victorious cinematic win music loop, rolling timpani, soaring strings, heroic horn theme, sparkling bells like treasure, bright and majestic, sustained celebratory energy that never resolves, instrumental, loopable"

> Like Waylanders Cup (only `bgm_base`+`bgm_bonus`), win tiers are SFX **stingers** over this bed —
> no per-tier songs. `winLevelMap` big→max already points at `bgm_win`.

### 3.2 UI & reels (3) — ElevenLabs — orchestra rework (v2)

**`sfx_btn_general`** — any UI button · **0.1–0.3 s** · measured pattern: ONE clean pure musical note
(Larry's ui_click = a single ~1.6 kHz tone, flat .02; Knight's shared_click = 91 ms tonal blip, -23 dB)
1. "Video game sound effect, one single clean xylophone note as a UI click, a pure simple musical tone, instant soft attack, dies quickly, quiet, no noise, extremely short"
2. "Video game sound effect, a single gentle plucked string note as a menu tick, one pure pleasant tone, soft and quiet, very short, clean"
3. "Video game sound effect, one small warm music box note, a single clear quiet tone as an interface click, simple and pure, very short"

**`sfx_btn_spin`** — spin press · **0.3–0.5 s** · the most-heard sound: playful and inviting, never fatiguing
1. "Video game sound effect, a warm low synth pluck with a soft rising bubble swish, playful action button, bouncy and inviting, rounded attack, no harshness, half a second"
2. "Video game sound effect, a deep soft marimba note with a quick gentle water swirl upward, cozy adventure game confirm, warm and fun, short"
3. "Video game sound effect, a padded drum tap with a friendly bubbly whoosh, energetic but soft, launch feeling, rounded, 400 milliseconds"

**`sfx_reel_stop`** — each column locks (fires 6× per spin, ~100 ms apart) · **0.2–0.3 s** · measured
pattern: a PITCHED low drum note — Larry's is a soft kick at ~70 Hz, loud, instant attack, quick decay
1. "Video game sound effect, one deep pitched drum note like a soft kick drum, low fundamental around 90 hertz, punchy instant attack, warm and round, quick natural decay, no high frequencies, very short"
2. "Video game sound effect, a single low tom drum hit, one warm pitched thump, tight and musical, instant attack, dies fast, no click, very short"
3. "Video game sound effect, one soft taiko drum note, deep round pitched hit, cushioned but punchy, quick decay, low register only, 250 milliseconds"

### 3.3 Scatter & feature (4) — ElevenLabs — orchestra rework (v2)

**`sfx_scatter_land`** — scatter symbol lands (up to 6 per spin) · **0.8–1.5 s** · ✅ **KEPT — the
current v2 clip is validated by the user ("really good"). Do not regenerate.** The pattern agrees:
Knight Watch's fs_lands are warm mid-register musical chimes with long rings, each land a new note.
1. (current clip) "Video game sound effect, a magical collect sound, three rising harp notes over one warm low marimba note, joyful and enchanting, soft attack, gentle watery sparkle, about one second"

**`sfx_anticipation`** — tension LOOP while a trigger scatter can still land · **5–8 s seamless loop** ·
plays under OUR screen-dim + board zoom-in · measured pattern: a HELD STRING-TREMOLO CHORD, strongly
musical (Knight's is flat .02, mid register, no sub, no bright air), swelling and receding like held breath
1. "Video game sound effect, a soft orchestral string tremolo holding one tense warm chord, slowly swelling and receding like held breath, mid register only, no bass, no bright highs, musical suspense, perfectly seamless loop"
2. "Video game sound effect, quivering warm strings sustaining a suspenseful minor chord that breathes louder and softer in slow waves, cinematic will-it-happen tension, mid register, seamless loop with no start or end"
3. "Video game sound effect, a musical suspense bed of soft tremolo strings and a low quiet choir holding one unresolved chord, swelling gently, warm and tonal, no sub-bass, loopable"

**`sfx_scatter_win`** — the scatter pay lands (3×/5×/100× bet) · **0.8–1.2 s**
1. "Video game sound effect, a joyful reward flourish, warm harp glissando with soft coins and a happy celesta melody, celebratory and charming, rounded, about one second"
2. "Video game sound effect, a treasure win jingle, quick kalimba run rising into a warm happy chord with gentle coin sparkle, delightful, soft attack, one second"
3. "Video game sound effect, a music box victory flourish with soft falling coins, sweet and rewarding, warm tone, no harshness, one second"

**`sfx_fs_intro`** — feature trigger fanfare over the intro card · **3–4.5 s** · measured pattern:
a slow WARM LOW riser (~2 s build, low/low-mid register, tonal) cresting near the END, then a clean stop
1. "Video game sound effect, a warm low orchestral riser building slowly for three seconds, deep soft strings and horns swelling upward and cresting into one joyful full chord near the end, round and majestic, no harsh brightness, clean stop"
2. "Video game sound effect, a rising bonus fanfare in a warm low register, cellos and soft brass climbing steadily to a triumphant crest at the very end, cozy epic, four seconds, clean ending"
3. "Video game sound effect, a deep warm build-up, low choir and strings growing richer and higher for three seconds then landing on a big warm major chord, rounded and grand, smooth stop"

### 3.4 The Eye & Gaze (9) — the hero feature — ElevenLabs — orchestra rework (v2)
ADD = **cyan** (`0x22dfff`), MUL = **red** (`0xff5a2a`). Distinguish them **by harmony and register,
not by harshness**: ADD = warm MAJOR bloom, mid register · MUL = deep MINOR power, low register —
both played softly on the same orchestra.

**`sfx_gaze_fill`** — essence orb hits the meter (fires several times per tumble) · **0.15–0.25 s** · stacks
1. "Video game sound effect, a tiny warm music box note with a soft water droplet, cute collect blip, rounded and gentle, very short"
2. "Video game sound effect, one soft kalimba pluck with a small bubble, pleasant pickup tick, warm, no harsh highs, 200 milliseconds"
3. "Video game sound effect, a gentle vibraphone touch with soft mallet, single warm note, light and smooth, very short"

**`sfx_gaze_full`** — the meter laps to the next colour band (milestone) · **0.6–0.9 s**
1. "Video game sound effect, a warm level-up, a soft rising harp arpeggio resolving into a gentle glowing major chord, satisfying and magical, rounded, under one second"
2. "Video game sound effect, a cozy power-up complete, three ascending marimba notes blooming into a warm choir touch, rewarding, soft attack, 800 milliseconds"
3. "Video game sound effect, a gentle chime cascade rising and settling into a warm full chord, meter-full satisfaction, smooth and round, short"

**`sfx_eye_land`** — an Eye lands on the board (board jolt) · **0.4–0.7 s** · the boss makes its
entrance — deep AWE, epic presence, still soft-edged (padded weight, never a harsh slam)
1. "Video game sound effect, a deep soft boss arrival, a padded low taiko boom with a warm mystical choir hum, awe and wonder, muffled and smooth, no harshness, 600 milliseconds"
2. "Video game sound effect, something huge arriving gently, a deep cushioned drum impact with a low warm chord swell, epic but rounded, underwater softness, short"
3. "Video game sound effect, a majestic deep landing, soft heavy frame drum with a brief low choir breath, powerful presence without any sharpness, 600 milliseconds"

**`sfx_eye_reveal_add`** — the cyan ADD eye opens (flip holds 700 ms) · **0.6–0.8 s** · warm MAJOR bloom
1. "Video game sound effect, a warm magical awakening, a soft major chord blooming gently upward on harp and vibraphone like light spreading underwater, friendly ancient magic, smooth, 700 milliseconds"
2. "Video game sound effect, a benevolent eye opening, a low warm hum rising into a gentle bright major chime, welcoming and magical, rounded attack, no harsh highs, under one second"
3. "Video game sound effect, a soft bloom of celesta and choir in a happy major key, wonder and kindness, watery shimmer, gentle, 700 milliseconds"

**`sfx_eye_reveal_mul`** — the red MUL eye opens · **0.5–0.8 s** · deep MINOR power — intriguing, not harsh
1. "Video game sound effect, a dark warm awakening, a low soft minor chord swelling on deep choir and low strings, mysterious and powerful, rounded, no scream, no distortion, 700 milliseconds"
2. "Video game sound effect, an ancient powerful eye opening, a deep velvet minor swell with a soft low pulse underneath, intriguing menace, smooth and dark, under one second"
3. "Video game sound effect, a low mysterious bloom, warm cello and low choir rising in a minor key with a gentle watery undertow, dramatic but soft, 700 milliseconds"

**`sfx_eye_combine_add`** — an ADD value folds into the total (~0.4 s chip pop) · **0.3–0.5 s**
1. "Video game sound effect, a soft magical absorb, a gentle whoosh into a padded warm pop with a small major chime, satisfying, rounded, 400 milliseconds"
2. "Video game sound effect, a value locking in, soft inward swish ending in a warm cushioned thump with a kalimba note, positive and smooth, very short"
3. "Video game sound effect, a cozy collect-and-lock, quick gentle vacuum into a soft marimba pop, warm, no harshness, short"

**`sfx_eye_combine_mul`** — a MUL value multiplies the total · **0.3–0.5 s** · same shape, deeper and minor
1. "Video game sound effect, a deep magical absorb, a soft whoosh into a heavier padded pop with a low minor pulse, weighty but smooth, mysterious power, 400 milliseconds"
2. "Video game sound effect, a powerful value multiplying, gentle inward sweep ending in a deep warm thump with a dark chord touch, rounded, no distortion, short"
3. "Video game sound effect, a low velvet lock-in, soft pull into a cushioned deep pop with a minor hum, dramatic and soft, very short"

**`sfx_eye_burst`** — the combine resolves: hero total (punch holds 750 ms) · **0.8–1.2 s** · the
biggest SFX — measured shape: a rising swell INTO the hit; make it big by depth and layers, never sharpness
1. "Video game sound effect, a grand magical bloom, a soft rising swell into a deep padded boom that opens into a joyful cascade of harp and warm bells, epic and euphoric but completely smooth, no harsh frequencies, one second"
2. "Video game sound effect, a huge warm release, gentle build-up sweeping into a deep cushioned impact with a bright happy chord blooming after, triumphant, rounded everywhere, about one second"
3. "Video game sound effect, a magical explosion of warmth, soft riser into a low velvety boom followed by sparkling music box notes raining down, celebratory and gentle, 1.2 seconds"

**`sfx_snowball_up`** — the banked ×M medallion climbs (free spins HUD pop) · **0.25–0.4 s**
1. "Video game sound effect, a warm rising two-note motif on marimba and harp, growing power, cozy and encouraging, soft attack, very short"
2. "Video game sound effect, a gentle power-up step, one warm synth pluck bending upward with a soft low tap, playful growth, rounded, 300 milliseconds"
3. "Video game sound effect, a soft ascending kalimba pair of notes with a padded thump, multiplier gaining strength, warm, short"

### 3.5 Wins & transition (8) — ElevenLabs — orchestra rework (v3)
The five `sfx_win_*` stingers are **one escalating family of MELODIC FANFARES on the Abyssal
orchestra**. Measured pattern (Larry's win_1→5): **warm LOW-register chords** (spectral peaks at
94–516 Hz!), strongly tonal, loud, growing 2.5→6 s — rich and round with almost no treble. Escalation
= **longer + lower + fuller** (add choir/drums/layers), never sharper. Generate all five in one
session with the same vocabulary so they read as one ladder.

**`sfx_cluster_win`** — a winning cluster pops (fires on most spins) · **0.3–0.6 s** · measured
pattern: one warm MID-register musical note (~1 kHz, tonal, quick) — pleasant at endless repetition
1. "Video game sound effect, one warm marimba note as a win pop, a single pleasant mid-register musical tone, soft round attack, satisfying, quick decay, very short"
2. "Video game sound effect, a single warm vibraphone note played softly, one clean feel-good tone, gentle and rewarding, short"
3. "Video game sound effect, one cozy plucked note with a soft body, single warm musical pop, smooth and pleasing, 400 milliseconds"

**`sfx_countup_loop`** — win amount rolling up (LOOP, stopped on lock) · **6–10 s** · measured
pattern: Knight Watch's count is literally named `p_counting_pitched` — a long sparkle tally that
**RISES IN PITCH** as it runs (excitement climbs with the number); light, airy, no bass. Our win
stinger provides the resolve note when it stops
1. "Video game sound effect, a fast sparkling coin counting tally gradually rising in pitch over eight seconds, tiny gentle ticks climbing higher and higher like an accelerating counter, light and airy, no bass, exciting accumulation"
2. "Video game sound effect, a long playful counting sequence of quick soft plucked notes steadily ascending in pitch, treasure adding up faster and faster, delicate and cheerful, no low end, eight seconds"
3. "Video game sound effect, rapid twinkling music box ticks sweeping slowly upward in pitch, a growing win counter, gentle bright and continuous, eight seconds"

**`sfx_win_nice`** — win levels 4–5 stinger · **0.8–1.2 s** · smallest of the family
1. "Video game sound effect, a small victory melody, a quick warm harp run up into one happy horn note with a soft chime, modest and pleasant, rounded, one second, clean gentle ending"
2. "Video game sound effect, a cheerful little win fanfare, three rising marimba notes crowned by a warm major chord, cozy and rewarding, smooth, about one second"

**`sfx_win_big`** — Big Win + the count-up tier-up/lock punch · **1–1.5 s**
1. "Video game sound effect, a triumphant warm fanfare, soft horns and choir landing on a big major chord with a padded drum hit and gentle bell shimmer, grand but smooth, 1.2 seconds, rounded ending"
2. "Video game sound effect, a big joyful win hit, warm brass swelling quickly into a full happy chord with soft timpani and harp sparkle, celebratory, no harshness, under 1.5 seconds"

**`sfx_win_mega`** — Mega Win · **1.5–2 s** · deeper, longer, fuller than big
1. "Video game sound effect, an epic warm win fanfare, a soft timpani roll rising into a rich major chord of horns, choir and harp with gentle bells raining, huge and joyful but velvety, two seconds, smooth ending"
2. "Video game sound effect, a grand celebration stinger, two warm rising brass swells crowned by choir and soft chimes, deep padded drums underneath, majestic and round, two seconds"

**`sfx_win_epic`** — Epic Win · **2–2.5 s**
1. "Video game sound effect, a massive warm victory fanfare, a long rising orchestral swell blooming into a heroic major theme with full choir, harp cascades and soft deep drums, overwhelming joy with zero harshness, 2.5 seconds, gentle resolve"
2. "Video game sound effect, an enormous celebration, three ascending warm orchestra swells each fuller than the last, choir and music box sparkle over padded timpani, epic and smooth, about 2.5 seconds"

**`sfx_win_max`** — MAX WIN 15,000× + trophy slam · **2.5–3.5 s** · nothing may top this — deepest, longest, fullest
1. "Video game sound effect, the ultimate victory fanfare, a deep soft boom swelling into a colossal warm major chord with full choir, horns, harp glissandi and cathedral bells, gigantic but velvety and euphoric, three seconds, majestic gentle ending"
2. "Video game sound effect, a jackpot apotheosis, slow powerful rise into the biggest warmest orchestral chord with angelic choir, deep padded drums and soft golden bells everywhere, monumental and smooth, three seconds"

**`sfx_transition`** — the water wall rises to cover the screen (cover tween = 620 ms) · **1.5–2 s** ·
measured pattern: a warm LOW whoosh (energy 20–800 Hz, round, tonal-ish, ~2 s)
1. "Video game sound effect, a warm deep watery whoosh, a soft low wave swelling up and over with gentle bubbles, round and smooth, low register, immersive, about 1.5 seconds, soft ending"
2. "Video game sound effect, a low rounded ocean sweep, deep water rising in a cushioned rush, warm scene change, no brightness, 1.5 seconds"
3. "Video game sound effect, a soft deep plunge, low muffled whoosh with a warm settle, cozy pressure shift, 1.5 seconds"

### 3.6 Optional (+1) — high feel-per-clip, add if budget allows

**`amb_underwater`** — ambient bed under `bgm_main` (LOOP lane) · **15–30 s seamless loop** · felt,
not heard (measured: pros run ambience near-silent — `config` volume ~0.25)
1. "Video game sound effect, a calm underwater ambience, slow soft bubbling, gentle currents, distant friendly whale song, peaceful vast water, warm and soothing, no music, perfectly seamless loop"
2. "Video game sound effect, a gentle deep-sea soundscape, soft vent bubbles and slow water movement with faraway soft echoes, serene and immersive, loopable with no start or end"

**Total: 27 core** (3 music + 3 UI/reels + 4 scatter + 9 Eye/Gaze + 8 wins) **+ 1 optional ambient.**

---

## 4. Wiring these names into code

### 4.1 Code rename + wiring — ✅ DONE (2026-07-12)
The names above are final and feature-accurate. `sound.ts` + every call site were renamed from the old
scatter-template names; the map below is the record of what changed (all applied):

| New name | Replaces (current code) | Where |
|---|---|---|
| `sfx_reel_stop` | `sfx_reel_stop_1` | `stateGame` onReelStopping |
| `sfx_scatter_land` | `sfx_scatter_stop_1` (+ drop `_2…5` escalation) | `SCATTER_LAND_SOUND_MAP` |
| `sfx_scatter_win` | `sfx_scatter_win` (unchanged) | Win.svelte |
| `sfx_fs_intro` | `sfx_scatter_win_v2` | freeSpinTrigger |
| `sfx_gaze_fill` | `sfx_multiplier_up` / `sfx_reel_stop_1` | GazeMeter `gazeMeterFill` |
| `sfx_eye_land` | `sfx_multiplier_landing` | Eye `eyeBurst`, TumbleWinAmount |
| `sfx_eye_reveal_add` | `sfx_multiplier_win` | Eye `eyeShow` (ADD) |
| `sfx_eye_reveal_mul` | `sfx_multiplier_explosion_b` | Eye `eyeShow` (MUL) |
| `sfx_eye_combine_add` | `sfx_multiplier_combine_a` | Eye `foldEye` (ADD) |
| `sfx_eye_combine_mul` | `sfx_multiplier_explosion_b` → new distinct | Eye `foldEye` (MUL) |
| `sfx_eye_burst` | `sfx_multiplier_explosion_a` | Eye `eyeBurst` hero total |
| `sfx_snowball_up` | `sfx_multiplier_up` | FreeSpinCounter |
| `sfx_cluster_win` | `sfx_winlevel_small` | winInfo handler |
| `sfx_win_nice…max` | `bgm_winlevel_*` / undefined `sound.sfx` | `winLevelMap.ts` tiers |

**New broadcasts added (were untriggered):** `sfx_gaze_full` (gaze lap in GazeMeter), `sfx_eye_combine_mul`
(split from the ADD fold in Eye), `sfx_transition` (`transitionCover` + `freeSpinExitCover`),
`sfx_scatter_win` (scatterPay). `sfx_countup_loop` rides the existing big-win loop. `amb_underwater` is
in the union but **intentionally unwired** (optional — add a `soundLoop` beside `bgm_main` if desired).

### 4.2 Load status — ✅ LIVE (2026-07-13)
All 24 SFX + `amb_underwater` were generated via the ElevenLabs sound-generation API (prompts logged
in `assets/audio/src/manifest.json` — that's also the license record), packed to
`static/assets/sounds/audio.m4a` + `sounds.json`, and the `assets.ts` `sound` entry is **active**.
Sprite ↔ `sound.ts` union verified 1:1 (28/28).

**Remaining:**
1. **Real music beds** — `bgm_main` / `bgm_freespin` currently alias the `bgm_win` segment
   (placeholder). Author in Suno/Udio (§3.1 prompts), drop mp3s in `assets/audio/src/`, add to the
   packer's `ORDER`, delete its alias block, repack.
2. **Audition in game** on localhost:3002; regenerate any clip that doesn't land (edit prompt →
   regenerate → repack), or run the variant pass (`__v2`/`__v3`) for A/B choices.
3. Tune `config` volumes in `pack_sprite.py` `VOLUMES` after hearing the real mix.

---

## 5. Where to make the sounds

> ⚠️ **Commercial licensing** (this is a real-money product): only use assets cleared for commercial
> use. For AI tools, confirm the plan grants commercial rights. Log every clip's source/license in
> `assets/audio/CREDITS.md`.

**AI — SFX:** [ElevenLabs Text-to-Sound-Effects](https://elevenlabs.io/sound-effects) (best; duration
+ loop control), Stable Audio, Meta AudioCraft/AudioGen (open-source, self-host).
**AI — music:** [Suno](https://suno.com), Udio, Soundraw / AIVA / Beatoven.ai (built for royalty-free
commercial licensing; prefer these for the rights question).

**Free libraries** (check each file's license — prefer **CC0**):
- **[Sonniss GDC bundle](https://sonniss.com/gameaudiogdc)** — huge pro packs, royalty-free for games (best single grab).
- **[Freesound](https://freesound.org)** (CC0 filter) — water/bubbles/foley. **[Pixabay](https://pixabay.com/sound-effects)** / **[Mixkit](https://mixkit.co/free-sound-effects)** — commercial-OK SFX + music.
- **[Kenney](https://kenney.nl/assets?q=audio)** (CC0) — UI clicks. **[99Sounds](https://99sounds.org)** — curated packs.
- Map: UI → Kenney/Mixkit · water/ambient → Freesound+Sonniss · coins → Sonniss/Pixabay · magical (Eye) → ElevenLabs (layer free shimmer under it).

---

## 6. Related docs
- `docs/ABYSSAL_EVENT_GUIDE.md` — book events & emission order (what triggers each sound).
- `src/game/sound.ts` — the name union · `src/components/Sound.svelte` — emitter→player map.
- `apps/scatter/src/{game/assets.ts, components/EnableSound.svelte}` — reference `type:'audio'` wiring.
