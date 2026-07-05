<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import gsap from 'gsap';

	import AbyssalPixiLogo from './AbyssalPixiLogo.svelte';
	import { getContext } from '../game/context';
	import { i18nDerived } from '../i18n/i18nDerived';

	// Hacksaw-style start screen: the logo is the hero, the feature copy plays as a carousel —
	// one info slide at a time on a full-width white-glass band, auto-advancing with manual
	// arrows — and the gate is a chunky gold slider that gives way to the CTA when the preload
	// completes. Responsiveness is pure CSS against the Stake device matrix (STAKE_TEST_DEVICES
	// in game/constants.ts) — the band works at every size, only type/icon scales change.
	const context = getContext();

	let visible = $state(true);
	let leaving = $state(false);
	let loaderElement = $state<HTMLDivElement>();
	let exitAnimation: gsap.core.Timeline | undefined;
	let activeCard = $state(0);
	let cardTimer: number | undefined;

	const progress = $derived(Math.round(context.stateApp.loadingProgress ?? 0));
	const ready = $derived(context.stateApp.loaded || progress >= 100);
	const copy = $derived({
		logo: i18nDerived.loaderLogo(),
		cta: i18nDerived.loaderCta(),
		loading: i18nDerived.loaderLoading(),
		previousCard: i18nDerived.loaderPreviousCard(),
		nextCard: i18nDerived.loaderNextCard(),
		card1Title: i18nDerived.loaderCard1Title(),
		card1Body: i18nDerived.loaderCard1Body(),
		card2Title: i18nDerived.loaderCard2Title(),
		card2Body: i18nDerived.loaderCard2Body(),
		card3Title: i18nDerived.loaderCard3Title(),
		card3Body: i18nDerived.loaderCard3Body(),
	});

	// Asset URLs resolve through `new URL('<static literal>', import.meta.url)` so they survive
	// Stake's sub-path deploy and file:// (a root-absolute `/assets/...` would 403). Keep each
	// argument a static literal — that's the form Vite leaves as a runtime resolve. Same form as
	// game/assets.ts.
	const backgroundUrl = new URL('../../assets/background/base.webp', import.meta.url).href;
	const cinzelFontUrl = new URL(
		'../../assets/fonts/Cinzel/Cinzel-VariableFont_wght.ttf',
		import.meta.url,
	).href;

	const cards = $derived([
		{
			art: new URL('../../assets/bonus/gaze_card.png', import.meta.url).href,
			title: copy.card1Title,
			body: copy.card1Body,
		},
		{
			art: new URL('../../assets/bonus/eye_card.png', import.meta.url).href,
			title: copy.card2Title,
			body: copy.card2Body,
		},
		{
			art: new URL('../../assets/bonus/win_card.png', import.meta.url).href,
			title: copy.card3Title,
			body: copy.card3Body,
		},
	]);

	// Auto-advance every few seconds; a manual arrow press restarts the clock so the next
	// automatic switch doesn't land right after the click.
	const startCardTimer = () => {
		window.clearInterval(cardTimer);
		cardTimer = window.setInterval(() => {
			if (!leaving) activeCard = (activeCard + 1) % 3;
		}, 5000);
	};
	const goToCard = (index: number) => {
		activeCard = (index + 3) % 3;
		startCardTimer();
	};

	const enter = async () => {
		if (!ready || !visible || leaving || !loaderElement) return;
		leaving = true;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });

		// Mount the slots underneath first — the water wall lives in the Pixi scene.
		context.stateLayout.showLoadingScreen = false;
		await tick();
		if (!loaderElement) return;

		// Camera pull-focus: the game starts soft (blurred, a touch zoomed and bright) behind
		// the dissolving loader, then racks into sharp focus like a lens settling on the reels.
		// The canvas styles are cleared at the end so the game is left untouched.
		const canvas = document.querySelector('canvas');
		if (canvas) {
			gsap.fromTo(
				canvas,
				{ filter: 'blur(16px) brightness(1.18)', scale: 1.07, transformOrigin: '50% 50%' },
				{
					filter: 'blur(0px) brightness(1)',
					scale: 1,
					duration: 1.3,
					ease: 'power2.out',
					clearProps: 'filter,transform',
				},
			);
		}

		exitAnimation = gsap.timeline({ onComplete: () => (visible = false) });
		exitAnimation.to(loaderElement, { autoAlpha: 0, duration: 0.75, ease: 'power2.inOut' });
		const stage = loaderElement.querySelector('.loader-stage');
		if (stage) {
			exitAnimation.to(
				stage,
				{ scale: 1.04, filter: 'blur(5px)', duration: 0.75, ease: 'power2.inOut' },
				0,
			);
		}
	};

	const onKey = (event: KeyboardEvent) => {
		if (event.target instanceof HTMLButtonElement) return;
		if (event.code === 'Space' || event.code === 'Enter') enter();
	};

	onMount(() => {
		// @font-face can't read a JS-resolved URL, so register Cinzel at runtime from the
		// deploy-safe asset URL. Harmless if it fails — text falls back to Georgia/serif.
		// Register under BOTH names: 'Abyssal Cinzel' for this loader's DOM, and 'Cinzel' for the
		// in-game Pixi canvas (the family the Eye / Gaze / Win labels reference). Without the
		// 'Cinzel' registration those canvas labels silently render as Georgia. `weight: '400 900'`
		// exposes the variable font's full weight range so the 800/900 requests render bold.
		// (The branded display type is the AbyssalBitmap bitmap font, loaded as a Pixi asset in
		// game/assets.ts — DOM FontFace registration doesn't apply to it.)
		if (typeof FontFace !== 'undefined') {
			for (const [family, url] of [
				['Abyssal Cinzel', cinzelFontUrl],
				['Cinzel', cinzelFontUrl],
			] as const) {
				const face = new FontFace(family, `url(${url}) format('truetype')`, {
					display: 'swap',
					weight: '400 900',
				});
				face
					.load()
					.then((loaded) => document.fonts.add(loaded))
					.catch(() => {});
			}
		}

		startCardTimer();

		if (!loaderElement) {
			return () => window.clearInterval(cardTimer);
		}

		const animation = gsap.context(() => {
			gsap.from('.loader-header', {
				autoAlpha: 0,
				y: -26,
				duration: 0.6,
				ease: 'power2.out',
			});
			gsap.from('.info-card', {
				autoAlpha: 0,
				y: 22,
				duration: 0.5,
				stagger: 0.12,
				ease: 'back.out(1.4)',
				delay: 0.3,
			});
			gsap.from('.carousel', {
				autoAlpha: 0,
				y: 18,
				duration: 0.5,
				ease: 'power2.out',
				delay: 0.3,
			});
			gsap.from('.loader-gate', {
				autoAlpha: 0,
				y: 16,
				duration: 0.4,
				ease: 'power2.out',
				delay: 0.65,
			});
		}, loaderElement);

		return () => {
			window.clearInterval(cardTimer);
			animation.revert();
			exitAnimation?.kill();
		};
	});
</script>

<svelte:window onkeydown={onKey} />

{#if visible}
	<div
		bind:this={loaderElement}
		class="abyssal-loader"
		class:ready
		class:leaving
		role="button"
		tabindex="0"
		aria-label={ready ? copy.cta : copy.loading}
		onclick={() => enter()}
		onkeydown={onKey}
	>
		<!-- atmosphere fills the WHOLE viewport (it used to live inside the aspect-locked stage,
		     which left bare bars on screens wider/squarer than 16:9); the UI stays framed in
		     the stage below -->
		<div
			class="background"
			aria-hidden="true"
			style={`background-image: url(${backgroundUrl})`}
		></div>
		<div class="vignette" aria-hidden="true"></div>
		<div class="light-rays" aria-hidden="true"></div>
		<div class="bubbles" aria-hidden="true">
			{#each Array.from({ length: 28 }) as _, index}
				<i style={`--i: ${index}`}></i>
			{/each}
		</div>

		<div class="loader-stage">
			<header class="loader-header">
				<AbyssalPixiLogo title={copy.logo} />
			</header>

			<!-- Desktop / laptop: the three info cards side by side (no carousel machinery).
			     Hidden on popouts and mobile, where the carousel below takes over. -->
			<div class="cards-grid">
				{#each cards as card}
					<article class="info-card">
						<img class="card-icon" src={card.art} alt="" />
						<h2>{card.title}</h2>
						<p>{card.body}</p>
					</article>
				{/each}
			</div>

			<!-- Popouts / mobile: one info slide at a time, auto-advancing, arrows for manual
			     browsing. Arrow clicks stop propagation so they never trigger the click-anywhere
			     enter. Hidden on desktop/laptop where the grid above shows instead. -->
			<div class="carousel" aria-live="polite">
				<button
					class="carousel-arrow previous"
					type="button"
					aria-label={copy.previousCard}
					onclick={(event) => {
						event.stopPropagation();
						goToCard(activeCard - 1);
					}}
				>
					‹
				</button>
				{#key activeCard}
					<div class="slide" in:fade={{ duration: 420 }} out:fade={{ duration: 240 }}>
						<img class="slide-icon" src={cards[activeCard].art} alt="" />
						<div class="slide-text">
							<h2>{cards[activeCard].title}</h2>
							<p>{cards[activeCard].body}</p>
						</div>
					</div>
				{/key}
				<button
					class="carousel-arrow next"
					type="button"
					aria-label={copy.nextCard}
					onclick={(event) => {
						event.stopPropagation();
						goToCard(activeCard + 1);
					}}
				>
					›
				</button>
				<div class="carousel-dots" aria-hidden="true">
					{#each cards as _, index}
						<i class:active={index === activeCard}></i>
					{/each}
				</div>
			</div>

			<div class="loader-gate">
				{#if ready}
					<span class="cta">{copy.cta}</span>
				{:else}
					<div class="progress">
						<div class="progress-fill" style={`width: ${progress}%`}></div>
					</div>
					<span class="loading-label">{copy.loading} {progress}%</span>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.abyssal-loader {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: #010313;
		color: #fff2ff;
		font-family: Arial, sans-serif;
		user-select: none;
		&.ready {
			cursor: pointer;
		}
		&.leaving {
			pointer-events: none;
		}
	}
	.loader-stage {
		position: relative;
		width: min(100vw, 177.683svh);
		aspect-ratio: 1672 / 941;
		overflow: hidden;
		isolation: isolate;
	}
	.background,
	.vignette,
	.light-rays,
	.bubbles {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.background {
		// background-image is set inline (JS-resolved, deploy-safe URL); keep framing here.
		background-position: center;
		background-size: cover;
		background-repeat: no-repeat;
		transform: scale(1.025);
		animation: background-breathe 9s ease-in-out infinite alternate;
	}
	.vignette {
		// A touch deeper at the bottom than before: the gate needs the contrast.
		background:
			radial-gradient(
				ellipse at center,
				transparent 30%,
				rgba(0, 0, 12, 0.3) 68%,
				rgba(0, 0, 9, 0.82) 100%
			),
			linear-gradient(to bottom, transparent 58%, rgba(1, 2, 14, 0.62) 92%);
	}
	.light-rays {
		background:
			linear-gradient(113deg, transparent 34%, rgba(26, 194, 255, 0.1) 43%, transparent 51%),
			linear-gradient(68deg, transparent 56%, rgba(123, 44, 255, 0.08) 64%, transparent 72%);
		mix-blend-mode: screen;
		animation: rays 3s ease-in-out infinite alternate;
	}
	.bubbles i {
		position: absolute;
		left: calc(var(--i) * 3.7%);
		top: 104%;
		width: calc(3px + var(--i) * 0.2px);
		height: calc(3px + var(--i) * 0.2px);
		border: 1px solid rgba(117, 238, 255, 0.45);
		border-radius: 50%;
		box-shadow:
			inset 1px 1px 2px rgba(255, 255, 255, 0.5),
			0 0 8px rgba(71, 233, 255, 0.22);
		animation: bubble calc(5s + var(--i) * 0.12s) linear infinite;
		animation-delay: calc(var(--i) * -0.55s);
	}

	// --- Hero logo -------------------------------------------------------------------------
	.loader-header {
		position: absolute;
		top: 6%;
		left: 50%;
		transform: translateX(-50%);
		width: 40%;
		height: 20%;
		filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.85));
	}

	// --- Desktop/laptop: three full-art "Dark Frost" cards side by side -----------------------
	// Hidden by default (mobile-first); the wide-landscape media query below swaps it in for
	// the carousel. The artwork fills each card (un-zoomed `contain` on a dark backing) and the
	// bottom half is blurred + darkened over the art so the text always reads.
	.cards-grid {
		position: absolute;
		top: 34%;
		left: 50%;
		transform: translateX(-50%);
		display: none; // shown on desktop/laptop via the media query below
		justify-content: center;
		gap: clamp(14px, 1.8vw, 30px);
		width: min(86%, 1280px);
		height: 38%;
	}
	.info-card {
		position: relative;
		overflow: hidden;
		flex: 1 1 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: clamp(8px, 1vw, 16px);
		padding: clamp(12px, 1.5vw, 28px) clamp(10px, 1.2vw, 22px);
		border: 1px solid rgba(255, 255, 255, 0.36);
		border-radius: clamp(12px, 1.4vw, 24px);
		box-shadow:
			0 12px 32px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(255, 255, 255, 0.28),
			inset 0 -1px 0 rgba(255, 255, 255, 0.12);
		text-align: center;
		// idle bob (the `translate` property, so it never fights the hover scale)
		animation: card-float 6.5s ease-in-out infinite;
		transition:
			scale 0.25s ease,
			border-color 0.25s ease,
			box-shadow 0.25s ease;
		// a light sheen sweeps across each card every few seconds
		&::before {
			content: '';
			position: absolute;
			top: -40%;
			bottom: -40%;
			left: 0;
			width: 42%;
			z-index: 0;
			background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.16), transparent);
			transform: rotate(12deg) translateX(-240%);
			animation: card-sheen 7.5s ease-in-out infinite;
			pointer-events: none;
		}
		// desynchronise the ambient motion between the three cards
		&:nth-child(2) {
			animation-delay: -2.2s;
			&::before {
				animation-delay: 0.9s;
			}
			.card-icon {
				animation-delay: -3.1s;
			}
		}
		&:nth-child(3) {
			animation-delay: -4.4s;
			&::before {
				animation-delay: 1.8s;
			}
			.card-icon {
				animation-delay: -6.2s;
			}
		}
		// hover: lift + gold rim + brighter art
		&:hover {
			scale: 1.025;
			border-color: rgba(255, 215, 106, 0.6);
			box-shadow:
				0 22px 44px rgba(0, 0, 0, 0.65),
				0 0 26px rgba(255, 215, 106, 0.2),
				inset 0 1px 0 rgba(255, 255, 255, 0.32),
				inset 0 -1px 0 rgba(255, 255, 255, 0.12);
			.card-icon {
				filter: saturate(1.18) brightness(1.06);
			}
		}
		// Dark Frost: the bottom half is blurred + darkened over the art, feathered at its top
		// edge so it never cuts a hard line across the artwork.
		&::after {
			content: '';
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
			height: 54%;
			z-index: 0;
			background: linear-gradient(to bottom, rgba(4, 8, 24, 0.25), rgba(3, 6, 20, 0.8));
			backdrop-filter: blur(14px) brightness(0.85) saturate(1.1);
			mask-image: linear-gradient(to bottom, transparent, #000 26%);
			pointer-events: none;
		}
		h2 {
			position: relative;
			z-index: 1;
			margin: 0;
			font-family: 'Abyssal Cinzel', Georgia, serif;
			font-weight: 800;
			font-size: clamp(13px, 1.5vw, 27px);
			letter-spacing: 0.14em;
			color: #ffd76a;
			text-shadow:
				0 2px 8px #000,
				0 0 14px rgba(0, 0, 0, 0.8);
		}
		p {
			position: relative;
			z-index: 1;
			margin: 0;
			white-space: pre-line;
			font-size: clamp(11px, 1.15vw, 20px);
			line-height: 1.4;
			color: rgba(242, 248, 255, 0.96);
			text-shadow: 0 2px 5px #000;
		}
	}
	.card-icon {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		// full-bleed: fill the card edge to edge (centre-crop the overflow, never stretch)
		object-fit: cover;
		object-position: center;
		filter: saturate(1.05);
		transition: filter 0.3s ease;
		// slow Ken-Burns drift so the full-art cards never read as frozen stills
		animation: card-kenburns 11s ease-in-out infinite alternate;
	}
	// Desktop (1200×675) and Laptop (1024×576): grid in, carousel out. Popout L (800×450),
	// Popout S (400×225) and portrait mobiles fail the width/height gate and keep the carousel.
	@media (min-width: 950px) and (min-height: 500px) and (orientation: landscape) {
		.cards-grid {
			display: flex;
		}
		.carousel {
			display: none;
		}
	}

	// --- Feature carousel: one full-art "Dark Frost" slide at a time (popouts / mobile) -------
	.carousel {
		position: absolute;
		top: 38%;
		left: 50%;
		transform: translateX(-50%);
		width: min(54%, 800px);
		height: 30%;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.36);
		border-radius: clamp(14px, 1.6vw, 26px);
		box-shadow:
			0 12px 32px rgba(0, 0, 0, 0.55),
			0 -6px 18px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.28),
			inset 0 -1px 0 rgba(255, 255, 255, 0.12);
	}
	.slide {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: clamp(4px, 0.6vw, 10px);
		padding: 4% 14% 9%;
		text-align: center;
		// same Dark Frost as the grid cards
		&::after {
			content: '';
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
			height: 58%;
			z-index: 0;
			background: linear-gradient(to bottom, rgba(4, 8, 24, 0.25), rgba(3, 6, 20, 0.8));
			backdrop-filter: blur(14px) brightness(0.85) saturate(1.1);
			mask-image: linear-gradient(to bottom, transparent, #000 26%);
			pointer-events: none;
		}
	}
	.slide-icon {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		// full-bleed: fill the panel edge to edge (centre-crop the overflow, never stretch)
		object-fit: cover;
		object-position: center;
		filter: saturate(1.05);
	}
	.slide-text {
		position: relative;
		z-index: 1;
		min-width: 0;
		h2 {
			margin: 0 0 0.25em;
			font-family: 'Abyssal Cinzel', Georgia, serif;
			font-weight: 800;
			font-size: clamp(17px, 2.1vw, 38px);
			letter-spacing: 0.14em;
			color: #ffd76a;
			text-shadow:
				0 2px 8px #000,
				0 0 14px rgba(0, 0, 0, 0.8);
		}
		p {
			margin: 0;
			white-space: pre-line;
			font-size: clamp(14px, 1.7vw, 30px);
			line-height: 1.38;
			color: rgba(242, 248, 255, 0.96);
			text-shadow: 0 2px 5px #000;
		}
	}
	.carousel-arrow {
		position: absolute;
		z-index: 2;
		top: 50%;
		transform: translateY(-50%);
		width: clamp(30px, 3.2vw, 54px);
		height: clamp(42px, 4.6vw, 78px);
		padding: 0;
		border: 1px solid rgba(255, 255, 255, 0.55);
		border-radius: 999px;
		background: rgba(7, 11, 38, 0.6);
		box-shadow:
			0 0 14px rgba(255, 255, 255, 0.18),
			0 6px 14px rgba(0, 0, 0, 0.5);
		color: #ffffff;
		font-family: Arial, sans-serif;
		font-size: clamp(22px, 2.6vw, 44px);
		line-height: 1;
		cursor: pointer;
		transition:
			background 0.18s ease,
			box-shadow 0.18s ease;
		&:hover {
			background: rgba(16, 26, 66, 0.8);
			box-shadow:
				0 0 20px rgba(255, 255, 255, 0.3),
				0 6px 16px rgba(0, 0, 0, 0.55);
		}
	}
	.carousel-arrow.previous {
		left: 2.5%;
	}
	.carousel-arrow.next {
		right: 2.5%;
	}
	.carousel-dots {
		position: absolute;
		z-index: 2;
		bottom: 4%;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 10px;
		i {
			width: clamp(6px, 0.6vw, 10px);
			height: clamp(6px, 0.6vw, 10px);
			border-radius: 50%;
			background: rgba(255, 255, 255, 0.32);
			transition:
				background 0.3s ease,
				transform 0.3s ease;
			&.active {
				background: #ffd76a;
				transform: scale(1.3);
			}
		}
	}

	// --- Gate: slider-style progress bar → CTA -------------------------------------------------
	.loader-gate {
		position: absolute;
		left: 50%;
		top: 78.5%;
		transform: translateX(-50%);
		width: min(32%, 500px);
		display: grid;
		justify-items: center;
		gap: 12px;
	}
	.progress {
		// Clean and slim: a hairline glass track — the fill and its light do the talking.
		position: relative;
		width: 100%;
		height: clamp(5px, 0.55vw, 8px);
		border-radius: 999px;
		background: rgba(4, 10, 26, 0.72);
		box-shadow:
			inset 0 1px 2px rgba(0, 0, 0, 0.7),
			0 0 0 1px rgba(255, 255, 255, 0.07);
	}
	.progress-fill {
		position: relative;
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #b8860b, #ffd76a 60%, #ffedb0);
		box-shadow: 0 0 10px rgba(255, 215, 106, 0.45);
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
				#fff8dc 0%,
				rgba(255, 215, 106, 0.9) 38%,
				rgba(255, 215, 106, 0) 72%
			);
			animation: tip-breathe 1.4s ease-in-out infinite alternate;
		}
	}
	.loading-label {
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-weight: 700;
		font-size: clamp(9px, 1vw, 17px);
		letter-spacing: 0.26em;
		color: #cfe8ff;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
	}
	.cta {
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-weight: 800;
		font-size: clamp(13px, 1.6vw, 28px);
		letter-spacing: 0.24em;
		color: #ffe9b0;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.9);
		animation: cta-pulse 0.95s ease-in-out infinite alternate;
		white-space: nowrap;
	}

	@keyframes background-breathe {
		to {
			transform: scale(1.06) translateY(-0.6%);
		}
	}
	@keyframes rays {
		to {
			opacity: 0.42;
			transform: translateX(2%);
		}
	}
	@keyframes bubble {
		to {
			transform: translate(5px, -120%);
			opacity: 0.1;
		}
	}
	@keyframes cta-pulse {
		to {
			opacity: 0.62;
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
	@keyframes card-float {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0 -5px;
		}
	}
	@keyframes card-sheen {
		0%,
		58% {
			transform: rotate(12deg) translateX(-240%);
		}
		88%,
		100% {
			transform: rotate(12deg) translateX(340%);
		}
	}
	@keyframes card-kenburns {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(1.04);
		}
	}

	// --- Portrait (Mobile S 320×568 / M 375×667 / L 425×812): stacked card rows ----------------
	// Icon left, copy right — three rows always fit without scrolling or a carousel.
	@media (max-aspect-ratio: 1 / 1) {
		.loader-stage {
			width: 100vw;
			height: 100svh;
			aspect-ratio: auto;
		}
		.loader-header {
			top: 4%;
			width: 72%;
			height: 12%;
		}
		.carousel {
			top: 34%;
			width: 88%;
			height: 30%;
		}
		.slide {
			padding: 5% 12% 12%;
		}
		.slide-text {
			h2 {
				font-size: clamp(16px, 5vw, 25px);
			}
			p {
				font-size: clamp(13px, 4vw, 20px);
				line-height: 1.3;
			}
		}
		.carousel-arrow {
			width: clamp(28px, 8vw, 40px);
			height: clamp(40px, 11vw, 58px);
			font-size: clamp(20px, 6vw, 32px);
		}
		.loader-gate {
			top: auto;
			bottom: 8%;
			width: 76%;
		}
		.progress {
			height: clamp(6px, 1.6vw, 9px);
		}
		.progress-fill::after {
			width: clamp(14px, 3.6vw, 20px);
			height: clamp(14px, 3.6vw, 20px);
		}
		.loading-label {
			font-size: clamp(11px, 3.2vw, 18px);
		}
		.cta {
			font-size: clamp(14px, 4.2vw, 22px);
		}
	}
	// --- Popout S (400×225), the smallest landscape target: the band just runs smaller ---------
	@media (max-height: 450px) and (orientation: landscape) {
		.loader-header {
			top: 6%;
			height: 20%;
		}
		.carousel {
			top: 34%;
			width: 64%;
			height: 38%;
		}
		.slide {
			padding: 4% 14% 10%;
		}
		.slide-text {
			h2 {
				font-size: clamp(11px, 2.9vw, 19px);
			}
			p {
				font-size: clamp(10px, 2.4vw, 15px);
				line-height: 1.25;
			}
		}
		.carousel-arrow {
			width: clamp(22px, 5.5vw, 34px);
			height: clamp(32px, 8vw, 46px);
			font-size: clamp(16px, 4.4vw, 26px);
		}
		.loader-gate {
			top: 76%;
			width: 44%;
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
