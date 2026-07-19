<script lang="ts" module>
	export type EmitterEventWinCapCelebration = { type: 'winCapTrigger'; amount: number };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';

	import { Container } from 'pixi-svelte';
	import ResponsiveText from './ResponsiveText.svelte';
	import { FadeContainer } from 'components-pixi';
	import { OnMount } from 'components-shared';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { createInterruptible } from 'utils-shared/interruptible';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { SECOND } from 'constants-shared/time';
	import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';

	import WinBubbles from './WinBubbles.svelte';
	import WinBanner from './WinBanner.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { abyssalAmountTextStyle, CELEBRATION_FACE, WIN_TIER_ACCENT } from '../game/textStyles';
	import { getContext } from '../game/context';

	const context = getContext();

	// The 15,000× MAX WIN trophy. `wincap` fires on the ROUND cumulative, and the capped books
	// NEVER emit a max-level `setWin` (every setWin in them is a small sub-20× tumble), so the
	// win ladder in Win.svelte never runs — this trophy is the ONLY celebration a max win gets.
	// It therefore plays the whole escalation itself: the count climbs from 0 through the win
	// tiers, the banner morphs BIG → HUGE → MEGA → EPIC with tier-up punches and stingers, then
	// the red-dragon MAX plaque SLAMS in as the climax over a ruby-washed scene, the amount locks
	// with a punch, and the trophy holds (banner breathing, fountain running) INDEFINITELY until
	// the player clicks/taps — the spacebar can't dismiss it — this screen is the screenshot moment.
	// ---- Tunable knobs -----------------------------------------------------------------
	// Same escalation ladder as Win.svelte, landing on maxWin at the 15,000× cap.
	const WIN_TIERS = [
		{ min: 15000, key: 'maxWin' },
		{ min: 250, key: 'epicWin' },
		{ min: 100, key: 'megaWin' },
		{ min: 50, key: 'hugeWin' },
		{ min: 20, key: 'bigWin' },
	] as const;
	// accents matched to the win_steps frame art; ruby is the dragon MAX plaque. Shared table —
	// see WIN_TIER_ACCENT, which the type's gradient reads from too.
	const TIER_COLOR: Record<string, number> = WIN_TIER_ACCENT;
	// each tier plays ITS OWN stinger as the count climbs into it — the ladder is audible
	const TIER_SFX = {
		bigWin: 'sfx_win_big',
		hugeWin: 'sfx_win_big',
		megaWin: 'sfx_win_mega',
		epicWin: 'sfx_win_epic',
		maxWin: 'sfx_win_max',
	} as const;
	// Step pacing — mirror Win.svelte: the first step savours the arrival, each next runs quicker.
	const STEP_BASE_SECONDS = 5.0;
	const STEP_ACCEL = 0.72;
	const STEP_MIN_SECONDS = 1.3;
	const FINAL_STEP_MIN_SECONDS = 3.2; // the climb into MAX never rushes
	const CRAWL_EXPONENT = 2.4; // crawl into each boundary (will it stop here…?)
	const BACKDROP_ALPHA = 0.78; // scene shadow under the trophy
	const SCENE_TINT_ALPHA = 0.1; // colour wash over the dimmed scene — morphs with the tier
	const FRAME_SCALE = 0.72; // fraction of the takeover width — SAME as Win.svelte's ladder frame
	const FRAME_SCALE_PORTRAIT = 0.95; // phones: the narrow screen squeezes the board — take a bigger share of it
	const AMOUNT_Y = 0.08; // amount centre ≈ the plaque's centre (fraction of frame height)
	const AMOUNT_SIZE = 0.24; // amount font size, fraction of frame height
	const AMOUNT_MAX_WIDTH = 0.66; // fraction of frame width before auto-shrink
	const BANNER_SHIFT = 0.12; // banner+amount pushed down so title+frame balance on centre
	const SLAM_SCALE = 1.6; // MAX climax: the dragon plaque lands from big → settles

	const tierFor = (mult: number) => WIN_TIERS.find((t) => mult >= t.min);
	const lowestTier = WIN_TIERS[WIN_TIERS.length - 1];

	// Like the win ladder, the trophy always plays at FULL speed — turbo never rushes the cap.
	const ts = () => 1;

	let show = $state(false);
	let amount = $state(0);
	let oncomplete = $state(() => {});

	// takeover geometry: mirrors Win.svelte's plaque placement, at the same shared size
	// (incl. the bigger portrait share — keep the two components' scale pairs identical)
	const boardWidth = $derived(context.stateGameDerived.boardLayout().width);
	const frameW = $derived(
		boardWidth *
			1.05 *
			(context.stateLayoutDerived.layoutType() === 'portrait' ? FRAME_SCALE_PORTRAIT : FRAME_SCALE),
	);
	const frameH = $derived(frameW * (383 / 522));

	// --- Stepped count-up + press-to-skip ---------------------------------------------------
	// The count runs boundary to boundary (each tier floor), easing into each landing; the tier
	// watcher morphs the banner as the number crosses. A press interrupts only the CURRENT step.
	const countUp = new Tween(0);
	const interruptible = createInterruptible();
	let countUpCompleted = $state(false);
	const countEase = (t: number) => 1 - Math.pow(1 - t, CRAWL_EXPONENT);
	const skipToNextStep = () => interruptible.interrupt();

	// live tier tracks the climbing number, exactly like Win.svelte
	const liveMult = $derived(countUp.current / BOOK_AMOUNT_MULTIPLIER);
	const bannerTier = $derived(tierFor(liveMult) ?? lowestTier);

	// Same as the win ladder: the amount's gradient base carries the live tier's colour, so the
	// number bleeds emerald → sapphire → amber → amethyst → ruby as it climbs into the cap.
	const amountStyle = $derived(
		abyssalAmountTextStyle({
			fontSize: frameH * AMOUNT_SIZE,
			accent: TIER_COLOR[bannerTier.key],
			face: CELEBRATION_FACE,
		}),
	);

	// --- Celebration FX -----------------------------------------------------------------
	const numFx = $state({ scale: 1, flash: 0, throb: 1 }); // lock pop + flash + counting throb
	const groupFx = $state({ scale: 0.6, alpha: 0 }); // banner entrance (BIG), then a MAX re-slam
	const shake = $state({ x: 0, y: 0 }); // screen-shake on tier-ups / slam / lock
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

	// Entrance: the BIG WIN banner blooms in (small → settle) — the ladder builds FROM here up to
	// the ruby MAX climax, so the arrival is a big win, not the trophy itself.
	const playEntrance = () => {
		gsap.killTweensOf(groupFx);
		gsap
			.timeline()
			.set(groupFx, { scale: 0.6, alpha: 0 })
			.to(groupFx, { alpha: 1, duration: 0.2, ease: 'power2.out' })
			.to(groupFx, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.55)' }, 0);
		burstKey++;
		triggerShake(SYMBOL_SIZE * 0.16);
		// the entry tier's stinger (the count starts under BIG WIN)
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_win_big', forcePlay: true });
	};

	// Each time the live banner tier climbs (big → huge → mega → epic), punch the screen + throw
	// a bubble surge + play the tier stinger. The maxWin crossing gets its own dramatic slam.
	const onTierUp = (tierKey: keyof typeof TIER_SFX) => {
		if (tierKey === 'maxWin') {
			playMaxSlam();
			return;
		}
		burstKey++;
		triggerShake(SYMBOL_SIZE * 0.16);
		context.eventEmitter.broadcast({
			type: 'soundOnce',
			name: TIER_SFX[tierKey] ?? 'sfx_win_big',
			forcePlay: true,
		});
	};

	// The MAX climax: the dragon plaque SLAMS bigger then settles elastic as the banner turns to
	// the ruby MAX art, the screen takes a heavy hit and the fountain erupts.
	const playMaxSlam = () => {
		gsap.killTweensOf(groupFx);
		gsap
			.timeline()
			.set(groupFx, { scale: SLAM_SCALE })
			.to(groupFx, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
		burstKey++;
		triggerShake(SYMBOL_SIZE * 0.34);
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_win_max', forcePlay: true });
	};

	// while the number rolls it throbs gently (same "alive" count as the win ladder)
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
			.to(numFx, { scale: 1.45, duration: 0.12, ease: 'back.out(3)' })
			.to(numFx, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
			.set(numFx, { flash: 0.95 }, 0)
			.to(numFx, { flash: 0, duration: 0.45, ease: 'power2.out' }, 0);
		burstKey++; // big final surge
		triggerShake(SYMBOL_SIZE * 0.26);
		// the roll is over — kill the count-up loop HERE, not at dismissal: the trophy holds
		// indefinitely on the capped total and the loop must not drone under it
		context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_countup_loop' });
		// the max-win amount locks in — a resolve punch (the trophy slam already owned the max fanfare)
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_win_big', forcePlay: true });
	};

	// Escalation watcher: each time the live banner tier climbs, fire its tier-up (the maxWin
	// crossing triggers the ruby slam). Skips the initial tier and the post-lock settle.
	let prevTierKey: string | undefined;
	$effect(() => {
		const key = bannerTier.key;
		if (prevTierKey !== undefined && prevTierKey !== key && !countUpCompleted) onTierUp(key);
		prevTierKey = key;
	});

	// The stepped climb: 0 → cap, pausing at each tier floor so the banner morphs and each tier
	// gets its beat. A press snaps the CURRENT step to its landing and the next step plays on, so
	// skipping never swallows the escalation. Ported from Win.svelte, landing on the cap.
	const startCountUp = async () => {
		const boundaries = [...WIN_TIERS]
			.reverse() // ascending: big, huge, mega, epic, max
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
				// a skip lands the amount on the next tier's floor — punch it so the new number
				// registers before the next step counts on
				gsap.killTweensOf(numFx, 'scale');
				gsap.fromTo(numFx, { scale: 1.22 }, { scale: 1, duration: 0.34, ease: 'back.out(2.5)' });
			}
		}
	};

	onMount(() => () => {
		gsap.killTweensOf(numFx);
		gsap.killTweensOf(groupFx);
		gsap.killTweensOf(shake);
	});

	context.eventEmitter.subscribeOnMount({
		winCapTrigger: async (emitterEvent) => {
			// reset BEFORE the subtree renders so the first frames never flash a stale amount
			countUp.set(0, { duration: 0 });
			groupFx.alpha = 0;
			groupFx.scale = 0.6;
			amount = emitterEvent.amount;
			show = true;
			await waitForResolve((resolve) => (oncomplete = resolve));
			show = false;
			// let the fade land before the book proceeds (freeSpinEnd / finalWin follow)
			await waitForTimeout(400);
		},
	});

	const present = async () => {
		// FadeContainer unmounts this subtree on fade-out, so OnMount re-arms per cap — but the
		// Tweens/fx objects persist across runs; reset them for a clean trophy.
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
		// the escalating ladder — banner morphs BIG → HUGE → MEGA → EPIC, then the MAX slam fires
		// on the maxWin crossing at the end of the final step
		await startCountUp();
		playLock();
		countUpCompleted = true;
		// no auto-advance: the trophy holds on the capped total until the player presses
	};
</script>

<FadeContainer {show} zIndex={50}>
	{#if amount > 0}
		<OnMount onmount={present} />

		<!-- the scene falls into shadow, washed in the live tier's colour (emerald → … → ruby) -->
		<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={BACKDROP_ALPHA * groupFx.alpha} />
		<CanvasSizeRectangle
			backgroundColor={TIER_COLOR[bannerTier.key]}
			backgroundAlpha={SCENE_TINT_ALPHA * groupFx.alpha}
		/>

		<!-- continuous bubble fountain at full max-win intensity, surging on each tier-up + slam -->
		<WinBubbles {burstKey} levelAlias="max" />

		<MainContainer>
			<Container
				x={context.stateGameDerived.boardLayout().x + shake.x}
				y={context.stateGameDerived.boardLayout().y + shake.y}
				scale={groupFx.scale}
				alpha={groupFx.alpha}
			>
				<Container y={frameH * BANNER_SHIFT}>
					<!-- banner morphs with the climbing tier; the red dragon MAX plaque is the finale.
					     "BIG/…/MAX WIN" headline + aura shells live in WinBanner -->
					<WinBanner
						tierKey={bannerTier.key}
						color={TIER_COLOR[bannerTier.key]}
						width={frameW}
						height={frameH}
					/>
					<Container scale={numFx.scale * numFx.throb}>
						<ResponsiveText
							anchor={0.5}
							y={frameH * AMOUNT_Y}
							maxWidth={frameW * AMOUNT_MAX_WIDTH}
							text={bookEventAmountToCurrencyString(countUp.current)}
							style={amountStyle}
						/>
						{#if numFx.flash > 0}
							<!-- the lock flash: an additive copy of the gold glyphs blooms them to white -->
							<Container alpha={numFx.flash} blendMode="add">
								<ResponsiveText
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

		<!-- tap mid-count → snap to the lock; tap after the lock → dismiss. The spacebar is fully
		     INERT here — pressed or held (turbo carried over from previous spins), it can never
		     dismiss the MAX WIN screen: the trophy holds indefinitely until a deliberate
		     click/tap. -->
		<PressToContinue
			showPrompt={countUpCompleted}
			onpress={() => (countUpCompleted ? oncomplete() : skipToNextStep())}
			onspace={() => {}}
		/>
	{/if}
</FadeContainer>
