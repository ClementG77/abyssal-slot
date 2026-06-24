<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import {
		INFINITY_MARK,
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateUi,
		stateMetaDerived,
		type BetModeData,
	} from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';
	import type { EmitterEventModal } from 'components-ui-html';

	// Abyssal-owned buy-bonus modal. Replaces the SDK's default ModalBuyBonus (wired through the
	// `buyBonus` snippet on the shared <Modals>). Fully data-driven off `stateMeta.betModeMeta`
	// (see betModeMeta.ts): every `activate` mode (ante) and every `buy` mode (super spins, free
	// spins, ultimate, super bonus) renders as a card with a hero image on top. One responsive
	// CSS grid handles every screen size — no per-orientation components.
	//
	// Buying reuses the exact action the SDK confirm modal performs: set the active bet mode, then
	// broadcast `bet` on the shared emitter (the same one the in-game Spin button uses). Activate
	// (ante) is a toggle and never fires a bet.
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	// every selectable mode in one list, cheapest first. `activate` modes (ante, super spins,
	// ultimate) toggle on/off; `buy` modes (free spins, super bonus) go through a confirm step.
	const cards = $derived(
		[...stateMetaDerived.betModeMetaList()]
			.filter((m) => m.type === 'activate' || m.type === 'buy')
			.sort((a, b) => a.costMultiplier - b.costMultiplier),
	);
	const isActivate = (m: BetModeData) => m.type === 'activate';

	// bet stepping — mirrors the control-bar bet controls so the cost shown here is live.
	const options = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const smallest = $derived(options[0] ?? 0);
	const biggest = $derived(options[options.length - 1] ?? 0);
	const decDisabled = $derived(stateBet.betAmount <= smallest);
	const incDisabled = $derived(stateBet.betAmount >= biggest);

	const sound = () => eventEmitter.broadcast({ type: 'soundPressGeneral' });
	const dec = () => {
		const next = [...options].reverse().find((o) => o < stateBet.betAmount);
		stateBetDerived.setBetAmount(next ?? smallest);
		sound();
	};
	const inc = () => {
		const next = options.find((o) => o > stateBet.betAmount);
		stateBetDerived.setBetAmount(next ?? biggest);
		sound();
	};

	const costOf = (m: BetModeData) => stateBet.betAmount * m.costMultiplier;
	const affordable = (m: BetModeData) =>
		stateBet.betAmount > 0 && stateBet.balanceAmount >= costOf(m);
	const isActive = (m: BetModeData) =>
		stateBet.activeBetModeKey.toUpperCase() === m.mode.toUpperCase();

	const close = () => (stateModal.modal = null);

	// every choice (buy OR activate) is confirmed in a little popup first
	let pending = $state<BetModeData | null>(null);
	const openConfirm = (m: BetModeData) => {
		sound();
		pending = m;
	};
	const cancelConfirm = () => {
		sound();
		pending = null;
	};
	const confirmChoice = () => {
		if (!pending) return;
		sound();
		const m = pending;
		stateBet.activeBetModeKey = m.mode;
		if (m.type === 'activate') {
			stateUi.autoSpinsLossLimitText = INFINITY_MARK;
			stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
		} else {
			// a buy fires the bet immediately
			eventEmitter.broadcast({ type: 'bet' });
		}
		// always close so the board can run the spin / show the activated mode
		pending = null;
		close();
	};
	// turning an already-active mode back off is immediate (no confirm needed)
	const deactivate = (m: BetModeData) => {
		sound();
		if (isActive(m)) stateBet.activeBetModeKey = 'BASE';
	};

	const money = (n: number) => numberToCurrencyString(n);
	const heroOf = (m: BetModeData) => m.assets?.dialogImage || m.assets?.icon || '';

	// 5-bolt volatility indicator (filled = gold), driven by assets.volatility in betModeMeta
	const BOLTS = [0, 1, 2, 3, 4];
	const volatilityOf = (m: BetModeData) => Number(m.assets?.volatility) || 0;

	// Make the card row scrollable by dragging it (mouse) and by the vertical mouse wheel.
	// Touch devices already pan natively, so the pointer-drag is limited to the mouse.
	const dragScroll = (node: HTMLElement) => {
		let down = false;
		let startX = 0;
		let startLeft = 0;
		let moved = false;
		let target = 0;
		let raf = 0;
		const overflowing = () => node.scrollWidth > node.clientWidth + 1;
		const maxLeft = () => node.scrollWidth - node.clientWidth;
		const stopRaf = () => {
			if (raf) cancelAnimationFrame(raf);
			raf = 0;
		};
		// ease the scroll position toward `target` each frame for a smooth glide
		const tick = () => {
			const diff = target - node.scrollLeft;
			if (Math.abs(diff) < 0.5) {
				node.scrollLeft = target;
				raf = 0;
				return;
			}
			node.scrollLeft += diff * 0.2;
			raf = requestAnimationFrame(tick);
		};

		const onWheel = (e: WheelEvent) => {
			if (!overflowing()) return;
			const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
			if (!delta) return;
			e.preventDefault();
			// re-sync the target to the live position if nothing is animating (e.g. after a drag)
			if (!raf) target = node.scrollLeft;
			target = Math.max(0, Math.min(maxLeft(), target + delta));
			if (!raf) raf = requestAnimationFrame(tick);
		};
		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse' || e.button !== 0 || !overflowing()) return;
			stopRaf();
			down = true;
			moved = false;
			startX = e.clientX;
			startLeft = node.scrollLeft;
		};
		const onPointerMove = (e: PointerEvent) => {
			if (!down) return;
			const dx = e.clientX - startX;
			if (Math.abs(dx) > 4) moved = true;
			node.scrollLeft = startLeft - dx;
		};
		const onPointerUp = () => {
			down = false;
		};
		// swallow the click that follows a drag so a card button isn't triggered on release.
		// `moved` is reset on every pointerdown, so a plain click always passes through.
		const onClickCapture = (e: MouseEvent) => {
			if (moved) {
				e.stopPropagation();
				moved = false;
			}
		};

		node.addEventListener('wheel', onWheel, { passive: false });
		node.addEventListener('pointerdown', onPointerDown);
		node.addEventListener('click', onClickCapture, true);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		return {
			destroy() {
				stopRaf();
				node.removeEventListener('wheel', onWheel);
				node.removeEventListener('pointerdown', onPointerDown);
				node.removeEventListener('click', onClickCapture, true);
				window.removeEventListener('pointermove', onPointerMove);
				window.removeEventListener('pointerup', onPointerUp);
			},
		};
	};
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<Popup zIndex={zIndex.modal} onclose={close}>
		<div class="buy-modal">
			<div class="bm-bet">
				<span class="bm-bet-label">BET</span>
				<div class="bm-stepper">
					<button class="bm-step" disabled={decDisabled} onclick={dec} aria-label="decrease bet">
						−
					</button>
					<span class="bm-bet-value">{money(stateBet.betAmount)}</span>
					<button class="bm-step" disabled={incDisabled} onclick={inc} aria-label="increase bet">
						+
					</button>
				</div>
			</div>

			<div class="bm-grid" use:dragScroll>
				{#each cards as m (m.mode)}
					{@const activate = isActivate(m)}
					{@const active = activate && isActive(m)}
					<div class="bm-card" class:active>
						<div class="bm-hero">
							{#if heroOf(m)}<img src={heroOf(m)} alt={m.text.title} />{/if}
							{#if active}<div class="bm-badge">ACTIVE</div>{/if}
						</div>

						<div class="bm-panel">
							<div class="bm-bolts">
								{#each BOLTS as i}
									<svg class="bolt" class:on={i < volatilityOf(m)} viewBox="0 0 24 24" aria-hidden="true">
										<path d="M13 2 4 14h6l-1 8 9-12h-6z" />
									</svg>
								{/each}
							</div>

							<div class="bm-title">{m.text.title}</div>
							<div class="bm-price">{money(costOf(m))}</div>

							{#if activate && active}
								<button class="bm-action activate on" onclick={() => deactivate(m)}>
									DEACTIVATE
								</button>
							{:else if activate}
								<button
									class="bm-action activate"
									disabled={!affordable(m)}
									onclick={() => openConfirm(m)}
								>
									ACTIVATE
								</button>
							{:else}
								<button class="bm-action buy" disabled={!affordable(m)} onclick={() => openConfirm(m)}>
									{affordable(m) ? 'BUY' : 'LOW FUNDS'}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

		</div>
	</Popup>

	<!-- confirm step as its own stacked popup (avoids the shared Popup's double-render of an
	     in-modal overlay, which showed the panel twice) -->
	{#if pending}
		<Popup zIndex={zIndex.dialog} onclose={cancelConfirm}>
			<div class="bm-confirm-panel">
				{#if heroOf(pending)}
					<img class="bm-confirm-hero" src={heroOf(pending)} alt={pending.text.title} />
				{/if}
				<div class="bm-confirm-title">{pending.text.title}</div>
				<div class="bm-confirm-dialog">{pending.text.dialog}</div>
				<div class="bm-confirm-cost">
					<span>{pending.type === 'activate' ? 'PER SPIN' : 'TOTAL'}</span>
					<strong>{money(costOf(pending))}</strong>
				</div>
				<div class="bm-confirm-actions">
					<button class="bm-action ghost" onclick={cancelConfirm}>CANCEL</button>
					<button
						class="bm-action {pending.type === 'activate' ? 'activate' : 'buy'}"
						onclick={confirmChoice}
					>
						{pending.type === 'activate' ? 'ACTIVATE' : 'CONFIRM BUY'}
					</button>
				</div>
			</div>
		</Popup>
	{/if}
{/if}

<style lang="scss">
	// deep-sea palette
	$ink: #04101e;
	$panel: rgba(8, 24, 44, 0.92);
	$line: rgba(120, 210, 255, 0.22);
	$line-strong: rgba(120, 210, 255, 0.55);
	$aqua: #5fe6ff;
	$violet: #b083ff;
	$gold: #ffd66b;
	$text: #eaf6ff;
	$dim: rgba(213, 234, 250, 0.62);

	// no panel background — just the centered bet selector + the cards floating over the game
	.buy-modal {
		position: relative;
		z-index: 100;
		box-sizing: border-box;
		width: min(60rem, 100vw);
		max-width: 100vw;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: clamp(0.7rem, 1.6vw, 1.1rem);
		color: $text;

		* {
			box-sizing: border-box;
		}
	}

	.bm-bet {
		align-self: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
	}
	.bm-bet-label {
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		color: $dim;
	}
	.bm-stepper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(0, 0, 0, 0.35);
		border: 1px solid $line;
		border-radius: 0.7rem;
		padding: 0.3rem 0.4rem;
	}
	.bm-bet-value {
		min-width: 5.5rem;
		text-align: center;
		font-size: 1.05rem;
		font-weight: 800;
		color: $gold;
	}
	.bm-step {
		width: 2rem;
		height: 2rem;
		border-radius: 0.5rem;
		border: 1px solid $line-strong;
		background: linear-gradient(180deg, rgba(95, 230, 255, 0.16), rgba(95, 230, 255, 0.04));
		color: $text;
		font-size: 1.25rem;
		font-weight: 900;
		line-height: 1;
		cursor: pointer;
		transition: filter 0.12s ease;
		&:hover:not(:disabled) {
			filter: brightness(1.35);
		}
		&:disabled {
			opacity: 0.3;
			cursor: default;
		}
	}

	.bm-grid {
		display: flex;
		gap: clamp(0.5rem, 1.2vw, 0.85rem);
		// centre the cards when they fit; scroll horizontally when they don't (mobile / small).
		// `safe center` keeps the first card reachable instead of clipping it on overflow.
		justify-content: safe center;
		align-items: stretch;
		overflow-x: auto;
		overflow-y: visible;
		padding: 0.4rem 0.5rem 0.85rem;
		-webkit-overflow-scrolling: touch;
		// horizontal swipe/drag panning + grab cursor for the mouse drag-to-scroll
		touch-action: pan-x;
		cursor: grab;
		&:active {
			cursor: grabbing;
		}

		&::-webkit-scrollbar {
			height: 6px;
		}
		&::-webkit-scrollbar-thumb {
			background: rgba(255, 255, 255, 0.28);
			border-radius: 6px;
		}
	}

	// Cards: cropped hero art on top, a white panel below holding a volatility bolt row, a dark
	// title, a dark price, and a pill ACTIVATE (pink) / BUY (gold) button — matching the reference.
	.bm-card {
		// fixed width so the row overflows (and scrolls) on small screens instead of shrinking.
		// kept small enough that all 5 modes are visible at once on desktop / tablet.
		flex: 0 0 auto;
		width: clamp(7rem, 24vw, 9rem);
		display: flex;
		flex-direction: column;
		border-radius: 0.85rem;
		overflow: hidden;
		background: #0a0b0f;
		border: 1px solid rgba(255, 255, 255, 0.08);
		transition:
			transform 0.14s ease,
			box-shadow 0.14s ease;

		&:hover {
			transform: translateY(-3px);
			box-shadow: 0 16px 30px rgba(0, 0, 0, 0.5);
		}
		&.active {
			box-shadow:
				0 0 0 2px rgba(95, 230, 255, 0.6),
				0 0 22px rgba(95, 230, 255, 0.32);
		}
	}

	.bm-hero {
		position: relative;
		// the bonus art is a wide self-contained banner (2172×724 = 3:1) — show it whole, no crop
		aspect-ratio: 3 / 1;
		overflow: hidden;
		background: #0a0d13;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
	}

	.bm-badge {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		z-index: 2;
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: $ink;
		background: $aqua;
		padding: 0.12rem 0.4rem;
		border-radius: 0.35rem;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
	}

	// white content body sitting directly under the banner header
	.bm-panel {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin: 0;
		padding: 0.55rem 0.5rem 0.6rem;
		background: #ffffff;
	}

	.bm-bolts {
		display: flex;
		justify-content: center;
		gap: 0.05rem;
		height: 1.1rem;

		.bolt {
			width: 0.95rem;
			height: 1.1rem;
			fill: #c7ccd6;

			&.on {
				fill: #ffc01e;
				filter: drop-shadow(0 1px 1px rgba(214, 150, 0, 0.5));
			}
		}
	}

	.bm-title {
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		white-space: nowrap;
		font-size: 0.82rem;
		font-weight: 900;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		line-height: 1;
		color: #18233a;
	}

	.bm-price {
		height: 1.6rem;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-size: 1.15rem;
		font-weight: 900;
		color: #0e1726;
	}

	.bm-action {
		// margin-top:auto pins every button to the bottom of its panel, so across cards the
		// titles, prices and buttons all line up at the same height.
		margin-top: auto;
		padding: 0.5rem 0.4rem;
		border-radius: 999px;
		border: none;
		font-weight: 900;
		font-size: 0.78rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: #fff;
		cursor: pointer;
		transition:
			filter 0.12s ease,
			transform 0.08s ease;

		&:hover:not(:disabled) {
			filter: brightness(1.08);
		}
		&:active:not(:disabled) {
			transform: translateY(1px);
		}
		&:disabled {
			filter: grayscale(0.85);
			opacity: 0.55;
			cursor: default;
		}

		// gold BUY button
		&.buy {
			background: linear-gradient(180deg, #ffd34d, #f0a81c);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.6),
				0 3px 8px rgba(240, 168, 28, 0.3);
			text-shadow: 0 1px 2px rgba(140, 90, 0, 0.4);
		}
		// pink ACTIVATE button
		&.activate {
			background: linear-gradient(180deg, #ff5cb1, #e21d86);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.5),
				0 3px 8px rgba(226, 29, 134, 0.3);
			text-shadow: 0 1px 2px rgba(120, 0, 60, 0.4);
		}
		// active state → deeper pink "deactivate"
		&.activate.on {
			background: linear-gradient(180deg, #b3186a, #7d124b);
			box-shadow: inset 0 0 0 1.5px rgba(255, 140, 200, 0.8);
		}
		// neutral cancel button in the confirm overlay
		&.ghost {
			color: $text;
			background: rgba(255, 255, 255, 0.1);
			box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
		}
	}

	// confirm panel — centered by its own Popup's top-layer
	.bm-confirm-panel {
		position: relative;
		z-index: 100;
		width: min(26rem, 92vw);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.7rem;
		padding: 1.4rem 1.25rem;
		border-radius: 1rem;
		background: linear-gradient(180deg, rgba(14, 38, 64, 0.96), rgba(5, 16, 30, 0.98));
		border: 1px solid $line-strong;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
	}
	.bm-confirm-hero {
		width: 100%;
		max-width: 20rem;
		aspect-ratio: 3 / 1;
		object-fit: cover;
		border-radius: 0.5rem;
		filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.6));
	}
	.bm-confirm-title {
		font-size: 1.25rem;
		font-weight: 900;
		letter-spacing: 0.04em;
	}
	.bm-confirm-dialog {
		font-size: 0.78rem;
		line-height: 1.35;
		color: $dim;
	}
	.bm-confirm-cost {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-top: 0.2rem;
		span {
			font-size: 0.7rem;
			letter-spacing: 0.16em;
			color: $dim;
		}
		strong {
			font-size: 1.5rem;
			color: $gold;
		}
	}
	.bm-confirm-actions {
		display: flex;
		gap: 0.7rem;
		width: 100%;
		margin-top: 0.4rem;
		.bm-action {
			margin: 0;
			flex: 1;
		}
	}

	// On phones / small screens the cards scroll horizontally, so make them noticeably bigger.
	// Sizes use viewport units (capped with min()) so they stay legible and are immune to the
	// global <500px html font-size halving.
	@media (max-width: 600px) {
		.bm-grid {
			padding-inline: 4vw;
			scroll-padding-inline: 4vw;
		}
		.bm-card {
			// ~2.5–3 cards visible at a time, the rest reachable by horizontal swipe
			width: min(38vw, 150px);
			border-radius: 2.5vw;
		}
		.bm-bolts {
			height: min(4.6vw, 20px);
			.bolt {
				width: min(4vw, 18px);
				height: min(4.6vw, 20px);
			}
		}
		.bm-title {
			height: 6vw;
			font-size: min(3.8vw, 17px);
		}
		.bm-price {
			height: 7vw;
			font-size: min(5.4vw, 24px);
		}
		.bm-action {
			padding: 2.4vw 1vw;
			font-size: min(3.6vw, 16px);
		}
		.bm-bet-label {
			font-size: min(3vw, 13px);
		}
		.bm-bet-value {
			min-width: 24vw;
			font-size: min(4.6vw, 20px);
		}
		.bm-step {
			width: min(8.5vw, 38px);
			height: min(8.5vw, 38px);
			font-size: min(5.5vw, 24px);
		}
		.bm-confirm-title {
			font-size: min(5.5vw, 24px);
		}
		.bm-confirm-dialog {
			font-size: min(3.6vw, 15px);
		}
		.bm-confirm-cost {
			span {
				font-size: min(3.2vw, 13px);
			}
			strong {
				font-size: min(6.5vw, 28px);
			}
		}
	}

	// Very short viewports (e.g. the 400×225 "S" preview): height is the constraint, so compact
	// everything in fixed px (immune to the global font-size halving) so a whole card fits
	// vertically and several are visible, the rest reachable by horizontal swipe.
	@media (max-height: 430px) {
		.buy-modal {
			gap: 5px;
		}
		.bm-bet {
			gap: 2px;
		}
		.bm-bet-label {
			font-size: 9px;
		}
		.bm-bet-value {
			min-width: 60px;
			font-size: 13px;
		}
		.bm-stepper {
			gap: 4px;
			padding: 2px 3px;
		}
		.bm-step {
			width: 20px;
			height: 20px;
			font-size: 15px;
		}
		.bm-grid {
			gap: 6px;
			padding: 3px 6px 7px;
		}
		.bm-card {
			width: min(28vw, 118px);
			border-radius: 8px;
		}
		.bm-panel {
			gap: 3px;
			padding: 4px 5px 5px;
		}
		.bm-bolts {
			height: 11px;
			.bolt {
				width: 10px;
				height: 11px;
			}
		}
		.bm-title {
			height: 14px;
			font-size: 11px;
		}
		.bm-price {
			height: 16px;
			font-size: 13px;
		}
		.bm-action {
			padding: 5px 4px;
			font-size: 11px;
		}
		// confirm popup also has to fit the short height
		.bm-confirm-panel {
			gap: 6px;
			padding: 10px 12px;
		}
		.bm-confirm-hero {
			max-width: 13rem;
		}
		.bm-confirm-title {
			font-size: 15px;
		}
		.bm-confirm-dialog {
			font-size: 11px;
		}
		.bm-confirm-cost strong {
			font-size: 18px;
		}
	}
</style>
