<script lang="ts" module>
	import type { WarpProfile } from '../game/symbolWarp';

	export type Props = {
		/** asset key, same lookup pixi-svelte's <Sprite> uses */
		key: string;
		/** display size — matches the <Sprite> this stands in for */
		width: number;
		height: number;
		/** 0..1 effect strength; 0 renders identically to a plain Sprite */
		amount: number;
		profile: WarpProfile;
		/** desynchronises symbols so a whole winning cluster doesn't move in lockstep */
		phase?: number;
	};
</script>

<script lang="ts">
	import { MeshPlane, Texture } from 'pixi.js';
	import { getContextApp, getContextParent } from 'pixi-svelte';

	import { applyWarp } from '../game/symbolWarp';

	// ---------------------------------------------------------------------------------------------
	// A <Sprite> that can bend. Renders the SAME atlas texture through a subdivided MeshPlane and
	// displaces its vertices per frame, which is what gives a static symbol the appearance of being
	// animated without a single frame of new art. See game/symbolWarp.ts for why this is code.
	//
	// pixi-svelte has no Mesh component, so this builds the MeshPlane directly and hands it to the
	// parent through the same `addToParent` context every other pixi-svelte leaf uses — which also
	// means it inherits their teardown (the parent destroys the node on unmount).
	// ---------------------------------------------------------------------------------------------

	// 9x9 = 81 vertices. Deliberately under Pixi's 100-vertex ceiling for `batchMode: 'auto'`, so
	// these still batch with the surrounding sprites instead of forcing their own draw calls. Coarser
	// grids visibly facet the `undulate` wave; denser ones stop batching for no visual gain.
	const GRID = 9;

	const props: Props = $props();
	const app = getContextApp();
	const parentContext = getContextParent();

	const texture = (app.stateApp.loadedAssets?.[props.key] ?? Texture.EMPTY) as Texture;
	const mesh = new MeshPlane({ texture, verticesX: GRID, verticesY: GRID });

	// MeshPlane draws from its top-left; the <Sprite> it replaces is anchor 0.5. Pivoting by half the
	// TEXTURE size (not the display size) centres it in geometry space, so the scale below then maps
	// it to the display box exactly as the sprite was.
	mesh.pivot.set(texture.width / 2, texture.height / 2);

	// Geometry is authored at texture size and scaled to the display box. Deforming in texture space
	// keeps `amp` proportional at every board scale for free.
	$effect(() => {
		if (!texture.width || !texture.height) return;
		mesh.scale.set(props.width / texture.width, props.height / texture.height);
	});

	const positions = mesh.geometry.getAttribute('aPosition');
	const buffer = positions.buffer;
	const live = buffer.data as Float32Array;
	// The undeformed grid. Every frame is computed from THIS, never from the previous frame —
	// integrating displacement onto live positions drifts, and the symbol wanders out of its cell.
	const base = new Float32Array(live);

	// Read by the render callback, which is a plain function and cannot track Svelte state itself.
	const frameState = { amount: 0, profile: props.profile, phase: props.phase ?? 0 };
	$effect(() => {
		frameState.amount = props.amount;
		frameState.profile = props.profile;
		frameState.phase = props.phase ?? 0;
	});

	// `onRender` fires only when this mesh is actually drawn, so a culled or hidden symbol costs
	// nothing — cheaper and safer than a shared ticker that would keep running after unmount.
	let deformed = false;
	mesh.onRender = () => {
		if (frameState.amount <= 0.001) {
			// Restore exactly once on the way out, then stop touching the GPU buffer entirely.
			if (deformed) {
				live.set(base);
				buffer.update();
				deformed = false;
			}
			return;
		}
		applyWarp({
			base,
			out: live,
			width: texture.width,
			height: texture.height,
			profile: frameState.profile,
			time: performance.now() / 1000,
			phase: frameState.phase,
			amount: frameState.amount,
		});
		buffer.update();
		deformed = true;
	};

	parentContext.addToParent(mesh);
</script>
