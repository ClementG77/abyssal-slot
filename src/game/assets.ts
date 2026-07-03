// Asset URLs resolve through `new URL('<static literal>', import.meta.url)` — NOT root-absolute
// `/assets/...`. Files in `static/` are served from the ROOT, but a literal `/assets/...` only
// resolves when the build is served from the domain root; it 403s under Stake's sub-path deploy and
// breaks under file://. The `new URL` form resolves relative to the emitted bundle, so it survives
// both. Keep each argument a STATIC string literal (no template vars) — that's the form Vite leaves
// as a runtime resolve; a dynamic string triggers Vite's glob-import path instead. This matches
// betModeMeta.ts / GameInfo.svelte. Pixi resolves each spritesheet's `meta.image` relative to the
// resolved JSON URL, so atlases keep working with their sibling PNG.
export default {
	// Abyssal's own art only. Every cloned scatter-template asset has been removed and
	// replaced by Abyssal-specific art or code-drawn placeholders.
	backgroundBase: {
		type: 'sprite',
		src: new URL('../../assets/background/base.webp', import.meta.url).href,
		preload: true,
	},
	backgroundFs: {
		type: 'sprite',
		src: new URL('../../assets/background/freespins.webp', import.meta.url).href,
		preload: true,
	},
	// Layered reel frame atlas: background panel, reel separators, and foreground border.
	reelFrame: {
		type: 'sprites',
		src: new URL('../../assets/frame/reel_frame/atlas.json', import.meta.url).href,
		preload: true,
	},
	winMeter: {
		type: 'sprite',
		src: new URL('../../assets/frame/gaze_sprite/winmeter.png', import.meta.url).href,
		preload: true,
	},
	// Provider logo used as the buy-bonus glyph on the control bar.
	providerLogo: {
		type: 'sprite',
		src: new URL('../../assets/provider_logo.png', import.meta.url).href,
		preload: true,
	},
	// TexturePacker symbol atlas. Frames are addressed by name, such as `H1` / `SCATTER` and the
	// Eye set (`EYE_PURPLE_CLOSE`, `EYE_ADD_ACTIVE`/`EYE_MULT_ACTIVE`, `EYE_ADD_EMPTY`/`EYE_MULT_EMPTY`).
	symbols: {
		type: 'sprites',
		src: new URL('../../assets/symbols/symbol_black/spritesheet.json', import.meta.url).href,
		preload: true,
	},
	bigWin: {
		type: 'sprite',
		src: new URL('../../assets/wins/big_win.png', import.meta.url).href,
		preload: true,
	},
	megaWin: {
		type: 'sprite',
		src: new URL('../../assets/wins/mega_win.png', import.meta.url).href,
		preload: true,
	},
	epicWin: {
		type: 'sprite',
		src: new URL('../../assets/wins/epic_win.png', import.meta.url).href,
		preload: true,
	},
	maxWin: {
		type: 'sprite',
		src: new URL('../../assets/wins/max_win.png', import.meta.url).href,
		preload: true,
	},
	tumbleWin: {
		type: 'sprite',
		src: new URL('../../assets/wins/tumble_win.png', import.meta.url).href,
		preload: true,
	},
	freeSpinIntro: {
		type: 'sprite',
		src: new URL('../../assets/wins/freespin_intro.png', import.meta.url).href,
		preload: true,
	},
	freeSpinOutro: {
		type: 'sprite',
		src: new URL('../../assets/wins/freespin_outro.png', import.meta.url).href,
		preload: true,
	},
	freeSpinsCount: {
		type: 'sprite',
		src: new URL('../../assets/wins/freespins_count.png', import.meta.url).href,
		preload: true,
	},
	totalMultBanner: {
		type: 'sprite',
		src: new URL('../../assets/wins/total_mult.png', import.meta.url).href,
		preload: true,
	},
	freeSpinsRetrigger: {
		type: 'sprite',
		src: new URL('../../assets/wins/freespin_retrigger.png', import.meta.url).href,
		preload: true,
	},
	// Branded gold "minted" bitmap font (face name `AbyssalBitmap`). BMFont .fnt + sibling PNG page;
	// Pixi installs it on load, then <BitmapText style={{ fontFamily: ABYSSAL_FONT_FAMILY }}> uses it.
	// Glyph coverage is UPPERCASE-only: A–Z 0–9 space $ £ € × x , . ! ? % + - # & * < = > @ _ |
	// — notably NO '/' and no lowercase (except 'x'). Keep on-screen strings inside that set.
	abyssalFont: {
		type: 'font',
		src: new URL('../../assets/fonts/abyssal_bitmap_font_package/abyssal_font.fnt', import.meta.url)
			.href,
		preload: true,
	},
} as const;
