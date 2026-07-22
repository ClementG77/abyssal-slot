import type { Graphics } from 'pixi.js';

import { C, FONT } from './theme';

// ---------------------------------------------------------------------------------------------
// The control-bar GLASS material and READOUT identity.
//
// Lifted out of ControlBar.svelte so the replay bar can render the *same* win panel rather than a
// visual copy of it. Copies drift: the compact replay plate was written by hand at alpha 0.78/0.45
// against the bar's 0.82/0.5 — identical colours, subtly different material, invisible in code and
// visible on screen. Everything here is imported by both bars, so there is one definition.
//
// ControlBar imports these instead of declaring them; nothing about its rendering changed when they
// moved, because the names and values are identical.
// ---------------------------------------------------------------------------------------------

export const GLASS = {
	bg: 0x081c2a,
	bgDeep: 0x030912,
	bgHover: 0x0c2e44,
	border: 0xe1faff,
	borderSoft: 0x9eefff,
	glow: 0x5adcff,
	glowStrong: 0x5febff,
	shadow: 0x000812,
	textDim: 0xdff8ff,
} as const;

// The readout identity: warm gold label + white value on a deep warm shadow. Balance, Bet, Win and
// the menu volume sliders ALL use this, so every readout in the game reads as one set.
export const READOUT = {
	label: C.readoutGold,
	value: 0xffffff,
	shadow: 0x2a0710,
} as const;

export const baseLabelStyle = {
	fontFamily: FONT,
	fontWeight: '800',
	fontSize: 17,
	fill: GLASS.textDim,
	letterSpacing: 0.8,
	dropShadow: { color: GLASS.shadow, blur: 4, distance: 2, alpha: 0.8 },
} as const;

export const baseValueStyle = {
	fontFamily: FONT,
	fontWeight: '900',
	fontSize: 36,
	fill: 0xffffff,
	dropShadow: { color: GLASS.shadow, blur: 6, distance: 2, alpha: 0.78 },
} as const;

export const readoutLabelStyle = {
	...baseLabelStyle,
	fill: READOUT.label,
	dropShadow: { color: READOUT.shadow, blur: 5, distance: 2, alpha: 0.82 },
} as const;

export const readoutValueStyle = {
	...baseValueStyle,
	fill: READOUT.value,
	dropShadow: { color: READOUT.shadow, blur: 7, distance: 2, alpha: 0.82 },
} as const;

/**
 * The bar's glass panel: outer glow, tinted body, a white sheen across the top half, a bright
 * border and an inner hairline. `active` is the hover/engaged state.
 */
export const drawGlassPanel = (
	g: Graphics,
	w: number,
	h: number,
	radius = 24,
	active = false,
) => {
	const hoverBoost = active ? 1 : 0;
	g.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, radius + 4).stroke({
		width: active ? 7 : 5,
		color: GLASS.glow,
		alpha: active ? 0.2 : 0.1,
	});
	g.roundRect(-w / 2, -h / 2, w, h, radius).fill({
		color: active ? GLASS.bgHover : GLASS.bg,
		alpha: active ? 0.48 : 0.34,
	});
	// (removed) a GLASS.bgDeep rect over the bottom 58% used to sit here. It carried the panel's
	// full corner radius while starting mid-panel, so its rounded TOP corners were visible against
	// the fill above — it read as a second, darker panel inside every element rather than as
	// shading. The top-half white sheen below is what gives the glass its depth.
	g.roundRect(-w / 2, -h / 2, w, h * 0.5, radius).fill({
		color: 0xffffff,
		alpha: 0.06 + hoverBoost * 0.08,
	});
	g.roundRect(-w / 2 + 7, -h / 2 + 6, w - 14, h * 0.34, Math.max(6, radius - 7)).fill({
		color: 0xffffff,
		alpha: 0.035 + hoverBoost * 0.055,
	});
	g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({
		width: active ? 2 : 1.5,
		color: GLASS.border,
		alpha: active ? 0.88 : 0.62,
	});
	g.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, Math.max(4, radius - 5)).stroke({
		width: 1.1,
		color: 0xffffff,
		alpha: active ? 0.3 : 0.18,
	});
};

/** Geometry + type sizes of the WIN readout, shared by the main bar and the replay bar. */
export const WIN_PANEL = {
	width: 300,
	height: 78,
	radius: 18,
	labelY: -17,
	labelFontSize: 15,
	valueY: 16,
	valueFontSize: 28,
} as const;
