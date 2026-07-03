<script lang="ts" module>
	export type EmitterEventFreeSpinRetrigger = {
		type: 'freeSpinRetriggerShow';
		totalFreeSpins: number;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { waitForResolve } from 'utils-shared/wait';

	import { getContext } from '../game/context';
	import { FREE_SPINS_BANNER_ASPECT } from '../game/constants';
	import { i18nDerived } from '../i18n/i18nDerived';

	const DISPLAY_MS = 2200;
	const context = getContext();

	let show = $state(false);
	let dismissing = $state(false);
	let oncomplete = $state(() => {});
	let timeoutId = $state<ReturnType<typeof setTimeout>>();
	let animation = $state<gsap.core.Timeline>();
	let fx = $state({ backdrop: 0, alpha: 0, scale: 0.74, y: 52, hint: 0 });

	const playIntro = () => {
		animation?.kill();
		Object.assign(fx, { backdrop: 0, alpha: 0, scale: 0.74, y: 52, hint: 0 });
		animation = gsap
			.timeline({ defaults: { ease: 'power2.out' } })
			.to(fx, { backdrop: 0.78, duration: 0.22 })
			.to(fx, { alpha: 1, scale: 1, y: 0, duration: 0.52, ease: 'back.out(1.45)' }, '<0.03')
			.to(fx, { hint: 1, duration: 0.18 }, '-=0.06');
	};

	const playOutro = () =>
		new Promise<void>((resolve) => {
			animation?.kill();
			animation = gsap
				.timeline({ defaults: { ease: 'power2.inOut' }, onComplete: resolve })
				.to(fx, { hint: 0, duration: 0.1 })
				.to(fx, { alpha: 0, scale: 1.06, y: -20, duration: 0.32 })
				.to(fx, { backdrop: 0, duration: 0.22 }, '<0.08');
		});

	const finish = () => {
		if (!show || dismissing) return;
		dismissing = true;
		if (timeoutId) clearTimeout(timeoutId);
		void playOutro().then(() => {
			show = false;
			dismissing = false;
			oncomplete();
		});
	};

	onMount(() => () => {
		animation?.kill();
		if (timeoutId) clearTimeout(timeoutId);
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinRetriggerShow: async () => {
			dismissing = false;
			show = true;
			playIntro();
			await waitForResolve((resolve) => {
				oncomplete = resolve;
				timeoutId = setTimeout(finish, DISPLAY_MS);
			});
		},
	});

	const sizes = $derived(context.stateLayoutDerived.canvasSizes());
	const tapToSkip = $derived(i18nDerived.freeSpinsTapToSkip());
	const imgW = $derived(
		Math.min(sizes.width * 0.76, sizes.height * 0.67 * FREE_SPINS_BANNER_ASPECT),
	);
	const imgH = $derived(imgW / FREE_SPINS_BANNER_ASPECT);
</script>

{#if show}
	<Container zIndex={46}>
		<Rectangle
			{...sizes}
			backgroundColor={0x030817}
			backgroundAlpha={fx.backdrop}
			eventMode="static"
			cursor="pointer"
			onpointerup={finish}
		/>
		<Container
			x={sizes.width / 2}
			y={sizes.height / 2 + fx.y}
			scale={fx.scale}
			alpha={fx.alpha}
			eventMode="static"
			cursor="pointer"
			onpointerup={finish}
		>
			<Sprite anchor={0.5} key="freeSpinsRetrigger" width={imgW} height={imgH} />
			<Text
				anchor={0.5}
				y={imgH * 0.58}
				alpha={fx.hint}
				text={tapToSkip}
				style={{
					fontFamily: 'Arial, Helvetica, sans-serif',
					fontWeight: '900',
					fontSize: imgH * 0.044,
					letterSpacing: imgH * 0.006,
					fill: 0xeafcff,
					stroke: { color: 0x080014, width: Math.max(2, imgH * 0.005) },
					dropShadow: { color: 0x000000, alpha: 0.9, blur: 5, distance: 2 },
				}}
			/>
		</Container>
	</Container>
{/if}
