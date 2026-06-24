import type { TextStyleOptions } from 'pixi.js';

export type ControlBarSpriteId =
	| 'barBack'
	| 'menuButton'
	| 'balancePanel'
	| 'betPanel'
	| 'minusButton'
	| 'plusButton'
	| 'spinEye'
	| 'winPanel'
	| 'autoButton'
	| 'buyBonusButton';

export type ControlBarTextId =
	| 'balanceLabel'
	| 'balanceValue'
	| 'betLabel'
	| 'betValue'
	| 'winLabel'
	| 'winValue'
	| 'buyBonusLabel'
	| 'buyBonusValue';

export type ControlBarButtonId =
	| 'menuButton'
	| 'minusButton'
	| 'plusButton'
	| 'spinEye'
	| 'autoButton'
	| 'buyBonusButton';

export type PointLayout = {
	x: number;
	y: number;
};

export type SizeLayout = {
	w: number;
	h: number;
};

export type AnchorLayout = {
	x: number;
	y: number;
};

export type ControlBarSpriteLayout = PointLayout &
	SizeLayout & {
		frame: string;
		anchor: AnchorLayout;
		z?: number;
	};

export type ControlBarTextLayout = PointLayout & {
	parent: ControlBarSpriteId;
	anchor: AnchorLayout;
	style: string;
	text: string;
	z?: number;
};

export type ControlBarRootLayout = PointLayout &
	SizeLayout & {
		id: string;
	};

export type ControlBarLayout = {
	meta: {
		name: string;
		atlas: string;
		image: string;
		designResolution: SizeLayout;
		coordinateSystem: 'top-left';
		description?: string;
	};
	root: ControlBarRootLayout;
	sprites: Record<ControlBarSpriteId, ControlBarSpriteLayout>;
	texts: Record<ControlBarTextId, ControlBarTextLayout>;
	styles: Record<string, TextStyleOptions>;
};

export type TexturePackerFrame = {
	frame: { x: number; y: number; w: number; h: number };
	rotated: boolean;
	trimmed: boolean;
	spriteSourceSize: { x: number; y: number; w: number; h: number };
	sourceSize: SizeLayout;
};

export type TexturePackerJson = {
	frames: Record<string, TexturePackerFrame>;
	animations?: Record<string, string[]>;
	meta: {
		image: string;
		format: string;
		size: SizeLayout;
		scale: string;
		app?: string;
		version?: string;
		smartupdate?: string;
	};
};

export type ControlBarCreateOptions = {
	atlasImage: string;
	atlasJson: string;
	layoutJson: string;
};

export type ControlBarCallbacks = {
	onSpin?: () => void;
	onBetMinus?: () => void;
	onBetPlus?: () => void;
	onAutoPlay?: () => void;
	onMenu?: () => void;
	onBuyBonus?: () => void;
};
