<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { FONT } from './controls/theme';

	// Free-spins intro: shows the freespins banner (the awarded count is baked into the art) and
	// waits for a click before the bonus plays (freeSpinTrigger awaits freeSpinIntroUpdate, so
	// resolving on press unblocks the book sequence → the dive transition → free spins).
	const context = getContext();

	let show = $state(false);
	let oncomplete = $state(() => {});
	let confirmed = $state(false);
	let animation = $state<gsap.core.Timeline>();
	let idleTl = $state<gsap.core.Timeline>();
	let fx = $state({ backdrop: 0, alpha: 0, scale: 0.82, y: 48, hint: 0 });
	const idle = $state({ breathe: 1, glow: 0 });

	const playIntro = () => {
		animation?.kill();
		idleTl?.kill();
		Object.assign(fx, { backdrop: 0, alpha: 0, scale: 0.82, y: 48, hint: 0 });
		Object.assign(idle, { breathe: 1, glow: 0 });
		animation = gsap
			.timeline({ defaults: { ease: 'power2.out' } })
			.to(fx, { backdrop: 0.72, duration: 0.28 })
			.to(fx, { alpha: 1, scale: 1, y: 0, duration: 0.62, ease: 'back.out(1.3)' }, '<0.04')
			.to(fx, { hint: 1, duration: 0.22 }, '-=0.12');
		// waiting screens should never freeze: gentle breathe + glow pulse while awaiting the tap
		idleTl = gsap
			.timeline({ repeat: -1, yoyo: true, delay: 1.1 })
			.to(idle, { breathe: 1.012, glow: 1, duration: 1.4, ease: 'sine.inOut' });
	};

	const playOutro = () =>
		new Promise<void>((resolve) => {
			animation?.kill();
			idleTl?.kill();
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

	onMount(() => () => {
		animation?.kill();
		idleTl?.kill();
	});

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
		freeSpinIntroUpdate: async () => {
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const tapToPlay = $derived(i18nDerived.freeSpinsTapToPlay());
	// The supplied 1408x768 card is wide. Fitting that exact ratio prevents distortion.
	const imageAspect = 1408 / 768;
	const imgW = $derived(Math.min(sizes.width * 0.88, sizes.height * 0.72 * imageAspect));
	const imgH = $derived(imgW / imageAspect);
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
			scale={fx.scale * idle.breathe}
			alpha={fx.alpha}
			eventMode="static"
			cursor="pointer"
			onpointerup={confirm}
		>
			<Sprite
				anchor={0.5}
				key="freeSpinIntro"
				width={imgW}
				height={imgH}
				eventMode="static"
				cursor="pointer"
				onpointerup={confirm}
			/>
			<!-- idle glow pulse so the waiting card never freezes -->
			{#if idle.glow > 0}
				<Sprite
					anchor={0.5}
					key="freeSpinIntro"
					width={imgW}
					height={imgH}
					alpha={idle.glow * 0.14}
					tint={0xffd27a}
					blendMode="add"
				/>
			{/if}
			<Text
				anchor={0.5}
				y={imgH * 0.49}
				alpha={fx.hint}
				text={tapToPlay}
				style={{
					fontFamily: FONT,
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
