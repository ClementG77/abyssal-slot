# Abyssal Gaze Meter — PixiJS + GSAP Implementation Guide

This document explains how to build the **Abyssal Gaze Meter** from the exported sprite kit:

```txt
empty meter frame
front dividers
top Eye
optional glow texture
optional particle texture
```

The goal is to create a **smooth, animated, code-driven meter** that sits on the left side of the slot board, fills in **10 charge steps**, and displays the current Eye/Gaze multiplier in the bottom text panel.

---

## 1. Final Goal

The meter should feel like an abyssal temple mechanism:

- A tall blue-stone and gold-framed gauge.
- A glowing blue Eye at the top.
- A dark vertical chamber split into **10 fillable segments**.
- Purple/cyan Gaze energy fills upward, one segment per winning tumble/connection.
- Gold dividers stay on top of the fill.
- Bottom panel displays multiplier text such as `0x`, `5x`, `13x`, `100x`.
- GSAP handles all pulses, fills, flashes, and cleanup.

The meter should **not** be a 10-frame baked animation. It should be built from a few static sprites plus dynamic PixiJS layers.

---

## 2. Why This Approach Is Best

### Do not use a full 10-step spritesheet of the whole meter

A baked 10-frame meter is simple, but it is less flexible:

```txt
Problems:
- Larger texture memory.
- Less smooth.
- Hard to tune timings.
- Hard to update the multiplier text.
- Hard to create partial fill / overcharge / anticipation FX.
- Any visual change requires regenerating all 10 frames.
```

### Recommended approach

Use the exported sprite kit as the **static skin**, and generate the fill dynamically:

```txt
Static sprites:
- empty frame
- front dividers
- top Eye
- glow
- particle

Dynamic PixiJS:
- 10 fill segments
- masks
- lightning
- shimmer
- bubbles
- multiplier text

GSAP:
- segment fill animation
- Eye pulse
- text bump
- flash
- reset/drain
```

This gives the best balance of art quality, performance, and gameplay control.

---

## 3. TexturePacker Export Naming

When slicing the generated sprite kit, use clear names.

Recommended texture names:

```txt
gaze_meter_frame_empty
gaze_meter_dividers_front
gaze_meter_eye_top
gaze_meter_glow_soft
gaze_meter_particle_burst
```

Optional extra slices if available:

```txt
gaze_meter_jewel_purple
gaze_meter_segment_glow
gaze_meter_lightning_bolt
gaze_meter_text_panel
```

### TexturePacker settings

Recommended settings:

```txt
Format:              JSON Hash or JSON Array, depending on project convention
Image format:        PNG
Premultiply alpha:   match existing game pipeline
Allow rotation:      false
Trim:                true for small FX, false for frame if easier to align
Padding:             4 px minimum
Extrude:             2 px
Max size:            2048 or 4096
Scale:               1x source
```

For UI assets, disabling rotation is useful because it makes debugging and manual placement easier.

---

## 4. Important Sprite Note

If the exported `gaze_meter_frame_empty` already includes the top Eye baked into it, you have two options:

### Option A — Preferred

Export the frame **without** the Eye baked in.

Then use:

```txt
gaze_meter_frame_empty
gaze_meter_eye_top
```

This lets the Eye pulse, glow, shake, and react independently.

### Option B — Acceptable

Keep the Eye baked in the frame and still place `gaze_meter_eye_top` as a glowing overlay at the exact same position.

This gives a nice pulse effect, but the underlying Eye will still be visible.

---

## 5. Layer Stack

The meter should be built in this order:

```txt
AbyssalGazeMeter
  1. frameBack
      - empty stone/gold frame
      - dark inner chamber
      - bottom text panel background

  2. fillMask
      - invisible rounded rectangle
      - clips all fill FX to the inner chamber

  3. fillLayer
      - 10 segment fills
      - vertical Gaze beam
      - internal shimmer
      - bubbles/particles inside chamber

  4. dividerLayer
      - gold horizontal dividers
      - jewels
      - must render above fillLayer

  5. topEye
      - independent Eye sprite
      - pulse on charge

  6. fxLayer
      - flashes
      - lightning
      - additive glow
      - charge sparks

  7. multiplierText
      - PixiJS text on bottom panel
```

Never bake the multiplier text into the image.

---

## 6. Recommended Coordinate System

Use the frame sprite as the reference coordinate system.

Example frame dimensions can vary after slicing, so keep all coordinates in a config object.

```ts
export type GazeMeterLayout = {
	frameW: number;
	frameH: number;

	inner: {
		x: number;
		y: number;
		w: number;
		h: number;
		radius: number;
	};

	eye: {
		x: number;
		y: number;
		size: number;
	};

	text: {
		x: number;
		y: number;
		w: number;
		h: number;
	};
};
```

Starting layout example for the approved vertical meter:

```ts
export const DEFAULT_GAZE_LAYOUT: GazeMeterLayout = {
	frameW: 430,
	frameH: 1220,

	inner: {
		x: 118,
		y: 300,
		w: 194,
		h: 650,
		radius: 38,
	},

	eye: {
		x: 215,
		y: 116,
		size: 250,
	},

	text: {
		x: 215,
		y: 1108,
		w: 340,
		h: 90,
	},
};
```

After slicing in TexturePacker, adjust these values once using a debug overlay.

---

## 7. Debug Overlay for Alignment

Use this while placing the fill area.

```ts
function addDebugLayoutOverlay(parent: PIXI.Container, layout: GazeMeterLayout) {
	const g = new PIXI.Graphics();

	g.roundRect(layout.inner.x, layout.inner.y, layout.inner.w, layout.inner.h, layout.inner.radius);

	g.stroke({
		width: 3,
		color: 0x00ffff,
		alpha: 0.8,
	});

	g.rect(
		layout.text.x - layout.text.w / 2,
		layout.text.y - layout.text.h / 2,
		layout.text.w,
		layout.text.h,
	);

	g.stroke({
		width: 3,
		color: 0xffcc00,
		alpha: 0.8,
	});

	parent.addChild(g);
}
```

Remove this before production.

---

## 8. Gaze States

The meter has 10 visual segments.

```ts
const MAX_GAZE_SEGMENTS = 10;
```

Gameplay can produce more than 10 tumbles in rare cases. In that case:

```txt
0-10       normal fill
>10        meter remains full and enters overcharge pulse
```

Recommended state model:

```ts
type GazeMeterState = {
	gaze: number; // current tumble count
	visibleSegments: number; // clamped 0-10
	multiplierText: string; // "0x", "5x", "13x", etc.
	overcharged: boolean; // true if gaze > 10
};
```

---

## 9. Event Contract With Game Logic

The meter should not calculate the game outcome. It should only visualize values sent by game logic.

Recommended API:

```ts
gazeMeter.reset();

gazeMeter.setGaze(0);
gazeMeter.incrementGaze({ multiplierText: '1x' });

gazeMeter.setMultiplierText('13x');

gazeMeter.playEyeLanded({
	eyeType: 'ADD',
	eyeValue: 10,
	finalMultiplier: 13,
});

gazeMeter.playEyeLanded({
	eyeType: 'MULT',
	eyeValue: 10,
	finalMultiplier: 30,
});

gazeMeter.playResolved();
```

Typical spin flow:

```txt
Spin starts
→ meter.reset()

Winning tumble happens
→ meter.incrementGaze()

Another winning tumble happens
→ meter.incrementGaze()

Eye lands / resolves
→ meter.playEyeLanded()
→ multiplier text updates

Spin ends
→ after payout, meter.reset()
```

---

## 10. PixiJS Class Skeleton

```ts
import { BlurFilter, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';

import gsap from 'gsap';

export type EyeType = 'ADD' | 'MULT';

export type GazeMeterTextures = {
	frame: Texture;
	dividers: Texture;
	eye: Texture;
	glow: Texture;
	particle: Texture;
};

export type GazeMeterOptions = {
	layout: GazeMeterLayout;
	maxSegments?: number;
	initialText?: string;
};

export class AbyssalGazeMeter extends Container {
	private layout: GazeMeterLayout;
	private maxSegments: number;

	private frameBack: Sprite;
	private dividersFront: Sprite;
	private topEye: Sprite;

	private fillMask: Graphics;
	private fillLayer: Container;
	private fxLayer: Container;
	private segmentFills: Container[] = [];

	private multiplierText: Text;

	private gaze = 0;
	private timelines: gsap.core.Timeline[] = [];

	constructor(
		private textures: GazeMeterTextures,
		options: GazeMeterOptions,
	) {
		super();

		this.layout = options.layout;
		this.maxSegments = options.maxSegments ?? 10;

		this.frameBack = new Sprite(textures.frame);
		this.addChild(this.frameBack);

		this.fillLayer = new Container();
		this.addChild(this.fillLayer);

		this.fillMask = this.createFillMask();
		this.addChild(this.fillMask);
		this.fillLayer.mask = this.fillMask;

		this.createSegments();

		this.dividersFront = new Sprite(textures.dividers);
		this.addChild(this.dividersFront);

		this.topEye = new Sprite(textures.eye);
		this.topEye.anchor.set(0.5);
		this.topEye.x = this.layout.eye.x;
		this.topEye.y = this.layout.eye.y;
		this.topEye.width = this.layout.eye.size;
		this.topEye.scale.y = this.topEye.scale.x;
		this.addChild(this.topEye);

		this.fxLayer = new Container();
		this.addChild(this.fxLayer);

		this.multiplierText = this.createMultiplierText(options.initialText ?? '0x');
		this.addChild(this.multiplierText);

		this.playIdle();
	}

	public setGaze(value: number, instant = false) {
		const next = Math.max(0, value);
		const prev = this.gaze;

		this.gaze = next;

		const prevVisible = Math.min(prev, this.maxSegments);
		const nextVisible = Math.min(next, this.maxSegments);

		if (instant) {
			this.segmentFills.forEach((seg, i) => {
				seg.alpha = i < nextVisible ? 1 : 0;
			});
			return;
		}

		if (nextVisible > prevVisible) {
			for (let i = prevVisible; i < nextVisible; i++) {
				this.animateSegmentIn(i, i - prevVisible);
			}
		} else if (nextVisible < prevVisible) {
			for (let i = prevVisible - 1; i >= nextVisible; i--) {
				this.animateSegmentOut(i, prevVisible - 1 - i);
			}
		}

		if (next > this.maxSegments) {
			this.playOvercharge();
		}
	}

	public incrementGaze(multiplierText?: string) {
		const next = this.gaze + 1;

		this.setGaze(next);

		if (multiplierText) {
			this.setMultiplierText(multiplierText);
		}

		this.playChargePulse();
	}

	public setMultiplierText(text: string) {
		this.multiplierText.text = text;

		gsap.fromTo(
			this.multiplierText.scale,
			{ x: 0.86, y: 0.86 },
			{
				x: 1,
				y: 1,
				duration: 0.28,
				ease: 'back.out(2)',
			},
		);
	}

	public playEyeLanded(params: { eyeType: EyeType; eyeValue: number; finalMultiplier: number }) {
		this.setMultiplierText(`${params.finalMultiplier}x`);

		const color = params.eyeType === 'MULT' ? 0xff331a : 0x35d9ff;

		this.spawnEyeBurst(color);

		gsap.fromTo(
			this.topEye.scale,
			{ x: this.topEye.scale.x, y: this.topEye.scale.y },
			{
				x: this.topEye.scale.x * 1.16,
				y: this.topEye.scale.y * 1.16,
				duration: 0.18,
				yoyo: true,
				repeat: 2,
				ease: 'sine.inOut',
			},
		);
	}

	public reset(animated = true) {
		this.gaze = 0;
		this.setMultiplierText('0x');

		if (!animated) {
			this.segmentFills.forEach((seg) => {
				seg.alpha = 0;
			});
			return;
		}

		this.segmentFills.forEach((seg, i) => {
			gsap.to(seg, {
				alpha: 0,
				duration: 0.22,
				delay: (this.maxSegments - i) * 0.025,
				ease: 'power2.in',
			});
		});
	}

	public destroyMeter() {
		this.timelines.forEach((tl) => tl.kill());
		gsap.killTweensOf(this);
		gsap.killTweensOf(this.topEye);
		gsap.killTweensOf(this.multiplierText);
		this.destroy({ children: true });
	}

	private createFillMask() {
		const g = new Graphics();

		g.roundRect(
			this.layout.inner.x,
			this.layout.inner.y,
			this.layout.inner.w,
			this.layout.inner.h,
			this.layout.inner.radius,
		);

		g.fill({ color: 0xffffff, alpha: 1 });

		return g;
	}

	private createSegments() {
		const { inner } = this.layout;

		const gap = 5;
		const segmentH = inner.h / this.maxSegments;

		for (let i = 0; i < this.maxSegments; i++) {
			const segment = new Container();

			const y = inner.y + inner.h - (i + 1) * segmentH;

			const baseGlow = new Graphics();
			baseGlow.roundRect(inner.x + 8, y + gap / 2, inner.w - 16, segmentH - gap, 10);
			baseGlow.fill({ color: 0x8a2cff, alpha: 0.78 });
			baseGlow.blendMode = 'add';

			const core = new Graphics();
			core.roundRect(inner.x + 24, y + gap / 2 + 4, inner.w - 48, segmentH - gap - 8, 8);
			core.fill({ color: 0x33d9ff, alpha: 0.2 });
			core.blendMode = 'add';

			const shine = new Sprite(this.textures.glow);
			shine.anchor.set(0.5);
			shine.x = inner.x + inner.w / 2;
			shine.y = y + segmentH / 2;
			shine.width = inner.w * 1.3;
			shine.height = segmentH * 2;
			shine.alpha = 0.5;
			shine.blendMode = 'add';

			segment.addChild(baseGlow, core, shine);
			segment.alpha = 0;

			this.fillLayer.addChild(segment);
			this.segmentFills.push(segment);
		}
	}

	private createMultiplierText(initialText: string) {
		const t = new Text({
			text: initialText,
			style: {
				fontFamily: 'Cinzel, Georgia, serif',
				fontSize: 54,
				fontWeight: '900',
				fill: '#FFE6A0',
				stroke: '#2B0700',
				strokeThickness: 8,
				align: 'center',
				dropShadow: true,
				dropShadowColor: '#000000',
				dropShadowBlur: 5,
				dropShadowDistance: 3,
			},
		});

		t.anchor.set(0.5);
		t.x = this.layout.text.x;
		t.y = this.layout.text.y;

		return t;
	}

	private animateSegmentIn(index: number, orderDelay = 0) {
		const seg = this.segmentFills[index];

		gsap.fromTo(
			seg,
			{ alpha: 0 },
			{
				alpha: 1,
				duration: 0.32,
				delay: orderDelay * 0.05,
				ease: 'power2.out',
			},
		);

		gsap.fromTo(
			seg.scale,
			{ x: 0.92, y: 0.75 },
			{
				x: 1,
				y: 1,
				duration: 0.38,
				delay: orderDelay * 0.05,
				ease: 'back.out(1.8)',
			},
		);

		this.flashSegment(index, orderDelay);
		this.spawnChargeParticle(index, orderDelay);
	}

	private animateSegmentOut(index: number, orderDelay = 0) {
		const seg = this.segmentFills[index];

		gsap.to(seg, {
			alpha: 0,
			duration: 0.22,
			delay: orderDelay * 0.035,
			ease: 'power2.in',
		});
	}

	private flashSegment(index: number, delay = 0) {
		const { inner } = this.layout;
		const segmentH = inner.h / this.maxSegments;
		const y = inner.y + inner.h - (index + 1) * segmentH;

		const flash = new Sprite(this.textures.glow);
		flash.anchor.set(0.5);
		flash.x = inner.x + inner.w / 2;
		flash.y = y + segmentH / 2;
		flash.width = inner.w * 1.45;
		flash.height = segmentH * 2.4;
		flash.alpha = 0;
		flash.blendMode = 'add';

		this.fxLayer.addChild(flash);

		gsap
			.timeline({ delay })
			.to(flash, {
				alpha: 0.95,
				duration: 0.08,
				ease: 'power1.out',
			})
			.to(flash, {
				alpha: 0,
				duration: 0.28,
				ease: 'power2.out',
				onComplete: () => flash.destroy(),
			});
	}

	private spawnChargeParticle(index: number, delay = 0) {
		const { inner } = this.layout;
		const segmentH = inner.h / this.maxSegments;
		const targetY = inner.y + inner.h - (index + 0.5) * segmentH;

		const p = new Sprite(this.textures.particle);
		p.anchor.set(0.5);
		p.x = inner.x + inner.w / 2;
		p.y = inner.y + inner.h + 20;
		p.width = 62;
		p.height = 62;
		p.alpha = 0;
		p.blendMode = 'add';

		this.fxLayer.addChild(p);

		gsap
			.timeline({ delay })
			.to(p, {
				alpha: 1,
				duration: 0.08,
			})
			.to(
				p,
				{
					y: targetY,
					duration: 0.32,
					ease: 'power3.out',
				},
				'<',
			)
			.to(p, {
				alpha: 0,
				scaleX: 1.8,
				scaleY: 1.8,
				duration: 0.22,
				ease: 'power2.out',
				onComplete: () => p.destroy(),
			});
	}

	private playChargePulse() {
		gsap.fromTo(
			this.topEye.scale,
			{ x: this.topEye.scale.x, y: this.topEye.scale.y },
			{
				x: this.topEye.scale.x * 1.08,
				y: this.topEye.scale.y * 1.08,
				duration: 0.16,
				yoyo: true,
				repeat: 1,
				ease: 'sine.inOut',
			},
		);

		gsap.fromTo(
			this.multiplierText,
			{ alpha: 0.75 },
			{
				alpha: 1,
				duration: 0.22,
				ease: 'sine.out',
			},
		);
	}

	private spawnEyeBurst(color: number) {
		const burst = new Sprite(this.textures.glow);
		burst.anchor.set(0.5);
		burst.x = this.layout.eye.x;
		burst.y = this.layout.eye.y;
		burst.width = this.layout.eye.size * 1.7;
		burst.height = this.layout.eye.size * 1.7;
		burst.tint = color;
		burst.alpha = 0;
		burst.blendMode = 'add';

		this.fxLayer.addChild(burst);

		gsap
			.timeline()
			.to(burst, {
				alpha: 0.9,
				duration: 0.1,
			})
			.to(burst, {
				alpha: 0,
				width: this.layout.eye.size * 2.4,
				height: this.layout.eye.size * 2.4,
				duration: 0.35,
				ease: 'power2.out',
				onComplete: () => burst.destroy(),
			});
	}

	private playOvercharge() {
		this.segmentFills.forEach((seg, i) => {
			gsap.to(seg, {
				alpha: 0.72 + (i % 2) * 0.18,
				duration: 0.45,
				repeat: 1,
				yoyo: true,
				ease: 'sine.inOut',
			});
		});
	}

	private playIdle() {
		const eyeTl = gsap.timeline({ repeat: -1, yoyo: true });

		eyeTl.to(this.topEye, {
			alpha: 0.86,
			duration: 1.6,
			ease: 'sine.inOut',
		});

		this.timelines.push(eyeTl);

		const textTl = gsap.timeline({ repeat: -1, yoyo: true });

		textTl.to(this.multiplierText, {
			alpha: 0.82,
			duration: 1.2,
			ease: 'sine.inOut',
		});

		this.timelines.push(textTl);
	}
}
```

---

## 11. Using the Meter In Game

```ts
const meter = new AbyssalGazeMeter(
	{
		frame: textures.gaze_meter_frame_empty,
		dividers: textures.gaze_meter_dividers_front,
		eye: textures.gaze_meter_eye_top,
		glow: textures.gaze_meter_glow_soft,
		particle: textures.gaze_meter_particle_burst,
	},
	{
		layout: DEFAULT_GAZE_LAYOUT,
		maxSegments: 10,
		initialText: '0x',
	},
);

meter.position.set(board.x - 110, board.y + board.height / 2);
meter.pivot.set(DEFAULT_GAZE_LAYOUT.frameW / 2, DEFAULT_GAZE_LAYOUT.frameH / 2);
meter.scale.set(0.62);

uiLayer.addChild(meter);
```

Example gameplay integration:

```ts
events.on('spin:start', () => {
	meter.reset(false);
});

events.on('tumble:win', ({ gaze, multiplierPreview }) => {
	meter.setGaze(gaze);
	meter.setMultiplierText(`${multiplierPreview}x`);
});

events.on('eye:landed', ({ eyeType, eyeValue, finalMultiplier }) => {
	meter.playEyeLanded({
		eyeType,
		eyeValue,
		finalMultiplier,
	});
});

events.on('spin:end', () => {
	gsap.delayedCall(0.9, () => meter.reset(true));
});
```

---

## 12. Alternative Fill Method: Single Rising Liquid Mask

For a more fluid look, use one tall fill sprite behind the dividers, masked to the chamber, and animate its height.

This gives a very smooth vertical liquid fill.

```ts
const liquid = new Sprite(textures.gaze_meter_glow_soft);
liquid.anchor.set(0.5, 1);
liquid.x = layout.inner.x + layout.inner.w / 2;
liquid.y = layout.inner.y + layout.inner.h;
liquid.width = layout.inner.w * 1.4;
liquid.height = 0;
liquid.blendMode = 'add';

fillLayer.addChild(liquid);
liquid.mask = fillMask;
```

Set the height:

```ts
function setLiquidFill(gaze: number) {
	const ratio = Math.min(gaze / 10, 1);
	const targetHeight = layout.inner.h * ratio;

	gsap.to(liquid, {
		height: targetHeight,
		duration: 0.35,
		ease: 'power2.out',
	});
}
```

Best visual result:

```txt
Use both methods:
- segmented fills for clear 10-step gameplay feedback
- liquid glow behind segments for smooth energy continuity
```

---

## 13. Recommended Final Fill Composition

Use this combined approach:

```txt
1. A vertical liquid glow rises smoothly behind everything.
2. Each segment turns on individually with a pop.
3. The front divider sprite stays above the fill.
4. The Eye pulses every time a segment is filled.
5. The bottom multiplier text bumps on update.
```

This feels smooth but still makes each of the 10 gameplay charges readable.

---

## 14. Segment Timing

Recommended charge animation timing:

```txt
0.00s   charge particle launches upward
0.08s   next segment begins glowing
0.14s   segment flashes
0.18s   top Eye pulses
0.22s   multiplier text bumps
0.35s   segment reaches stable glow
```

For a fast cascade sequence, queue charges:

```ts
const chargeQueue = gsap.timeline();

function queueGazeIncrement(gaze: number, text: string) {
	chargeQueue.add(() => {
		meter.setGaze(gaze);
		meter.setMultiplierText(text);
	});

	chargeQueue.to({}, { duration: 0.18 });
}
```

---

## 15. Visual States

### Empty

```txt
- Inner chamber dark.
- Bottom panel shows 0x or empty.
- Eye has soft idle pulse.
```

### Charging

```txt
- Purple/cyan particle rises.
- Next segment flashes.
- Dividers catch a gold sparkle.
- Eye pulses.
```

### Filled Segment

```txt
- Segment remains purple with cyan center glow.
- Soft bubbles/shimmer can loop inside.
```

### Full / Overcharged

```txt
- All 10 segments filled.
- Whole chamber pulses.
- Top Eye glow increases.
- Bottom text can glow stronger.
```

### Resolved

```txt
- Eye burst plays if Eye landed.
- Multiplier text bumps.
- After payout, meter drains or fades back to empty.
```

---

## 16. Cleanup and Memory Safety

Any GSAP timelines or delayed calls must be killed when the meter is destroyed.

```ts
public destroyMeter() {
  this.timelines.forEach((tl) => tl.kill());
  gsap.killTweensOf(this);
  gsap.killTweensOf(this.children);
  this.destroy({ children: true });
}
```

If you use `gsap.delayedCall`, store the reference:

```ts
const delayed = gsap.delayedCall(0.9, () => meter.reset(true));
delayed.kill();
```

---

## 17. QA Checklist

Before approving the meter:

- [ ] The meter has exactly **10 fillable steps**.
- [ ] The frame remains readable on top of the slot background.
- [ ] The fill is behind the front dividers.
- [ ] The bottom multiplier text is generated in PixiJS, not baked.
- [ ] The Eye can pulse independently.
- [ ] Segment fill animation feels responsive after each winning connection/tumble.
- [ ] Full meter state is clear.
- [ ] Reset is smooth and not distracting.
- [ ] No purple gameplay Eye is introduced.
- [ ] Works on desktop and mobile scale.
- [ ] GSAP tweens are killed on scene exit.
- [ ] No full-meter 10-frame spritesheet is required.
- [ ] TexturePacker JSON names match the code constants.

---

## 18. Recommended Production Decision

Use the generated sprite kit as:

```txt
frame          static art
dividers       front overlay
top Eye        pulse overlay
glow           fill/flash
particle       charge burst
```

Then animate all game states dynamically with PixiJS + GSAP.

This gives the smoothest, most maintainable Gaze meter and keeps it fully synced with the Abyssal tumble/connection logic.
