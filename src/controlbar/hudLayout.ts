export type HudRect = {
	x: number;
	y: number;
	w: number;
	h: number;
};

export type HudCircle = {
	x: number;
	y: number;
	size: number;
};

export type ControlBarHudLayout = {
	design: {
		w: number;
		h: number;
	};
	left: {
		menu: HudCircle;
		balance: HudRect;
		buyBonus: HudRect;
	};
	right: {
		autoplay: HudCircle;
		turbo: HudCircle;
		spin: HudCircle;
		bet: HudRect;
	};
	menuPopup: {
		x: number;
		y: number;
		gap: number;
		size: number;
	};
	autoPopup: HudRect;
};

export const ABYSSAL_CONTROL_BAR_LAYOUT: ControlBarHudLayout = {
	design: { w: 1920, h: 1080 },
	left: {
		menu: { x: 132, y: 962, size: 112 },
		balance: { x: 335, y: 962, w: 260, h: 112 },
		buyBonus: { x: 335, y: 818, w: 210, h: 142 },
	},
	right: {
		autoplay: { x: 1768, y: 772, size: 72 },
		turbo: { x: 1768, y: 858, size: 72 },
		spin: { x: 1608, y: 814, size: 212 },
		bet: { x: 1608, y: 976, w: 360, h: 100 },
	},
	menuPopup: {
		x: 132,
		y: 842,
		gap: 56,
		size: 54,
	},
	autoPopup: { x: 1516, y: 730, w: 300, h: 172 },
};
