import { FillGradient, type TextStyleOptions } from 'pixi.js';

import { DISPLAY_FONT, FONT } from '../components/controls/theme';

// ---------------------------------------------------------------------------------------------
// Canvas-text styles for the game's on-screen numbers and captions.
//
// WHY CANVAS TEXT AND NOT THE BITMAP FACE
//   * Full Unicode. The bitmap page cannot draw 22 of Stake's 49 currency symbols (no lowercase
//     except `x`, no `/`, none of ₹ ₽ ₩ ₺ ₦ ₡ ₨ ₫ ₱ ₵) and BitmapText SILENTLY SKIPS what it
//     lacks — players on those currencies simply lost the symbol.
//   * No minification. The page is rasterized at 192px; a ~23px caption is an 8.5x reduction that
//     turns the baked bevel/outline to mush. Canvas Text rasterizes at the exact size asked for.
//
// COST: canvas Text re-rasterizes whenever its string changes, so a per-frame count-up pays a
// canvas redraw + GPU upload each frame. That is the cost the bitmap font originally avoided —
// keep an eye on low-end mobile during long count-ups.
// ---------------------------------------------------------------------------------------------

// One palette so every number/caption in the game reads as the same material. Sampled from the
// reel-frame border art (pearl ivory over warm taupe) so the type matches the furniture.
export const TEXT_PALETTE = {
	fill: 0xfffbed, // pearl-cream face
	fillBright: 0xffffff, // captions on mid-tone panels, where contrast matters more than warmth
	stroke: 0x2a1a0c, // deep warm brown — reads as the frame's shadow, not a black outline
	shadow: 0x0a0410, // near-black with a violet lean, matching the abyss backdrop
} as const;

// Stroke and shadow are sized as FRACTIONS OF THE FONT SIZE, so a 23px caption and a 126px hero
// amount carry a proportionally identical weight instead of one looking hairline and the other
// looking clotted.
const STROKE_RATIO = 0.09;
const SHADOW_BLUR_RATIO = 0.07;
const SHADOW_DISTANCE_RATIO = 0.028;

// ---------------------------------------------------------------------------------------------
// Metal gradient
//
// A flat fill reads as a decal; slot amounts want to look like struck metal. The gradient runs
// TOP-DOWN across the glyph box: a white specular lip, the pearl face, then a warmer, darker
// base — the light-from-above cue that makes type feel three-dimensional.
//
// `textureSpace: 'local'` normalizes the gradient to the text's own bounds, so ONE gradient works
// at every font size — which is why these can be cached by colour alone and never rebuilt.
//
// CACHING IS NOT OPTIONAL. Each FillGradient allocates a 256px texture that must be destroyed to
// avoid a leak. A win takeover recomputes its style on every tier-up, so building a fresh
// gradient per call would leak one texture per tier per win. Keyed by accent, the cache tops out
// at one entry per tier colour (6) for the whole session.
// ---------------------------------------------------------------------------------------------

/** Linear blend between two packed RGB colours. `t` 0 → `a`, 1 → `b`. */
const mix = (a: number, b: number, t: number) => {
	const ch = (shift: number) => {
		const ca = (a >> shift) & 0xff;
		const cb = (b >> shift) & 0xff;
		return Math.round(ca + (cb - ca) * t) & 0xff;
	};
	return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

// Neutral base: pearl face falling to a warm gold, matching the reel frame's ivory-over-taupe.
const NEUTRAL_BASE = 0xe8b45c;

// ---------------------------------------------------------------------------------------------
// Ink band
//
// Canvas text gradients are mapped across the FONT BOX (`textMetrics.height`), but the glyph ink
// only occupies part of it — the box carries ascent/descent room the digits never reach. Spanning
// stops 0..1 therefore throws away both ends of the ramp: the specular lip lands above the glyph
// and the fully-saturated base lands below it, so the tier colour barely shows.
//
// Measured in the live renderer at fontSize 200 (extract.pixels on a flat-white fill, scanning for
// the first/last opaque row) — NOT derived from font metrics, which got this wrong before:
//
//   '8' / '0123456789' / 'MEGA WIN'   ink 0.181 → 0.782   ← the body, and what we tune for
//   '12,345.67' / '$1,234.56'         ink 0.181 → 0.938   ← comma descender only
//
// We span the BODY (baseline at 0.78), not the descender. A comma is a few px of ink; letting it
// stretch the ramp would wash out the whole number to make room for a tail nobody looks at. Canvas
// gradients clamp past the last stop, so the descender simply keeps the full accent colour.
// ---------------------------------------------------------------------------------------------
// THE BAND IS PER TYPEFACE. It describes where a face's glyphs sit inside its own font box, so a
// different family needs its own pair — reuse Inter's on a serif and the ramp slides off the ink,
// which is the exact failure documented above.
export type TextFace = 'ui' | 'display';

export const FACES: Record<TextFace, { family: string; inkTop: number; inkBaseline: number }> = {
	// Measured (see above).
	ui: { family: FONT, inkTop: 0.18, inkBaseline: 0.78 },

	// NOT YET MEASURED — these are Inter's numbers standing in until someone runs the measurement
	// on Cinzel in the live renderer. Cinzel is an inscriptional serif with a taller cap height and
	// a shallower descender than Inter, so its real band almost certainly sits higher and runs
	// longer than this. Symptom of it being wrong: the accent never fully arrives at the baseline,
	// or the specular lip cuts across the glyph instead of catching its cap.
	display: { family: DISPLAY_FONT, inkTop: 0.18, inkBaseline: 0.78 },
};

/** Map a design offset (0 = top of the ink, 1 = baseline) into font-box space, for one face. */
const inkStop = (face: TextFace, t: number) => {
	const { inkTop, inkBaseline } = FACES[face];
	return inkTop + t * (inkBaseline - inkTop);
};

/**
 * The face the TAKEOVER surfaces use. Flip to `'ui'` to put them all back on Inter in one edit.
 *
 * Read by: the win ladder amount, the max-win takeover amount, the tier headline, and the
 * multiplier token that flies out of the Eye cell.
 *
 * NOT read by the tumble banner's own text, the Eye's numbers, the HUD, counters or control bar.
 * Those stay on the UI face on purpose — the serif is reserved for the moments the game stops to
 * celebrate, so it keeps meaning "you won something" instead of becoming the default voice. It
 * also avoids the serif's two weak spots: small captions (its hairlines get eaten by the stroke)
 * and currency amounts (Cinzel lacks ~10 of Stake's symbols, so they render mixed with Inter).
 */
export const CELEBRATION_FACE: TextFace = 'display';

// ---------------------------------------------------------------------------------------------
// The sheen
//
// A pure top-to-bottom fade reads as a wash — a coloured sheet of paper. Real struck metal has a
// SPECULAR LINE: a tight bright band where the surface turns through the light, with the tone
// dropping away hard on the far side. That single hot stop is most of what separates "gold-ish
// text" from "a minted coin".
//
// Placed just BELOW the optical middle. Dead centre looks like a mistake (it reads as a seam
// splitting the glyph); sitting it low implies a surface rolling over toward the viewer, and it
// leaves room for the accent to build underneath.
//
// THE SPLIT: A NEAR-WHITE SHEEN BREAKS THE HUE. Two earlier attempts put a white-ish stop in the
// middle of the ramp. Measuring SATURATION (not luminance) down the glyph showed why that reads as
// two halves stuck together rather than one fade — the accent built, collapsed, then rebuilt:
//
//   ink   0.25  0.33  0.42  0.50  0.58  0.67  0.75  1.00
//   sat     23    38    53    41    18    32    71    195      ← reverses twice
//
// A white band de-saturates the middle by ~66%, so the eye sees a pale top, a light seam, and a
// coloured bottom. No amount of widening fixes that; the discontinuity is in HUE, not spacing.
//
// So every stop below the lip is now a blend between the accent and PEARL — one colour family the
// whole way down. Saturation climbs monotonically; the sheen is a small LUMINANCE swell inside
// that climb (a slight step back toward pearl), never a white band. Specular highlights do
// de-saturate in reality, which is why the swell is kept gentle — enough to imply a surface,
// too little to cut the glyph in two.
//
// Also: TUNE IN PIXELS, NOT OFFSETS. Offsets that look generous in ink space collapse at real font
// sizes — a hero amount is ~126px, giving only a ~92px ink band, and an earlier ±0.08 sheen became
// a 14px stripe changing 39 luminance/px. The dense table below keeps every segment ≥10% of the
// band, which holds at any size because the gradient is normalized to the text box.
// ---------------------------------------------------------------------------------------------

/**
 * The ramp: `[ink offset, light mix]`, top to bottom. Ink space — 0 is the top of the glyph, 1 the
 * baseline. Light mix 1 = the pale end, 0 = full accent, so the numbers read as "how much colour
 * has arrived yet" and MUST fall monotonically apart from the deliberate sheen swell.
 *
 * Shared by every text role — hero amounts, captions, HUD values and Eye chips all run this same
 * curve, only with a different pale end and depth. That is what makes them read as one material.
 */
const RAMP: readonly (readonly [number, number])[] = [
	[0.0, 1.0], // top of the ink — full pearl
	[0.14, 0.94],
	[0.3, 0.85],
	[0.44, 0.76],
	[0.54, 0.72], // shoulder — the ramp flattens just before the sheen
	[0.62, 0.78], // sheen — a step BACK toward pearl, not toward white
	[0.74, 0.55],
	[0.86, 0.31],
	[1.0, 0.0], // baseline — full accent
];

// ---------------------------------------------------------------------------------------------
// Win-step accents
//
// One source of truth for the celebration ladder's colours, matched to the win_steps frame art
// (crest + gem per step). Red is RESERVED for the cap: MAX wears the dragon frame, EPIC the eye.
// Lives here because type, frame tint, aura and bubbles must all agree — three components were
// carrying private copies of this table before.
// ---------------------------------------------------------------------------------------------
export const WIN_TIER_ACCENT = {
	bigWin: 0x2fd06c, // emerald (seahorse)
	hugeWin: 0x3f8cff, // sapphire (jellyfish)
	megaWin: 0xffb13c, // amber (nautilus)
	epicWin: 0xb45cff, // amethyst (the Eye)
	maxWin: 0xff4438, // ruby (dragon) — the 15,000x moment only
} as const;

/**
 * `winLevelMap` aliases → the accent above. Levels below `big` have no celebration colour of their
 * own and fall through to the neutral pearl-and-gold, so this returns undefined for them.
 */
export const winTierAccent = (alias: string): number | undefined =>
	({
		big: WIN_TIER_ACCENT.bigWin,
		superwin: WIN_TIER_ACCENT.hugeWin,
		mega: WIN_TIER_ACCENT.megaWin,
		epic: WIN_TIER_ACCENT.epicWin,
		max: WIN_TIER_ACCENT.maxWin,
	})[alias];

const gradientCache = new Map<string, FillGradient>();

/**
 * The shared vertical metal gradient.
 *
 * - `accent` — a win-step colour. Pass it and the lower half carries the tier's identity while the
 *   top stays pale, so escalating tiers recolour the type itself. Omit for the neutral gold.
 * - `light` — the pale end. Pearl for hero type; pure white where contrast matters more than warmth.
 * - `depth` — how far down the ramp actually travels toward the accent. 1 reaches it fully; lower
 *   values keep the whole glyph brighter, which is how small captions get the material without
 *   losing legibility against a mid-tone panel.
 *
 * Cached by all three, because each FillGradient allocates a 256px texture that would otherwise
 * leak — a win takeover rebuilds its style on every tier-up.
 */
const metalGradient = ({
	accent,
	light = TEXT_PALETTE.fill,
	depth = 1,
	face = 'ui',
}: {
	accent?: number;
	light?: number;
	depth?: number;
	face?: TextFace;
}) => {
	// `face` belongs in the key: it moves every stop, so two faces sharing one cached gradient
	// would silently hand the serif Inter's ink band.
	const key = `${accent ?? -1}|${light}|${depth}|${face}`;
	const cached = gradientCache.get(key);
	if (cached) return cached;

	// `depth` pulls the ramp's dark end back toward the light end BEFORE the ramp is built, so a
	// shallow gradient is the same curve compressed — never a different shape.
	const base = mix(light, accent ?? NEUTRAL_BASE, depth);
	const gradient = new FillGradient({
		type: 'linear',
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		textureSpace: 'local',
		colorStops: [
			// The one genuinely achromatic stop, and it sits ABOVE the ink (see the face's
			// `inkTop`) so it catches only the very cap — a specular lip, not a band across it.
			{ offset: 0, color: 0xffffff },
			...RAMP.map(([at, lightMix]) => ({
				offset: inkStop(face, at),
				color: mix(base, light, lightMix),
			})),
		],
	});
	gradientCache.set(key, gradient);
	return gradient;
};

/**
 * Hero win amounts — tumble banner, win celebration, outro card, max-win.
 *
 * `accent` recolours the gradient's base to a win-step colour; `depth` shortens how far the ramp
 * travels toward it. `fill` is an escape hatch that forces a flat colour and skips the gradient
 * entirely — nothing uses it today (the Eye chips moved to `accent`, which keeps their ADD/MUL
 * signal at full strength at the baseline), but it stays for anything that must not be a gradient.
 */
export const abyssalAmountTextStyle = ({
	fontSize,
	fill,
	accent,
	// MUST default here, not be left undefined. TextStyle merges as
	// `{ ...defaultTextStyle, ...style }`, so an explicit `letterSpacing: undefined` OVERWRITES
	// the default 0 instead of falling back to it — and undefined then poisons text measurement
	// into NaN. Harmless with a flat fill, but the gradient feeds those metrics straight into
	// `createLinearGradient`, which throws on a non-finite value.
	letterSpacing = 0,
	depth,
	face = 'ui',
}: {
	fontSize: number;
	fill?: number;
	accent?: number;
	letterSpacing?: number;
	depth?: number;
	face?: TextFace;
}): TextStyleOptions => ({
	fontFamily: FACES[face].family,
	fontWeight: '900',
	fontSize,
	letterSpacing,
	align: 'center',
	fill: fill ?? metalGradient({ accent, depth, face }),
	stroke: {
		color: TEXT_PALETTE.stroke,
		width: Math.max(2, fontSize * STROKE_RATIO),
		join: 'round',
	},
	dropShadow: {
		color: TEXT_PALETTE.shadow,
		blur: Math.max(3, fontSize * SHADOW_BLUR_RATIO),
		distance: Math.max(1, fontSize * SHADOW_DISTANCE_RATIO),
		alpha: 0.9,
		angle: Math.PI / 2,
	},
});

/**
 * Small captions sitting ON a coloured panel — "TUMBLE WIN", "FREE SPINS", "TOTAL MULT".
 *
 * CONTRAST IS THE CONSTRAINT HERE, which is why this runs a much shallower ramp than the amounts.
 * Ivory on the tumble banner's #0D8290 teal measures only 3.4:1, under the 4.5:1 floor for small
 * text; pure white lifts it to 4.55:1 — so white, not pearl, is the pale end, and `LABEL_DEPTH`
 * keeps the baseline from travelling far enough down to give that margin back. Raising the depth
 * makes captions richer and less legible in the same move; check the teal panel if you touch it.
 */
const LABEL_DEPTH = 0.25;

export const abyssalLabelTextStyle = ({
	fontSize,
	letterSpacing = 2,
	accent,
	face = 'ui',
}: {
	fontSize: number;
	letterSpacing?: number;
	accent?: number;
	face?: TextFace;
}): TextStyleOptions => ({
	// Defaults to the UI face. Captions run small, and a serif's hairlines and serifs are the first
	// thing the stroke eats — if a caption on the display face reads mushy rather than carved, that
	// is why, and STROKE_RATIO (or dropping this one back to 'ui') is the fix.
	fontFamily: FACES[face].family,
	fontWeight: '800',
	fontSize,
	letterSpacing,
	align: 'center',
	fill: metalGradient({ accent, light: TEXT_PALETTE.fillBright, depth: LABEL_DEPTH, face }),
	stroke: {
		color: TEXT_PALETTE.stroke,
		width: Math.max(1.5, fontSize * (STROKE_RATIO * 0.7)),
		join: 'round',
	},
	dropShadow: {
		color: TEXT_PALETTE.shadow,
		blur: Math.max(2, fontSize * SHADOW_BLUR_RATIO),
		distance: Math.max(1, fontSize * SHADOW_DISTANCE_RATIO),
		alpha: 0.9,
		angle: Math.PI / 2,
	},
});

/**
 * HUD readouts — the free-spins counter, and anything else that is a value but not the hero.
 * Runs the ramp at reduced depth: these are small, and at 30px a full-travel ramp crowds the whole
 * curve into a handful of pixels and muddies rather than sculpts.
 */
const VALUE_DEPTH = 0.65;

export const abyssalValueTextStyle = ({
	fontSize,
	accent,
}: {
	fontSize: number;
	accent?: number;
}): TextStyleOptions => abyssalAmountTextStyle({ fontSize, accent, depth: VALUE_DEPTH });

/**
 * Eye values that carry their OWN colour — the flying combine chips (ADD cyan / MUL red) and the
 * number on an eye's face.
 *
 * The chip's colour IS the signal (add vs multiply), so it drives the gradient's accent rather than
 * being a flat fill: the glyph runs pale at the cap down to full chip colour at the baseline. That
 * keeps the signal at full strength where the eye actually reads it while matching the material of
 * every other number on screen.
 */
export const eyeValueTextStyle = ({
	fontSize,
	fill,
}: {
	fontSize: number;
	fill: number;
}): TextStyleOptions => abyssalAmountTextStyle({ fontSize, accent: fill });
