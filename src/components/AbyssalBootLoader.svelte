<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	import { getContext } from '../game/context';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { registerLoaderFonts } from '../game/loaderFonts';

	// Boot splash — the first paint of the app. A studio-style dark-and-white card (zero asset
	// dependencies beyond the provider mark, so it shows instantly): near-black backdrop, the
	// white crescent provider logo breathing in a soft white bloom, one slim white bar tracking
	// the Pixi preload. Its single duty is loading: once every asset is in it hands off
	// (+layout mounts AbyssalLoader underneath via `onhandoff`) and dissolves over it, so the
	// card screen never has to show a bar — it opens straight on "click to continue".
	type Props = {
		onhandoff: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	let visible = $state(true);
	let leaving = false;
	let domArtReady = $state(false);
	let bootElement = $state<HTMLDivElement>();
	let exitAnimation: gsap.core.Timeline | undefined;

	const copy = $derived({
		loading: i18nDerived.loaderLoading(),
	});

	const pixiProgress = $derived(Math.round(context.stateApp.loadingProgress ?? 0));
	const pixiReady = $derived(context.stateApp.loaded || pixiProgress >= 100);
	const ready = $derived(pixiReady && domArtReady);
	// Hold at 99 until the DOM art is also in, so "100%" never sits on screen doing nothing.
	const shown = $derived(ready ? 100 : Math.min(pixiProgress, 99));

	// The white crescent provider mark — same deploy-safe static-literal URL form as
	// game/betModeMeta.ts (resolves to static/assets/ in dev and respects Stake's sub-path).
	const providerLogoUrl = new URL('../../assets/provider_logo.png', import.meta.url).href;

	// Brand name, not copy — it never localizes, so it stays out of i18n.
	const PROVIDER_NAME = 'Celest Studios';

	// The card screen's own art is plain <img>/CSS — not part of the Pixi manifest — so warm
	// the browser cache here and the cards fade in fully painted. A missing file must never
	// gate the game: resolve on error too.
	const loaderArtUrls = [
		new URL('../../assets/background/base.webp', import.meta.url).href,
		new URL('../../assets/bonus/gaze_card.png', import.meta.url).href,
		new URL('../../assets/bonus/eye_card.png', import.meta.url).href,
		new URL('../../assets/bonus/win_card.png', import.meta.url).href,
	];

	const startExit = () => {
		if (leaving || !bootElement) return;
		leaving = true;

		// A short beat at 100% so the bar visibly completes; the card loader mounts at the
		// timeline start (its entrance plays during this dissolve — a real cross-fade).
		exitAnimation = gsap.timeline({
			delay: 0.45,
			onStart: () => props.onhandoff(),
			onComplete: () => (visible = false),
		});
		exitAnimation.to(bootElement, { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' });
		const stage = bootElement.querySelector('.boot-stage');
		if (stage) {
			exitAnimation.to(
				stage,
				{ scale: 1.05, filter: 'blur(6px)', duration: 0.9, ease: 'power2.inOut' },
				0,
			);
		}
	};

	$effect(() => {
		if (ready) startExit();
	});

	onMount(() => {
		registerLoaderFonts();

		Promise.all(
			loaderArtUrls.map(
				(src) =>
					new Promise<void>((resolve) => {
						const image = new Image();
						image.onload = () => resolve();
						image.onerror = () => resolve();
						image.src = src;
					}),
			),
		).then(() => (domArtReady = true));

		if (!bootElement) return;

		const animation = gsap.context(() => {
			gsap.from('.boot-logo', {
				autoAlpha: 0,
				scale: 0.94,
				y: 14,
				duration: 0.9,
				ease: 'power2.out',
			});
			gsap.from('.boot-name', {
				autoAlpha: 0,
				y: 10,
				duration: 0.7,
				ease: 'power2.out',
				delay: 0.25,
			});
			gsap.from('.boot-gate', {
				autoAlpha: 0,
				y: 12,
				duration: 0.6,
				ease: 'power2.out',
				delay: 0.35,
			});
		}, bootElement);

		return () => {
			animation.revert();
			exitAnimation?.kill();
		};
	});
</script>

{#if visible}
	<div bind:this={bootElement} class="abyssal-boot" aria-busy="true" aria-label={copy.loading}>
		<div class="backdrop" aria-hidden="true"></div>
		<div class="glow" aria-hidden="true"></div>

		<div class="boot-stage">
			<div class="boot-brand">
				<img class="boot-logo" src={providerLogoUrl} alt="" draggable="false" />
				<span class="boot-name">{PROVIDER_NAME}</span>
			</div>
			<div class="boot-gate">
				<div class="progress">
					<div class="progress-fill" style={`width: ${shown}%`}></div>
				</div>
				<span class="loading-label">{copy.loading} {shown}%</span>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.abyssal-boot {
		position: fixed;
		inset: 0;
		z-index: 1100; // above AbyssalLoader (1000) — it dissolves to reveal it
		display: grid;
		place-items: center;
		overflow: hidden;
		background: #030305;
		color: #ffffff;
		font-family: Arial, sans-serif;
		user-select: none;
	}
	.backdrop,
	.glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	// Near-black, faintly lifted at centre so the black never reads as a dead screen.
	.backdrop {
		background:
			radial-gradient(ellipse 80% 60% at 50% 42%, rgba(255, 255, 255, 0.05), transparent 70%),
			linear-gradient(to bottom, #060608 0%, #030305 55%, #010102 100%);
	}
	// One soft white bloom breathing behind the mark — light, not hardware.
	.glow {
		background: radial-gradient(
			ellipse 34% 30% at 50% 42%,
			rgba(255, 255, 255, 0.1),
			transparent 70%
		);
		animation: glow-breathe 3.2s ease-in-out infinite alternate;
	}

	.boot-stage {
		position: relative;
		display: grid;
		justify-items: center;
		gap: clamp(26px, 5vh, 54px);
	}
	.boot-brand {
		display: grid;
		justify-items: center;
		gap: clamp(14px, 2.6vh, 26px);
	}
	.boot-logo {
		height: clamp(140px, 30vh, 260px);
		width: auto;
		filter: drop-shadow(0 0 26px rgba(255, 255, 255, 0.18)) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.85));
		animation: logo-breathe 3.2s ease-in-out infinite alternate;
	}
	.boot-name {
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-weight: 800;
		font-size: clamp(18px, 2.2vw, 34px);
		letter-spacing: 0.34em;
		margin-right: -0.34em; // recentre: tracking adds a trailing space after the last glyph
		text-transform: uppercase;
		white-space: nowrap;
		color: #ffffff;
		text-shadow:
			0 0 18px rgba(255, 255, 255, 0.28),
			0 2px 6px rgba(0, 0, 0, 0.9);
	}

	// Same slim glass-track grammar as before, in white.
	.boot-gate {
		display: grid;
		justify-items: center;
		gap: 12px;
		width: min(60vw, 380px);
	}
	.progress {
		position: relative;
		width: 100%;
		height: clamp(5px, 0.55vw, 8px);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		box-shadow:
			inset 0 1px 2px rgba(0, 0, 0, 0.7),
			0 0 0 1px rgba(255, 255, 255, 0.07);
	}
	.progress-fill {
		position: relative;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.65), #ffffff 60%, #ffffff);
		box-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
		transition: width 0.25s ease-out;
		// a soft luminous tip rides the head of the fill — light, not hardware
		&::after {
			content: '';
			position: absolute;
			top: 50%;
			right: 0;
			width: clamp(12px, 1.3vw, 18px);
			height: clamp(12px, 1.3vw, 18px);
			transform: translate(50%, -50%);
			border-radius: 50%;
			background: radial-gradient(
				circle,
				#ffffff 0%,
				rgba(255, 255, 255, 0.85) 38%,
				rgba(255, 255, 255, 0) 72%
			);
			animation: tip-breathe 1.4s ease-in-out infinite alternate;
		}
	}
	.loading-label {
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-weight: 700;
		font-size: clamp(10px, 1vw, 17px);
		letter-spacing: 0.26em;
		color: rgba(255, 255, 255, 0.85);
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}

	@keyframes glow-breathe {
		from {
			opacity: 0.55;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes logo-breathe {
		from {
			filter: drop-shadow(0 0 18px rgba(255, 255, 255, 0.12))
				drop-shadow(0 6px 14px rgba(0, 0, 0, 0.85));
		}
		to {
			filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.26))
				drop-shadow(0 6px 14px rgba(0, 0, 0, 0.85));
		}
	}
	@keyframes tip-breathe {
		from {
			opacity: 0.75;
			scale: 0.85;
		}
		to {
			opacity: 1;
			scale: 1.15;
		}
	}

	// Portrait (Mobile S/M/L): the mark and bar just run to the width.
	@media (max-aspect-ratio: 1 / 1) {
		.boot-logo {
			height: clamp(110px, 24vh, 200px);
			max-width: 70vw;
			object-fit: contain;
		}
		.boot-name {
			font-size: clamp(15px, 4.6vw, 24px);
		}
		.boot-gate {
			width: 74vw;
		}
		.progress {
			height: clamp(6px, 1.6vw, 9px);
		}
		.loading-label {
			font-size: clamp(11px, 3.2vw, 18px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
		}
	}
</style>
