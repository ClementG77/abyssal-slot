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
		// downscaled hard on phones — mipmap it too (see the `symbols` note above)
		data: { textureOptions: { autoGenerateMipmaps: true, scaleMode: 'linear' } },
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
		// TEST (2026-07-19): swapped from `symbols_final` to `symbol_black` to see whether the
		// mobile pixelation follows the ATLAS or the renderer. Frame names are identical in both
		// (16 frames: H1-H4, L1-L5, SCATTER, EYE_*), so this is a drop-in swap — but the cells are
		// 495x501 here vs 484x495 there, so SYMBOL_SOURCE_SIZES in constants.ts must match.
		// REVERT: point this back at symbols_final/spritesheet.json + set the sizes back to 484x495.
		src: new URL('../../assets/symbols/symbol_black/spritesheet.json', import.meta.url).href,
		preload: true,
		// MIPMAPS — the fix for "symbols look pixelated on mobile". Atlas cells are 484x495, but
		// the 1920x1080 design canvas scales down hard on a phone (~5x minification vs ~3x on
		// desktop). Without mipmaps the GPU point-samples scattered texels instead of averaging
		// them, which reads as shimmer/aliasing — worse the smaller the symbol, hence mobile-only.
		// `antialias` does NOT help here; it only smooths geometry edges, not texture minification.
		data: { textureOptions: { autoGenerateMipmaps: true, scaleMode: 'linear' } },
	},
	// Win-step plaque frames (BIG_WIN / HUGE_WIN / MEGA_WIN / EPIC_WIN / MAX_WIN): ornate
	// empty frames with tier crests — WinBanner renders title + amount inside in bitmap font.
	winSteps: {
		type: 'sprites',
		src: new URL('../../assets/wins/win_steps/spritesheet.json', import.meta.url).href,
		preload: true,
		// downscaled hard on phones — mipmap it too (see the `symbols` note above)
		data: { textureOptions: { autoGenerateMipmaps: true, scaleMode: 'linear' } },
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

	// Sound sprite — the production set (docs/ABYSSAL_SOUND_DESIGN.md §3), packed as one audio.m4a
	// + Howler offset map (Valkyrie/Waylanders pattern). The m4a lives in static/ because Howler
	// resolves the JSON's `src` relative to the PAGE, not the JSON — static/ serves it at
	// ./assets/sounds/audio.m4a in both dev and build. Repack via assets/audio/README.md.
	sound: {
		type: 'audio',
		src: new URL('../../static/assets/sounds/sounds.json', import.meta.url).href,
		preload: true,
	},
} as const;
