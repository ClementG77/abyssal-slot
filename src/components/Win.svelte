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
	import { FadeContainer, ResponsiveText } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { createInterruptible } from 'utils-shared/interruptible';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { SECOND } from 'constants-shared/time';
	import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
	import { stateBetDerived } from 'state-shared';

	import WinCoins from './WinCoins.svelte';
	import WinBackdrop from './WinBackdrop.svelte';
	import WinBanner from './WinBanner.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { getContext } from '../game/context';

	const context = getContext();

	// Win-tier banners shown for wins over 20× the bet (multiplier = bookEvent.amount /
	// BOOK_AMOUNT_MULTIPLIER). The banner escalates LIVE with the count-up — e.g. a 160× win
	// starts on BIG (≥20×), climbs to MEGA (≥50×), and lands on EPIC (≥150×) as the number
	// rolls. Sub-20× wins are gated out in setWin (no on-screen takeover).
	// MAX WIN is reserved for the 15,000× win cap only; everything between 150× and the cap shows EPIC.
	const WIN_TIERS = [
		{ min: 15000, key: 'maxWin', seconds: 7 },
		{ min: 150, key: 'epicWin', seconds: 5.5 },
		{ min: 50, key: 'megaWin', seconds: 4.5 },
		{ min: 20, key: 'bigWin', seconds: 3.5 },
	] as const;

	const TIER_COLOR: Record<string, number> = {
		bigWin: 0xffb13c, // gold
		megaWin: 0x22e0ff, // cyan
		epicWin: 0x9b6cff, // violet
		maxWin: 0xff6a3c, // ember
	};

	const tierFor = (mult: number) => WIN_TIERS.find((t) => mult >= t.min);
	const lowestTier = WIN_TIERS[WIN_TIERS.length - 1];

	// Branded "minted" amount type — Cinzel (matches the Eye / Gaze values), warm gold fill, dark
	// stroke and a soft drop shadow for depth. One style for every banner tier.
	const amountStyle = {
		fontFamily: 'Cinzel, Georgia, serif',
		fontWeight: '900',
		fontSize: SYMBOL_SIZE * 0.95,
		align: 'center',
		fill: 0xffe6a6,
		stroke: { color: 0x2a1400, width: 8 },
		dropShadow: { color: 0x000000, blur: 10, distance: 5, alpha: 0.6 },
	} as const;

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});

	const ts = () => stateBetDerived.timeScale(); // turbo speed-up
	const multiplier = $derived(amount / BOOK_AMOUNT_MULTIPLIER);
	const finalTier = $derived(tierFor(multiplier)); // gates the banner celebration (≥20×)
	const duration = $derived((finalTier ? finalTier.seconds * SECOND : 0) / ts());

	// banner geometry: 3:2 banner with the amount sitting in the lower plate of the art
	const boardWidth = $derived(context.stateGameDerived.boardLayout().width);
	const imgW = $derived(boardWidth * 1.05);
	const imgH = $derived(imgW / 1.5);

	// --- Count-up (our own, so we control the cadence) + press-to-skip --------------------
	// A near-linear climb that eases out into a settle, then a hard "lock" pop punctuates it.
	const countUp = new Tween(0);
	const interruptible = createInterruptible();
	let countUpCompleted = $state(false);
	const countEase = (t: number) => 1 - Math.pow(1 - t, 1.6);
	const runCount = () => countUp.set(amount, { duration, easing: countEase });
	const finishCountUp = () => interruptible.interrupt();
	const startCountUp = async () => {
		await interruptible.add(runCount);
		await countUp.set(amount, { duration: 0 }); // snap to final if skipped mid-count
		interruptible.clear();
	};

	const liveMult = $derived(countUp.current / BOOK_AMOUNT_MULTIPLIER);
	const bannerTier = $derived(tierFor(liveMult) ?? lowestTier);

	// --- Celebration FX -------------------------------------------------------------------
	const numFx = $state({ scale: 1, flash: 0 }); // count-up lock pop + white flash
	const groupFx = $state({ scale: 0.6, alpha: 0 }); // banner entrance
	const shake = $state({ x: 0, y: 0 }); // screen-shake on tier-ups / lock
	let burstKey = $state(0); // bump → WinCoins fires a fresh physics burst

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

	const onTierUp = () => {
		burstKey++;
		triggerShake(SYMBOL_SIZE * 0.16);
		// PLACEHOLDER tier-up stinger — swap for a bespoke escalation sound later.
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_scatter_win' });
	};

	const playLock = () => {
		gsap.killTweensOf(numFx);
		gsap
			.timeline()
			.set(numFx, { scale: 1, flash: 0 })
			.to(numFx, { scale: 1.4, duration: 0.12, ease: 'back.out(3)' })
			.to(numFx, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.45)' })
			.set(numFx, { flash: 0.95 }, 0)
			.to(numFx, { flash: 0, duration: 0.45, ease: 'power2.out' }, 0);
		burstKey++; // big final burst
		triggerShake(SYMBOL_SIZE * 0.26);
		// PLACEHOLDER lock stinger — swap for a bespoke "win locked" hit later.
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_end' });
	};

	// Escalation watcher: each time the live banner tier climbs (big → mega → epic → max),
	// punch the screen + throw a coin burst. Skips the initial tier and the post-lock settle.
	let prevTierKey: string | undefined;
	$effect(() => {
		const key = bannerTier.key;
		if (prevTierKey !== undefined && prevTierKey !== key && !countUpCompleted) onTierUp();
		prevTierKey = key;
	});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
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
		shake.x = 0;
		shake.y = 0;
		await countUp.set(0, { duration: 0 });

		playEntrance();
		await startCountUp();
		playLock();
		countUpCompleted = true;
		await waitForTimeout((SECOND * 0.5) / ts());
		oncomplete();
	};
</script>

<FadeContainer {show}>
	<!-- Only 20×+ wins reach here (gated in setWin): the banner escalates with the live count-up
	     over an animated backdrop; smaller wins get no centre-screen takeover. -->
	{#if winLevelData && finalTier}
		<OnMount onmount={present} />

		<!-- board falls into shadow (fades in with the entrance) -->
		<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.6 * groupFx.alpha} />

		<!-- physics coin bursts (screen space), fired on each tier-up and the final lock -->
		<WinCoins {burstKey} levelAlias={winLevelData.alias} />

		<MainContainer>
			<Container
				x={context.stateGameDerived.boardLayout().x + shake.x}
				y={context.stateGameDerived.boardLayout().y + shake.y}
				scale={groupFx.scale}
				alpha={groupFx.alpha}
			>
				<WinBackdrop radius={imgW * 0.6} color={TIER_COLOR[bannerTier.key]} />
				<WinBanner tierKey={bannerTier.key} width={imgW} height={imgH} />
				<Container scale={numFx.scale}>
					<ResponsiveText
						anchor={0.5}
						y={imgH * 0.17}
						maxWidth={imgW * 0.6}
						text={bookEventAmountToCurrencyString(countUp.current)}
						style={amountStyle}
					/>
					{#if numFx.flash > 0}
						<Container alpha={numFx.flash}>
							<ResponsiveText
								anchor={0.5}
								y={imgH * 0.17}
								maxWidth={imgW * 0.6}
								text={bookEventAmountToCurrencyString(countUp.current)}
								style={{ ...amountStyle, fill: 0xffffff }}
							/>
						</Container>
					{/if}
				</Container>
			</Container>
		</MainContainer>

		<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
	{/if}
</FadeContainer>
