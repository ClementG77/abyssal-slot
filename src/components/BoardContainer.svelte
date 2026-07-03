<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import gsap from 'gsap';

	import { Container } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		MOBILE_REEL_DISPLAY_SCALE,
		REEL_DISPLAY_GRID,
		getReelDisplayGrid,
	} from '../game/constants';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();

	const context = getContext();
	const mobileReelScale = $derived(
		context.stateLayoutDerived.layoutType() === 'portrait' ? MOBILE_REEL_DISPLAY_SCALE : 1,
	);
	const activeGrid = $derived(getReelDisplayGrid(context.stateGameDerived.reelLayout()));
	const frameGridScale = $derived({
		x: activeGrid.width / REEL_DISPLAY_GRID.width,
		y: activeGrid.height / REEL_DISPLAY_GRID.height,
	});

	let now = $state(0);
	let launchStartedAt = $state(-1);
	let scatterAnticipationStartedAt = $state(-1);
	let scatterAnticipationReleasedAt = $state(-1);
	let scatterAnticipationReleaseFrom = $state(0);
	// The Eye's heavy landing jolt — fired on the Eye's drop only (see onSymbolLand), never on reveal.
	const eyeImpact = $state({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 });
	let eyeImpactTimeline: gsap.core.Timeline | undefined;

	onMount(() => {
		let raf = 0;
		const loop = (timestamp: number) => {
			now = timestamp;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(raf);
			eyeImpactTimeline?.kill();
		};
	});

	context.eventEmitter.subscribeOnMount({
		reelFrameSpinLaunch: () => (launchStartedAt = performance.now()),
		reelFrameScatterAnticipationStart: () => {
			scatterAnticipationStartedAt = performance.now();
			scatterAnticipationReleasedAt = -1;
		},
		reelFrameScatterAnticipationEnd: () => {
			scatterAnticipationReleaseFrom = scatterAnticipationProgress;
			scatterAnticipationReleasedAt = performance.now();
		},
		boardEyeImpact: () => {
			eyeImpactTimeline?.kill();
			eyeImpactTimeline = gsap
				.timeline()
				.set(eyeImpact, { x: 0, y: -8, scaleX: 0.985, scaleY: 1.025, rotation: 0 })
				.to(eyeImpact, {
					y: 15,
					scaleX: 1.035,
					scaleY: 0.965,
					rotation: -0.012,
					duration: 0.09,
					ease: 'power3.in',
				})
				.to(eyeImpact, { x: -12, y: -5, rotation: 0.009, duration: 0.045, ease: 'power2.out' })
				.to(eyeImpact, { x: 10, y: 3, rotation: -0.007, duration: 0.05, ease: 'power2.out' })
				.to(eyeImpact, {
					x: 0,
					y: 0,
					scaleX: 1,
					scaleY: 1,
					rotation: 0,
					duration: 0.18,
					ease: 'back.out(1.8)',
				});
		},
	});

	const launchEnergy = $derived.by(() => {
		const elapsed = launchStartedAt < 0 ? Infinity : (now - launchStartedAt) / 1000;
		return elapsed < 0.62 ? Math.max(0, 1 - elapsed / 0.62) : 0;
	});
	const launchMotion = $derived(launchEnergy > 0 ? Math.sin((1 - launchEnergy) * Math.PI) : 0);
	const scatterAnticipationProgress = $derived.by(() => {
		if (scatterAnticipationReleasedAt >= 0) {
			const releaseElapsed = (now - scatterAnticipationReleasedAt) / 1000;
			return Math.max(0, scatterAnticipationReleaseFrom * (1 - releaseElapsed / 0.2));
		}

		if (scatterAnticipationStartedAt < 0) return 0;
		const elapsed = (now - scatterAnticipationStartedAt) / 1000;
		// lean in over the first second…
		const p = Math.min(1, elapsed);
		const smooth = p * p * (3 - 2 * p);
		// …then keep building instead of holding: a slow creep (up to +50% more zoom over ~4s)
		// and a faint heartbeat so the hold feels like pressure, not pause.
		const creep = Math.min(0.5, Math.max(0, elapsed - 1) * 0.12);
		const heartbeat = elapsed > 1 ? Math.sin((elapsed - 1) * Math.PI * 2.3) * 0.035 : 0;
		return smooth + creep + heartbeat;
	});
	const boardShakeY = $derived(launchMotion * 42);
	const boardScale = $derived({
		x:
			mobileReelScale *
			frameGridScale.x *
			(1 + launchMotion * 0.045 + scatterAnticipationProgress * 0.06) *
			eyeImpact.scaleX,
		y:
			mobileReelScale *
			frameGridScale.y *
			(1 + launchMotion * 0.045 + scatterAnticipationProgress * 0.06) *
			eyeImpact.scaleY,
	});
</script>

<Container
	x={context.stateGameDerived.boardLayout().x + eyeImpact.x}
	y={context.stateGameDerived.boardLayout().y + boardShakeY + eyeImpact.y}
	pivot={{ x: REEL_DISPLAY_GRID.width / 2, y: REEL_DISPLAY_GRID.height / 2 }}
	rotation={eyeImpact.rotation}
	scale={boardScale}
>
	{@render props.children()}
</Container>
