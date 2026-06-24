import {
	Assets,
	Container,
	Rectangle,
	Sprite,
	Spritesheet,
	Text,
	Texture,
	Ticker,
	type FederatedPointerEvent,
	type TextStyleOptions,
} from 'pixi.js';

import { formatMoney } from './formatMoney';
import type {
	ControlBarButtonId,
	ControlBarCallbacks,
	ControlBarCreateOptions,
	ControlBarLayout,
	ControlBarSpriteId,
	ControlBarSpriteLayout,
	ControlBarTextId,
	TexturePackerJson,
} from './types';

type SpriteNode = {
	container: Container;
	sprite: Sprite;
	layout: ControlBarSpriteLayout;
	baseScale: { x: number; y: number };
};

type ButtonNode = SpriteNode & {
	disabledAlpha: number;
};

type PointerEventName =
	| 'pointerover'
	| 'pointerout'
	| 'pointerdown'
	| 'pointerup'
	| 'pointerupoutside';

type InteractiveContainer = Container & {
	on(
		event: PointerEventName,
		callback: (event: FederatedPointerEvent) => void,
	): InteractiveContainer;
};

const BUTTON_IDS: ControlBarButtonId[] = [
	'menuButton',
	'minusButton',
	'plusButton',
	'spinEye',
	'autoButton',
	'buyBonusButton',
];

const HOVER_SCALE = 1.045;
const DOWN_SCALE = 0.94;

const fetchJson = async <T>(url: string): Promise<T> => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
	return (await response.json()) as T;
};

const applyAnchor = (displayObject: Sprite | Text, anchor?: { x: number; y: number }) => {
	displayObject.anchor.set(anchor?.x ?? 0, anchor?.y ?? 0);
};

const createTextStyle = (style: TextStyleOptions): TextStyleOptions => ({
	...style,
});

export class ControlBar implements ControlBarCallbacks {
	static async create(options: ControlBarCreateOptions): Promise<ControlBar> {
		const [atlasJson, layout, atlasTexture] = await Promise.all([
			fetchJson<TexturePackerJson>(options.atlasJson),
			fetchJson<ControlBarLayout>(options.layoutJson),
			Assets.load<Texture>(options.atlasImage),
		]);

		const sheet = new Spritesheet(atlasTexture, atlasJson);
		await sheet.parse();

		return new ControlBar(sheet, layout);
	}

	readonly container = new Container();

	onSpin?: () => void;
	onBetMinus?: () => void;
	onBetPlus?: () => void;
	onAutoPlay?: () => void;
	onMenu?: () => void;
	onBuyBonus?: () => void;

	private readonly sprites = new Map<ControlBarSpriteId, SpriteNode>();
	private readonly buttons = new Map<ControlBarButtonId, ButtonNode>();
	private readonly texts = new Map<ControlBarTextId, Text>();
	private enabled = true;
	private spinning = false;
	private spinTime = 0;
	private spinHovered = false;
	private spinPressed = false;
	private readonly spinTicker: (ticker: Ticker) => void;

	private constructor(
		private readonly sheet: Spritesheet,
		private readonly layout: ControlBarLayout,
	) {
		this.spinTicker = (ticker) => this.updateSpinEye(ticker.deltaTime);
		this.container.label = layout.root.id;
		this.container.sortableChildren = true;
		this.container.x = layout.root.x;
		this.container.y = layout.root.y;

		this.createSprites();
		this.createTexts();
		this.createButtons();
		Ticker.shared.add(this.spinTicker);
	}

	setBalance(value: number): void {
		this.setText('balanceValue', formatMoney(value));
	}

	setBet(value: number): void {
		this.setText('betValue', formatMoney(value));
	}

	setWin(value: number): void {
		this.setText('winValue', formatMoney(value));
	}

	setBonusBuyPrice(value: number): void {
		this.setText('buyBonusValue', formatMoney(value));
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		if (!enabled) {
			this.spinHovered = false;
			this.spinPressed = false;
		}
		for (const id of BUTTON_IDS) this.setButtonEnabled(id, enabled);
	}

	setSpinning(isSpinning: boolean): void {
		this.spinning = isSpinning;
		const spin = this.buttons.get('spinEye');
		if (!spin) return;

		if (!isSpinning) {
			this.spinTime = 0;
			spin.sprite.rotation = 0;
			this.applyButtonScale(spin, this.spinHovered ? HOVER_SCALE : 1);
		}
	}

	resize(screenWidth: number, screenHeight: number): void {
		const design = this.layout.meta.designResolution;
		const scale = Math.min(screenWidth / design.w, screenHeight / design.h);
		const stageWidth = design.w * scale;

		this.container.scale.set(scale);
		this.container.x = (screenWidth - stageWidth) * 0.5 + this.layout.root.x * scale;
		this.container.y = screenHeight - this.layout.root.h * scale;
	}

	destroy(): void {
		Ticker.shared.remove(this.spinTicker);
		this.container.destroy({ children: true });
	}

	private createSprites(): void {
		for (const [id, spriteLayout] of Object.entries(this.layout.sprites) as [
			ControlBarSpriteId,
			ControlBarSpriteLayout,
		][]) {
			const texture = this.sheet.textures[spriteLayout.frame];
			if (!texture) throw new Error(`Missing control bar frame: ${spriteLayout.frame}`);

			const wrapper = new Container();
			wrapper.label = id;
			wrapper.x = spriteLayout.x;
			wrapper.y = spriteLayout.y;
			wrapper.zIndex = spriteLayout.z ?? 0;

			const sprite = new Sprite(texture);
			sprite.width = spriteLayout.w;
			sprite.height = spriteLayout.h;
			applyAnchor(sprite, spriteLayout.anchor);

			wrapper.addChild(sprite);
			this.container.addChild(wrapper);
			this.sprites.set(id, {
				container: wrapper,
				sprite,
				layout: spriteLayout,
				baseScale: { x: wrapper.scale.x, y: wrapper.scale.y },
			});
		}
	}

	private createTexts(): void {
		for (const [id, textLayout] of Object.entries(this.layout.texts) as [
			ControlBarTextId,
			ControlBarLayout['texts'][ControlBarTextId],
		][]) {
			const parent = this.sprites.get(textLayout.parent);
			if (!parent) throw new Error(`Missing text parent "${textLayout.parent}" for "${id}"`);

			const style = this.layout.styles[textLayout.style];
			if (!style) throw new Error(`Missing text style "${textLayout.style}" for "${id}"`);

			const text = new Text({
				text: textLayout.text,
				style: createTextStyle(style),
			});
			text.label = id;
			text.x = textLayout.x;
			text.y = textLayout.y;
			text.zIndex = textLayout.z ?? 50;
			applyAnchor(text, textLayout.anchor);

			parent.container.sortableChildren = true;
			parent.container.addChild(text);
			this.texts.set(id, text);
		}
	}

	private createButtons(): void {
		this.makeButton('menuButton', () => this.onMenu?.());
		this.makeButton('minusButton', () => this.onBetMinus?.());
		this.makeButton('plusButton', () => this.onBetPlus?.());
		this.makeButton('spinEye', () => this.onSpin?.());
		this.makeButton('autoButton', () => this.onAutoPlay?.());
		this.makeButton('buyBonusButton', () => this.onBuyBonus?.());
	}

	private makeButton(id: ControlBarButtonId, callback: () => void): void {
		const node = this.sprites.get(id);
		if (!node) throw new Error(`Missing button sprite "${id}"`);

		const { container, layout } = node;
		container.eventMode = 'static';
		container.cursor = 'pointer';
		container.hitArea = new Rectangle(
			-layout.w * layout.anchor.x,
			-layout.h * layout.anchor.y,
			layout.w,
			layout.h,
		);

		const button = { ...node, disabledAlpha: 0.45 };
		const interactive = container as InteractiveContainer;
		this.buttons.set(id, button);

		interactive.on('pointerover', () => {
			if (!this.isButtonEnabled(id)) return;
			if (id === 'spinEye') {
				this.spinHovered = true;
				button.sprite.alpha = 1;
				return;
			}
			this.applyButtonScale(button, HOVER_SCALE);
		});
		interactive.on('pointerout', () => {
			if (!this.isButtonEnabled(id)) return;
			if (id === 'spinEye') {
				this.spinHovered = false;
				this.spinPressed = false;
				button.sprite.alpha = 0.96;
				return;
			}
			this.applyButtonScale(button, 1);
		});
		interactive.on('pointerdown', () => {
			if (!this.isButtonEnabled(id)) return;
			if (id === 'spinEye') {
				this.spinPressed = true;
				return;
			}
			this.applyButtonScale(button, DOWN_SCALE);
		});
		interactive.on('pointerup', (event) => {
			if (!this.isButtonEnabled(id)) return;
			event.stopPropagation();
			if (id === 'spinEye') {
				this.spinPressed = false;
				callback();
				return;
			}
			this.applyButtonScale(button, HOVER_SCALE);
			callback();
		});
		interactive.on('pointerupoutside', () => {
			if (!this.isButtonEnabled(id)) return;
			if (id === 'spinEye') {
				this.spinPressed = false;
				return;
			}
			this.applyButtonScale(button, 1);
		});
	}

	private isButtonEnabled(id: ControlBarButtonId): boolean {
		const button = this.buttons.get(id);
		return Boolean(this.enabled && button && button.container.eventMode === 'static');
	}

	private setButtonEnabled(id: ControlBarButtonId, enabled: boolean): void {
		const button = this.buttons.get(id);
		if (!button) return;

		button.container.eventMode = enabled ? 'static' : 'none';
		button.container.cursor = enabled ? 'pointer' : 'default';
		button.container.alpha = enabled ? 1 : button.disabledAlpha;
		if (!enabled) this.applyButtonScale(button, 1);
	}

	private applyButtonScale(button: SpriteNode, scale: number): void {
		button.container.scale.set(button.baseScale.x * scale, button.baseScale.y * scale);
	}

	private setText(id: ControlBarTextId, value: string): void {
		const text = this.texts.get(id);
		if (!text) throw new Error(`Missing control bar text: ${id}`);
		text.text = value;
	}

	private updateSpinEye(deltaTime: number): void {
		const spin = this.buttons.get('spinEye');
		if (!spin || !this.enabled) return;

		this.spinTime += deltaTime;
		const pulse = 1 + Math.sin(this.spinTime * 0.08) * (this.spinning ? 0.045 : 0.018);
		const interactionScale = this.spinPressed ? DOWN_SCALE : this.spinHovered ? HOVER_SCALE : 1;
		this.applyButtonScale(spin, pulse * interactionScale);
		spin.sprite.rotation = this.spinning ? this.spinTime * 0.035 : 0;
	}
}
