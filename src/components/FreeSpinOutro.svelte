<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';

	import { Container, Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer, ResponsiveBitmapText } from 'components-pixi';
	import { OnMount } from 'components-shared';
	import { waitForResolve } from 'utils-shared/wait';
	import { createInterruptible } from 'utils-shared/interruptible';
	import { SECOND } from 'constants-shared/time';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import PressToContinue from './PressToContinue.svelte';
	import { getContext } from '../game/context';
	import { abyssalBitmapStyle } from '../game/constants';

	const context = getContext();

	// ---- Tunable knobs --------------------------------------------------------------------
	const COUNT_SECONDS = 2.4; // feature-total count-up length (before turbo timeScale)
	// The purple amount plaque, measured from the 1408×768 card art. The text must live
	// inside its inner purple area (x ≈ 395–1010, y ≈ 458–588) — not on the ivory frame.
	const PLAQUE_CENTER_Y = 523 / 768; // vertical centre of the plaque within the card
	const PLAQUE_TEXT_WIDTH = 0.4; // max amount width, fraction of card width
	const PLAQUE_FONT_SIZE = 0.105; // amount font size, fraction of card height

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});

	const ts = () => stateBetDerived.timeScale(); // turbo speed-up

	// --- Count-up (same cadence as the win banner) + press-to-skip --------------------------
	// A near-linear climb that eases out into a settle, then a "lock" pop punctuates it.
	const countUp = new Tween(0);
	const interruptible = createInterruptible();
	let countUpCompleted = $state(false);
	const countEase = (t: number) => 1 - Math.pow(1 - t, 1.6);
	const runCount = () =>
		countUp.set(amount, { duration: (COUNT_SECONDS * SECOND) / ts(), easing: countEase });

	// --- FX ----------------------------------------------------------------------------------
	const cardFx = $state({ scale: 0.85 }); // card entrance pop
	const numFx = $state({ scale: 1, flash: 0 }); // count-up lock pop + white bloom

	const playEntrance = () => {
		gsap.killTweensOf(cardFx);
		gsap
			.timeline()
			.set(cardFx, { scale: 0.85 })
			.to(cardFx, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.6)' });
	};

	const playLock = () => {
		gsap.killTweensOf(numFx);
		gsap
			.timeline()
			.set(numFx, { scale: 1, flash: 0 })
			.to(numFx, { scale: 1.35, duration: 0.12, ease: 'back.out(3)' })
			.to(numFx, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' })
			.set(numFx, { flash: 0.95 }, 0)
			.to(numFx, { flash: 0, duration: 0.45, ease: 'power2.out' }, 0);
		// PLACEHOLDER lock stinger — swap for a bespoke "feature total locked" hit later.
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_end' });
	};

	onMount(() => () => {
		gsap.killTweensOf(cardFx);
		gsap.killTweensOf(numFx);
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => (show = true),
		// FadeContainer unmounts its children once the fade-out lands, which re-arms OnMount →
		// present() for the next bonus — no state reset needed here.
		freeSpinOutroHide: () => (show = false),
		freeSpinOutroCountUp: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});

	const present = async () => {
		countUpCompleted = false;
		numFx.scale = 1;
		numFx.flash = 0;
		await countUp.set(0, { duration: 0 });

		playEntrance();
		await interruptible.add(runCount);
		await countUp.set(amount, { duration: 0 }); // snap to final if skipped mid-count
		interruptible.clear();
		playLock();
		countUpCompleted = true;
		// no auto-advance: the card holds on the locked total until the player taps
	};

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const imageAspect = 1408 / 768;
	const imgW = $derived(Math.min(sizes.width * 0.88, sizes.height * 0.72 * imageAspect));
	const imgH = $derived(imgW / imageAspect);
	const amountY = $derived(imgH * (PLAQUE_CENTER_Y - 0.5));
	const amountMaxWidth = $derived(imgW * PLAQUE_TEXT_WIDTH);
	// Branded AbyssalBitmap face — gold fill/outline baked into the glyphs.
	const amountStyle = $derived(abyssalBitmapStyle({ fontSize: imgH * PLAQUE_FONT_SIZE }));
</script>

<FadeContainer {show} zIndex={45}>
	<Rectangle {...sizes} backgroundColor={0x05080f} backgroundAlpha={0.78} />
	{#if winLevelData}
		<OnMount onmount={present} />

		<Container x={sizes.width / 2} y={sizes.height / 2} scale={cardFx.scale}>
			<Sprite anchor={0.5} key="freeSpinOutro" width={imgW} height={imgH} />
			<Container y={amountY} scale={numFx.scale}>
				<ResponsiveBitmapText
					anchor={0.5}
					maxWidth={amountMaxWidth}
					text={bookEventAmountToCurrencyString(countUp.current)}
					style={amountStyle}
				/>
				{#if numFx.flash > 0}
					<!-- the lock flash: an additive copy of the gold glyphs blooms them to white -->
					<Container alpha={numFx.flash} blendMode="add">
						<ResponsiveBitmapText
							anchor={0.5}
							maxWidth={amountMaxWidth}
							text={bookEventAmountToCurrencyString(countUp.current)}
							style={amountStyle}
						/>
					</Container>
				{/if}
			</Container>
		</Container>

		<PressToContinue
			onpress={() => (countUpCompleted ? oncomplete() : interruptible.interrupt())}
		/>
	{/if}
</FadeContainer>
