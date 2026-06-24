<script lang="ts">
	import { Texture, Rectangle } from 'pixi.js';
	import { AnimatedSprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState } from '../game/types';

	// Generic spritesheet symbol: slices a `cols×rows` grid from a single loaded texture and
	// rests on one static frame, only animating on a win (so the board isn't always moving).
	type Props = {
		assetKey: string;
		cols: number;
		rows: number;
		restIndex?: number; // frame shown at rest (default 0)
		scale?: number; // size multiplier vs the cell
		state: SymbolState;
		size?: number;
	};

	const props: Props = $props();
	const size = $derived(props.size ?? SYMBOL_SIZE);
	const context = getContext();

	// Slice the sheet into frames and capture the native frame aspect ratio (w/h) in one
	// pass, so non-square frames (the eye is landscape, the jelly is portrait) aren't
	// stretched into a square. Returned together to avoid mutating state inside a derived.
	const sheet = $derived.by(() => {
		const base = context.stateApp.loadedAssets?.[props.assetKey] as Texture | undefined;
		if (!base?.source) return { frames: [] as Texture[], aspect: 1 };
		const fw = base.width / props.cols;
		const fh = base.height / props.rows;
		const all: Texture[] = [];
		for (let r = 0; r < props.rows; r++) {
			for (let c = 0; c < props.cols; c++) {
				// 1px inset avoids bleeding from neighbouring frames
				all.push(
					new Texture({
						source: base.source,
						frame: new Rectangle(c * fw + 1, r * fh + 1, fw - 2, fh - 2),
					}),
				);
			}
		}
		const rest = props.restIndex ?? 0;
		// put the rest frame first so the stopped (idle) sprite shows it
		const frames =
			rest <= 0 || rest >= all.length
				? all
				: [all[rest], ...all.slice(0, rest), ...all.slice(rest + 1)];
		return { frames, aspect: fw / fh };
	});

	const frames = $derived(sheet.frames);
	const playing = $derived(props.state === 'win');
	const mult = $derived(props.scale ?? 0.96);
	// fit the native frame aspect inside the size*mult box (no stretching)
	const box = $derived(size * mult);
	const drawW = $derived(sheet.aspect >= 1 ? box : box * sheet.aspect);
	const drawH = $derived(sheet.aspect >= 1 ? box / sheet.aspect : box);
</script>

{#if frames.length}
	<AnimatedSprite
		textures={frames}
		anchor={0.5}
		width={drawW}
		height={drawH}
		animationSpeed={0.3}
		loop
		play={playing}
	/>
{/if}
