<script lang="ts" module>
	export type EmitterEventWinCapCelebration = { type: 'winCapTrigger'; amount: number };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { Tween } from 'svelte/motion';

	import { Container } from 'pixi-svelte';
	import { FadeContainer, ResponsiveBitmapText } from 'components-pixi';
	import { OnMount } from 'components-shared';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { createInterruptible } from 'utils-shared/interruptible';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { SECOND } from 'constants-shared/time';

	import WinBubbles from './WinBubbles.svelte';
	import WinBanner from './WinBanner.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE, abyssalBitmapStyle } from '../game/constants';
	import { getContext } from '../game/context';

	const context = getContext();

	// The 15,000× MAX WIN trophy. `wincap` fires on the ROUND cumulative, so this can arrive
	// without the spin's own win ladder having reached (or even shown) MAX WIN — a small spin
	// win can tip the total over the cap. The takeover is therefore a standalone reveal, played
	// at the end of the win celebrations: the red-dragon plaque slams in over a ruby-washed
	// scene, the amount does one short hero count, locks with a punch, and the trophy holds
	// (banner breathing, fountain running) until the player presses — this screen is the
	// screenshot moment.
	// ---- Tunable knobs -----------------------------------------------------------------
	const COUNT_SECONDS = 1.6; // short hero count — the ladder already counted the win
	const CRAWL_EXPONENT = 2.2; // ease into the lock (same crawl family as the win ladder)
	const BACKDROP_ALPHA = 0.78; // scene shadow under the trophy
	const SCENE_TINT_ALPHA = 0.1; // ruby wash over the dimmed scene — red belongs to the cap
	const RUBY = 0xff4438; // matches Win.svelte's TIER_COLOR.maxWin (the dragon frame's accent)
	const FRAME_SCALE = 0.72; // fraction of the takeover width — one size up from the ladder's 0.62
	const AMOUNT_Y = 0.08; // amount centre ≈ the plaque's centre (fraction of frame height)
	const AMOUNT_SIZE = 0.24; // amount font size, fraction of frame height
	const AMOUNT_MAX_WIDTH = 0.66; // fraction of frame width before auto-shrink
	const BANNER_SHIFT = 0.12; // banner+amount pushed down so title+frame balance on centre
	const SLAM_SCALE = 1.6; // entrance: the plaque lands from big → settles (WinBanner's slam size)

	// Like the win ladder, the trophy always plays at FULL speed — turbo never rushes the cap.
	const ts = () => 1;

	let show = $state(false);
	let amount = $state(0);
	let oncomplete = $state(() => {});

	// takeover geometry: mirrors Win.svelte's plaque placement, one size up
	const boardWidth = $derived(context.stateGameDerived.boardLayout().width);
	const frameW = $derived(boardWidth * 1.05 * FRAME_SCALE);
	const frameH = $derived(frameW * (383 / 522));
	const amountStyle = $derived(abyssalBitmapStyle({ fontSize: frameH * AMOUNT_SIZE }));

	// --- Hero count + press-to-skip ---------------------------------------------------------
	// One count, boundary-free: 0 → cap with a crawl into the lock. A press mid-count snaps to
	// the lock; a press after the lock dismisses the trophy (resolves the book's await).
	const countUp = new Tween(0);
	const interruptible = createInterruptible();
	let countUpCompleted = $state(false);
	const countEase = (t: number) => 1 - Math.pow(1 - t, CRAWL_EXPONENT);

	// --- Celebration FX -----------------------------------------------------------------
	const numFx = $state({ scale: 1, flash: 0, throb: 1 }); // lock pop + flash + counting throb
	const groupFx = $state({ scale: SLAM_SCALE, alpha: 0 }); // trophy slam entrance
	const shake = $state({ x: 0, y: 0 }); // screen-shake on slam / lock
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

	// SLAM entrance: the dragon plaque lands from big → settles elastic, the screen takes the
	// hit and the fountain surges. No white flash (glow carries it, per the house style).
	const playEntrance = () => {
		gsap.killTweensOf(groupFx);
		gsap
			.timeline()
			.set(groupFx, { scale: SLAM_SCALE, alpha: 0 })
			.to(groupFx, { alpha: 1, duration: 0.16, ease: 'power2.out' })
			.to(groupFx, { scale: 1, duration: 0.62, ease: 'elastic.out(1, 0.5)' }, 0.02);
		burstKey++;
		triggerShake(SYMBOL_SIZE * 0.3);
		// PLACEHOLDER cap-slam stinger — swap for the bespoke max-win hit later.
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_youwon_panel' });
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
		// PLACEHOLDER lock stinger — swap for a bespoke "max win locked" hit later.
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_winlevel_end' });
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
			groupFx.scale = SLAM_SCALE;
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
		numFx.scale = 1;
		numFx.flash = 0;
		numFx.throb = 1;
		shake.x = 0;
		shake.y = 0;
		await countUp.set(0, { duration: 0 });

		playEntrance();
		startThrob();
		await interruptible.add(() =>
			countUp.set(amount, { duration: (COUNT_SECONDS * SECOND) / ts(), easing: countEase }),
		);
		await countUp.set(amount, { duration: 0 }); // snap to the cap if skipped mid-count
		interruptible.clear();
		playLock();
		countUpCompleted = true;
		// no auto-advance: the trophy holds on the capped total until the player presses
	};
</script>

<FadeContainer {show} zIndex={50}>
	{#if amount > 0}
		<OnMount onmount={present} />

		<!-- the scene falls into shadow, washed ruby — red is reserved for the cap alone -->
		<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={BACKDROP_ALPHA * groupFx.alpha} />
		<CanvasSizeRectangle backgroundColor={RUBY} backgroundAlpha={SCENE_TINT_ALPHA * groupFx.alpha} />

		<!-- continuous bubble fountain at full max-win intensity, surging on slam + lock -->
		<WinBubbles {burstKey} levelAlias="max" />

		<MainContainer>
			<Container
				x={context.stateGameDerived.boardLayout().x + shake.x}
				y={context.stateGameDerived.boardLayout().y + shake.y}
				scale={groupFx.scale}
				alpha={groupFx.alpha}
			>
				<Container y={frameH * BANNER_SHIFT}>
					<!-- the red dragon plaque — "MAX WIN" headline + aura shells live in WinBanner -->
					<WinBanner tierKey="maxWin" color={RUBY} width={frameW} height={frameH} />
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

		<!-- press mid-count → snap to the lock; press after the lock → dismiss. The prompt (and
		     the spacebar) only come alive once the count has locked, so a held spacebar (turbo)
		     can never blow through the cap screen. -->
		<PressToContinue
			showPrompt={countUpCompleted}
			onpress={() => (countUpCompleted ? oncomplete() : interruptible.interrupt())}
			onspace={() => {
				if (countUpCompleted) oncomplete();
			}}
		/>
	{/if}
</FadeContainer>
