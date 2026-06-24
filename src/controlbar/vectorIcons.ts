import type { Graphics } from 'pixi.js';

export type ControlGlyphKey = 'menu' | 'autoplay' | 'turbo' | 'spin' | 'plus' | 'minus';

export type ControlGlyphOptions = {
	active?: boolean;
	disabled?: boolean;
	stop?: boolean;
	color?: number;
};

const WHITE = 0xffffff;

const alphaOf = (options: ControlGlyphOptions) => (options.disabled ? 0.42 : 1);

const strokeLine = (
	g: Graphics,
	width: number,
	color: number,
	alpha: number,
	cap: 'butt' | 'round' | 'square' = 'round',
) => {
	g.stroke({ width, color, alpha, cap, join: 'round' });
};

const drawArcStroke = (
	g: Graphics,
	radius: number,
	from: number,
	to: number,
	width: number,
	color: number,
	alpha: number,
) => {
	g.beginPath();
	g.arc(0, 0, radius, from, to);
	strokeLine(g, width, color, alpha);
};

const drawGlowArc = (
	g: Graphics,
	radius: number,
	from: number,
	to: number,
	width: number,
	alpha: number,
) => {
	drawArcStroke(g, radius, from, to, width + 10, 0x000000, alpha * 0.28);
	drawArcStroke(g, radius, from, to, width, WHITE, alpha);
};

const drawArrowHead = (
	g: Graphics,
	x: number,
	y: number,
	angle: number,
	size: number,
	alpha: number,
	color = WHITE,
) => {
	const points = [
		{ x: size * 0.72, y: 0 },
		{ x: -size * 0.46, y: -size * 0.46 },
		{ x: -size * 0.18, y: 0 },
		{ x: -size * 0.46, y: size * 0.46 },
	];
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const rotated = points.flatMap((point) => [
		x + point.x * cos - point.y * sin,
		y + point.x * sin + point.y * cos,
	]);

	g.poly(rotated, true).fill({ color: 0x000000, alpha: alpha * 0.32 });
	g.poly(rotated, true).fill({ color, alpha });
};

const drawBar = (g: Graphics, x: number, y: number, w: number, h: number, alpha: number) => {
	g.roundRect(x - w / 2, y - h / 2, w, h, h / 2).fill({ color: 0x000000, alpha: alpha * 0.5 });
	g.roundRect(x - w / 2, y - h / 2, w, h, h / 2).fill({ color: WHITE, alpha });
};

export const drawControlGlyph = (
	g: Graphics,
	key: ControlGlyphKey,
	size: number,
	options: ControlGlyphOptions = {},
) => {
	const alpha = alphaOf(options);
	const s = size;
	const color = options.color ?? WHITE;

	if (key === 'menu') {
		const h = s * 0.105;
		for (const y of [-s * 0.24, 0, s * 0.24]) drawBar(g, 0, y, s * 0.66, h, alpha);
		return;
	}

	if (key === 'minus') {
		drawBar(g, 0, 0, s * 0.66, s * 0.105, alpha);
		return;
	}

	if (key === 'plus') {
		const h = s * 0.105;
		drawBar(g, 0, 0, s * 0.66, h, alpha);
		drawBar(g, 0, 0, h, s * 0.66, alpha);
		return;
	}

	if (key === 'turbo') {
		const bolt = [
			s * 0.08,
			-s * 0.5,
			-s * 0.32,
			s * 0.02,
			-s * 0.05,
			s * 0.02,
			-s * 0.12,
			s * 0.5,
			s * 0.34,
			-s * 0.12,
			s * 0.06,
			-s * 0.1,
		];
		g.poly(bolt, true).fill({ color: 0x000000, alpha: alpha * 0.28 });
		if (options.active) {
			g.poly(bolt, true).fill({ color, alpha });
		} else {
			g.poly(bolt, true).stroke({
				width: s * 0.08,
				color,
				alpha: alpha * 0.86,
				join: 'round',
			});
		}
		return;
	}

	if (key === 'autoplay') {
		const r = s * 0.35;
		const start = -Math.PI * 0.78;
		const end = Math.PI * 1.08;
		if (options.active) drawArcStroke(g, r, start, end, s * 0.22, color, alpha * 0.24);
		drawArcStroke(g, r, start, end, s * 0.16, 0x000000, alpha * 0.34);
		drawArcStroke(g, r, start, end, s * 0.105, color, alpha);
		drawArrowHead(g, Math.cos(end) * r, Math.sin(end) * r, Math.PI * 1.58, s * 0.26, alpha, color);
		g.poly([-s * 0.12, -s * 0.18, -s * 0.12, s * 0.18, s * 0.18, 0], true).fill({
			color: 0x000000,
			alpha: alpha * 0.26,
		});
		g.poly([-s * 0.1, -s * 0.16, -s * 0.1, s * 0.16, s * 0.16, 0], true).fill({
			color,
			alpha,
		});
		return;
	}

	const r = s * 0.34;
	drawGlowArc(g, r, -Math.PI * 0.28, Math.PI * 1.32, s * 0.14, alpha);
	drawArrowHead(
		g,
		Math.cos(Math.PI * 1.32) * r,
		Math.sin(Math.PI * 1.32) * r,
		Math.PI * 1.82,
		s * 0.31,
		alpha,
	);

	if (options.stop) {
		g.roundRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24, s * 0.035).fill({
			color: WHITE,
			alpha: alpha * 0.94,
		});
		g.roundRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24, s * 0.035).stroke({
			width: s * 0.025,
			color: WHITE,
			alpha: alpha * 0.72,
		});
	}
};

export const drawBonusShell = (g: Graphics, size: number, options: ControlGlyphOptions = {}) => {
	const alpha = alphaOf(options);
	const s = size;

	g.ellipse(0, s * 0.17, s * 0.39, s * 0.24).fill({ color: 0x000000, alpha: 0.34 * alpha });
	g.ellipse(0, s * 0.17, s * 0.44, s * 0.27).stroke({
		width: s * 0.035,
		color: WHITE,
		alpha: 0.28 * alpha,
	});

	for (let i = -3; i <= 3; i++) {
		const x = i * s * 0.08;
		g.moveTo(0, s * 0.13).quadraticCurveTo(x * 0.82, -s * 0.39, x * 1.9, -s * 0.08);
		strokeLine(g, s * 0.09, 0x000000, 0.28 * alpha);
		g.moveTo(0, s * 0.13).quadraticCurveTo(x * 0.82, -s * 0.39, x * 1.9, -s * 0.08);
		strokeLine(g, s * 0.052, WHITE, (0.34 + Math.abs(i) * 0.04) * alpha);
	}

	g.ellipse(0, -s * 0.06, s * 0.43, s * 0.36).stroke({
		width: s * 0.035,
		color: 0xffffff,
		alpha: 0.58 * alpha,
	});
	g.circle(0, s * 0.26, s * 0.1).fill({ color: 0xf6b23a, alpha });
	g.circle(0, s * 0.04, s * 0.08).fill({ color: WHITE, alpha: 0.88 * alpha });
	g.circle(0, s * 0.04, s * 0.035).fill({ color: 0x0b0a08, alpha: 0.62 * alpha });
};
