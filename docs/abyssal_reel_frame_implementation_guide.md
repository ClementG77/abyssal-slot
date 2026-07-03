# Abyssal Reel Frame Implementation Guide — Base + Free Spins

This guide is written specifically for the two current reel frame assets:

```text
Base frame:       reel_frame_base.png
Free spins frame: reel_frame_fs.png
```

Both frames are designed for:

```text
6 columns
5 rows
thin vertical column separators
no visible row separators
transparent outside the frame
dark reel background kept inside the frame
```

Current detected image dimensions:

```ts
const REEL_FRAME_BASE_IMAGE_SIZE = {
	width: 1448,
	height: 1086,
};

const REEL_FRAME_FREE_SPINS_IMAGE_SIZE = {
	width: 1448,
	height: 1086,
};
```

The implementation goal is:

```text
Use the image as a reel container.
Display 6 × 5 symbols perfectly centered inside it.
Keep all proportions correct on every screen size.
Keep symbols masked inside the reel area.
Keep the decorative frame above the symbols visually.
```

---

## 1. Important concept

The reel frame image contains three visual areas:

```text
1. Transparent outside area
2. Decorative frame border
3. Dark inner reel background with 6 columns
```

In PixiJS, symbols must be placed only inside the **inner reel area**, not across the whole image.

You should never position symbols with screen percentages. Instead, use a fixed virtual game resolution.

```ts
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
```

Build all positions in this virtual 1920×1080 world, then scale the entire game container to the real screen.

---

## 2. Recommended PixiJS structure

For production, the cleanest structure is:

```text
app.stage
└── rootContainer
    ├── background
    ├── reelFrameContainer
    │   ├── reelFrameImage
    │   ├── symbolsContainer
    │   └── optional frameOverlay
    └── ui
```

Because the current reel frame images already include the inner dark background and decorative frame, you can start with a single image:

```text
reelFrameImage
symbolsContainer
```

However, for the cleanest production result, later split the frame into:

```text
reel-frame-base-bg.png       dark inside background + separators
reel-frame-base-overlay.png  decorative border only

reel-frame-fs-bg.png         dark inside background + separators
reel-frame-fs-overlay.png    decorative border only
```

Then render order becomes:

```text
background image
symbols
overlay image
```

This prevents symbols from visually appearing above the decorative border.

---

## 3. Coordinate system

Use frame-local coordinates.

When the reel frame is added to a PixiJS container, its local coordinate system starts at:

```text
x = 0 at the left of the reel frame image
y = 0 at the top of the reel frame image
```

The playable grid is a rectangle inside that image:

```ts
gridX;
gridY;
gridWidth;
gridHeight;
```

Then each symbol cell is:

```ts
cellWidth = gridWidth / 6;
cellHeight = gridHeight / 5;
```

Each symbol center is:

```ts
symbolX = gridX + col * cellWidth + cellWidth / 2;
symbolY = gridY + row * cellHeight + cellHeight / 2;
```

Where:

```ts
((col = 0), 1, 2, 3, 4, 5);
((row = 0), 1, 2, 3, 4);
```

---

## 4. Layout values for the current assets

These values are the recommended starting point for your current frame exports.

Because the frame border is decorative and irregular, these values may need final tuning using the debug grid described later.

### Base frame layout

```ts
export const REEL_LAYOUT_BASE = {
	imageWidth: 1448,
	imageHeight: 1086,

	columns: 6,
	rows: 5,

	// Inner playable reel area, in local image coordinates.
	// Tune these with the debug grid if needed.
	gridX: Math.round(1448 * 0.105),
	gridY: Math.round(1086 * 0.155),
	gridWidth: Math.round(1448 * 0.79),
	gridHeight: Math.round(1086 * 0.72),

	symbolFill: 0.86,
};
```

Approximate resolved values:

```ts
export const REEL_LAYOUT_BASE_APPROX = {
	imageWidth: 1448,
	imageHeight: 1086,
	columns: 6,
	rows: 5,
	gridX: 152,
	gridY: 168,
	gridWidth: 1144,
	gridHeight: 782,
	symbolFill: 0.86,
};
```

### Free spins frame layout

```ts
export const REEL_LAYOUT_FREE_SPINS = {
	imageWidth: 1448,
	imageHeight: 1086,

	columns: 6,
	rows: 5,

	// Inner playable reel area, in local image coordinates.
	// Tune these with the debug grid if needed.
	gridX: Math.round(1448 * 0.105),
	gridY: Math.round(1086 * 0.155),
	gridWidth: Math.round(1448 * 0.79),
	gridHeight: Math.round(1086 * 0.72),

	symbolFill: 0.86,
};
```

Approximate resolved values:

```ts
export const REEL_LAYOUT_FREE_SPINS_APPROX = {
	imageWidth: 1448,
	imageHeight: 1086,
	columns: 6,
	rows: 5,
	gridX: 152,
	gridY: 168,
	gridWidth: 1144,
	gridHeight: 782,
	symbolFill: 0.86,
};
```

### How to tune these values

If symbols are too far left/right:

```text
increase/decrease gridX
```

If symbols are too high/low:

```text
increase/decrease gridY
```

If columns do not align with the separators:

```text
adjust gridX and gridWidth
```

If symbols are too close to the top/bottom border:

```text
adjust gridY and gridHeight
```

---

## 5. Scaling to fit different screen sizes

Use a root container for the full game.

```ts
const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

const rootContainer = new Container();
app.stage.addChild(rootContainer);
```

Put the reel frame, background, symbols, UI, and effects inside `rootContainer`.

Then resize like this:

```ts
function resize() {
	const screenWidth = wrapper.clientWidth;
	const screenHeight = wrapper.clientHeight;

	app.renderer.resize(screenWidth, screenHeight);

	const scale = Math.min(screenWidth / GAME_WIDTH, screenHeight / GAME_HEIGHT);

	rootContainer.scale.set(scale);

	rootContainer.x = (screenWidth - GAME_WIDTH * scale) / 2;
	rootContainer.y = (screenHeight - GAME_HEIGHT * scale) / 2;
}
```

This is **contain scaling**.

It preserves proportions perfectly:

```text
No stretching
No distortion
Frame and symbols scale together
Separators stay aligned with columns
```

---

## 6. Placing the reel frame in the 1920×1080 scene

For your current frame proportions, start with:

```ts
const REEL_DISPLAY_WIDTH = 1320;
const REEL_DISPLAY_HEIGHT =
	REEL_DISPLAY_WIDTH * (REEL_LAYOUT_BASE.imageHeight / REEL_LAYOUT_BASE.imageWidth);

const REEL_POSITION = {
	x: (GAME_WIDTH - REEL_DISPLAY_WIDTH) / 2,
	y: 150,
};
```

Then:

```ts
reelFrameContainer.position.set(REEL_POSITION.x, REEL_POSITION.y);
reelFrameContainer.setDisplaySize(REEL_DISPLAY_WIDTH);
```

The reel frame container should scale all internal coordinates from the original image size to the display size.

---

## 7. ReelFrameContainer implementation

This version works directly with the single current PNG frame assets.

```ts
import { Assets, Container, Sprite, Texture, Graphics } from 'pixi.js';

export type ReelFrameLayout = {
	imageWidth: number;
	imageHeight: number;

	columns: number;
	rows: number;

	gridX: number;
	gridY: number;
	gridWidth: number;
	gridHeight: number;

	symbolFill?: number;
};

type ReelFrameOptions = {
	framePath: string;
	symbolPaths: Record<string, string>;
	layout: ReelFrameLayout;
};

export class ReelFrameContainer extends Container {
	private frame!: Sprite;
	private symbolsContainer!: Container;
	private symbolMask!: Graphics;

	private symbolTextures: Record<string, Texture> = {};

	private options: ReelFrameOptions;
	private layout: ReelFrameLayout;

	private scaleRatio = 1;

	constructor(options: ReelFrameOptions) {
		super();
		this.options = options;
		this.layout = options.layout;
	}

	async init() {
		const frameTexture = await Assets.load<Texture>(this.options.framePath);

		this.frame = new Sprite(frameTexture);
		this.frame.width = this.layout.imageWidth;
		this.frame.height = this.layout.imageHeight;
		this.addChild(this.frame);

		const loadedSymbols = await Promise.all(
			Object.entries(this.options.symbolPaths).map(async ([id, path]) => {
				const texture = await Assets.load<Texture>(path);
				return [id, texture] as const;
			}),
		);

		for (const [id, texture] of loadedSymbols) {
			this.symbolTextures[id] = texture;
		}

		this.symbolsContainer = new Container();
		this.addChild(this.symbolsContainer);

		this.symbolMask = new Graphics();
		this.drawMask();
		this.addChild(this.symbolMask);

		this.symbolsContainer.mask = this.symbolMask;
	}

	setDisplayWidth(width: number) {
		this.scaleRatio = width / this.layout.imageWidth;

		this.scale.set(this.scaleRatio);
	}

	setGrid(grid: string[][]) {
		this.symbolsContainer.removeChildren();

		const cellWidth = this.layout.gridWidth / this.layout.columns;
		const cellHeight = this.layout.gridHeight / this.layout.rows;

		for (let row = 0; row < this.layout.rows; row++) {
			for (let col = 0; col < this.layout.columns; col++) {
				const symbolId = grid[row]?.[col];
				if (!symbolId) continue;

				const texture = this.symbolTextures[symbolId];

				if (!texture) {
					console.warn(`Missing texture for symbol: ${symbolId}`);
					continue;
				}

				const symbol = new Sprite(texture);
				symbol.anchor.set(0.5);

				symbol.x = this.layout.gridX + col * cellWidth + cellWidth / 2;
				symbol.y = this.layout.gridY + row * cellHeight + cellHeight / 2;

				this.fitSymbolToCell(symbol, symbolId, cellWidth, cellHeight);

				this.symbolsContainer.addChild(symbol);
			}
		}
	}

	getCellCenter(col: number, row: number) {
		const cellWidth = this.layout.gridWidth / this.layout.columns;
		const cellHeight = this.layout.gridHeight / this.layout.rows;

		return {
			x: this.layout.gridX + col * cellWidth + cellWidth / 2,
			y: this.layout.gridY + row * cellHeight + cellHeight / 2,
		};
	}

	private fitSymbolToCell(symbol: Sprite, symbolId: string, cellWidth: number, cellHeight: number) {
		const fill = this.getSymbolFill(symbolId);

		const maxWidth = cellWidth * fill;
		const maxHeight = cellHeight * fill;

		const scale = Math.min(maxWidth / symbol.texture.width, maxHeight / symbol.texture.height);

		symbol.scale.set(scale);
	}

	private getSymbolFill(symbolId: string) {
		if (symbolId === 'scatter') return 0.94;
		if (symbolId === 'add_eye') return 0.86;
		if (symbolId === 'mult_eye') return 0.86;
		if (symbolId.startsWith('H')) return 0.88;
		if (symbolId.startsWith('L')) return 0.8;

		return this.layout.symbolFill ?? 0.86;
	}

	private drawMask() {
		this.symbolMask.clear();

		this.symbolMask.rect(
			this.layout.gridX,
			this.layout.gridY,
			this.layout.gridWidth,
			this.layout.gridHeight,
		);

		this.symbolMask.fill(0xffffff);
	}

	async setFrame(framePath: string, layout: ReelFrameLayout) {
		const frameTexture = await Assets.load<Texture>(framePath);

		this.frame.texture = frameTexture;
		this.layout = layout;

		this.frame.width = layout.imageWidth;
		this.frame.height = layout.imageHeight;

		this.drawMask();
	}
}
```

---

## 8. Example usage with the current two frame images

```ts
const SYMBOL_PATHS = {
	H1_anglerfish: '/assets/abyssal/symbols/H1_anglerfish.png',
	H2_nautilus: '/assets/abyssal/symbols/H2_nautilus.png',
	H3_diving_helmet: '/assets/abyssal/symbols/H3_diving_helmet.png',
	H4_jellyfish: '/assets/abyssal/symbols/H4_jellyfish.png',
	L1_red_gem: '/assets/abyssal/symbols/L1_red_gem.png',
	L2_green_gem: '/assets/abyssal/symbols/L2_green_gem.png',
	L3_blue_gem: '/assets/abyssal/symbols/L3_blue_gem.png',
	L4_purple_gem: '/assets/abyssal/symbols/L4_purple_gem.png',
	L5_yellow_gem: '/assets/abyssal/symbols/L5_yellow_gem.png',
	scatter: '/assets/abyssal/symbols/scatter.png',
	add_eye: '/assets/abyssal/symbols/add_eye.png',
	mult_eye: '/assets/abyssal/symbols/mult_eye.png',
};

const reelFrame = new ReelFrameContainer({
	framePath: '/assets/abyssal/frames/reel_frame_base.png',
	symbolPaths: SYMBOL_PATHS,
	layout: REEL_LAYOUT_BASE_APPROX,
});

await reelFrame.init();

const displayWidth = 1320;
reelFrame.setDisplayWidth(displayWidth);

reelFrame.position.set((GAME_WIDTH - displayWidth) / 2, 150);

rootContainer.addChild(reelFrame);
```

Set symbols:

```ts
reelFrame.setGrid([
	['H1_anglerfish', 'H2_nautilus', 'H3_diving_helmet', 'L1_red_gem', 'L3_blue_gem', 'H4_jellyfish'],
	['L1_red_gem', 'L2_green_gem', 'L3_blue_gem', 'L4_purple_gem', 'add_eye', 'L5_yellow_gem'],
	['L5_yellow_gem', 'L4_purple_gem', 'scatter', 'H2_nautilus', 'mult_eye', 'L3_blue_gem'],
	['H1_anglerfish', 'H2_nautilus', 'L1_red_gem', 'L3_blue_gem', 'L4_purple_gem', 'H4_jellyfish'],
	['L5_yellow_gem', 'H3_diving_helmet', 'L2_green_gem', 'scatter', 'L1_red_gem', 'L3_blue_gem'],
]);
```

Switch to free spins:

```ts
await reelFrame.setFrame('/assets/abyssal/frames/reel_frame_fs.png', REEL_LAYOUT_FREE_SPINS_APPROX);

reelFrame.setGrid(newFreeSpinsGrid);
```

---

## 9. Debug grid for perfect alignment

Use this while tuning your layout.

```ts
import { Container, Graphics } from 'pixi.js';
import type { ReelFrameLayout } from './ReelFrameContainer';

export function drawDebugGrid(container: Container, layout: ReelFrameLayout) {
	const g = new Graphics();

	g.rect(layout.gridX, layout.gridY, layout.gridWidth, layout.gridHeight);
	g.stroke({
		color: 0xff00ff,
		width: 3,
		alpha: 0.9,
	});

	const cellWidth = layout.gridWidth / layout.columns;
	const cellHeight = layout.gridHeight / layout.rows;

	for (let c = 1; c < layout.columns; c++) {
		const x = layout.gridX + c * cellWidth;
		g.moveTo(x, layout.gridY);
		g.lineTo(x, layout.gridY + layout.gridHeight);
	}

	for (let r = 1; r < layout.rows; r++) {
		const y = layout.gridY + r * cellHeight;
		g.moveTo(layout.gridX, y);
		g.lineTo(layout.gridX + layout.gridWidth, y);
	}

	g.stroke({
		color: 0x00ffff,
		width: 1,
		alpha: 0.65,
	});

	container.addChild(g);
}
```

Usage:

```ts
drawDebugGrid(reelFrame, REEL_LAYOUT_BASE_APPROX);
```

Your actual frame has no row separators, but the debug overlay should still draw rows temporarily so you can verify the 5-row spacing.

Remove the debug grid after tuning.

---

## 10. Svelte + PixiJS setup

```svelte
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Application, Container, Sprite, Assets, Texture } from 'pixi.js';
	import { ReelFrameContainer } from './ReelFrameContainer';
	import { REEL_LAYOUT_BASE_APPROX, REEL_LAYOUT_FREE_SPINS_APPROX } from './reelLayouts';

	const GAME_WIDTH = 1920;
	const GAME_HEIGHT = 1080;

	let wrapper: HTMLDivElement;

	let app: Application;
	let rootContainer: Container;
	let reelFrame: ReelFrameContainer;

	onMount(async () => {
		app = new Application();

		await app.init({
			width: GAME_WIDTH,
			height: GAME_HEIGHT,
			backgroundAlpha: 0,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
		});

		wrapper.appendChild(app.canvas);

		rootContainer = new Container();
		app.stage.addChild(rootContainer);

		// Add background here if needed.

		reelFrame = new ReelFrameContainer({
			framePath: '/assets/abyssal/frames/reel_frame_base.png',
			symbolPaths: SYMBOL_PATHS,
			layout: REEL_LAYOUT_BASE_APPROX,
		});

		await reelFrame.init();

		const displayWidth = 1320;
		reelFrame.setDisplayWidth(displayWidth);
		reelFrame.position.set((GAME_WIDTH - displayWidth) / 2, 150);

		rootContainer.addChild(reelFrame);

		resize();
		window.addEventListener('resize', resize);
	});

	onDestroy(() => {
		window.removeEventListener('resize', resize);
		app?.destroy(true);
	});

	function resize() {
		if (!app || !rootContainer || !wrapper) return;

		const screenWidth = wrapper.clientWidth;
		const screenHeight = wrapper.clientHeight;

		app.renderer.resize(screenWidth, screenHeight);

		const scale = Math.min(screenWidth / GAME_WIDTH, screenHeight / GAME_HEIGHT);

		rootContainer.scale.set(scale);
		rootContainer.x = (screenWidth - GAME_WIDTH * scale) / 2;
		rootContainer.y = (screenHeight - GAME_HEIGHT * scale) / 2;
	}
</script>

<div bind:this={wrapper} class="game-wrapper"></div>

<style>
	.game-wrapper {
		width: 100vw;
		height: 100vh;
		overflow: hidden;
		background: black;
	}

	.game-wrapper :global(canvas) {
		display: block;
	}
</style>
```

---

## 11. Common implementation mistakes

### Mistake 1: Treating the image as 5 columns

The final frame is:

```text
6 columns
5 rows
```

So always use:

```ts
columns: 6,
rows: 5,
```

### Mistake 2: Drawing permanent row separators

Your final art direction is:

```text
thin column separators only
no row separators
```

Rows exist only mathematically for symbol placement.

### Mistake 3: Scaling frame and symbols separately

Bad:

```ts
frame.scale.set(scale);
symbolsContainer.scale.set(otherScale);
```

Good:

```ts
reelFrameContainer.scale.set(scaleRatio);
rootContainer.scale.set(screenScale);
```

### Mistake 4: Not masking the symbols

The mask is mandatory during spin and cascade animations.

### Mistake 5: Using screen size for symbol position

Bad:

```ts
symbol.x = window.innerWidth * 0.5;
```

Good:

```ts
symbol.x = gridX + col * cellWidth + cellWidth / 2;
```

---

## 12. Final checklist

```text
[ ] Use 1920×1080 virtual resolution.
[ ] Use rootContainer scaling for screen responsiveness.
[ ] Use 6 columns and 5 rows.
[ ] Use only vertical separators in the frame image.
[ ] Use mathematical rows, not visible row lines.
[ ] Define gridX, gridY, gridWidth, gridHeight for each frame.
[ ] Center each symbol in its calculated cell.
[ ] Fit each symbol with padding.
[ ] Mask symbols inside the inner grid.
[ ] Use debug grid temporarily to tune alignment.
[ ] Switch base/free-spins frame with separate layout configs.
```

---

## 13. Summary

The method is:

```text
1. Load reel_frame_base.png or reel_frame_fs.png.
2. Place it inside a ReelFrameContainer.
3. Define the inner symbol grid rectangle.
4. Divide it into 6 columns and 5 rows.
5. Center each symbol in its calculated cell.
6. Mask the symbols to the inner grid.
7. Scale the whole rootContainer to support every screen size.
8. Use separate layouts for base and free-spins if needed.
```

This will make your reel frame behave as a proper slot container while preserving the exact proportions of your art.
