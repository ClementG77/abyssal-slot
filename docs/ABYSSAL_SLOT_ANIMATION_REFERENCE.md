# Abyssal Slot Animation Reference

Generated from the current frontend implementation on 2026-07-02. This file maps every slot-design and slot-animation surface I found: reels, frame, symbols, tumble/cascade, wins, scatter, Gaze/Eye, free spins, transitions, assets, sounds, and known rebuild gaps.

## Executive Summary

Abyssal is mostly code-animated Pixi/Svelte/GSAP, not frame-by-frame animation. The visual system is event-driven:

1. `src/game/actor.ts` starts a spin and broadcasts frame launch events.
2. `src/game/bookEventHandlerMap.ts` translates book events into UI events.
3. `src/components/Game.svelte` mounts the render layers in the visual order.
4. `src/components/*` consume emitter events and animate Pixi containers, sprites, graphics, tweens, and filters.
5. `src/game/constants.ts` centralizes reel geometry, symbol sizing, frame layouts, Gaze meter measurements, spin physics, and special symbol constants.
6. `src/game/assets.ts` registers the images/atlases used by the animations.

Important current implementation notes:

- The primary slot board is 6 columns x 5 visible rows, with padded top/bottom rows for reel/cascade motion.
- The reel frame has a background layer and an overlay layer, both rendered around the board.
- Symbols are atlas sprites where possible, with code-driven state transitions for land, win, post-win, explosion, scatter, and Eye behavior.
- The tumble/cascade animation temporarily hides the main board and uses `TumbleBoard` to explode and refill cells.
- The Gaze/Eye feature is the most developed bespoke animation path.
- Free-spin intro/retrigger/outro and max-win are still partially placeholder/asset-card driven.
- There are a few stale or broken asset/component hooks, listed in "Known Gaps And Risks".

## Render Layer Order

Main composition: `src/components/Game.svelte`

Mounted inside the blurred game scene:

- `Background`: animated base/free-spins background crossfade, shimmer, god rays, marine snow.
- `ReelFrame layer="background"`: reel panel behind symbols.
- `Board` and `TumbleBoard`: main board and temporary cascade board.
- `ReelFrame layer="overlay"`: separators, border, glints, surges.
- `BoardDebris`, `Anticipations`, `TumbleWinAmount`, `GazeMeter`, `ClusterWinAmounts`: board-space overlays.
- `Eye`: board-space Eye equation/resolve overlay.
- `ScatterFx`: screen dim, scatter anticipation audio bridge, trigger link/flash.
- `Win`, `ScatterPay`, `WinCapCelebration`, `FreeSpinCounter`, `FreeSpinOutro`: larger presentation overlays.

Mounted outside the blurred scene:

- `FreeSpinIntro`: shown above the blurred board while waiting for player press.
- `FreeSpinRetrigger`: retrigger card and tap-to-skip.
- `Transition`: dark dive fade/iris cover/reveal.

Note: `FreeSpinCounter` is currently only mounted for `desktop` and `landscape` layouts.

## Event Pipeline

Core bridge: `src/game/bookEventHandlerMap.ts`

| Book event / action | UI events emitted                                                                                  | Main components                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| new game start      | `reelFrameSpinLaunch`, `enhancedBoard.preSpin`                                                     | `BoardContainer`, `ReelFrame`, `utils-slots` reels                         |
| `reveal`            | reset tumble/Gaze/Eye, `enhancedBoard.spin`, end scatter anticipation                              | `Board`, `GazeMeter`, `Eye`, `ReelFrame`                                   |
| `winInfo`           | `boardWithAnimateSymbols`, `showClusterWinAmounts`                                                 | `Board`, `Symbol`, `ClusterWinAmounts`                                     |
| `updateTumbleWin`   | `tumbleWinAmountShow`, `tumbleWinAmountUpdate`                                                     | `TumbleWinAmount`                                                          |
| `gazeStep`          | `gazeMeterFill`                                                                                    | `GazeMeter`, `Symbol` Eye intensity                                        |
| `scatterPay`        | `scatterPayShow`                                                                                   | `ScatterPay`                                                               |
| `tumbleBoard`       | hide main board, show/init temporary board, explode, remove, slide, settle main board              | `TumbleBoard`, `BoardDebris`, `Symbol`                                     |
| `eyeDrop`           | board cell becomes closed Eye, drop tween, `boardEyeImpact`, `reelFrameEyeLand`                    | `Symbol`, `AbyssalEye`, `BoardContainer`, `ReelFrame`                      |
| `eyeReveal`         | board Eye receives type/value, `eyeShow`                                                           | `AbyssalEye`, `Eye`, `GazeMeter`                                           |
| `eyeResolve`        | `gazeMeterToEye`, `eyeBurst`, `eyeHide`, `gazeMeterReset`                                          | `GazeMeter`, `Eye`, `TumbleWinAmount`                                      |
| `setPersistentMult` | `snowballShow`, `snowballUpdate`                                                                   | `FreeSpinCounter`, `PersistentMultiplier` if mounted                       |
| `setWin`            | optional `gazeMeterDrain`, optional `tumbleWinAmountMultiply`, then `winShow`/`winUpdate` for 20x+ | `TumbleWinAmount`, `Win`                                                   |
| `wincap`            | `winCapTrigger`                                                                                    | `WinCapCelebration`                                                        |
| `freeSpinTrigger`   | animate scatters, `scatterCelebrate`, transition, intro card, bgm, frame glow, counter/snowball    | `ScatterFx`, `Transition`, `FreeSpinIntro`, `FreeSpinCounter`, `ReelFrame` |
| `updateFreeSpin`    | `freeSpinCounterUpdate`                                                                            | `FreeSpinCounter`                                                          |
| `freeSpinRetrigger` | animate scatters, `freeSpinRetriggerShow`, counter total update                                    | `FreeSpinRetrigger`, `FreeSpinCounter`                                     |
| `freeSpinEnd`       | UI hide, frame glow hide, outro card, exit cover/reveal                                            | `FreeSpinOutro`, `Transition`, `ReelFrame`                                 |

Typed emitter union: `src/game/typesEmitterEvent.ts`

## Reel And Board Motion

Primary files:

- `src/game/actor.ts`
- `src/game/stateGame.svelte.ts`
- `src/game/constants.ts`
- `src/components/Board.svelte`
- `src/components/BoardContainer.svelte`
- `src/components/ReelFrame.svelte`

Current behavior:

- `actor.ts` broadcasts `reelFrameSpinLaunch` before `enhancedBoard.preSpin`.
- Reels are created through `utils-slots` via `createReelForCascading`.
- `SPIN_OPTIONS_DEFAULT` and `SPIN_OPTIONS_FAST` drive fall-in/out speed, intervals, bounce, padding, and anticipation padding.
- Turbo doubles main symbol fall speeds and removes fall-in interval.
- Board launch animation is visualized by `BoardContainer` and `ReelFrame`, not by the reel utility alone.
- `BoardContainer` applies launch shake/scale for about `0.62s`: vertical shake up to about 42 board px and scale boost about 4.5%.
- `BoardContainer` also applies Eye impact jolt through a GSAP timeline: compress/stretch, x/y shake, rotation, then back-out settle.
- `ReelFrame` mirrors spin launch motion so frame and board feel connected.

Rebuild notes:

- Keep board and frame launch response synced; currently both listen to the same event and recompute similar launch energy.
- Consider extracting launch/anticipation/impact timings into shared constants so the frame, board, and audio do not drift.

## Reel Frame

Primary files:

- `src/components/ReelFrame.svelte`
- `src/components/ProceduralReelFrame.svelte`
- `src/game/constants.ts`
- `static/assets/frame/reel_frame/atlas.json`
- `static/assets/frame/reel_frame/atlas.png`

Current asset frame:

- Uses atlas layers:
  - `frame_background.png`
  - `frame_separator.png`
  - `frame_border.png`
- `ReelFrame` supports `layer="background"` and `layer="overlay"`.
- Base and free-spin layouts crossfade via `featureMix` over about `620ms`.
- Free spins switch glow color to ember/red; base uses purple.
- Overlay adds:
  - bottom surge strips on spin/scatter/Eye energy,
  - moving glint across the top,
  - separators,
  - foreground border,
  - optional debug grid.
- `reelFrameGlowShow`/`Hide` boosts persistent feature glow.
- `reelFrameScatterLand` produces cyan burst energy for about `0.52s`.
- `reelFrameEyeLand` produces purple burst energy for about `0.76s`.
- `reelFrameScatterAnticipationStart`/`End` adds a zoom/hold, released over about `0.2s`.

Procedural frame:

- `ProceduralReelFrame.svelte` is a code-drawn fallback/variant with separate base/free-spins palettes, glow, glints, bottom clouds, and launch shake.
- It is not mounted in `Game.svelte`.

Rebuild notes:

- The atlas frame is the production path.
- The procedural frame can be used as a fallback/reference for code-generated frame states, but should either be intentionally mounted/storybooked or archived.

## Background

Primary files:

- `src/components/Background.svelte`
- `static/assets/background/base.webp`
- `static/assets/background/freespins.webp`

Current behavior:

- Full-cover painted background with deep fallback rect.
- Base/free-spins backgrounds crossfade with `featureMix` over about `720ms`.
- Uses `ColorMatrixFilter` for slow brightness and hue shimmer.
- Adds slow drift and breathing scale to the cover transform.
- Draws swaying god rays and marine snow particles in code.

Rebuild notes:

- The background is lightweight and already separated from board effects.
- If adding heavier environmental FX, keep them behind the board and controlled by feature state.

## Symbol System

Primary files:

- `src/components/Symbol.svelte`
- `src/components/ReelSymbol.svelte`
- `src/components/TumbleSymbol.svelte`
- `src/components/SymbolWrap.svelte`
- `src/components/AbyssalEye.svelte`
- `src/components/SheetSymbol.svelte`
- `src/game/constants.ts`
- `src/game/types.ts`

Symbol states:

- `static`
- `spin`
- `land`
- `win`
- `postWinStatic`
- `explosion`

Atlas frame mapping:

- H1 -> `H1`
- H2 -> `H2`
- H3 -> `H3`
- H4 -> `H4`
- L1 -> `L1`
- L2 -> `L2`
- L3 -> `L3`
- L4 -> `L4`
- L5 -> `L5`
- S -> `SCATTER`
- Eye variants use `CLOSE_EYE`, `ADD_EYE`, `MULT_EYE`

Current generic symbol behavior:

- `land`: scale starts at `0.84`, alpha snaps to `1`, then scales to `1` in `150ms / timeScale` with `backOut`.
- Non-Eye land squash: `scaleX 1.08`, `scaleY 0.92`, settles in `0.26s`.
- `win`: quick squash-pop, glow copy, scale to `1.2` in `150ms / timeScale`, then resolves the awaited animation.
- `postWinStatic`: non-Eye/non-scatter symbols grow toward `1.4` over `1100ms / timeScale`, holding visual tension before explosion.
- `explosion`: starts from grown size, fades alpha to 0 and scales down to `0.2` over `150ms / timeScale`.
- Non-Eye winning cells draw an electric border and wiggling lightning while in `win` or `postWinStatic`.
- Explosion cell flash is local; flying shards are handled by `BoardDebris`.

Scatter symbol behavior:

- Scatter breathes forever while visible.
- In normal state breathes to about `1.025` over `1.1s`.
- During anticipation breathes harder to about `1.05` over `0.42s`.
- On land, plays quick flare and expanding ring.
- When part of trigger/win connection, gets a pulsing additive halo.

Eye symbol behavior:

- Closed and resolved Eyes render through `AbyssalEye`.
- Closed Eye brightens as Gaze charge rises.
- Resolved Eye uses ADD/MUL atlas art and labels the value without plus/multiply prefix.
- `AbyssalEye` layers additive halo, atlas sprite, tinted copy, flash copy, optional burst, shock ring, particles, and value text.
- Eye idle has alpha shimmer and random slow sway.
- Eye land animates from above with heavy drop, squash, small rotation, and shake.
- Eye reveal has stronger glow/text pop for MUL than ADD.
- Eye burst can be used as standalone eruption FX.

Sheet symbol:

- `SheetSymbol.svelte` is a generic grid-sliced `AnimatedSprite` component that only plays on `win`.
- I did not find it mounted in the main game path.

Rebuild notes:

- `Symbol.svelte` is the main symbol animation source of truth today.
- For a rebuild, keep the state-machine style. It gives clear sequencing guarantees to `Board` and `TumbleBoard`.
- Consider moving per-state timings into `constants.ts` or an `animationTimings.ts` file.

## Tumble And Cascade

Primary files:

- `src/components/TumbleBoard.svelte`
- `src/components/TumbleBoardBase.svelte`
- `src/components/TumbleSymbol.svelte`
- `src/components/BoardDebris.svelte`
- `src/components/TumbleWinAmount.svelte`
- `src/game/bookEventHandlerMap.ts`

Current sequence:

1. `tumbleBoard` book event hides the main board.
2. `TumbleBoard` shows and builds two temporary layers:
   - `tumbleBoardBase`: current board symbols.
   - `tumbleBoardAdding`: new symbols above the grid.
3. Exploding positions are de-duped.
4. `BoardDebris` receives board-level shard bursts before cells collapse.
5. Matching temporary symbols enter `explosion` state and are awaited.
6. Exploded cells are removed from `tumbleBoardBase`.
7. Combined columns slide down.
8. Refill drop is staggered left-to-right by `80ms / timeScale` per column.
9. Each falling symbol moves to target Y over `200ms` with `backOut`.
10. Inner non-Eye symbols trigger `land`; Eye cascade refills are intentionally not bounced.
11. Main board is settled from the temporary combined board.
12. Temporary board resets/hides; main board shows again.

Debris behavior:

- Each exploded cell spawns 11 shards.
- Burst duration is about `620ms / timeScale`.
- Shards fly outward, arc down with gravity, draw motion streaks and bright heads.

Tumble win banner:

- `TumbleWinAmount` sits above reels, centered in base game and nudged left in feature portrait mode.
- Shows `tumble_win.png`.
- Raw tumble amount normally snaps unless `animate` is true.
- Eye multiplier path:
  - `xN` token flies from board cell/center to banner.
  - Token alpha/scale pops, travels for about `0.5s`, impacts panel.
  - Banner briefly shows `raw x mult`.
  - Counts from raw to final win over about `620ms / timeScale`.

Rebuild notes:

- The cascade is already split cleanly into stateful board logic and reusable symbol animations.
- If adding particles per symbol type, `BoardDebris` is the best central place.
- Eye refills during cascade are intentionally quiet today; changing that will alter feature pacing.

## Cluster Wins

Primary files:

- `src/components/ClusterWinAmounts.svelte`
- `src/components/ClusterWinAmount.svelte`
- `src/components/Board.svelte`

Current behavior:

- `winInfo` triggers symbol win state and per-cluster floating amount labels in parallel.
- Cluster positions are de-duped before awaiting symbol animation.
- Labels pop from scale `0.4` to `1`, float up about `0.7 * SYMBOL_SIZE` over `0.8s / timeScale`, then fade over `180ms`.
- Amount is raw cluster win; Eye multiplication happens later at spin-total level.

Rebuild notes:

- Good spot to add richer cluster-specific beams or outlines.
- Keep de-dupe behavior; duplicate cluster cells can otherwise hang the sequence.

## Gaze Meter

Primary files:

- `src/components/GazeMeter.svelte`
- `src/components/GazeBar.svelte`
- `src/game/constants.ts`
- `static/assets/frame/gaze_sprite/winmeter.png`

Current behavior:

- `GazeMeter` is mounted in board space and uses measured coordinates from `winmeter.png`.
- Meter rotates in portrait.
- `gazeMeterFill`:
  - records source win positions,
  - plays a reel-stop sound tick,
  - draws energy beams from winning positions into meter,
  - fills the track using `Tween` duration about `520ms` with `cubicOut`,
  - plays burst/text-scale FX,
  - overcharge shimmer if charge exceeds max charge.
- `gazeMeterToEye`:
  - animates charge token from meter to Eye over about `540ms`,
  - drains fill to zero over about `300ms`.
- `gazeMeterDrain`:
  - drains fill over about `420ms`,
  - waits about `120ms`,
  - clears charge and sources.

GazeBar:

- `GazeBar.svelte` is a standalone polished liquid fill component with GlowFilter, bubbles, and meniscus.
- I only found it in Storybook, not in the main game.

Rebuild notes:

- The current `GazeMeter` replaced/absorbed the separate `GazeBar` role.
- If improving meter visuals, either integrate `GazeBar` effects into `GazeMeter` or remove the unused story-only path.

## Eye Resolve

Primary files:

- `src/components/Eye.svelte`
- `src/components/AbyssalEye.svelte`
- `src/components/TumbleWinAmount.svelte`
- `src/game/bookEventHandlerMap.ts`

Current behavior:

- `eyeDrop` places a closed Eye on the settled board and drops it in with a Tween.
- `eyeReveal` updates the board cell to ADD/MUL and broadcasts `eyeShow`.
- `eyeResolve` first sends Gaze energy into Eye, then broadcasts `eyeBurst`.
- `Eye.svelte` shows the resolve equation at board center:
  - board dims to about `0.72` alpha,
  - starts with Gaze charge,
  - sorts opened Eyes so ADD chips fold in before MUL chips,
  - each chip flies from its board cell to center,
  - running value updates and pops,
  - final total multiplier gets a bigger punch.
- After resolve, `setWin` carries the multiplier to `TumbleWinAmount` so the raw tumble win becomes final win.
- Resolved board Eye values are stripped back to closed Eye after multiplier is spent.

Rebuild notes:

- This is the strongest current feature path and should be preserved as the model for future feature animations.
- Ultimate multi-Eye support already exists in the animation path.

## Scatter And Anticipation

Primary files:

- `src/components/Anticipations.svelte`
- `src/components/Anticipation.svelte`
- `src/components/ScatterFx.svelte`
- `src/components/ScatterPay.svelte`
- `src/components/Symbol.svelte`
- `src/game/stateGame.svelte.ts`

Current behavior:

- Math sets per-reel `reelState.anticipating`.
- `Anticipations` bridges that reel flag to global events:
  - `reelFrameScatterAnticipationStart`
  - `reelFrameScatterAnticipationEnd`
- `Anticipation.svelte` no longer draws a per-reel column highlight. It only clears the flag after the anticipated reel stops.
- `ScatterFx` owns:
  - screen dim to about `0.4`,
  - anticipation start/loop sounds,
  - stopping anticipation,
  - trigger celebration links between scatter positions,
  - trigger flash.
- Scatter land in `stateGame.svelte.ts`:
  - increments scatter counter,
  - plays scatter-stop sound based on landing count,
  - triggers `reelFrameScatterLand`.
- Scatter trigger path:
  - `freeSpinTrigger` first animates scatter symbols as wins,
  - `scatterCelebrate` links positions and flashes,
  - then the game transitions to free spins.
- Scatter pay path:
  - `scatterPay` shows `4 SCATTERS`, `5 SCATTERS`, or `6 SCATTERS`.
  - 6 scatters is hero style with deeper dim, bigger text, flash, and longer hold.

Rebuild notes:

- Anticipation is intentionally global now, not per-reel.
- If you want more suspense, add an explicit visual in `Anticipation.svelte` or `ScatterFx`, but keep the event lifecycle controlled by `reelState.anticipating`.

## Win Presentation

Primary files:

- `src/components/Win.svelte`
- `src/components/WinBackdrop.svelte`
- `src/components/WinBanner.svelte`
- `src/components/WinCoins.svelte`
- `src/components/WinCapCelebration.svelte`
- `src/game/winLevelMap.ts`
- `src/game/bookEventHandlerMap.ts`

Thresholds and behavior:

- `setWin` gates center-screen celebration below `20x`.
- `Win.svelte` has live presentation tiers:
  - `20x` -> `bigWin`
  - `50x` -> `megaWin`
  - `150x` -> `epicWin`
  - `15000x` -> `maxWin`
- Count-up duration is tier-based:
  - Big: `3.5s`
  - Mega: `4.5s`
  - Epic: `5.5s`
  - Max: `7s`
- Count-up can be interrupted by press-to-continue; it snaps to final.
- Banner enters with scale/alpha GSAP.
- Tier changes trigger:
  - banner pop,
  - coin burst,
  - screen shake,
  - placeholder tier-up sound.
- Final lock triggers:
  - number pop/flash,
  - bigger coin burst,
  - stronger shake,
  - placeholder lock sound.
- `WinBackdrop` draws rotating rays and pulsing radial glow.
- `WinCoins` spawns physics coin bursts with gravity and fake spin via ellipse squash.

Win cap:

- `wincap` triggers `WinCapCelebration`.
- Current max-win cap screen is placeholder: dark overlay, `MAX WIN`, amount, hold about `3500ms`.
- It does not currently use `timeScale`.

Rebuild notes:

- There is overlap between `Win.svelte` max tier and `WinCapCelebration`. Decide whether max win should be a normal win tier, a dedicated takeover, or both in sequence.
- `WinCapCelebration` is explicitly marked as awaiting full art pass.

## Free Spins And Snowball

Primary files:

- `src/components/FreeSpinIntro.svelte`
- `src/components/FreeSpinRetrigger.svelte`
- `src/components/FreeSpinCounter.svelte`
- `src/components/FreeSpinOutro.svelte`
- `src/components/PersistentMultiplier.svelte`
- `src/components/Transition.svelte`
- `src/game/bookEventHandlerMap.ts`

Free-spin trigger sequence:

1. Play scatter win sound.
2. Animate triggering scatters as winning symbols.
3. Play `scatterCelebrate`.
4. Hide UI.
5. Play dark transition fade.
6. Show `FreeSpinIntro`.
7. Start free-spin music.
8. Wait for player press.
9. Hide intro and switch `gameType` to `freegame`.
10. Show reel-frame glow.
11. Initialize snowball multiplier to `x1`.
12. Show/update free-spin counter.
13. Show UI.

FreeSpinIntro:

- Uses `freeSpinIntro.png`.
- Backdrop fades to about `0.72`.
- Card enters from scale `0.82`, y `48`, alpha `0`, into scale `1`, y `0`.
- Waits for click/tap to unblock the book sequence.
- Blurs underlying game scene via `Game.svelte` while active.
- Does not currently draw `totalFreeSpins` even though the event passes it.

FreeSpinRetrigger:

- Uses `retrigger.png`.
- Backdrop fades to about `0.78`.
- Card enters from scale `0.74`, y `52`.
- Auto-dismisses after `2200ms`, or on press.
- Event carries `totalFreeSpins`, but the component does not display it.

FreeSpinCounter:

- Shows `total_mult.png` plus `freespins_count.png`.
- Displays persistent multiplier and `current / total`.
- On `snowballUpdate`, total multiplier panel pops to `1.16` if multiplier climbed.
- Mounted only on desktop/landscape.

PersistentMultiplier:

- Separate snowball badge component exists and pops to `1.35`.
- It is not mounted in `Game.svelte`.

FreeSpinOutro:

- Uses `freeSpinOutro.png`.
- Draws total amount into the card.
- Currently placeholder behavior: sets amount and waits `2200ms / timeScale`; no animated count-up.

Transition:

- `transition`: dark fade in/out, each about `320ms / timeScale`.
- `freeSpinExitCover`: dark cover over `350ms`.
- `freeSpinExitReveal`: iris reveal over `1650ms`.
- Replaces an older Spine-style `TransitionAnimation` to avoid sequence stalls.

Rebuild notes:

- Decide whether the feature HUD is `FreeSpinCounter`, `PersistentMultiplier`, or both.
- Add mobile feature HUD if free-spins state must remain visible in portrait.
- Intro/retrigger should probably display awarded/retriggered spins if the static art does not.

## Sound Hooks

Primary files:

- `src/components/Sound.svelte`
- `src/game/sound.ts`
- `src/game/bookEventHandlerMap.ts`
- `src/game/stateGame.svelte.ts`

Current sound mapping:

- Main/free-spin/win-tier music is switched by `soundMusic`.
- Reel stop sound is fired on reel stopping and Gaze fill ticks.
- Scatter land increments `stateGame.scatterCounter` and plays one of five scatter stop sounds.
- Scatter anticipation has start and loop sounds.
- Scatter trigger/pay uses `sfx_scatter_win_v2`.
- Eye/Gaze combine uses multiplier landing/combine/explosion sounds.
- Snowball multiplier climb uses `sfx_multiplier_up`.
- Win tier-up and lock currently use placeholder sounds in comments.
- Big win type starts `sfx_bigwin_coinloop`; it is stopped after presentation.

Rebuild notes:

- Sound types include more SFX than are currently used.
- Keep sound tied to emitter events rather than component mount timing so skip/turbo paths stay consistent.

## Asset Inventory

Registered in `src/game/assets.ts`:

- Backgrounds:
  - `backgroundBase` -> `assets/background/base.webp`
  - `backgroundFs` -> `assets/background/freespins.webp`
- Frame:
  - `reelFrame` -> `assets/frame/reel_frame/atlas.json`
  - `winMeter` -> `assets/frame/gaze_sprite/winmeter.png`
- Symbols:
  - `symbols` -> `assets/symbols/eye/eye.json`
- Win/presentation:
  - `bigWin`, `megaWin`, `epicWin`, `maxWin`
  - `tumbleWin`
  - `freeSpinIntro`
  - `freeSpinOutro`
  - `freeSpinsCount`
  - `totalMultBanner`
  - `freeSpinsRetrigger`
- Font:
  - `abyssalFont` -> `assets/fonts/font_abyssal.ttf`

Static files found in `static/assets/wins`:

- `big_win.png`
- `epic_win.png`
- `freespins_count.png`
- `freespin_intro.png`
- `freespin_outro.png`
- `freespin_retrigger.png`
- `max_win.png`
- `mega_win.png`
- `retrigger.png`
- `total_mult.png`
- `tumble_win.png`

Asset concerns found:

- `src/game/assets.ts` still registers `freeSpinsBanner` at `assets/wins/freespins.png`, but that file is missing in the current worktree.
- `src/game/assets.ts` registers `abyssalFont` at `assets/fonts/font_abyssal.ttf`, but that file is missing in the current `static/assets/fonts` tree.
- `static/assets/wins/freespin_retrigger.png` exists, but the registered retrigger asset points to `retrigger.png`.
- `freeSpinsBanner` does not appear to be used in the main components, but missing preloaded assets can still break loading depending on asset loader behavior.

## Unused Or Story-Only Animation Components

These files exist but are not part of the main mounted game path I found:

- `src/components/ProceduralReelFrame.svelte`: procedural frame variant/fallback.
- `src/components/GazeBar.svelte`: standalone liquid Gaze bar, used in Storybook.
- `src/components/SheetSymbol.svelte`: generic `AnimatedSprite` symbol sheet helper.
- `src/components/PersistentMultiplier.svelte`: snowball badge exists but is not mounted in `Game.svelte`.
- `src/components/TransitionAnimation.svelte`: used by `LoadingScreen`, not by free-spin transitions.

## Known Gaps And Risks

1. Missing registered assets:
   - `static/assets/wins/freespins.png`
   - `static/assets/fonts/font_abyssal.ttf`

2. Snowball UI split:
   - `PersistentMultiplier` listens for `snowballShow/Hide/Update` but is not mounted.
   - `FreeSpinCounter` also listens to `snowballUpdate`, but it is only mounted on desktop/landscape.
   - Portrait may have no visible feature multiplier/counter unless handled elsewhere.

3. Free-spin intro/retrigger event data is underused:
   - `freeSpinIntroUpdate` receives `totalFreeSpins` but does not display it.
   - `freeSpinRetriggerShow` receives `totalFreeSpins` but does not display it.

4. Max-win presentation is placeholder:
   - `WinCapCelebration` is a simple text overlay and does not use `timeScale`.
   - There is also a `maxWin` tier in `Win.svelte`; decide final ownership.

5. Free-spin outro is placeholder:
   - Total amount is shown, but not counted up.

6. Animation timings are spread across components:
   - Board/frame launch, scatter anticipation, tumble, Eye, win, and feature cards each define local durations.
   - Good for iteration, but harder to tune globally.

7. Some comments/docs refer to older planned components:
   - Existing roadmap/event docs mention components like `FreeSpinAnimation`, `BankedMultiplier`, and old transition paths. Current implementation names differ.

## Rebuild / Improvement Priorities

1. Fix asset registry first:
   - Remove unused missing `freeSpinsBanner`, restore the file, or point it to the current intro/retrigger assets.
   - Restore or update `abyssalFont`.

2. Decide feature HUD architecture:
   - Use `FreeSpinCounter` as the combined free-spins + snowball HUD, or mount `PersistentMultiplier` as a separate badge.
   - Make the portrait behavior explicit.

3. Centralize timing tokens:
   - Create shared timings for spin launch, scatter anticipation, symbol land/win/explode, tumble drop, Eye resolve, feature cards, and win presentation.

4. Finish the placeholder presentations:
   - Free-spin outro count-up.
   - Free-spin retrigger count/details.
   - Max-win takeover.

5. Make story states for every slot beat:
   - Spin launch
   - Scatter anticipation
   - Scatter pay 4/5/6
   - Tumble explode/refill
   - Gaze fill/drain/to-Eye
   - Single Eye resolve
   - Ultimate multi-Eye resolve
   - Snowball update
   - Big/Mega/Epic/Max win
   - Free-spin intro/retrigger/outro

6. Preserve the event-driven contract:
   - Components should keep awaiting their own animation completion through `broadcastAsync`.
   - Do not let long-lived idle FX block book event progression.

## Fast Search Map

Use these when improving a specific feature:

- Whole event choreography: `src/game/bookEventHandlerMap.ts`
- Board/reels state: `src/game/stateGame.svelte.ts`
- Geometry/timing/assets constants: `src/game/constants.ts`
- Asset registry: `src/game/assets.ts`
- Main mounted order: `src/components/Game.svelte`
- Reel frame: `src/components/ReelFrame.svelte`
- Board wrappers/shake: `src/components/BoardContainer.svelte`
- Symbol states: `src/components/Symbol.svelte`
- Eye component: `src/components/AbyssalEye.svelte`
- Tumble/cascade: `src/components/TumbleBoard.svelte`
- Debris: `src/components/BoardDebris.svelte`
- Tumble win banner: `src/components/TumbleWinAmount.svelte`
- Gaze meter: `src/components/GazeMeter.svelte`
- Eye resolve overlay: `src/components/Eye.svelte`
- Scatter anticipation/celebration: `src/components/ScatterFx.svelte`, `src/components/Anticipations.svelte`
- Scatter pay: `src/components/ScatterPay.svelte`
- Win presentation: `src/components/Win.svelte`, `WinBanner.svelte`, `WinBackdrop.svelte`, `WinCoins.svelte`
- Max win: `src/components/WinCapCelebration.svelte`
- Free spins: `FreeSpinIntro.svelte`, `FreeSpinRetrigger.svelte`, `FreeSpinCounter.svelte`, `FreeSpinOutro.svelte`
- Transition: `src/components/Transition.svelte`
- Sound: `src/components/Sound.svelte`, `src/game/sound.ts`
