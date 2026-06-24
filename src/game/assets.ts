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
		src: new URL('../../assets/background/background-base.png', import.meta.url).href,
		preload: true,
	},
	backgroundFs: {
		type: 'sprite',
		src: new URL('../../assets/background/background-fs.png', import.meta.url).href,
		preload: true,
	},
	// Current frame PNGs include the inner dark reel background and vertical separators.
	reelFrameBase: {
		type: 'sprite',
		src: new URL('../../assets/frame/reel_frame_base.png', import.meta.url).href,
		preload: true,
	},
	reelFrameFs: {
		type: 'sprite',
		src: new URL('../../assets/frame/reel_frame_fs.png', import.meta.url).href,
		preload: true,
	},
	// Layered Gaze meter kit. The component composes its frame, Eye and FX at runtime so the
	// ten charge steps and multiplier remain fully driven by game state.
	gazeMeter: {
		type: 'sprites',
		src: new URL('../../assets/frame/fram/spritesheet.json', import.meta.url).href,
		preload: true,
	},
	// Free-spins counterpart of the Gaze kit. Its frame names are FS-prefixed in the atlas
	// so both skins can be preloaded without replacing each other's textures.
	gazeMeterFs: {
		type: 'sprites',
		src: new URL('../../assets/frame/frame_fs/frame_fs.json', import.meta.url).href,
		preload: true,
	},
	// Provider logo used as the buy-bonus glyph on the control bar.
	providerLogo: {
		type: 'sprite',
		src: new URL('../../assets/provider_logo.png', import.meta.url).href,
		preload: true,
	},
	// TexturePacker symbol atlas. Frames are addressed by name, such as `H1` / `SCATTER` /
	// `ADD_EYE` / `MULT_EYE` / `CLOSE_EYE`.
	symbols: {
		type: 'sprites',
		src: new URL('../../assets/symbols/eye/eye.json', import.meta.url).href,
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
	freeSpinsBanner: {
		type: 'sprite',
		src: new URL('../../assets/wins/freespins.png', import.meta.url).href,
		preload: true,
	},
	freeSpinsRetrigger: {
		type: 'sprite',
		src: new URL('../../assets/wins/retrigger.png', import.meta.url).href,
		preload: true,
	},
} as const;
