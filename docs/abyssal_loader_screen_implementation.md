# Abyssal Loader Screen — PixiJS + GSAP Implementation Guide

This document describes how to recreate the **Abyssal “How It Works” loading screen** in code, using **PixiJS** for rendering and **GSAP** for polished animations.

The goal is to **avoid baked text** so the loader can be localized for all regions. The background, cards, symbols, glows, lightning, and illustrations should be built as layers. All copy should come from localization JSON.

---

## 1. Target Result

The screen should look like the approved generated reference:

- Dark underwater abyss temple background.
- Large **ABYSSAL** logo at top.
- Subtitle: `HOW IT WORKS`.
- Three vertical instruction cards.
- Each card has:
  - Purple/blue rounded frame.
  - Gold/purple jewel ornaments.
  - Illustration area on top.
  - Title text.
  - Body text.
- Bottom CTA: `CLICK TO CONTINUE`.
- Subtle animated bubbles, glows, lightning, floating symbols, and pulsing CTA.

The three cards explain:

1. **Charge the Gaze**  
   Winning clusters/tumbles charge the Gaze meter.
2. **Eye Multipliers**  
   When an Eye lands, it applies multipliers.
3. **Huge Wins**  
   Charged Eye effects combine with Gaze to create large wins.

---

## 2. Important Gameplay Accuracy

Use the real game symbols and mechanics:

- The board is **6 columns × 5 rows**.
- Wins happen when **8+ matching symbols** land anywhere.
- Winning symbols tumble/cascade.
- Each winning tumble charges the **Gaze**.
- The Eye can be:
  - `ADD_EYE`
  - `MULT_EYE`
- There is **no purple Eye symbol** in the actual game. Do **not** create a purple Eye as a gameplay symbol.
- For card 3, combine the real `ADD_EYE` and `MULT_EYE` with a Gaze charge beam, rather than showing a new purple Eye symbol.

---

## 3. Asset Requirements

### Required Production Assets

```txt
/assets/background_base.png
/assets/logo_abyssal.png
/assets/spritesheet.png
/assets/spritesheet.json
```

### Optional FX Assets

These can also be drawn directly with PixiJS Graphics.

```txt
/assets/fx/soft_glow.png
/assets/fx/particle_dot.png
/assets/fx/light_ray.png
/assets/fx/bubble.png
```

- `/assets/spritesheet.png` + `/assets/spritesheet.json` — current sheet size `848×678`, texture keys: `H2, H1, H4, H3, L2, L3, L1, L5, SCATTER, ADD_EYE, MULT_EYE, L4`.

### Current Symbol Texture Keys

Use these texture names from the current symbol sheet:

```txt
H1
H2
H3
H4
L1
L2
L3
L4
L5
SCATTER
ADD_EYE
MULT_EYE
```

Symbol usage:

```txt
H1       red anglerfish
H2       green nautilus
H3       gold diving helmet
H4       pink jellyfish
L1-L5    low-value coral/crystal/plant symbols
SCATTER  purple dragon scatter
ADD_EYE  blue Eye
MULT_EYE red Eye
```

---

## 4. Recommended Scene Hierarchy

```txt
LoadingScreenRoot
  BackgroundLayer
    BackgroundSprite
    Vignette
    LightRays
    Bubbles
  LogoLayer
    LogoSprite
    SubtitleText
  CardLayer
    Card1Container
      CardFrame
      CardArt
      TitleText
      BodyText
    Card2Container
      CardFrame
      CardArt
      TitleText
      BodyText
    Card3Container
      CardFrame
      CardArt
      TitleText
      BodyText
  FXLayer
    Lightning
    GlowSprites
    Particles
  CTALayer
    ClickToContinueText
```

---

## 5. Design Resolution

Build the loader in a fixed coordinate system and scale the root container responsively.

```ts
export const DESIGN_W = 1672;
export const DESIGN_H = 941;
```

Use this layout as the reference:

```ts
export const LOADER_LAYOUT = {
	logo: {
		x: 836,
		y: 90,
		maxW: 650,
	},

	subtitle: {
		x: 836,
		y: 178,
	},

	cards: {
		y: 238,
		w: 430,
		h: 540,
		gap: 36,
		x0: 155,
	},

	cta: {
		x: 836,
		y: 846,
	},
};
```

Card positions:

```ts
const CARD_W = 430;
const CARD_H = 540;
const CARD_Y = 238;
const CARD_GAP = 36;
const CARD_X0 = 155;

const cardPositions = [
	{ x: 155, y: 238 },
	{ x: 621, y: 238 },
	{ x: 1087, y: 238 },
];
```

---

## 6. Responsive Scaling

Scale the root, not each element independently.

```ts
function fitRootToScreen(app: PIXI.Application, root: PIXI.Container) {
	const scale = Math.min(app.screen.width / DESIGN_W, app.screen.height / DESIGN_H);

	root.scale.set(scale);
	root.x = (app.screen.width - DESIGN_W * scale) / 2;
	root.y = (app.screen.height - DESIGN_H * scale) / 2;
}
```

Call this on resize:

```ts
fitRootToScreen(app, root);
app.renderer.on('resize', () => fitRootToScreen(app, root));
```

---

## 7. Text and Font Direction

### Logo

Best option: use a transparent logo PNG.

```txt
/assets/logo_abyssal.png
```

If the logo must be built with text later, use a decorative fantasy serif. Recommended options:

```txt
Cinzel Decorative
Cinzel
Cormorant SC
Trajan-style custom game font
```

### Card Titles

Suggested style:

```ts
export const cardTitleStyle = {
	fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
	fontSize: 36,
	fontWeight: '900',
	fill: '#FFD76A',
	stroke: '#1A0628',
	strokeThickness: 6,
	align: 'center',
	dropShadow: true,
	dropShadowColor: '#000000',
	dropShadowBlur: 5,
	dropShadowDistance: 3,
	wordWrap: true,
	wordWrapWidth: 390,
};
```

### Body Text

Suggested style:

```ts
export const bodyStyle = {
	fontFamily: 'Montserrat, Nunito Sans, Arial, sans-serif',
	fontSize: 23,
	fontWeight: '800',
	fill: '#FFF2FF',
	stroke: '#12051F',
	strokeThickness: 4,
	align: 'center',
	lineHeight: 34,
	wordWrap: true,
	wordWrapWidth: 372,
};
```

### CTA Text

```ts
export const ctaStyle = {
	fontFamily: 'Cinzel, Georgia, serif',
	fontSize: 44,
	fontWeight: '900',
	fill: '#FFE6A0',
	stroke: '#3B1600',
	strokeThickness: 7,
	align: 'center',
	dropShadow: true,
	dropShadowColor: '#000000',
	dropShadowBlur: 6,
	dropShadowDistance: 4,
};
```

---

## 8. Localization Structure

Do not hardcode card text in the Pixi scene. Use locale files.

Example:

```ts
export const loaderCopy = {
	en: {
		subtitle: 'HOW IT WORKS',

		card1Title: 'CHARGE THE GAZE',
		card1Body: 'Winning clusters charge your Gaze.\nMore tumbles build more power.',

		card2Title: 'EYE MULTIPLIERS',
		card2Body: 'When an Eye lands, it boosts your win.\nADD and MULTIPLY Eyes can appear.',

		card3Title: 'HUGE WINS',
		card3Body:
			'Charged Eyes combine with Gaze\nfor massive payouts.\nBuild power, then unleash it.',

		cta: 'CLICK TO CONTINUE',
	},

	fr: {
		subtitle: 'COMMENT JOUER',

		card1Title: 'CHARGE LE REGARD',
		card1Body: 'Les gains chargent le Regard.\nPlus de cascades, plus de puissance.',

		card2Title: 'MULTIPLICATEURS',
		card2Body: 'Quand l’Œil apparaît,\nil augmente votre gain.',

		card3Title: 'GAINS ÉNORMES',
		card3Body: 'Combinez le Regard chargé\navec les Yeux pour de gros gains.',

		cta: 'CLIQUER POUR CONTINUER',
	},
};
```

Important for translations:

- Use `wordWrapWidth`.
- Reduce font size for long languages.
- Keep titles max two lines.
- Keep body max three lines.
- Use `TextMetrics.measureText` to fit text if needed.

---

## 9. PixiJS Setup

Example using PixiJS v8 style imports.

```ts
import {
	Application,
	Assets,
	BlurFilter,
	Container,
	Graphics,
	Sprite,
	Text,
	Texture,
} from 'pixi.js';

import gsap from 'gsap';
```

Scene creation:

```ts
export async function createAbyssalLoader(
	app: Application,
	locale: keyof typeof loaderCopy = 'en',
) {
	const root = new Container();
	app.stage.addChild(root);

	await Assets.load([
		'/assets/background_base.png',
		'/assets/logo_abyssal.png',
		'/assets/spritesheet.json',
	]);

	const sheet = Assets.get('/assets/spritesheet.json');
	const copy = loaderCopy[locale];

	const getTexture = (name: string): Texture => {
		return sheet.textures[name];
	};

	buildBackground(root);
	buildLogo(root, copy);
	buildCards(root, getTexture, copy);
	buildCTA(root, copy);

	fitRootToScreen(app, root);
	app.renderer.on('resize', () => fitRootToScreen(app, root));

	animateLoader(root);

	return root;
}
```

---

## 10. Background

```ts
function buildBackground(root: Container) {
	const bg = Sprite.from('/assets/background_base.png');
	bg.width = DESIGN_W;
	bg.height = DESIGN_H;
	root.addChild(bg);

	addVignette(root);
	addLightRays(root);
	addAmbientBubbles(root);
}
```

Vignette:

```ts
function addVignette(parent: Container) {
	const g = new Graphics();
	g.rect(0, 0, DESIGN_W, DESIGN_H);
	g.fill({ color: 0x000000, alpha: 0.18 });
	parent.addChild(g);
}
```

Light rays:

```ts
function addLightRays(parent: Container) {
	const rays = new Container();
	parent.addChild(rays);

	for (let i = 0; i < 5; i++) {
		const ray = new Graphics();
		ray.moveTo(650 + i * 90, 0);
		ray.lineTo(730 + i * 70, 0);
		ray.lineTo(930 + i * 40, 420);
		ray.lineTo(700 + i * 30, 420);
		ray.closePath();
		ray.fill({ color: 0x15b8ff, alpha: 0.045 });
		ray.blendMode = 'add';

		rays.addChild(ray);
	}

	gsap.to(rays, {
		alpha: 0.55,
		duration: 2.8,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});
}
```

Bubbles:

```ts
function addAmbientBubbles(parent: Container) {
	const bubbleLayer = new Container();
	parent.addChild(bubbleLayer);

	for (let i = 0; i < 55; i++) {
		const b = new Graphics();
		const r = 3 + Math.random() * 8;

		b.circle(0, 0, r);
		b.stroke({ width: 1.5, color: 0x47e9ff, alpha: 0.35 });
		b.fill({ color: 0x1237a8, alpha: 0.08 });

		b.x = Math.random() * DESIGN_W;
		b.y = Math.random() * DESIGN_H;

		bubbleLayer.addChild(b);

		gsap.to(b, {
			y: b.y - 80 - Math.random() * 180,
			x: b.x + (Math.random() - 0.5) * 35,
			alpha: 0.15 + Math.random() * 0.35,
			duration: 4 + Math.random() * 5,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut',
			delay: Math.random() * 3,
		});
	}
}
```

---

## 11. Logo and Subtitle

```ts
function buildLogo(root: Container, copy: LoaderCopy) {
	const logo = Sprite.from('/assets/logo_abyssal.png');
	logo.anchor.set(0.5);
	logo.x = 836;
	logo.y = 90;

	const logoMaxW = 650;
	logo.scale.set(logoMaxW / logo.texture.width);

	root.addChild(logo);

	const subtitle = new Text({
		text: copy.subtitle,
		style: {
			fontFamily: 'Cinzel, Georgia, serif',
			fontSize: 34,
			fontWeight: '800',
			fill: '#7FE8FF',
			stroke: '#061E4C',
			strokeThickness: 5,
			letterSpacing: 4,
			align: 'center',
		},
	});

	subtitle.anchor.set(0.5);
	subtitle.x = 836;
	subtitle.y = 178;
	root.addChild(subtitle);

	gsap.fromTo(
		logo,
		{ y: 70, alpha: 0, scaleX: logo.scale.x * 0.9, scaleY: logo.scale.y * 0.9 },
		{
			y: 90,
			alpha: 1,
			scaleX: logo.scale.x,
			scaleY: logo.scale.y,
			duration: 0.75,
			ease: 'back.out(1.5)',
		},
	);

	gsap.to(logo, {
		y: 94,
		duration: 2.4,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});
}
```

---

## 12. Reusable Card Creation

```ts
function buildCards(root: Container, getTexture: (name: string) => Texture, copy: LoaderCopy) {
	const cards = [
		{
			title: copy.card1Title,
			body: copy.card1Body,
			buildArt: buildChargeGazeArt,
		},
		{
			title: copy.card2Title,
			body: copy.card2Body,
			buildArt: buildEyeMultiplierArt,
		},
		{
			title: copy.card3Title,
			body: copy.card3Body,
			buildArt: buildHugeWinsArt,
		},
	];

	cards.forEach((data, i) => {
		const card = createCard({
			x: CARD_X0 + i * (CARD_W + CARD_GAP),
			y: CARD_Y,
			w: CARD_W,
			h: CARD_H,
			title: data.title,
			body: data.body,
			getTexture,
			buildArt: data.buildArt,
			index: i,
		});

		root.addChild(card);

		gsap.fromTo(
			card,
			{ y: CARD_Y + 40, alpha: 0 },
			{
				y: CARD_Y,
				alpha: 1,
				duration: 0.55,
				delay: 0.15 + i * 0.12,
				ease: 'back.out(1.4)',
			},
		);
	});
}
```

Card function:

```ts
function createCard(options: {
	x: number;
	y: number;
	w: number;
	h: number;
	title: string;
	body: string;
	index: number;
	getTexture: (name: string) => Texture;
	buildArt: (parent: Container, w: number, getTexture: (name: string) => Texture) => void;
}) {
	const card = new Container();
	card.x = options.x;
	card.y = options.y;

	const frame = createCardFrame(options.w, options.h);
	card.addChild(frame);

	const art = new Container();
	options.buildArt(art, options.w, options.getTexture);
	card.addChild(art);

	const titleText = new Text({
		text: options.title,
		style: {
			fontFamily: 'Cinzel Decorative, Cinzel, Georgia, serif',
			fontSize: 36,
			fontWeight: '900',
			fill: '#FFD76A',
			stroke: '#1A0628',
			strokeThickness: 6,
			align: 'center',
			dropShadow: true,
			dropShadowColor: '#000000',
			dropShadowBlur: 5,
			dropShadowDistance: 3,
			wordWrap: true,
			wordWrapWidth: options.w - 40,
		},
	});

	titleText.anchor.set(0.5);
	titleText.x = options.w / 2;
	titleText.y = 380;
	card.addChild(titleText);

	const bodyText = new Text({
		text: options.body,
		style: {
			fontFamily: 'Montserrat, Nunito Sans, Arial, sans-serif',
			fontSize: 23,
			fontWeight: '800',
			fill: '#FFF2FF',
			stroke: '#12051F',
			strokeThickness: 4,
			align: 'center',
			lineHeight: 34,
			wordWrap: true,
			wordWrapWidth: options.w - 58,
		},
	});

	bodyText.anchor.set(0.5, 0);
	bodyText.x = options.w / 2;
	bodyText.y = 428;
	card.addChild(bodyText);

	animateCardIdle(card, art, options.index);

	return card;
}
```

---

## 13. Card Frame

Use Pixi Graphics so it scales cleanly and can be reused.

```ts
function createCardFrame(w: number, h: number) {
	const c = new Container();

	const glow = new Graphics();
	glow.roundRect(-6, -6, w + 12, h + 12, 28);
	glow.fill({ color: 0x7c2cff, alpha: 0.18 });
	glow.filters = [new BlurFilter({ strength: 10 })];
	c.addChild(glow);

	const bg = new Graphics();
	bg.roundRect(0, 0, w, h, 24);
	bg.fill({ color: 0x050725, alpha: 0.88 });
	c.addChild(bg);

	const border1 = new Graphics();
	border1.roundRect(0, 0, w, h, 24);
	border1.stroke({ width: 3, color: 0x9e5bff, alpha: 0.95 });
	c.addChild(border1);

	const border2 = new Graphics();
	border2.roundRect(8, 8, w - 16, h - 16, 18);
	border2.stroke({ width: 1.5, color: 0xffd76a, alpha: 0.55 });
	c.addChild(border2);

	addDiamondOrnament(c, w / 2, -4, 28);
	addDiamondOrnament(c, w / 2, h + 2, 28);
	addDiamondOrnament(c, 18, h - 18, 16);
	addDiamondOrnament(c, w - 18, h - 18, 16);

	return c;
}
```

Diamond helper:

```ts
function addDiamondOrnament(parent: Container, x: number, y: number, size: number) {
	const g = new Graphics();

	g.moveTo(x, y - size);
	g.lineTo(x + size * 0.65, y);
	g.lineTo(x, y + size);
	g.lineTo(x - size * 0.65, y);
	g.closePath();

	g.fill({ color: 0x8f33ff, alpha: 1 });
	g.stroke({ width: 2, color: 0xffd76a, alpha: 0.9 });

	parent.addChild(g);

	gsap.to(g, {
		alpha: 0.65,
		duration: 1.4,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});
}
```

---

## 14. Card 1 Illustration — Charge the Gaze

Concept:

- Several winning symbols around the top.
- Purple lightning from those symbols into the `ADD_EYE`.
- A Gaze charge arc under the Eye.

```ts
function buildChargeGazeArt(parent: Container, w: number, getTexture: (name: string) => Texture) {
	const centerX = w / 2;
	const eyeX = centerX;
	const eyeY = 245;

	const glow = radialGlow(eyeX, eyeY, 170, 0x7c2cff, 0.45);
	parent.addChild(glow);

	const symbolPositions = [
		{ name: 'H2', x: 122, y: 100, size: 88 },
		{ name: 'H1', x: 225, y: 95, size: 88 },
		{ name: 'H4', x: 318, y: 112, size: 88 },
		{ name: 'H2', x: 95, y: 190, size: 88 },
		{ name: 'H1', x: 325, y: 205, size: 88 },
	];

	const lightningLayer = new Container();
	parent.addChild(lightningLayer);

	for (const p of symbolPositions) {
		const s = addIcon(parent, getTexture(p.name), p.x, p.y, p.size);
		animateFloat(s, 1.8 + Math.random() * 0.8, 4 + Math.random() * 3);

		drawLightning(lightningLayer, p.x, p.y, eyeX, eyeY, 0xb34cff, 3);
	}

	const eye = addIcon(parent, getTexture('ADD_EYE'), eyeX, eyeY, 150);
	eye.scale.x *= 1.03;
	eye.scale.y *= 1.03;

	drawGazeArc(parent, eyeX, eyeY + 70);

	gsap.to(glow, {
		alpha: 0.2,
		duration: 1.2,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});

	gsap.to(eye.scale, {
		x: eye.scale.x * 1.04,
		y: eye.scale.y * 1.04,
		duration: 1.25,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});

	animateLightningRefresh(lightningLayer, () => {
		lightningLayer.removeChildren();
		for (const p of symbolPositions) {
			drawLightning(lightningLayer, p.x, p.y, eyeX, eyeY, 0xb34cff, 3);
		}
	});
}
```

---

## 15. Card 2 Illustration — Eye Multipliers

Concept:

- Dark mini reel grid behind.
- `MULT_EYE` in center.
- Multiplier values around: `2x`, `5x`, `10x`.
- Red/orange lightning.

```ts
function buildEyeMultiplierArt(
	parent: Container,
	w: number,
	getTexture: (name: string) => Texture,
) {
	const centerX = w / 2;
	const centerY = 210;

	drawMiniGrid(parent, 82, 52, 266, 250);

	const bgSymbols = [
		['H4', 'L5', 'L4'],
		['L1', 'L3', 'H3'],
		['H4', 'L2', 'L3'],
	];

	for (let r = 0; r < 3; r++) {
		for (let col = 0; col < 3; col++) {
			const tex = getTexture(bgSymbols[r][col]);
			const s = addIcon(parent, tex, 125 + col * 85, 92 + r * 82, 65);
			s.alpha = 0.22;
		}
	}

	const glow = radialGlow(centerX, centerY, 175, 0xff3300, 0.35);
	parent.addChild(glow);

	const lightningLayer = new Container();
	parent.addChild(lightningLayer);

	const eye = addIcon(parent, getTexture('MULT_EYE'), centerX, centerY, 170);

	drawLightning(lightningLayer, centerX, centerY, 120, 110, 0xff4d37, 2);
	drawLightning(lightningLayer, centerX, centerY, 315, 105, 0xff4d37, 2);
	drawLightning(lightningLayer, centerX, centerY, centerX, 310, 0xffb72e, 2);

	const m2 = addMultiplierText(parent, '2x', 112, 105, 40, 0x47e9ff);
	const m10 = addMultiplierText(parent, '10x', 320, 102, 40, 0xff4d37);
	const m5 = addMultiplierText(parent, '5x', centerX, 310, 50, 0xffc238);

	[m2, m10, m5].forEach((m, i) => {
		gsap.to(m.scale, {
			x: 1.08,
			y: 1.08,
			duration: 0.8,
			delay: i * 0.18,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut',
		});
	});

	gsap.to(eye, {
		rotation: 0.035,
		duration: 1.6,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});

	animateLightningRefresh(lightningLayer, () => {
		lightningLayer.removeChildren();
		drawLightning(lightningLayer, centerX, centerY, 120, 110, 0xff4d37, 2);
		drawLightning(lightningLayer, centerX, centerY, 315, 105, 0xff4d37, 2);
		drawLightning(lightningLayer, centerX, centerY, centerX, 310, 0xffb72e, 2);
	});
}
```

---

## 16. Card 3 Illustration — Huge Wins

Concept:

- Use only real Eye symbols:
  - `ADD_EYE`
  - `MULT_EYE`
- Gaze charge energy rises from below.
- The two Eyes combine with Gaze.
- Coins/crystals suggest a huge payout.
- No purple Eye symbol.

```ts
function buildHugeWinsArt(parent: Container, w: number, getTexture: (name: string) => Texture) {
	const centerX = w / 2;
	const baseY = 325;

	const aura = radialGlow(centerX, 250, 210, 0x7c2cff, 0.5);
	parent.addChild(aura);

	const beam = new Graphics();
	beam.moveTo(centerX, baseY);
	beam.lineTo(centerX - 70, 205);
	beam.lineTo(centerX - 82, 185);
	beam.moveTo(centerX, baseY);
	beam.lineTo(centerX + 70, 210);
	beam.lineTo(centerX + 80, 200);
	beam.stroke({ width: 5, color: 0xa34cff, alpha: 0.95 });
	beam.filters = [new BlurFilter({ strength: 4 })];
	parent.addChild(beam);

	const addEye = addIcon(parent, getTexture('ADD_EYE'), centerX - 78, 188, 135);
	const multEye = addIcon(parent, getTexture('MULT_EYE'), centerX + 80, 205, 145);

	const lightningLayer = new Container();
	parent.addChild(lightningLayer);

	drawLightning(lightningLayer, centerX - 78, 188, centerX, baseY, 0x47e9ff, 3);
	drawLightning(lightningLayer, centerX + 80, 205, centerX, baseY, 0xff4d37, 3);

	drawCoinBurst(parent, centerX, baseY + 5);
	drawCrystalPile(parent, centerX, baseY + 18);

	gsap.to(aura, {
		alpha: 0.2,
		duration: 1.1,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});

	gsap.to(beam, {
		alpha: 0.35,
		duration: 0.7,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});

	animateFloat(addEye, 1.7, 5);
	animateFloat(multEye, 1.9, 6);

	animateLightningRefresh(lightningLayer, () => {
		lightningLayer.removeChildren();
		drawLightning(lightningLayer, centerX - 78, 188, centerX, baseY, 0x47e9ff, 3);
		drawLightning(lightningLayer, centerX + 80, 205, centerX, baseY, 0xff4d37, 3);
	});
}
```

---

## 17. CTA

```ts
function buildCTA(root: Container, copy: LoaderCopy) {
	const cta = new Text({
		text: copy.cta,
		style: {
			fontFamily: 'Cinzel, Georgia, serif',
			fontSize: 44,
			fontWeight: '900',
			fill: '#FFE6A0',
			stroke: '#3B1600',
			strokeThickness: 7,
			align: 'center',
			dropShadow: true,
			dropShadowColor: '#000000',
			dropShadowBlur: 6,
			dropShadowDistance: 4,
		},
	});

	cta.anchor.set(0.5);
	cta.x = 836;
	cta.y = 846;

	root.addChild(cta);

	gsap.to(cta, {
		alpha: 0.72,
		duration: 0.85,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});

	gsap.to(cta.scale, {
		x: 1.035,
		y: 1.035,
		duration: 0.85,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});
}
```

---

## 18. Shared Helper Functions

### Add Icon

```ts
function addIcon(parent: Container, texture: Texture, x: number, y: number, targetSize: number) {
	const s = new Sprite(texture);
	s.anchor.set(0.5);

	const maxSide = Math.max(texture.width, texture.height);
	const scale = targetSize / maxSide;

	s.scale.set(scale);
	s.x = x;
	s.y = y;

	parent.addChild(s);
	return s;
}
```

### Glow

```ts
function radialGlow(x: number, y: number, radius: number, color: number, alpha: number) {
	const g = new Graphics();
	g.circle(x, y, radius);
	g.fill({ color, alpha });
	g.filters = [new BlurFilter({ strength: 24 })];
	g.blendMode = 'add';
	return g;
}
```

### Lightning

```ts
function drawLightning(
	parent: Container,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: number,
	width = 3,
) {
	const g = new Graphics();

	g.moveTo(x1, y1);

	const segments = 7;
	for (let i = 1; i < segments; i++) {
		const t = i / segments;
		const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 18;
		const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 18;
		g.lineTo(x, y);
	}

	g.lineTo(x2, y2);
	g.stroke({ width, color, alpha: 0.9 });
	g.filters = [new BlurFilter({ strength: 2 })];
	g.blendMode = 'add';

	parent.addChild(g);
	return g;
}
```

### Lightning Refresh with GSAP

```ts
function animateLightningRefresh(layer: Container, redraw: () => void) {
	const state = { value: 0 };

	gsap.to(state, {
		value: 1,
		duration: 0.12,
		repeat: -1,
		ease: 'none',
		onRepeat: redraw,
	});
}
```

### Gaze Arc

```ts
function drawGazeArc(parent: Container, x: number, y: number) {
	const g = new Graphics();

	for (let i = 0; i < 8; i++) {
		const start = Math.PI * 0.15 + i * 0.25;
		const end = start + 0.18;

		g.arc(x, y, 112, start, end);
		g.stroke({ width: 9, color: 0xb34cff, alpha: 0.95 });
	}

	g.blendMode = 'add';
	parent.addChild(g);

	gsap.to(g, {
		alpha: 0.45,
		duration: 0.8,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});
}
```

### Mini Grid

```ts
function drawMiniGrid(parent: Container, x: number, y: number, w: number, h: number) {
	const g = new Graphics();

	g.roundRect(x, y, w, h, 12);
	g.fill({ color: 0x020a28, alpha: 0.45 });
	g.stroke({ width: 2, color: 0x47e9ff, alpha: 0.22 });

	for (let i = 1; i < 3; i++) {
		g.moveTo(x + (w / 3) * i, y);
		g.lineTo(x + (w / 3) * i, y + h);
	}

	for (let i = 1; i < 3; i++) {
		g.moveTo(x, y + (h / 3) * i);
		g.lineTo(x + w, y + (h / 3) * i);
	}

	g.stroke({ width: 1.5, color: 0x47e9ff, alpha: 0.18 });

	parent.addChild(g);
}
```

### Multiplier Text

```ts
function addMultiplierText(
	parent: Container,
	text: string,
	x: number,
	y: number,
	fontSize: number,
	color: number,
) {
	const glow = radialGlow(x, y, fontSize * 1.4, color, 0.25);
	parent.addChild(glow);

	const t = new Text({
		text,
		style: {
			fontFamily: 'Cinzel, Georgia, serif',
			fontSize,
			fontWeight: '900',
			fill: color,
			stroke: '#250006',
			strokeThickness: 6,
			dropShadow: true,
			dropShadowColor: '#000000',
			dropShadowBlur: 4,
			dropShadowDistance: 3,
		},
	});

	t.anchor.set(0.5);
	t.x = x;
	t.y = y;
	parent.addChild(t);

	return t;
}
```

### Coin Burst

```ts
function drawCoinBurst(parent: Container, x: number, y: number) {
	const coins: Graphics[] = [];

	for (let i = 0; i < 24; i++) {
		const angle = -Math.PI * 0.95 + Math.random() * Math.PI * 0.9;
		const dist = 35 + Math.random() * 135;

		const cx = x + Math.cos(angle) * dist;
		const cy = y + Math.sin(angle) * dist;

		const coin = new Graphics();
		coin.ellipse(0, 0, 12, 5);
		coin.fill({ color: 0xffbf38, alpha: 1 });
		coin.stroke({ width: 2, color: 0x8a5121, alpha: 1 });

		coin.x = cx;
		coin.y = cy;
		coin.rotation = Math.random() * Math.PI;

		parent.addChild(coin);
		coins.push(coin);

		gsap.to(coin, {
			y: cy - 10 - Math.random() * 20,
			rotation: coin.rotation + Math.PI * 2,
			duration: 1.4 + Math.random() * 0.8,
			repeat: -1,
			yoyo: true,
			ease: 'sine.inOut',
			delay: Math.random() * 0.5,
		});
	}

	return coins;
}
```

### Crystal Pile

```ts
function drawCrystalPile(parent: Container, x: number, y: number) {
	const g = new Graphics();

	for (let i = 0; i < 8; i++) {
		const cx = x - 80 + i * 22;
		const h = 28 + Math.random() * 45;

		g.moveTo(cx, y);
		g.lineTo(cx + 10, y - h);
		g.lineTo(cx + 22, y);
		g.closePath();

		g.fill({ color: i % 2 === 0 ? 0x7c2cff : 0xffd76a, alpha: 0.9 });
		g.stroke({ width: 2, color: 0xffffff, alpha: 0.3 });
	}

	parent.addChild(g);
	return g;
}
```

### Floating Animation

```ts
function animateFloat(target: any, duration = 1.8, distance = 5) {
	gsap.to(target, {
		y: target.y - distance,
		duration,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});
}
```

### Card Idle Animation

```ts
function animateCardIdle(card: Container, art: Container, index: number) {
	gsap.to(card, {
		y: card.y - 3,
		duration: 2.2 + index * 0.2,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
		delay: index * 0.15,
	});

	gsap.to(art, {
		alpha: 0.92,
		duration: 1.8 + index * 0.2,
		repeat: -1,
		yoyo: true,
		ease: 'sine.inOut',
	});
}
```

---

## 19. Full Animation Timeline

Use GSAP timeline for entrance.

```ts
function animateLoader(root: Container) {
	const tl = gsap.timeline();

	const logoLayer = root.getChildByName('logoLayer');
	const cardLayer = root.getChildByName('cardLayer');
	const ctaLayer = root.getChildByName('ctaLayer');

	if (logoLayer) {
		tl.from(logoLayer, {
			alpha: 0,
			y: -30,
			duration: 0.55,
			ease: 'power2.out',
		});
	}

	if (cardLayer) {
		tl.from(
			cardLayer.children,
			{
				alpha: 0,
				y: 40,
				duration: 0.55,
				stagger: 0.12,
				ease: 'back.out(1.35)',
			},
			'-=0.2',
		);
	}

	if (ctaLayer) {
		tl.from(
			ctaLayer,
			{
				alpha: 0,
				y: 20,
				duration: 0.35,
				ease: 'power2.out',
			},
			'-=0.1',
		);
	}
}
```

Recommended continuous animations:

```txt
Background bubbles       upward drift, random delays
Light rays               slow alpha pulse
Card frames              jewel pulse
Card 1 symbols           small float
Card 1 lightning         redraw every 0.12s
Card 1 Gaze arc          alpha pulse
Card 2 Eye               slight rotation/pulse
Card 2 multiplier text   scale pulse
Card 2 lightning         redraw every 0.12s
Card 3 Eyes              small float, offset timing
Card 3 beam              alpha pulse
Card 3 coins             float/rotate
CTA                      alpha + scale pulse
```

---

## 20. Final Loader File Example

The final file could look like:

```txt
src/scenes/loader/AbyssalLoader.ts
src/scenes/loader/loaderCopy.ts
src/scenes/loader/loaderStyles.ts
src/scenes/loader/loaderLayout.ts
src/scenes/loader/loaderFx.ts
```

Example usage:

```ts
const app = new PIXI.Application();
await app.init({
	width: window.innerWidth,
	height: window.innerHeight,
	backgroundColor: 0x000000,
	resizeTo: window,
});

document.body.appendChild(app.canvas);

const loader = await createAbyssalLoader(app, currentLocale);

loader.eventMode = 'static';
loader.cursor = 'pointer';

loader.on('pointertap', () => {
	gsap.to(loader, {
		alpha: 0,
		duration: 0.35,
		ease: 'power2.inOut',
		onComplete: () => {
			app.stage.removeChild(loader);
			loader.destroy({ children: true });
			startGame();
		},
	});
});
```

---

## 21. QA Checklist

Before approving implementation:

- [ ] No baked tutorial text in images.
- [ ] All copy comes from locale files.
- [ ] Cards stay readable at mobile sizes.
- [ ] Card titles do not exceed two lines.
- [ ] Body text does not exceed three lines.
- [ ] `ADD_EYE` and `MULT_EYE` use real spritesheet assets.
- [ ] No purple gameplay Eye is shown.
- [ ] Card 3 communicates Gaze + Eyes + big win without inventing a new symbol.
- [ ] Loader scales uniformly using the root container.
- [ ] No hardcoded screen-specific pixel positions outside the design layout constants.
- [ ] GSAP animations stop/destroy correctly when leaving the loader.
- [ ] No memory leaks from repeated lightning redraw timers/tweens.
- [ ] Works at 16:9 desktop.
- [ ] Works on mobile landscape.
- [ ] Works on lower-end devices without excessive filters.

---

## 22. Performance Notes

Use moderation with filters:

- Blur filters are expensive.
- Avoid applying `BlurFilter` to huge full-screen containers.
- Prefer small glows behind objects.
- Cache static card frames if needed.
- Keep animated lightning inside small containers.
- Destroy GSAP timelines on scene exit.

On scene cleanup:

```ts
function destroyLoader(loader: Container, timelines: gsap.core.Timeline[]) {
	timelines.forEach((tl) => tl.kill());
	gsap.killTweensOf(loader);
	loader.destroy({ children: true });
}
```

---

## 23. Recommended Final Approach

Use this hybrid approach:

```txt
Static image:
- background_base.png
- logo_abyssal.png

PixiJS:
- card frames
- text
- symbols
- glows
- coins
- lightning
- bubbles

GSAP:
- entrance sequence
- card idle motion
- symbol float
- glows
- CTA pulse
- lightning refresh
```

This gives the team the generated art direction while keeping the loader flexible, localized, animated, and maintainable.
