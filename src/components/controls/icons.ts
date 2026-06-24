import type { Graphics } from 'pixi.js';

// Hand-authored vector icons, drawn centred at the origin inside a box of side `s`.
// Crisp at any size, tintable per state — no image assets.
export type IconKey =
	| 'spin'
	| 'stop'
	| 'plus'
	| 'minus'
	| 'turbo'
	| 'auto'
	| 'sound'
	| 'soundOff'
	| 'menu'
	| 'settings'
	| 'info'
	| 'close';

type DrawIcon = (g: Graphics, s: number, color: number) => void;

export const icons: Record<IconKey, DrawIcon> = {
	// play triangle
	spin: (g, s, c) => {
		g.poly([-s * 0.22, -s * 0.34, -s * 0.22, s * 0.34, s * 0.34, 0]).fill({ color: c });
	},
	stop: (g, s, c) => {
		g.roundRect(-s * 0.26, -s * 0.26, s * 0.52, s * 0.52, s * 0.08).fill({ color: c });
	},
	plus: (g, s, c) => {
		const t = s * 0.16;
		const l = s * 0.62;
		g.roundRect(-l / 2, -t / 2, l, t, t / 2).fill({ color: c });
		g.roundRect(-t / 2, -l / 2, t, l, t / 2).fill({ color: c });
	},
	minus: (g, s, c) => {
		const t = s * 0.16;
		const l = s * 0.62;
		g.roundRect(-l / 2, -t / 2, l, t, t / 2).fill({ color: c });
	},
	// lightning bolt
	turbo: (g, s, c) => {
		g.poly([
			s * 0.06,
			-s * 0.42,
			-s * 0.3,
			s * 0.06,
			-s * 0.04,
			s * 0.06,
			-s * 0.06,
			s * 0.42,
			s * 0.3,
			-s * 0.06,
			s * 0.04,
			-s * 0.06,
		]).fill({ color: c });
	},
	// circular arrow (autoplay)
	auto: (g, s, c) => {
		const r = s * 0.3;
		g.arc(0, 0, r, Math.PI * 0.25, Math.PI * 1.75).stroke({
			width: s * 0.12,
			color: c,
			cap: 'round',
		});
		// arrowhead at the arc end
		const a = Math.PI * 1.75;
		const ax = Math.cos(a) * r;
		const ay = Math.sin(a) * r;
		g.poly([
			ax + s * 0.16,
			ay - s * 0.02,
			ax - s * 0.04,
			ay - s * 0.18,
			ax - s * 0.1,
			ay + s * 0.1,
		]).fill({ color: c });
	},
	sound: (g, s, c) => {
		g.poly([
			-s * 0.36,
			-s * 0.12,
			-s * 0.16,
			-s * 0.12,
			s * 0.0,
			-s * 0.3,
			s * 0.0,
			s * 0.3,
			-s * 0.16,
			s * 0.12,
			-s * 0.36,
			s * 0.12,
		]).fill({ color: c });
		g.arc(s * 0.02, 0, s * 0.22, -Math.PI / 3, Math.PI / 3).stroke({
			width: s * 0.07,
			color: c,
			cap: 'round',
		});
		g.arc(s * 0.02, 0, s * 0.34, -Math.PI / 3, Math.PI / 3).stroke({
			width: s * 0.07,
			color: c,
			cap: 'round',
		});
	},
	soundOff: (g, s, c) => {
		g.poly([
			-s * 0.36,
			-s * 0.12,
			-s * 0.16,
			-s * 0.12,
			s * 0.0,
			-s * 0.3,
			s * 0.0,
			s * 0.3,
			-s * 0.16,
			s * 0.12,
			-s * 0.36,
			s * 0.12,
		]).fill({ color: c });
		g.moveTo(s * 0.12, -s * 0.16)
			.lineTo(s * 0.36, s * 0.16)
			.stroke({ width: s * 0.08, color: c, cap: 'round' });
		g.moveTo(s * 0.36, -s * 0.16)
			.lineTo(s * 0.12, s * 0.16)
			.stroke({ width: s * 0.08, color: c, cap: 'round' });
	},
	// hamburger
	menu: (g, s, c) => {
		const t = s * 0.12;
		const l = s * 0.58;
		for (const y of [-s * 0.22, 0, s * 0.22]) {
			g.roundRect(-l / 2, y - t / 2, l, t, t / 2).fill({ color: c });
		}
	},
	// sliders
	settings: (g, s, c) => {
		for (const y of [-s * 0.2, s * 0.08]) {
			g.roundRect(-s * 0.3, y - s * 0.04, s * 0.6, s * 0.08, s * 0.04).fill({ color: c });
		}
		g.circle(s * 0.12, -s * 0.2, s * 0.1).fill({ color: c });
		g.circle(-s * 0.1, s * 0.08, s * 0.1).fill({ color: c });
	},
	info: (g, s, c) => {
		g.circle(0, 0, s * 0.34).stroke({ width: s * 0.075, color: c });
		g.circle(0, -s * 0.15, s * 0.05).fill({ color: c });
		g.roundRect(-s * 0.05, -s * 0.02, s * 0.1, s * 0.24, s * 0.03).fill({ color: c });
	},
	close: (g, s, c) => {
		g.moveTo(-s * 0.22, -s * 0.22)
			.lineTo(s * 0.22, s * 0.22)
			.stroke({ width: s * 0.12, color: c, cap: 'round' });
		g.moveTo(s * 0.22, -s * 0.22)
			.lineTo(-s * 0.22, s * 0.22)
			.stroke({ width: s * 0.12, color: c, cap: 'round' });
	},
};
