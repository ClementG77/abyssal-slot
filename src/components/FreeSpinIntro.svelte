<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { FREE_SPINS_BANNER_ASPECT } from '../game/constants';
	import { i18nDerived } from '../i18n/i18nDerived';

	// Free-spins intro: shows the freespins banner with the awarded spin count drawn into its
	// plate, and waits for a click before the bonus plays (freeSpinTrigger awaits
	// freeSpinIntroUpdate, so resolving on press unblocks the book sequence → free spins).
	const context = getContext();

	let show = $state(false);
	let total = $state(0);
	let oncomplete = $state(() => {});
	let confirmed = $state(false);
	let animation = $state<gsap.core.Timeline>();
	let fx = $state({ backdrop: 0, alpha: 0, scale: 0.82, y: 48, hint: 0 });

	const playIntro = () => {
		animation?.kill();
		Object.assign(fx, { backdrop: 0, alpha: 0, scale: 0.82, y: 48, hint: 0 });
		animation = gsap
			.timeline({ defaults: { ease: 'power2.out' } })
			.to(fx, { backdrop: 0.72, duration: 0.28 })
			.to(fx, { alpha: 1, scale: 1, y: 0, duration: 0.62, ease: 'back.out(1.3)' }, '<0.04')
			.to(fx, { hint: 1, duration: 0.22 }, '-=0.12');
	};

	const playOutro = () =>
		new Promise<void>((resolve) => {
			animation?.kill();
			animation = gsap
				.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: resolve })
				.to(fx, { hint: 0, duration: 0.12 })
				.to(fx, { alpha: 0, scale: 1.08, y: -28, duration: 0.3 })
				.to(fx, { backdrop: 0, duration: 0.26 }, '<0.08');
		});

	const confirm = () => {
		if (confirmed) return;
		confirmed = true;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		oncomplete();
	};

	onMount(() => () => animation?.kill());

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => {
			confirmed = false;
			show = true;
			playIntro();
		},
		freeSpinIntroHide: async () => {
			if (!show) return;
			await playOutro();
			show = false;
		},
		freeSpinIntroUpdate: async (emitterEvent) => {
			total = emitterEvent.totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const tapToPlay = $derived(i18nDerived.freeSpinsTapToPlay());
	// The supplied 1448×1086 card is 4:3. Fitting that exact ratio prevents distortion.
	const imgW = $derived(
		Math.min(sizes.width * 0.82, sizes.height * 0.68 * FREE_SPINS_BANNER_ASPECT),
	);
	const imgH = $derived(imgW / FREE_SPINS_BANNER_ASPECT);
	const countY = $derived(imgH * 0.13);
</script>

{#if show}
	<Container zIndex={45}>
		<!-- The board scene underneath is blurred by Game.svelte; this veil gives it the deep abyss tint. -->
		<Rectangle
			{...sizes}
			backgroundColor={0x05080f}
			backgroundAlpha={fx.backdrop}
			eventMode="static"
			cursor="pointer"
			onpointerup={confirm}
		/>
		<Container
			x={sizes.width / 2}
			y={sizes.height / 2 + fx.y}
			scale={fx.scale}
			alpha={fx.alpha}
			eventMode="static"
			cursor="pointer"
			onpointerup={confirm}
		>
			<Sprite
				anchor={0.5}
				key="freeSpinsBanner"
				width={imgW}
				height={imgH}
				eventMode="static"
				cursor="pointer"
				onpointerup={confirm}
			/>
			<!-- Cover the baked number with a dynamic plate: books award different starting totals. -->
			<Graphics
				draw={(g) => {
					g.roundRect(
						-imgW * 0.14,
						countY - imgH * 0.105,
						imgW * 0.28,
						imgH * 0.21,
						imgH * 0.035,
					).fill({
						color: 0x06183d,
						alpha: 0.94,
					});
					g.roundRect(
						-imgW * 0.14,
						countY - imgH * 0.105,
						imgW * 0.28,
						imgH * 0.21,
						imgH * 0.035,
					).stroke({
						width: Math.max(2, imgH * 0.007),
						color: 0x72eaff,
						alpha: 0.9,
					});
				}}
			/>
			<Text
				anchor={0.5}
				y={countY}
				text={`${total}`}
				style={{
					fontFamily: 'Cinzel, Georgia, serif',
					fontWeight: '900',
					fontSize: imgH * 0.16,
					fill: 0xffe6a6,
					stroke: { color: 0x251000, width: Math.max(3, imgH * 0.008) },
					dropShadow: { color: 0x000000, alpha: 0.9, blur: 6, distance: 2 },
				}}
			/>
			<Text
				anchor={0.5}
				y={imgH * 0.62}
				alpha={fx.hint}
				text={tapToPlay}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '800',
					fontSize: imgH * 0.055,
					letterSpacing: imgH * 0.006,
					fill: 0xeafcff,
					stroke: { color: 0x160508, width: 4 },
					dropShadow: { color: 0x000000, alpha: 0.85, blur: 5, distance: 2 },
				}}
			/>
		</Container>
	</Container>
{/if}
