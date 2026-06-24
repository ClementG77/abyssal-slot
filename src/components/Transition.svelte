<script lang="ts" module>
	export type EmitterEventTransition =
		| { type: 'transition' }
		| { type: 'freeSpinExitCover' }
		| { type: 'freeSpinExitReveal' };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';

	import { Graphics, Rectangle } from 'pixi-svelte';
	import { stateBetDerived } from 'state-shared';
	import { waitForTimeout } from 'utils-shared/wait';

	import { getContext } from '../game/context';

	const context = getContext();

	// A reliable code-driven dark "dive" wipe (fade in → out) that always resolves — replaces
	// the spine TransitionAnimation so the book sequence never stalls between base ↔ feature.
	const alpha = new Tween(0, { duration: 320 });
	const irisProgress = new Tween(0, { duration: 680 });
	const FREE_SPIN_EXIT_COVER_DURATION = 350;
	const FREE_SPIN_EXIT_REVEAL_DURATION = 1650;
	let irisActive = $state(false);
	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const irisRadius = $derived(
		(Math.hypot(sizes.width, sizes.height) * 0.5 + 4) * irisProgress.current,
	);

	context.eventEmitter.subscribeOnMount({
		transition: async () => {
			const duration = 320 / stateBetDerived.timeScale();
			await alpha.set(1, { duration });
			await alpha.set(0, { duration });
		},
		freeSpinExitCover: async () => {
			irisActive = false;
			void irisProgress.set(0, { duration: 0 });
			void alpha.set(1, { duration: FREE_SPIN_EXIT_COVER_DURATION });
			await waitForTimeout(FREE_SPIN_EXIT_COVER_DURATION);
		},
		freeSpinExitReveal: async () => {
			irisActive = true;
			void irisProgress.set(1, { duration: FREE_SPIN_EXIT_REVEAL_DURATION });
			await waitForTimeout(FREE_SPIN_EXIT_REVEAL_DURATION);
			void alpha.set(0, { duration: 0 });
			irisActive = false;
		},
	});
</script>

{#if irisActive}
	<Graphics
		zIndex={40}
		draw={(g) => {
			const centerX = sizes.width * 0.5;
			const centerY = sizes.height * 0.5;
			const top = Math.max(0, centerY - irisRadius);
			const bottom = Math.min(sizes.height, centerY + irisRadius);
			const fill = { color: 0x05080f, alpha: 1 };

			if (irisRadius < 1) {
				g.rect(0, 0, sizes.width, sizes.height).fill(fill);
				return;
			}

			if (top > 0) g.rect(0, 0, sizes.width, top).fill(fill);
			if (bottom < sizes.height) g.rect(0, bottom, sizes.width, sizes.height - bottom).fill(fill);

			const left = [{ x: 0, y: top }];
			const right = [{ x: sizes.width, y: top }];
			const steps = 28;
			for (let index = 0; index <= steps; index += 1) {
				const y = top + ((bottom - top) * index) / steps;
				const halfChord = Math.sqrt(Math.max(0, irisRadius ** 2 - (y - centerY) ** 2));
				left.push({ x: Math.max(0, centerX - halfChord), y });
				right.push({ x: Math.min(sizes.width, centerX + halfChord), y });
			}
			left.push({ x: 0, y: bottom });
			right.push({ x: sizes.width, y: bottom });
			g.poly(left).fill(fill);
			g.poly(right).fill(fill);
		}}
	/>
{:else if alpha.current > 0.001}
	<Rectangle {...sizes} backgroundColor={0x05080f} backgroundAlpha={alpha.current} zIndex={40} />
{/if}
