<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';

	import { Container } from 'pixi-svelte';
	import { FadeContainer, ResponsiveBitmapText } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { createInterruptible } from 'utils-shared/interruptible';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { SECOND } from 'constants-shared/time';
	import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

	import WinBubbles from './WinBubbles.svelte';
	import WinBanner from './WinBanner.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE, abyssalBitmapStyle } from '../game/constants';
	import { getContext } from '../game/context';

	const context = getContext();

	// Win-tier takeover shown for wins over 20× the bet (multiplier = bookEvent.amount /
	// BOOK_AMOUNT_MULTIPLIER). The count-up plays as STEPS — every tier on the way to the final
	// is its own act (0→50× under BIG, 50→100× under HUGE, …), so a 300× win ALWAYS shows the
	// full BIG → HUGE → MEGA → EPIC ladder. A press skips to the next step (not to the end); after the
	// final lock a press dismisses. Sub-20× wins are gated out in setWin (no takeover).
	// MAX WIN is reserved for the 15,000× win cap only; 250× up to the cap shows EPIC.
	// Ladder spacing: each step is at least double the last, so the higher screens stay RARE
	// and hitting one feels like an event (a 60× win is a HUGE, not already a MEGA).
	const WIN_TIERS = [
		{ min: 15000, key: 'maxWin' },
		{ min: 250, key: 'epicWin' },
		{ min: 100, key: 'megaWin' },
		{ min: 50, key: 'hugeWin' },
		{ min: 20, key: 'bigWin' },
	] as const;
	// Step pacing: the FIRST step is the slowest (savour the arrival), then each step up the
	// ladder runs quicker — momentum builds as the win grows. The landing step never rushes.
	const STEP_BASE_SECONDS = 6.0; // duration of the first step
	const STEP_ACCEL = 0.72; // each next step takes ×0.72 of the previous (accelerates)
	const STEP_MIN_SECONDS = 1.3; // intermediate steps never faster than this
	const FINAL_STEP_MIN_SECONDS = 3.6; // the landing step never faster than this
	// Within a step the count CRAWLS into the boundary (will it stop here…?) then the next
	// step opens back at full speed. Higher exponent = longer, more teasing crawl.
	const CRAWL_EXPONENT = 2.6;
	// discreet tier-color wash over the whole dimmed scene behind the takeover
	const SCENE_TINT_ALPHA = 0.06;

	// accents matched to the win_steps frame art (crest + gem colors per step).
	// Red is RESERVED for the win cap: MAX WIN wears the dragon frame, EPIC the eye frame.
	const TIER_COLOR: Record<string, number> = {
		bigWin: 0x2fd06c, // emerald (seahorse)
		hugeWin: 0x3f8cff, // sapphire (jellyfish)
		megaWin: 0xffb13c, // amber (nautilus)
		epicWin: 0xb45cff, // amethyst (the Eye)
		maxWin: 0xff4438, // ruby (dragon) — the 15,000× moment only
	};

	const tierFor = (mult: number) => WIN_TIERS.find((t) => mult >= t.min);
	const lowestTier = WIN_TIERS[WIN_TIERS.length - 1];

	// The amount is the ONLY text inside the plaque (the title is a headline above the frame,
	// rendered by WinBanner). Fractions of the frame height, measured from the plaque art.
	const AMOUNT_Y = 0.08; // amount centre ≈ the plaque's centre
	const AMOUNT_SIZE = 0.22; // amount font size
	const AMOUNT_MAX_WIDTH = 0.66; // fraction of frame width before auto-shrink
	const BANNER_SHIFT = 0.12; // banner+amount pushed down so title+frame balance on centre

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});

	// The win takeover always plays at FULL speed — turbo (incl. a held spacebar) is deliberately
	// ignored here so a big win is never skipped or rushed; the player sees the whole escalation
	// even while holding space to fast-forward spins. A screen tap can still skip steps, and the
	// takeover auto-dismisses after its own linger, so a held spacebar simply resumes spinning
	// once the win is removed.
	const ts = () => 1;
	const multiplier = $derived(amount / BOOK_AMOUNT_MULTIPLIER);
	const finalTier = $derived(tierFor(multiplier)); // gates the banner celebration (≥20×)

	// takeover geometry: the plaque frame centred over the board, at the art's 522:383 aspect.
	// 0.72 matches WinCapCelebration's FRAME_SCALE — the win ladder and the max-win takeover
	// share ONE plaque size (the bigger read was preferred over the old 0.62). On portrait
	// phones the board itself is squeezed by the narrow screen, so the plaque takes a bigger
	// share of it (0.95) to stay a real centre-piece — same pair of numbers as WinCapCelebration.
	const boardWidth = $derived(context.stateGameDerived.boardLayout().width);
	const imgW = $derived(boardWidth * 1.05);
	const frameScale = $derived(
		context.stateLayoutDerived.layoutType() === 'portrait' ? 0.95 : 0.72,
	);
	const frameW = $derived(imgW * frameScale);
	const frameH = $derived(frameW * (383 / 522));
	const amountStyle = $derived(abyssalBitmapStyle({ fontSize: frameH * AMOUNT_SIZE }));

	// --- Stepped count-up + press-to-skip ---------------------------------------------------
	// The count runs boundary to boundary (each tier floor above the entry tier), easing into
	// each landing; the tier watcher slams the new title as the number crosses. A press
	// interrupts only the CURRENT step — the count snaps to that step's landing and the next
	// step plays on, so skipping never swallows the escalation ladder.
	const countUp = new Tween(0);
	const interruptible = createInterruptible();
	let countUpCompleted = $state(false);
	const countEase = (t: number) => 1 - Math.pow(1 - t, CRAWL_EXPONENT);
	const skipToNextStep = () => interruptible.interrupt();
	const startCountUp = async () => {
		const boundaries = [...WIN_TIERS]
			.reverse() // ascending: big, mega, epic, max
			.slice(1) // steps begin where the tier ABOVE the entry tier starts
			.map((tier) => tier.min * BOOK_AMOUNT_MULTIPLIER)
			.filter((boundary) => boundary < amount);
		const targets = [...boundaries, amount];
		for (const [index, target] of targets.entries()) {
			const paced = STEP_BASE_SECONDS * Math.pow(STEP_ACCEL, index);
			const seconds = Math.max(
				paced,
				index === targets.length - 1 ? FINAL_STEP_MIN_SECONDS : STEP_MIN_SECONDS,
			);
			const { interrupted } = await interruptible.add(() =>
				countUp.set(target, { duration: (seconds * SECOND) / ts(), easing: countEase }),
			);
			await countUp.set(target, { duration: 0 }); // snap to the step's landing if skipped
			interruptible.clear();
			if (interrupted && index < targets.length - 1) {
				// a skip lands the amount on the next tier's floor — punch it so the new
				// starting number (35×, 50×, …) registers before the next step counts on
				gsap.killTweensOf(numFx, 'scale');
				gsap.fromTo(
					numFx,
					{ scale: 1.22 },
					{ scale: 1, duration: 0.34, ease: 'back.out(2.5)' },
				);
			}
		}
	};

	const liveMult = $derived(countUp.current / BOOK_AMOUNT_MULTIPLIER);
	const bannerTier = $derived(tierFor(liveMult) ?? lowestTier);

	// --- Celebration FX -------------------------------------------------------------------
	const numFx = $state({ scale: 1, flash: 0, throb: 1 }); // lock pop + flash + counting throb
	const groupFx = $state({ scale: 0.6, alpha: 0 }); // banner entrance
	const shake = $state({ x: 0, y: 0 }); // screen-shake on tier-ups / lock
	let burstKey = $state(0); // bump → WinBubbles fires a fresh surge

	const triggerShake = (power: number) => {
		gsap.killTweensOf(shake);
		const tl = gsap.timeline({
			onComplete: () => {
				shake.x = 0;
				shake.y = 0;
			},
		});
		const kicks = 5;
		for (let i = 0; i < kicks; i++) {
			const decay = 1 - i / kicks;
			tl.to(shake, {
				x: (Math.random() - 0.5) * power * decay,
				y: (Math.random() - 0.5) * power * decay,
				duration: 0.045,
				ease: 'power1.inOut',
			});
		}
		tl.to(shake, { x: 0, y: 0, duration: 0.12, ease: 'power2.out' });
	};

	const playEntrance = () => {
		gsap.killTweensOf(groupFx);
		gsap
			.timeline()
			.set(groupFx, { scale: 0.6, alpha: 0 })
			.to(groupFx, { alpha: 1, duration: 0.2, ease: 'power2.out' })
			.to(groupFx, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.55)' }, 0);
	};

	// each tier plays ITS OWN stinger when the count climbs into it — the ladder is audible
	const TIER_SFX = {
		bigWin: 'sfx_win_big',
		hugeWin: 'sfx_win_big',
		megaWin: 'sfx_win_mega',
		epicWin: 'sfx_win_epic',
		maxWin: 'sfx_win_max',
	} as const;

	const onTierUp = (tierKey: keyof typeof TIER_SFX) => {
		burstKey++;
		triggerShake(SYMBOL_SIZE * 0.16);
		context.eventEmitter.broadcast({
			type: 'soundOnce',
			name: TIER_SFX[tierKey] ?? 'sfx_win_big',
			forcePlay: true,
		});
	};

	// while the number rolls it throbs gently (Gates-style "alive" count) — killed by the lock
	const startThrob = () => {
		gsap.killTweensOf(numFx);
		numFx.throb = 1;
		gsap.to(numFx, { throb: 1.045, duration: 0.38, yoyo: true, repeat: -1, ease: 'sine.inOut' });
	};

	const playLock = () => {
		gsap.killTweensOf(numFx);
		gsap
			.timeline()
			.set(numFx, { scale: 1, flash: 0, throb: 1 })
			.to(numFx, { scale: 1.4, duration: 0.12, ease: 'back.out(3)' })
			.to(numFx, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
			.set(numFx, { flash: 0.95 }, 0)
			.to(numFx, { flash: 0, duration: 0.45, ease: 'power2.out' }, 0);
		burstKey++; // big final burst
		triggerShake(SYMBOL_SIZE * 0.26);
		// the roll is over — kill the count-up loop at the lock (not at dismissal) so it never
		// drones under the settled amount. Safe for capped books: the wincap handler restarts
		// the loop for the trophy's own hero count.
		context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_countup_loop' });
		// the win amount locks in — the final resolve hit
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_win_big', forcePlay: true });
	};

	// Escalation watcher: each time the live banner tier climbs (big → mega → epic → max),
	// punch the screen + throw a coin burst. Skips the initial tier and the post-lock settle.
	let prevTierKey: string | undefined;
	$effect(() => {
		const key = bannerTier.key;
		if (prevTierKey !== undefined && prevTierKey !== key && !countUpCompleted) onTierUp(key);
		prevTierKey = key;
	});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			// reset BEFORE the subtree renders: countUp/groupFx keep the PREVIOUS win's values
			// between takeovers, so without this the first frames show the old final amount
			// instead of counting from 0
			countUp.set(0, { duration: 0 });
			groupFx.alpha = 0;
			groupFx.scale = 0.6;
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});

	const present = async () => {
		// reset everything for a clean run (the subtree remounts per win, but the Tweens persist)
		countUpCompleted = false;
		prevTierKey = undefined;
		numFx.scale = 1;
		numFx.flash = 0;
		numFx.throb = 1;
		shake.x = 0;
		shake.y = 0;
		await countUp.set(0, { duration: 0 });

		playEntrance();
		startThrob();
		await startCountUp();
		playLock();
		countUpCompleted = true;
		// linger on the locked total — let the win breathe before the round moves on
		await waitForTimeout((SECOND * 2.6) / ts());
		oncomplete();
	};
</script>

<FadeContainer {show}>
	<!-- Only 20×+ wins reach here (gated in setWin): the banner escalates with the live count-up
	     over an animated backdrop; smaller wins get no centre-screen takeover. -->
	{#if winLevelData && finalTier}
		<OnMount onmount={present} />

		<!-- board falls into shadow (fades in with the entrance), washed faintly in the
		     current step's color so the whole scene leans with the ladder -->
		<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.72 * groupFx.alpha} />
		<CanvasSizeRectangle
			backgroundColor={TIER_COLOR[bannerTier.key]}
			backgroundAlpha={SCENE_TINT_ALPHA * groupFx.alpha}
		/>

		<!-- continuous bubble fountain (screen space): diagonal sprays from the bottom for the
		     whole takeover, surging on each tier-up and the final lock -->
		<WinBubbles {burstKey} levelAlias={winLevelData.alias} />

		<MainContainer>
			<Container
				x={context.stateGameDerived.boardLayout().x + shake.x}
				y={context.stateGameDerived.boardLayout().y + shake.y}
				scale={groupFx.scale}
				alpha={groupFx.alpha}
			>
				<Container y={frameH * BANNER_SHIFT}>
				<WinBanner
					tierKey={bannerTier.key}
					color={TIER_COLOR[bannerTier.key]}
					width={frameW}
					height={frameH}
				/>
				<Container scale={numFx.scale * numFx.throb}>
					<ResponsiveBitmapText
						anchor={0.5}
						y={frameH * AMOUNT_Y}
						maxWidth={frameW * AMOUNT_MAX_WIDTH}
						text={bookEventAmountToCurrencyString(countUp.current)}
						style={amountStyle}
					/>
					{#if numFx.flash > 0}
						<!-- the lock flash: an additive copy of the gold glyphs blooms them to white -->
						<Container alpha={numFx.flash} blendMode="add">
							<ResponsiveBitmapText
								anchor={0.5}
								y={frameH * AMOUNT_Y}
								maxWidth={frameW * AMOUNT_MAX_WIDTH}
								text={bookEventAmountToCurrencyString(countUp.current)}
								style={amountStyle}
							/>
						</Container>
					{/if}
				</Container>
				</Container>
			</Container>
		</MainContainer>

		<!-- Screen tap skips a step (or dismisses at the end); the prompt text and the spacebar
		     dismissal only come alive once the count-up has FINISHED, so a held spacebar (turbo)
		     can't skip through the celebration and the prompt isn't shown mid-animation. -->
		<PressToContinue
			showPrompt={countUpCompleted}
			onpress={() => (countUpCompleted ? oncomplete() : skipToNextStep())}
			onspace={() => {
				if (countUpCompleted) oncomplete();
			}}
		/>
	{/if}
</FadeContainer>
