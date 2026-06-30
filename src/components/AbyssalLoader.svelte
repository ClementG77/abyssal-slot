<script lang="ts">
	import { onMount, tick } from 'svelte';
	import gsap from 'gsap';

	import AbyssalPixiLogo from './AbyssalPixiLogo.svelte';
	import { getContext } from '../game/context';
	import { i18nDerived } from '../i18n/i18nDerived';

	const context = getContext();

	let visible = $state(true);
	let leaving = $state(false);
	let loaderElement = $state<HTMLDivElement>();
	let cardsElement = $state<HTMLDivElement>();
	let exitAnimation: gsap.core.Timeline | undefined;
	let pointerStart: { x: number; y: number } | undefined;
	let didDragCards = false;
	let activeCard = $state(0);

	const progress = $derived(Math.round(context.stateApp.loadingProgress ?? 0));
	const ready = $derived(context.stateApp.loaded || progress >= 100);
	const copy = $derived({
		logo: i18nDerived.loaderLogo(),
		card1Title: i18nDerived.loaderCard1Title(),
		card1Body: i18nDerived.loaderCard1Body(),
		card2Title: i18nDerived.loaderCard2Title(),
		card2Body: i18nDerived.loaderCard2Body(),
		card3Title: i18nDerived.loaderCard3Title(),
		card3Body: i18nDerived.loaderCard3Body(),
		cta: i18nDerived.loaderCta(),
		loading: i18nDerived.loaderLoading(),
		cardsLabel: i18nDerived.loaderCardsLabel(),
		previousCard: i18nDerived.loaderPreviousCard(),
		nextCard: i18nDerived.loaderNextCard(),
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

	const enter = async () => {
		if (!ready || !visible || leaving || !loaderElement) return;
		leaving = true;

		// Mount the slots underneath first, then dissolve the loader over them.
		context.stateLayout.showLoadingScreen = false;
		await tick();
		if (!loaderElement) return;

		exitAnimation = gsap.timeline({ onComplete: () => (visible = false) });
		exitAnimation.to(loaderElement, { autoAlpha: 0, duration: 1.2, ease: 'power3.inOut' });
		const stage = loaderElement.querySelector('.loader-stage');
		if (stage) {
			exitAnimation.to(
				stage,
				{ scale: 1.06, filter: 'blur(3px)', duration: 1.2, ease: 'power3.inOut' },
				0,
			);
		}
	};

	const onKey = (event: KeyboardEvent) => {
		if (event.target instanceof HTMLButtonElement) return;
		if (event.code === 'Space' || event.code === 'Enter') enter();
	};

	const onPointerDown = (event: PointerEvent) => {
		pointerStart = { x: event.clientX, y: event.clientY };
		didDragCards = false;
	};

	const onPointerMove = (event: PointerEvent) => {
		if (!pointerStart) return;
		didDragCards ||= Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 8;
	};

	const onPointerUp = () => {
		pointerStart = undefined;
		// A click fires after pointerup; retain the drag flag until it has been ignored.
		window.setTimeout(() => (didDragCards = false), 0);
	};

	const onClick = () => {
		if (!didDragCards) void enter();
	};

	const showCard = (index: number) => {
		activeCard = Math.min(Math.max(index, 0), cards.length - 1);
		const card = cardsElement?.children.item(activeCard) as HTMLElement | null;
		card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
	};

	const onCardsScroll = () => {
		if (!cardsElement) return;
		const firstCard = cardsElement.firstElementChild as HTMLElement | null;
		if (!firstCard) return;
		activeCard = Math.min(
			cards.length - 1,
			Math.max(0, Math.round(cardsElement.scrollLeft / (firstCard.offsetWidth + 16))),
		);
	};

	onMount(() => {
		// @font-face can't read a JS-resolved URL, so register Cinzel at runtime from the
		// deploy-safe asset URL. Harmless if it fails — text falls back to Georgia/serif.
		// Register under BOTH names: 'Abyssal Cinzel' for this loader's DOM, and 'Cinzel' for the
		// in-game Pixi canvas (the family the Eye / Gaze / Win labels reference). Without the
		// 'Cinzel' registration those canvas labels silently render as Georgia. `weight: '400 900'`
		// exposes the variable font's full weight range so the 800/900 requests render bold.
		if (typeof FontFace !== 'undefined') {
			for (const family of ['Abyssal Cinzel', 'Cinzel']) {
				const face = new FontFace(family, `url(${cinzelFontUrl}) format('truetype')`, {
					display: 'swap',
					weight: '400 900',
				});
				face
					.load()
					.then((loaded) => document.fonts.add(loaded))
					.catch(() => {});
			}
		}

		if (!loaderElement) return;

		const animation = gsap.context(() => {
			gsap.from('.loader-header', {
				autoAlpha: 0,
				y: -24,
				duration: 0.55,
				stagger: 0.1,
				ease: 'power2.out',
			});
			gsap.from('.how-card', {
				autoAlpha: 0,
				y: 40,
				duration: 0.55,
				stagger: 0.12,
				ease: 'back.out(1.35)',
				delay: 0.25,
			});
			gsap.from('.loader-gate', {
				autoAlpha: 0,
				y: 20,
				duration: 0.35,
				ease: 'power2.out',
				delay: 0.75,
			});
		}, loaderElement);

		return () => {
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
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={() => (pointerStart = undefined)}
		onclick={onClick}
		onkeydown={onKey}
	>
		<div class="loader-stage">
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

			<header class="loader-header">
				<AbyssalPixiLogo title={copy.logo} />
			</header>

			<div bind:this={cardsElement} class="cards" onscroll={onCardsScroll}>
				{#each cards as card}
					<article class="how-card">
						<img class="card-art" src={card.art} alt="" />
						<div class="card-shade"></div>
						<div class="card-copy">
							<h2>{card.title}</h2>
							<p>{card.body}</p>
						</div>
					</article>
				{/each}
			</div>
			<div class="card-navigation" aria-label={copy.cardsLabel}>
				<button
					class="carousel-arrow previous"
					type="button"
					aria-label={copy.previousCard}
					disabled={activeCard === 0}
					onclick={(event) => {
						event.stopPropagation();
						showCard(activeCard - 1);
					}}
				>
					‹
				</button>
				<button
					class="carousel-arrow next"
					type="button"
					aria-label={copy.nextCard}
					disabled={activeCard === cards.length - 1}
					onclick={(event) => {
						event.stopPropagation();
						showCard(activeCard + 1);
					}}
				>
					›
				</button>
			</div>

			<div class="loader-gate">
				{#if ready}
					<div class="cta">{copy.cta}</div>
				{:else}
					<div class="progress">
						<div class="progress-fill" style={`width: ${progress}%`}></div>
					</div>
					<span>{copy.loading} {progress}%</span>
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
		background: radial-gradient(
			ellipse at center,
			transparent 32%,
			rgba(0, 0, 12, 0.23) 70%,
			rgba(0, 0, 9, 0.75) 100%
		);
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

	.loader-header {
		position: absolute;
		top: 2.5%;
		left: 50%;
		transform: translateX(-50%);
		width: 54%;
		height: 18%;
		filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.8));
	}

	.cards {
		position: absolute;
		left: 9.27%;
		top: 25.29%;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 2.153%;
		width: 81.46%;
		height: 57.39%;
	}
	.how-card {
		position: relative;
		overflow: hidden;
		border: 3px solid transparent;
		border-radius: 24px;
		background:
			linear-gradient(
					135deg,
					rgba(15, 31, 76, 0.98),
					rgba(17, 10, 55, 0.98) 52%,
					rgba(5, 10, 35, 0.99)
				)
				padding-box,
			linear-gradient(
					135deg,
					rgba(127, 232, 255, 0.75),
					rgba(158, 91, 255, 0.78) 48%,
					rgba(255, 215, 106, 0.6)
				)
				border-box;
		box-shadow:
			0 0 0 1px rgba(220, 246, 255, 0.17) inset,
			0 12px 26px rgba(2, 4, 24, 0.55),
			0 18px 28px rgba(0, 0, 0, 0.6);
	}
	.card-art {
		position: absolute;
		inset: 3px;
		width: calc(100% - 6px);
		height: calc(100% - 6px);
		object-fit: cover;
		border-radius: 20px;
	}
	.card-shade {
		position: absolute;
		z-index: 1;
		inset: 3px;
		border-radius: 20px;
		background: linear-gradient(
			135deg,
			rgba(7, 15, 46, 0.52),
			transparent 42%,
			rgba(6, 4, 28, 0.82) 82%,
			rgba(3, 2, 18, 0.96)
		);
	}
	.card-copy {
		position: absolute;
		z-index: 2;
		inset: 0;
		text-align: center;
	}
	.card-copy h2 {
		position: absolute;
		top: 5.5%;
		left: 6%;
		width: 88%;
		margin: 0;
		font-family: 'Arial Black', Impact, sans-serif;
		font-size: clamp(11px, 2.15vw, 36px);
		line-height: 1.08;
		font-weight: 900;
		color: #ffd76a;
		-webkit-text-stroke: clamp(0.5px, 0.08vw, 1.5px) #1a0628;
		text-shadow:
			0 3px 5px #000,
			0 0 8px rgba(143, 51, 255, 0.3);
	}
	.card-copy p {
		position: absolute;
		bottom: 4%;
		left: 6%;
		width: 88%;
		margin: 0;
		white-space: pre-line;
		font-family: Arial, Helvetica, sans-serif;
		font-size: clamp(10px, 1.48vw, 24px);
		line-height: 1.35;
		font-weight: 900;
		letter-spacing: 0.01em;
		color: #ffffff;
		text-shadow: 0 2px 4px #12051f;
	}

	.loader-gate {
		position: absolute;
		left: 50%;
		top: 89%;
		transform: translateX(-50%);
		width: min(34%, 570px);
		min-height: 5%;
		display: grid;
		justify-items: center;
		gap: 7px;
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-size: clamp(9px, 1.25vw, 21px);
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #c7ecff;
	}
	.card-navigation {
		display: none;
	}
	.cta {
		// Match the card titles (.card-copy h2): same font + colour.
		font-family: 'Arial Black', Impact, sans-serif;
		font-weight: 900;
		font-size: clamp(15px, 2.63vw, 44px);
		letter-spacing: normal;
		color: #ffd76a;
		-webkit-text-stroke: clamp(0.5px, 0.1vw, 2px) #3b1600;
		text-shadow:
			0 4px 7px #000,
			0 0 14px #8f33ff;
		animation: cta-pulse 0.85s ease-in-out infinite alternate;
		white-space: nowrap;
	}
	.progress {
		width: 100%;
		height: 7px;
		overflow: hidden;
		border: 1px solid rgba(127, 232, 255, 0.5);
		border-radius: 999px;
		background: rgba(2, 10, 40, 0.7);
		box-shadow: 0 0 10px rgba(71, 233, 255, 0.25);
	}
	.progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #7036db, #7fe8ff, #ffd76a);
		box-shadow: 0 0 10px #7fe8ff;
		transition: width 0.18s ease;
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
			transform: scale(1.035);
			opacity: 0.72;
		}
	}

	@media (max-aspect-ratio: 1 / 1) {
		.loader-stage {
			width: 100vw;
			height: 100svh;
			aspect-ratio: auto;
			overflow-y: auto;
			scroll-padding-bottom: 132px;
			overscroll-behavior: contain;
			scrollbar-width: thin;
		}
		.background {
			position: fixed;
		}
		.loader-header {
			top: 2%;
			width: 96%;
			height: 14%;
		}
		.cards {
			top: 17%;
			left: 8%;
			width: 84%;
			height: auto;
			grid-template-columns: 1fr;
			gap: 28px;
			padding-bottom: 118px;
		}
		.how-card {
			min-height: min(128vw, 540px);
		}
		.card-copy h2 {
			font-size: clamp(20px, 7.2vw, 34px);
		}
		.card-copy p {
			font-size: clamp(13px, 4.5vw, 22px);
		}
		.loader-gate {
			position: fixed;
			top: auto;
			bottom: 4%;
			width: 80%;
			padding: 8px 0;
			background: linear-gradient(
				90deg,
				transparent,
				rgba(3, 2, 22, 0.86) 15%,
				rgba(3, 2, 22, 0.86) 85%,
				transparent
			);
		}
		.cta {
			font-size: clamp(17px, 6.2vw, 30px);
		}
	}
	@media (max-width: 390px) {
		.cards {
			top: 15%;
			gap: 22px;
		}
		.how-card {
			min-height: 126vw;
		}
		.card-copy h2 {
			top: 4.5%;
		}
		.loader-gate {
			bottom: 2%;
		}
	}
	// Stake popouts and phones share a compact, horizontal card rail. It keeps every
	// surrounding loader element in-frame while the instructional cards scroll sideways.
	@media (max-width: 900px) {
		.loader-stage {
			overflow: hidden;
		}
		.cards {
			display: flex;
			box-sizing: border-box;
			gap: 16px;
			overflow-x: auto;
			overflow-y: hidden;
			padding: 4px 0 12px;
			scroll-snap-type: x mandatory;
			scrollbar-width: none;
			-ms-overflow-style: none;
			touch-action: pan-x;
			-webkit-overflow-scrolling: touch;
			&::-webkit-scrollbar {
				display: none;
			}
		}
		.how-card {
			flex: 0 0 100%;
			min-height: 0;
			height: 100%;
			scroll-snap-align: center;
		}
		.card-navigation {
			display: contents;
		}
		.carousel-arrow {
			position: absolute;
			z-index: 5;
			top: 53%;
			width: clamp(28px, 7vw, 44px);
			height: clamp(42px, 10vw, 58px);
			border: 1px solid rgba(191, 238, 255, 0.62);
			border-radius: 999px;
			background: rgba(7, 11, 38, 0.75);
			box-shadow: 0 0 14px rgba(71, 233, 255, 0.25);
			color: #ffffff;
			font-family: Arial, sans-serif;
			font-size: clamp(28px, 7vw, 42px);
			line-height: 1;
			cursor: pointer;
			transform: translateY(-50%);
			&:disabled {
				opacity: 0.28;
				cursor: default;
			}
		}
		.carousel-arrow.previous {
			left: 3%;
		}
		.carousel-arrow.next {
			right: 3%;
		}
	}
	@media (max-width: 900px) and (orientation: portrait) {
		.cards {
			top: 22%;
			left: 50%;
			width: min(78%, 300px);
			height: 39%;
			padding-bottom: 12px;
			transform: translateX(-50%);
		}
		.carousel-arrow {
			top: 41.5%;
		}
	}
	@media (max-width: 900px) and (orientation: landscape) {
		.cards {
			left: 50%;
			width: min(42%, 300px);
			transform: translateX(-50%);
		}
	}
	// Stake's Popout S (400×225) is the smallest landscape target. The fixed 16:9 stage
	// stays uniformly scaled; these limits prevent the CTA and card copy from being clipped.
	@media (max-height: 450px) and (orientation: landscape) {
		.loader-header {
			top: 1.5%;
			width: 58%;
			height: 19%;
		}
		.cards {
			left: 50%;
			top: 23%;
			width: min(42%, 300px);
			height: 60%;
			transform: translateX(-50%);
		}
		.card-copy h2 {
			font-size: clamp(9px, 2.15vw, 30px);
		}
		.card-copy p {
			font-size: clamp(8px, 1.4vw, 20px);
			line-height: 1.25;
		}
		.loader-gate {
			top: 87%;
		}
		.cta {
			font-size: clamp(11px, 2.4vw, 34px);
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
