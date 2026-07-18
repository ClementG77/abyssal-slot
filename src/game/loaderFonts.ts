// Cinzel ships as a raw .ttf under `assets/` (resolved with the deploy-safe
// `new URL('<static literal>', import.meta.url)` form — same as game/assets.ts), so a CSS
// @font-face can't reference it. Register it from JS instead, under BOTH names:
// 'Abyssal Cinzel' for the DOM loader screens, and 'Cinzel' for the in-game Pixi canvas
// labels (Eye / Gaze / Win) — without the 'Cinzel' registration those silently render as
// Georgia. `weight: '400 900'` exposes the variable font's full weight range so the 800/900
// requests render bold. Harmless if it fails — text falls back to Georgia/serif.
// (The branded display type is the AbyssalBitmap bitmap font, loaded as a Pixi asset in
// game/assets.ts — DOM FontFace registration doesn't apply to it.)
const cinzelFontUrl = new URL(
	'../../assets/fonts/Cinzel/Cinzel-VariableFont_wght.ttf',
	import.meta.url,
).href;

let registered = false;

export const registerLoaderFonts = () => {
	if (registered || typeof FontFace === 'undefined') return;
	registered = true;

	for (const family of ['Abyssal Cinzel', 'Cinzel'] as const) {
		const face = new FontFace(family, `url(${cinzelFontUrl}) format('truetype')`, {
			display: 'swap',
			weight: '400 900',
		});
		face
			.load()
			.then((loaded) => document.fonts.add(loaded))
			.catch(() => {});
	}
};
