# Abyssal — Typography / Mobile-Perf Handoff

Paste everything below into a new chat to continue.

---

You are continuing work on **Abyssal**, a deep-sea tumbling slot in a `pixi-svelte` monorepo.
Working dir: `apps/abyssal` inside `.../lantern/front/web-sdk`. Dev server: **localhost:3002**
(`pnpm run dev --filter=abyssal`) — the user drives spins themselves. Read `CLAUDE.md` first.

## What just changed (2026-07-19)

### 1. The bitmap font is GONE — everything is canvas `Text` (Inter)

The branded `AbyssalBitmap` / `abyssal_new` BMFont has been **fully removed from code**. Every
number and caption now renders as canvas `Text` in **Inter**, styled from ONE module:

- **`src/game/textStyles.ts`** — `abyssalAmountTextStyle` (hero amounts), `abyssalLabelTextStyle`
  (small captions), `abyssalValueTextStyle` (HUD readouts), `eyeValueTextStyle` (Eye chips, own
  fill colour). All share `TEXT_PALETTE` and size stroke/shadow as **fractions of fontSize**
  (`stroke 0.09`, `blur 0.07`, `distance 0.028`) so a 23px caption and a 126px amount read as the
  same material.
- **`src/components/ResponsiveText.svelte`** — canvas equivalent of `ResponsiveBitmapText`
  (measure-then-scale, shrinks only). REQUIRED: plain `Text` does not fit-to-width, so long
  amounts would overflow their plaques.
- Font family is `FONT` in `src/components/controls/theme.ts` (`Inter, Arial, sans-serif`).
  `BAR_FONT` in ControlBar is an alias. **One source of truth — never hardcode a family.**

Converted: TumbleWinAmount, Win, WinBanner, WinCapCelebration, FreeSpinOutro, FreeSpinCounter,
GazeMeter, ClusterWinAmount, AbyssalEye, Eye, AbyssalPixiLogo.

Deleted: `CurrencyAmount.svelte`, `abyssalBitmapStyle`, `ABYSSAL_FONT_FAMILY`, the `abyssalFont`
asset entry, and the charset/split helpers.

### 2. UNFINISHED — delete the font files

`static/assets/fonts/Abyssal_new/` and `static/assets/fonts/abyssal_bitmap_font_package/` are now
**unreferenced**. Removing them saves **~1.8 MB download + 5.8 MB VRAM**. Left in place only
because the user hand-built that font this session; confirm before deleting.

### 3. THE RISK TO WATCH — count-up performance

Canvas `Text` **re-rasterizes on every string change** (canvas redraw + GPU upload). Win amounts
count up per frame — roughly **144 rasterizations per 2.4 s count-up**, now on EVERY counting
surface. This is exactly the cost the bitmap font existed to avoid. Desktop is fine; **low-end
mobile is the open question.** Test a big multi-tier win on a real phone. If it janks, the fallback
is bitmap for the digits + canvas Text for the currency symbol only.

## Mobile performance work (same session)

Measured VRAM was ~99 MB. Fixes applied:

- **Backgrounds halved** 2752×1536 → 1376×768 (**−24 MB VRAM**). Originals in
  `assets/backgrounds_original/`. Aspect preserved so `IMAGE_RATIO` still matches.
- **Per-symbol `GlowFilter`s removed** (Symbol.svelte) → additive halo sprites. A filtered
  container costs a **render-to-texture pass per frame**; a 12-symbol win + 3 scatters was ~15 RTTs
  every frame. Now 0.
- **Background filter/overlays gated off on mobile** via `canvasSizeType()`; only one background
  sprite renders outside the 720 ms crossfade.
- **Mipmaps** enabled on `symbols`, `reelFrame`, `winSteps` via a new optional `data` field
  threaded through `packages/pixi-svelte` (`AssetsLoader.svelte` + `types.ts`). Fixes mobile
  symbol aliasing.
- **Symbol atlas swapped** `symbols_final` → `symbol_black` (marked `TEST (2026-07-19)` in
  `assets.ts` + `SYMBOL_SOURCE_SIZES` 484×495 → 495×501). User confirmed it looks better. Decide
  whether to keep and drop the TEST comments.

## Facts that were expensive to establish — do NOT re-derive

- **Layout scale**: `mainSizesMap` in `stateLayout.ts` uses 1920×1080 for ALL orientations. The
  board is 1380 design units wide, so a "correct" 1080-wide portrait canvas would NOT fit it.
  `MOBILE_REEL_DISPLAY_SCALE = 1.45` already compensates. **Do not change the portrait canvas.**
- **Old vs new font vertical metrics were effectively identical** (glyph centre −9.90 vs −9.64 per
  100px). Plaque positions were always correct; a "centring correction" was added and then removed
  because it pushed every amount ~10 px low. **If text looks off-centre, measure before nudging.**
- **Pixi `Text` centres the FONT BOX, not the ink** — glyph ink sits ~+3.5 (per 100px) below the
  origin, varying per glyph (`$` +5.5, `₦`/`₩` +6.5, `Rp` +13.5).
- **Measure in the live renderer, not from `.fnt` files.** `__PIXI_APP__` is exposed on the page
  and `await import('/@id/pixi.js')` works in the Vite dev server — that is how the above were
  measured after arithmetic from the `.fnt` gave wrong answers twice.
- **Currency**: `packages/utils-shared/amount.ts` has 49 currencies. The old bitmap font could not
  draw 22 of them (no lowercase except `x`, no `/`, none of `₹ ₽ ₩ ₺ ₦ ₡ ₨ ₫ ₱ ₵`). Inter draws
  all of them — this is now moot, but it is why the migration happened.

## Other open items

- **Sound**: complete and validated (28-name union, all enabled, sprite ↔ union 1:1). Repack after
  ANY audio change: `python assets/audio/pack_sprite.py`. See `assets/audio/SOUND_WORK_HANDOFF.md`.
  One stray file: `static/assets/sounds/sfx_gaze_full.mp3` is a user drop never imported to
  `assets/audio/src/` — ask whether to import + repack.
- **Deployed sounds 500**: `sounds.json` 404/500s on
  `celest-studios.live.stake-engine.com`. Build contains it; likely the upload dropped the folder
  (audio.m4a is 5 MB). Test a known-bad path to confirm 500 == missing on that host.
- **Tumble banner equation** (`"raw × mult"`) still shows a currency string; on the old font the
  symbol vanished. Now on Inter it should be fine — verify.
- **`typesEmitterEvent.ts` tsc errors are PRE-EXISTING NOISE** (plain `tsc` cannot read `.svelte`
  exports). All 17 fail; ignore them. Same for `src/stories/**` (Storybook is retired) and the
  `$app/*` / `$env/*` module errors.
- `pnpm lint` fails environmentally (ESLint 9 wants a flat config); not caused by these changes.

## How to verify

`pnpm tsc` (filter the known noise above), then fetch changed modules through the dev server
(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/src/components/X.svelte`) to
confirm Vite compiles them. For anything visual/behavioural, the user drives the live game.
