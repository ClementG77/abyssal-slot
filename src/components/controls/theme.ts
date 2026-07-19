// Shared palette + font for the Abyssal bet controls (classic dark-purple glass).
export const C = {
	navy: 0x12101b,
	navyDeep: 0x08070c,
	navyGlass: 0x0d0a14,
	cyan: 0x22e0ff,
	teal: 0x1fb6a6,
	amber: 0xffb13c,
	ember: 0xff6a3c,
	violet: 0x9b6cff,
	purple: 0x3d2b58,
	purpleBright: 0x7c3dff,
	white: 0xffffff,
	text: 0xffffff,
	textDim: 0xb7a9c9,
	iconDisabled: 0x6d6078,
	// Dim chrome text — the header's clock and slot name. Deliberately the SAME value as the
	// control bar's glass caption tint (GLASS.textDim), so the screen's furniture reads as one set
	// instead of the header inventing its own near-miss of it.
	chrome: 0xdff8ff,
} as const;

// ONE font for every piece of UI text/information in the game (control bar, replay controls,
// buy/ante buttons, headers). Import this — never hardcode a family, or the HUD drifts.
export const FONT = 'Inter, Arial, sans-serif';

// The DISPLAY face, for celebration type only (win ladder, max-win takeover, tier headline).
// Cinzel is registered from JS in game/loaderFonts.ts under the family name 'Cinzel' — there is no
// @font-face for it, so that registration is what makes this work; without it Pixi silently
// renders Georgia.
//
// Inter tails the stack ON PURPOSE. Cinzel is a Latin inscriptional serif and does not carry most
// of Stake's currency symbols (₹ ₽ ₩ ₺ ₦ ₡ ₨ ₫ ₱ ₵). Canvas text falls back PER GLYPH, so those
// players get an Inter symbol next to Cinzel digits rather than a missing glyph — mixed, but never
// blank. Losing the symbol entirely is what drove the move off the bitmap face in the first place.
export const DISPLAY_FONT = 'Cinzel, Inter, Arial, sans-serif';
