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
	import ResponsiveText from './ResponsiveText.svelte';
	import { FadeContainer } from 'components-pixi';
	import { OnMount } from 'components-shared';
	import { waitForResolve } from 'utils-shared/wait';
	import { createInterruptible } from 'utils-shared/interruptible';
	import { SECOND } from 'constants-shared/time';
	import { stateBetDerived } from 'state-shared';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import PressToContinue from './PressToContinue.svelte';
	import { getContext } from '../game/context';

	import { abyssalAmountTextStyle, winTierAccent } from '../game/textStyles';

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
		// the roll is over — kill the count-up loop HERE, not at dismissal: the card holds
		// indefinitely on the locked total and the loop must not drone under it. The lock is
		// deliberately stinger-free (visual punch only) — the bgm takeover carries the moment.
		context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_countup_loop' });
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

		// the congratulations card lands — its own fanfare (the tier stinger from
		// winLevelSoundsPlay covers the win SIZE; this covers the "bonus complete" moment)
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fs_outro' });
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
	// The feature total wears the win level it landed on, same as the win ladder — a bonus that
	// ended on `mega` shows an amber-footed number, not the generic gold. Levels below `big` have
	// no celebration colour and fall through to the neutral pearl-and-gold.
	const amountStyle = $derived(
		abyssalAmountTextStyle({
			fontSize: imgH * PLAQUE_FONT_SIZE,
			accent: winLevelData ? winTierAccent(winLevelData.alias) : undefined,
		}),
	);
</script>

<FadeContainer {show} zIndex={45}>
	<Rectangle {...sizes} backgroundColor={0x05080f} backgroundAlpha={0.78} />
	{#if winLevelData}
		<OnMount onmount={present} />

		<Container x={sizes.width / 2} y={sizes.height / 2} scale={cardFx.scale}>
			<Sprite anchor={0.5} key="freeSpinOutro" width={imgW} height={imgH} />
			<Container y={amountY} scale={numFx.scale}>
				<ResponsiveText
					anchor={0.5}
					maxWidth={amountMaxWidth}
					text={bookEventAmountToCurrencyString(countUp.current)}
					style={amountStyle}
				/>
				{#if numFx.flash > 0}
					<!-- the lock flash: an additive copy of the gold glyphs blooms them to white -->
					<Container alpha={numFx.flash} blendMode="add">
						<ResponsiveText
							anchor={0.5}
							maxWidth={amountMaxWidth}
							text={bookEventAmountToCurrencyString(countUp.current)}
							style={amountStyle}
						/>
					</Container>
				{/if}
			</Container>
		</Container>

		<!-- the bonus-end card holds until a deliberate click/tap (mid-count a tap snaps the
		     count to the lock). The spacebar is fully INERT — pressed or held (turbo carried
		     over from previous spins), it can never skip past the feature total. -->
		<PressToContinue
			showPrompt={countUpCompleted}
			onpress={() => (countUpCompleted ? oncomplete() : interruptible.interrupt())}
			onspace={() => {}}
		/>
	{/if}
</FadeContainer>
