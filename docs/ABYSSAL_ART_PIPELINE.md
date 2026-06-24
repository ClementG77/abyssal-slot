# Abyssal — AI-Assisted Art & Build Pipeline

How to produce Abyssal's visuals and animation at **maximum quality with an AI-driven
asset workflow**, building inside the Stake Engine **web-sdk** (PixiJS 8 + Svelte 5).
Companion to [ABYSSAL_PRODUCTION_ROADMAP.md](ABYSSAL_PRODUCTION_ROADMAP.md) (engineering)
and [ABYSSAL_FRONTEND_GUIDE.md](ABYSSAL_FRONTEND_GUIDE.md) (event contract).

> **Locked art direction: stylized cinematic (atmospheric deep-sea).** Semi-realistic
> painterly look — dark abyss, bioluminescent glow, god-rays, particles. Not photoreal
> (too hard for AI coherence), not pixel (undersells the theme).

---

## 0. The two principles that decide quality

1. **Coherence > fidelity.** A set of 30 assets that share *one* believable style looks
   premium; 30 individually-great-but-mismatched assets look cheap. → **Lock one style
   reference (the style bible, §2) before generating anything**, and generate everything
   against it.
2. **The juice is code, not frames.** ~80% of "Gates feel" is PixiJS code-driven effects
   (glow, particles, shake, squash-pop, shaders) layered on **static** art — AI's strong
   suit. Reserve true AI spritesheets for the few hero frame-moments. The abyss theme
   (darkness, fog, glow, particles) makes code-juice read as premium cheaply.

**Why this theme is forgiving:** the deep sea is inherently low-detail/high-mood, which
hides AI's weakness (frame/detail consistency) and rewards its strength (atmosphere).

---

## 1. Pipeline & tool stack

```
 (1) STYLE BIBLE  -> one locked key-art reference (palette, light, render, the EYE)
        │           Midjourney v7 / Flux — pin a --sref / seed and reuse it everywhere
        ▼
 (2) STATIC ART  -> symbols, EYE, backgrounds, UI, VFX textures (all vs the bible)
        │           cleanup: background removal, trim, normalize size
        ▼
 (3) SPRITESHEETS -> only hero frame-moments (Eye reveal, idle shimmer); pack to atlas+JSON
        │           AI frames (AutoSprite/Ludo) OR AI-video->frames; TexturePacker
        ▼
 (4) WIRE -> assets.ts manifest -> Sprite / AnimatedSprite component -> Storybook story
        ▼
 (5) JUICE (code) -> tweens, particle emitters, filters/shaders, screen shake (§4)
        ▼
 (6) AUDIO + FEEL LOOP -> ambience/SFX + human-judged timing/easing via /run screenshots
```

| Need | Tool |
|---|---|
| Static art (hi-fi stylized) | Midjourney v7 / Flux (+ optional SDXL inpaint for cleanup) |
| Spritesheet frames (hero anim) | AutoSprite / Ludo.ai / PixelLab, or AI video → frame extract |
| Atlas packing | TexturePacker (or free-tex-packer) → PNG + JSON |
| Background removal / cleanup | rembg / Photoshop / Krita |
| Animation & VFX | **PixiJS code** (Container tweens, `@pixi/particle-emitter`, filters/shaders) |
| Audio | AI audio gen (ambience/SFX) + a SFX library |
| Engine | web-sdk (`pixi-svelte`, Storybook), spritesheets first-class (skip Spine) |

---

## 2. STYLE BIBLE (generate this FIRST, lock it, reuse it)

Produce **one** key-art frame that defines the world, then pin its style (`--sref`/seed)
for every subsequent asset. Target: a wide shot of the abyss with the Leviathan's Eye
glowing in the dark — this single image is your north star.

**Locked parameters**
- **Palette:** abyssal navy/near-black `#05080F`–`#0A1A2E`; bioluminescent cyan `#22E0FF`,
  teal `#1FB6A6`; accent amber/gold from the Eye `#FFB13C`; ghostly pearl whites for wild.
- **Lighting:** single dominant glow source (the Eye / bioluminescence), strong rim light,
  deep falloff to black, volumetric god-rays from above, faint caustics.
- **Render:** painterly semi-realistic, soft focus at depth, fine particulate (marine snow),
  subtle chromatic depth haze. Cinematic, ominous, awe — *not* cute, *not* photoreal.
- **Format:** transparent PNG for symbols (square, centered, even margin); 16:9 + 9:16 for
  backgrounds (game must run portrait + landscape).

**Midjourney v7 — key-art prompt (seed the whole project):**
```
deep abyssal ocean trench at crushing depth, a colossal ancient leviathan's single
enormous glowing eye emerging from pitch darkness, bioluminescent cyan and teal light,
volumetric god-rays from far above, drifting marine snow particles, ornate deep-sea
treasure, cinematic key art, painterly semi-realistic, dramatic rim lighting, deep
navy-to-black palette with amber-gold eye glow, ominous and awe-inspiring, high detail
focal point with soft hazy depth --ar 16:9 --style raw --v 7
```
**Negative / avoid:** `--no text, watermark, ui, frame, cartoon, flat vector, pixel art,
bright daylight, photoreal, cluttered, busy background`

**Then for every later asset append:** `--sref <key-art job> --sw 80` (Midjourney) or the
fixed seed/reference (Flux) so symbols, UI, and VFX all inherit the same world.

**Coherence checklist (apply to every generation):** same palette • same light direction
(glow from the Eye/above) • same render weight (painterly, soft depth) • transparent,
centered, consistent margin • re-roll anything that drifts rather than accepting it.

---

## 3. PRIORITIZED ASSET LIST (hero-first)

Spend effort top-down. Tiers 0–1 are what players stare at; later tiers can be simpler.
`static` = single AI image + code animation. `sheet` = true AI spritesheet. `code/VFX` =
generic particle/shader, no bespoke art.

### Tier 0 — HERO (most effort; these define the game)
| Asset | Make | Notes |
|---|---|---|
| **The EYE — idle** | static | the brand. Glow/iris pulse done in code. |
| **The EYE — ADD face / MUL face** | static ×2 | clearly distinct (e.g. ADD calm cyan, MUL violent amber/red) — readable at a glance |
| **The EYE — reveal (crack open)** | sheet | short frame anim of the eye opening/flaring; the signature moment |
| **The EYE — resolve burst** | code/VFX | shockwave + light + particles applied over the static eye |
| **Gaze meter** | static + code | the charge battery; fills/drains in code (see §4) |
| **Base background** | static | abyss trench, subtle parallax layers (foreground haze / mid / deep) |
| **Free-spins background** | static | deeper/darker, more bioluminescence, snowball badge space |
| **Win-cap scene** | static | the 15,000× moment — leviathan fully revealed / max drama |
| **Logo / key art** | static | from the style bible |

### Tier 1 — SYMBOLS (10) — `static` art each; win/explode mostly code
6×5 grid, padded to 6×7. Each symbol needs: **idle** (AI static), **win-pop** (code
squash/scale+glow), **explode** (generic VFX puff, §4). Keep one cohesive set.
| ID | Subject | Tier feel |
|---|---|---|
| H1 | Anglerfish | premium, most menacing/detailed |
| H2 | Nautilus | premium |
| H3 | Diving Helmet | premium |
| H4 | Jellyfish | premium (translucent glow) |
| L1–L4 | Cyan / Teal / Sapphire / Violet gems | low — bioluminescent gemstones, distinct hues |
| W | Pearl (Wild) | special — pearlescent, clearly "different/valuable" |
| S | Conch (Scatter) | special — ornate shell, glows on near-trigger (anticipation) |

> Symbol production tip: generate the **8 pay symbols as one sheet/batch in a single prompt
> family** so they share style, then split — cohesion is far easier than generating 8 apart.

### Tier 2 — VFX TEXTURES (generic, reusable; consistency is forgiving here)
`code/VFX`: bubble particle, marine-snow particle, god-ray gradient, soft glow/bloom
sprite, spark, explosion/implosion puff, water caustics overlay, energy/lightning wisp
(Eye), scatter glow ring, coin/treasure shimmer for wins.

### Tier 3 — UI (clean, themed; AI static + code states)
Spin button, bet +/−, autobet, turbo, **buy buttons ×3** (bonus 100× / super spins 20× /
super bonus 500×) + confirm modals, **ante toggle** (1.25×), balance/bet HUD, **win
counter**, **free-spins counter**, **snowball multiplier badge**, menu/paytable/rules
modal, settings, loading screen. Theme: carved deep-sea brass/coral, glowing accents.

### Tier 4 — AUDIO
Music loops (base / free-spins / super-bonus), ambient bed (deep ocean drone + sonar
pings), reel-drop, cascade-explode, **per-win-tier stings (map to `winLevel` 1–10)**,
**Gaze charge tick**, **Eye reveal (ADD vs MUL variants)**, **Eye resolve**, snowball
increment, scatter land, scatter anticipation riser, free-spins trigger fanfare,
**win-cap fanfare (leviathan roar)**, button clicks.

---

## 4. VFX / JUICE CHECKLIST (code-driven, mapped to the event vocabulary)

The polish lives here. Each row = a game moment (from
[ABYSSAL_FRONTEND_GUIDE.md §6](ABYSSAL_FRONTEND_GUIDE.md)) and the code-driven effects that
sell it. All on static sprites — no bespoke frame art needed unless noted.

| Moment / event | Juice (code) |
|---|---|
| Board `reveal` | reels drop with eased overshoot + soft bounce; ambient bubble/marine-snow emitters always on; subtle bg parallax |
| Scatter present (`anticipation`) | Conch **glows + pulses**; on the near-trigger reel, slow-reveal + riser SFX + screen-edge vignette tighten ("bait") |
| Scatter lands mid-tumble (organic) | extra glow + sonar ping as each Conch drops in; running on-board count tick |
| Win cluster (`winInfo`) | winning symbols **squash-pop + glow**, brief flash; floating win-amount label eased up; light coin/treasure shimmer |
| `tumbleBoard` (cascade) | exploding symbols **implode → puff VFX**; survivors fall with gravity ease; new symbols drop with bounce; small camera nudge per cascade |
| `gazeStep` (charge) | energy wisps fly **from the win positions into the Gaze meter**; meter fills with easing + glow; pitch-rising tick per step |
| No Eye (charge discarded) | Gaze meter **drains/dims with a deflating SFX** — render the near-miss (most spins) |
| `eyeReveal` | the Eye **cracks open + flares** (hero sheet); ADD = calm cyan bloom, MUL = violent amber/red; screen dims around it |
| `eyeResolve` | **shockwave + screen shake** scaled to `totalMult`; light burst; charge meter empties into the win; bigger mult = bigger shake/zoom |
| `setPersistentMult` (snowball) | multiplier badge **punches up + glows**, climb SFX; lingers as the feature's running total |
| `setWin` + `winLevel` 1–10 | celebration tier scales with `winLevel`: small = quick flash; mid = coin shower + sting; big = full-screen rays + slow count-up + bigger shake |
| `wincap` / `finalWin{capped}` | **max-win takeover**: leviathan/win-cap scene, full god-rays, screen shake, roar fanfare, big slow count-up to 15,000× |
| `freeSpinTrigger` | transition dive **deeper** (bg swap), Conch scatters converge + burst, feature intro card |
| `updateFreeSpin` / `freeSpinRetrigger` | spin counter punch; retrigger = extra-spins flash + SFX |
| `freeSpinEnd` | ascend transition back to base, total-win summary card |

**Global feel:** 60fps; turbo mode (speed up / skip cascades + Eye resolve); a tasteful
screen-shake budget (scale with win tier, cap it so autobet isn't nauseating); persistent
ambient particles; bg parallax on device tilt/resize.

---

## 5. Skills to author (encode the web-sdk patterns so agents don't drift)

| Skill | Does |
|---|---|
| `new-bookevent` | scaffolds the SDK's 9-step event pipeline (types → handlerMap → emitter types → component stub → story) from a row of our event map |
| `new-component` | a `pixi-svelte` component + its emitter handlers + Storybook stories, in SDK conventions |
| `wire-asset` ⭐ | the **AI-art → game bridge**: register a spritesheet/atlas in `assets.ts`, generate the `Sprite`/`AnimatedSprite` component + preview story |
| `pack-spritesheet` | raw AI frames → packed atlas + JSON (bg-removal, normalize, TexturePacker) |
| (built-ins) | `/run` + `/verify` (launch + screenshot to judge feel), `/code-review`, `/simplify` |

## 6. Agent / Storybook workflow

- Storybook's component isolation = clean **parallel subagents**, one per signature
  component (`Eye`, `GazeMeter`, `TumbleBoard`, `FreeSpins`, `WinPresentation`), each built
  & tested in isolation against our event map.
- An `Explore` agent to map `apps/scatter` as the template; a coordinator holding the event
  contract for integration.
- **Feel loop:** agent scaffolds + wires asset + codes first-pass juice → `/run` screenshots
  → **you judge the feel** → agent adjusts easing/timing/particles → repeat. Agents compress
  cycle time; your eye sets the bar.

## 7. Honest limits (what AI won't cover)

- **Bespoke character animation** at Pragmatic fidelity (frame-consistent personality). Keep
  the Eye mostly code-animated; accept simpler creature motion.
- **Perfect set cohesion** takes iteration + cleanup — the hidden cost is *making 30 assets
  look like one game*, not generating them.
- **Feel/taste** is human-judged; agents accelerate the loop but don't replace the eye.
- Net: the static-art + code-juice + audio hybrid reaches **very polished and atmospheric**
  (~80–90% of the *feel*). The last 10–20% (a Pragmatic art team) is the part AI won't close.

---

## 8. Recommended order of attack

1. **Style bible** (§2) — lock it; everything depends on it.
2. **The EYE + base background** (Tier 0 hero) — prove the look + the signature moment.
3. **8 symbols as one cohesive batch** (Tier 1).
4. **Core VFX textures** (Tier 2) + the code-juice for `reveal`/`winInfo`/`tumbleBoard`/`gazeStep`.
5. **The Eye reveal/resolve juice** (the brand moment) + Gaze meter.
6. **Free spins + snowball + win-cap** scenes & juice.
7. **UI + audio + feel pass + responsive/perf**.
