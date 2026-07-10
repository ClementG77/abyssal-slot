import type { TextStyleOptions } from 'pixi.js';
import { quadIn } from 'svelte/easing';

import type { RawSymbol, SymbolState, SymbolName } from './types';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

// Stake's viewport matrix. Keep UI responsive work checked against these exact CSS-pixel sizes.
export const STAKE_TEST_DEVICES = {
	desktop: { label: 'Desktop', width: 1200, height: 675 },
	laptop: { label: 'Laptop', width: 1024, height: 576 },
	popoutS: { label: 'Popout S', width: 400, height: 225 },
	popoutL: { label: 'Popout L', width: 800, height: 450 },
	mobileL: { label: 'Mobile L', width: 425, height: 812 },
	mobileM: { label: 'Mobile M', width: 375, height: 667 },
	mobileS: { label: 'Mobile S', width: 320, height: 568 },
} as const;

export type StakeTestDevice = keyof typeof STAKE_TEST_DEVICES;

// Native dimensions of the two free-spin presentation cards. Both are transparent 4:3 PNGs;
// retain this aspect ratio when fitting them to any Stake viewport.
export const FREE_SPINS_BANNER_SIZE = { width: 1448, height: 1086 } as const;
export const FREE_SPINS_BANNER_ASPECT =
	FREE_SPINS_BANNER_SIZE.width / FREE_SPINS_BANNER_SIZE.height;

export type ReelFrameLayout = {
	imageWidth: number;
	imageHeight: number;
	displayWidth: number;
	columns: number;
	rows: number;
	gridX: number;
	gridY: number;
	gridWidth: number;
	gridHeight: number;
	symbolFill: number;
};

// The current base frame is a 4:3 export. Keep these in sync with the PNG so Pixi
// preserves its intended proportions instead of stretching the frame wide.
export const REEL_FRAME_BASE_IMAGE_SIZE = { width: 1448, height: 1086 };
// The current red free-spins frame is the same export size as the base frame. Its reel
// window is wider and taller, so it needs its own measured source-space grid below.
export const REEL_FRAME_FREE_SPINS_IMAGE_SIZE = { width: 1448, height: 1086 };

// Source dimensions and measured artwork bounds for the finished Win/Gaze meter export.
// Coordinates are kept as source-space fractions so the component scales cleanly on every viewport.
export const GAZE_METER_IMAGE_SIZE = { width: 1254, height: 1254 };
// ---- Essence Gaze economy (2026-07 math rework) -------------------------------------------
// Every winning CLUSTER charges the Gaze by essence graded on the cluster's size (the same
// bands as the paytable): +2 (8-9 symbols), +3 (10-11), +5 (12+). Super Bonus charges double
// (+4/+6/+10). The charge hard-caps at 30. The meter VISUAL keeps a 10-wide track and LAPS it:
// 0-10 tide teal → 11-20 abyssal purple → 21-30 ember red (see GazeMeter's GAZE_LAPS).
export const GAZE_METER_MAX_CHARGE = 30;
export const GAZE_LAP_SIZE = 10;
// essence value per cluster-size tier: [8-9, 10-11, 12+]
export const ESSENCE_TIER_VALUES = [2, 3, 5] as const;
export const getEssenceTier = (count: number): 1 | 2 | 3 =>
	count >= 12 ? 3 : count >= 10 ? 2 : 1;
// The closed Eye's tension glow reaches full brightness here — deliberately BELOW the 30 cap
// (a 0-30 normalizer would leave the eye visibly cold on almost every spin).
export const GAZE_EYE_INTENSITY_FULL = 15;
export const GAZE_METER_LAYOUT = {
	imageWidth: GAZE_METER_IMAGE_SIZE.width,
	imageHeight: GAZE_METER_IMAGE_SIZE.height,
	visibleBounds: {
		left: 449 / 1254,
		top: 26 / 1254,
		right: 804 / 1254,
		bottom: 1228 / 1254,
	},
	// Recessed vertical track interior measured from static/assets/frame/gaze_sprite/winmeter.png.
	trackSegments: [
		{
			left: 578 / 1254,
			right: 676 / 1254,
			top: 381 / 1254,
			bottom: 970 / 1254,
			radius: 49 / 589,
		},
	],
	eye: { x: 626.5 / 1254, y: 214.5 / 1254, radius: 101 / 1254 },
	gem: { x: 626.5 / 1254, y: 1054 / 1254, radius: 48 / 1254 },
	plaque: { x: 626.5 / 1254, y: 214.5 / 1254, radius: 92 / 1254, textDy: 0 },
} as const;

export const REEL_Y = 0;
export const MOBILE_REEL_DISPLAY_SCALE = 1.45;
export const REEL_FRAME_BASE_DISPLAY_WIDTH = 1380;
export const REEL_FRAME_FREE_SPINS_DISPLAY_WIDTH = 1360;
export const REEL_FRAME_BASE_GRID = {
	x: 152,
	y: 168,
	width: 1144,
	height: 782,
};
export const REEL_FRAME_FREE_SPINS_GRID = {
	x: 132,
	y: 134,
	width: 1176,
	height: 846,
};

export const REEL_LAYOUT_BASE: ReelFrameLayout = {
	imageWidth: REEL_FRAME_BASE_IMAGE_SIZE.width,
	imageHeight: REEL_FRAME_BASE_IMAGE_SIZE.height,
	displayWidth: REEL_FRAME_BASE_DISPLAY_WIDTH,
	columns: 6,
	rows: 5,
	gridX: REEL_FRAME_BASE_GRID.x,
	gridY: REEL_FRAME_BASE_GRID.y,
	gridWidth: REEL_FRAME_BASE_GRID.width,
	gridHeight: REEL_FRAME_BASE_GRID.height,
	symbolFill: 0.86,
};

export const REEL_LAYOUT_FREE_SPINS: ReelFrameLayout = {
	imageWidth: REEL_FRAME_FREE_SPINS_IMAGE_SIZE.width,
	imageHeight: REEL_FRAME_FREE_SPINS_IMAGE_SIZE.height,
	displayWidth: REEL_FRAME_FREE_SPINS_DISPLAY_WIDTH,
	columns: 6,
	rows: 5,
	gridX: REEL_FRAME_FREE_SPINS_GRID.x,
	gridY: REEL_FRAME_FREE_SPINS_GRID.y,
	gridWidth: REEL_FRAME_FREE_SPINS_GRID.width,
	gridHeight: REEL_FRAME_FREE_SPINS_GRID.height,
	symbolFill: 0.86,
};

export const getReelDisplayScale = (layout: ReelFrameLayout) =>
	layout.displayWidth / layout.imageWidth;

export const getReelDisplayHeight = (layout: ReelFrameLayout) =>
	layout.imageHeight * getReelDisplayScale(layout);

export const getReelPosition = (layout: ReelFrameLayout) => ({
	x: (GAME_WIDTH - layout.displayWidth) / 2,
	y: REEL_Y,
});

export const getReelDisplayGrid = (layout: ReelFrameLayout) => ({
	x: layout.gridX * getReelDisplayScale(layout),
	y: layout.gridY * getReelDisplayScale(layout),
	width: layout.gridWidth * getReelDisplayScale(layout),
	height: layout.gridHeight * getReelDisplayScale(layout),
});

export const REEL_DISPLAY_GRID = getReelDisplayGrid(REEL_LAYOUT_BASE);

export const REEL_CELL_WIDTH = REEL_DISPLAY_GRID.width / REEL_LAYOUT_BASE.columns;
export const REEL_CELL_HEIGHT = REEL_DISPLAY_GRID.height / REEL_LAYOUT_BASE.rows;

export const SYMBOL_SIZE = REEL_CELL_HEIGHT;

// Initial board (6 reels × 7 rows, padded top + bottom; visible rows are 1–5).
// Hand-seeded purely for first paint / Storybook; real boards arrive via `reveal` events.
export const INITIAL_BOARD: RawSymbol[][] = [
	[
		{ name: 'L1' },
		{ name: 'H1' },
		{ name: 'L3' },
		{ name: 'L2' },
		{ name: 'H4' },
		{ name: 'L1' },
		{ name: 'L4' },
	],
	[
		{ name: 'L3' },
		{ name: 'H2' },
		{ name: 'L2' },
		{ name: 'S', scatter: true },
		{ name: 'L1' },
		{ name: 'H3' },
		{ name: 'L2' },
	],
	[
		{ name: 'L2' },
		{ name: 'H3' },
		{ name: 'L5' },
		{ name: 'L3' },
		{ name: 'L4' },
		{ name: 'L2' },
		{ name: 'H1' },
	],
	[
		{ name: 'L4' },
		{ name: 'H4' },
		{ name: 'L1' },
		{ name: 'EYE', eye: true },
		{ name: 'H2' },
		{ name: 'L3' },
		{ name: 'H1' },
	],
	[
		{ name: 'H3' },
		{ name: 'L2' },
		{ name: 'L4' },
		{ name: 'H2' },
		{ name: 'S', scatter: true },
		{ name: 'L1' },
		{ name: 'L3' },
	],
	[
		{ name: 'H2' },
		{ name: 'L1' },
		{ name: 'S', scatter: true },
		{ name: 'L3' },
		{ name: 'H1' },
		{ name: 'L4' },
		{ name: 'L2' },
	],
];

export const BOARD_DIMENSIONS = { x: REEL_LAYOUT_BASE.columns, y: REEL_LAYOUT_BASE.rows };

export const BOARD_SIZES = {
	width: REEL_DISPLAY_GRID.width,
	height: REEL_DISPLAY_GRID.height,
};

export const VISIBLE_ROW_START = 1;

export const getSymbolFill = (symbolName: SymbolName) => {
	// The scatter art fills ~100% of its 393×415 frame while the highs only fill ~73% (circles with
	// empty corners). ~0.69 matches the highs' visible height; a touch above makes the leviathan
	// read as the hero symbol without dominating.
	if (symbolName === 'S') return 1.1;
	if (symbolName === 'EYE') return 1.2; // eye a bit bigger
	if (symbolName.startsWith('H')) return 1; // highs a bit bigger
	if (symbolName.startsWith('L')) return 0.74; // lows a bit smaller

	return REEL_LAYOUT_BASE.symbolFill;
};

// --- Branded bitmap font (the gold "minted" Abyssal type) --------------------------------
// Face name baked into static/assets/fonts/abyssal_bitmap_font_package/abyssal_font.fnt and
// registered by the `abyssalFont` asset. Render it with <BitmapText>/<ResponsiveBitmapText> —
// the gold fill, bevel and dark outline are baked into the glyph art (no stroke/dropShadow
// style props needed, and `fill` tints multiplicatively so leave it unset to keep the gold).
// UPPERCASE-only coverage, no '/' (use "OF"), no lowercase except 'x'.
export const ABYSSAL_FONT_FAMILY = 'AbyssalBitmap';
export const abyssalBitmapStyle = ({
	fontSize,
	letterSpacing,
}: {
	fontSize: number;
	letterSpacing?: number;
}): TextStyleOptions => ({
	fontFamily: ABYSSAL_FONT_FAMILY,
	fontSize,
	align: 'center',
	...(letterSpacing !== undefined ? { letterSpacing } : {}),
});

// The Eye states all live in the symbol atlas, in reveal order:
//   CLOSE (purple, unrevealed) → flip → ADD_EMPTY/MULT_EMPTY (closed coloured art, our number
//   written in the MIDDLE) → the multiplier fires into the win → the number leaves and the
//   plain EMPTY art remains. The ADD/MULT ACTIVE (open) frames are reserved for hero moments
//   (paytable, feature presentation) — the board lifecycle doesn't use them.
// One definition so every component (board Symbol, the AbyssalEye FX component, the reveal
// overlay, the paytable) addresses the same frames.
export const EYE_FRAME = {
	close: 'EYE_PURPLE_CLOSE',
	add: 'EYE_ADD_ACTIVE',
	mult: 'EYE_MULT_ACTIVE',
	addEmpty: 'EYE_ADD_EMPTY',
	multEmpty: 'EYE_MULT_EMPTY',
} as const;
export type EyeVariant = keyof typeof EYE_FRAME;
// Eye art shares the uniform 495×501 atlas cell.
export const EYE_ASPECT = 495 / 501;

// Value placement per art, as fractions of the eye's width/height:
// EMPTY (closed) art → the multiplier sits in the MIDDLE of the face (~centre of the frame).
export const EYE_LABEL_OFFSET = { x: 0, y: 0.015 } as const;
// ACTIVE (open) art → the value sits in the banner plaque BELOW the iris (~+0.36 of the height).
export const EYE_LABEL_OFFSET_PLAQUE = { x: 0, y: 0.36 } as const;

// The Eye's number wears the same minted look as the Gaze meter value (Cinzel 900, dark navy
// stroke, soft black drop shadow) so the two read as one currency. `fill` stays colour-coded —
// cyan = ADD, gold = MUL — so colour alone signals the eye type (no +/× prefix). One definition,
// shared by the board Eye (AbyssalEye) and the resolve overlay (Eye), so they never drift.
export const EYE_VALUE_FILL = { add: 0xdffbff, mul: 0xffe66d } as const;
export const eyeValueTextStyle = ({
	fontSize,
	fill,
}: {
	fontSize: number;
	fill: number;
}): TextStyleOptions => ({
	fontFamily: 'Cinzel, Georgia, serif',
	fontWeight: '900',
	fontSize,
	fill,
	align: 'center',
	stroke: { color: 0x071a2d, width: Math.max(3, fontSize * 0.06) },
	dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 },
});

// All frames in the `symbol_black` atlas share a uniform 495×501 source cell.
export const SYMBOL_SOURCE_SIZES: Record<SymbolName, { width: number; height: number }> = {
	H1: { width: 495, height: 501 },
	H2: { width: 495, height: 501 },
	H3: { width: 495, height: 501 },
	H4: { width: 495, height: 501 },
	L1: { width: 495, height: 501 },
	L2: { width: 495, height: 501 },
	L3: { width: 495, height: 501 },
	L4: { width: 495, height: 501 },
	L5: { width: 495, height: 501 },
	S: { width: 495, height: 501 },
	EYE: { width: 495, height: 501 },
};

export const BACKGROUND_RATIO = 2039 / 1000;
export const PORTRAIT_BACKGROUND_RATIO = 1242 / 2208;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const HIGH_SYMBOLS = ['H1', 'H2', 'H3', 'H4'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

// --- Placeholder symbol art (code-drawn) ----------------------------------------------
// Real deep-sea sprites arrive later via the art pipeline; until then each symbol renders
// as a coloured tile + label drawn in `Symbol.svelte`. The descriptor shape is kept
// per-state so swapping in `{ type:'sprite'|'spine', ... }` later is a drop-in change.
export type PlaceholderInfo = {
	type: 'placeholder';
	label: string;
	color: number; // tile fill
	glow?: number; // accent ring for special symbols
	sizeRatios: { width: number; height: number };
};

const SYMBOL_COLORS: Record<SymbolName, { color: number; glow?: number; label: string }> = {
	H1: { color: 0xc2410c, label: 'H1' }, // Anglerfish
	H2: { color: 0xd97706, label: 'H2' }, // Nautilus
	H3: { color: 0xb45309, label: 'H3' }, // Diving Helmet
	H4: { color: 0xdb2777, label: 'H4' }, // Jellyfish
	L1: { color: 0x22e0ff, label: 'L1' }, // Cyan gem
	L2: { color: 0x1fb6a6, label: 'L2' }, // Teal gem
	L3: { color: 0x3b82f6, label: 'L3' }, // Sapphire gem
	L4: { color: 0x8b5cf6, label: 'L4' }, // Violet gem
	L5: { color: 0x5eead4, label: 'L5' }, // Aqua gem
	S: { color: 0xffb13c, glow: 0xffd27a, label: 'S' }, // Leviathan (scatter)
	EYE: { color: 0x0a1a2e, glow: 0xfbbf24, label: 'EYE' }, // The Eye
};

const SYMBOL_STATES_ALL: SymbolState[] = [
	'static',
	'spin',
	'land',
	'win',
	'postWinStatic',
	'explosion',
];

const buildPlaceholderInfo = (name: SymbolName) => {
	const { color, glow, label } = SYMBOL_COLORS[name];
	const info: PlaceholderInfo = {
		type: 'placeholder',
		label,
		color,
		glow,
		sizeRatios: { width: 1, height: 1 },
	};
	return Object.fromEntries(SYMBOL_STATES_ALL.map((state) => [state, info])) as Record<
		SymbolState,
		PlaceholderInfo
	>;
};

export const SYMBOL_INFO_MAP = {
	H1: buildPlaceholderInfo('H1'),
	H2: buildPlaceholderInfo('H2'),
	H3: buildPlaceholderInfo('H3'),
	H4: buildPlaceholderInfo('H4'),
	L1: buildPlaceholderInfo('L1'),
	L2: buildPlaceholderInfo('L2'),
	L3: buildPlaceholderInfo('L3'),
	L4: buildPlaceholderInfo('L4'),
	L5: buildPlaceholderInfo('L5'),
	S: buildPlaceholderInfo('S'),
	EYE: buildPlaceholderInfo('EYE'),
} as const;

const SPIN_OPTIONS_SHARED = {
	reelFallInDelay: 80,
	reelPaddingMultiplierNormal: 1.25,
	reelPaddingMultiplierAnticipated: 18,
	reelFallOutDelay: 145,
};

// Drops use the GRAVITY feel (see CascadingReelSpinOptions): the fall accelerates the whole
// way down (quadIn — arrives at full speed) and reacts on contact with a small rebound,
// instead of the old linear travel that decelerated into place.
export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	symbolFallInSpeed: 3.1,
	symbolFallInInterval: 30,
	symbolFallInBounceSpeed: 0.15,
	symbolFallInBounceSizeMulti: 0.3,
	symbolFallInEasing: quadIn,
	symbolFallInReboundMulti: 0.12,
	symbolFallOutSpeed: 3.5,
	symbolFallOutInterval: 20,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	reelFallOutDelay: 0, // fast/skip spins clear all columns together
	symbolFallInSpeed: 7,
	symbolFallInInterval: 0,
	symbolFallInBounceSpeed: 0.3,
	symbolFallInBounceSizeMulti: 0.2,
	symbolFallInEasing: quadIn,
	symbolFallInReboundMulti: 0.07,
	symbolFallOutSpeed: 7,
	symbolFallOutInterval: 0,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
