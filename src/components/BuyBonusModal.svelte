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

	import { i18nDerived } from '../i18n/i18nDerived';

	// Abyssal-owned buy-bonus modal. Replaces the SDK's default ModalBuyBonus (wired through the
	// `buyBonus` snippet on the shared <Modals>). Fully data-driven off `stateMeta.betModeMeta`
	// (see betModeMeta.ts). Clean “shop card” look: ivory card, mode art on top (cropped from the
	// bonus_buy sprite sheet), title / description / price, and exactly TWO accent colours —
	// green for ACTIVATE modes, gold for BUY modes. Bet stepper sits on a white-glass pill.
	//
	// Buying reuses the exact action the SDK confirm modal performs: set the active bet mode, then
	// broadcast `bet` on the shared emitter (the same one the in-game Spin button uses). Activate
	// (ante) is a toggle and never fires a bet.
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();

	// --- mode art: CSS-sprite crops from static/assets/bonus/bonus/bonus_buy.png ---------------
	// Frame layout per its sibling spritesheet.json: five 578×342 frames on a 2312×684 sheet
	// (4 columns × 2 rows). Percent positions map each mode key to its frame.
	const SPRITE_URL = new URL('../../assets/bonus/bonus/bonus_buy.png', import.meta.url).href;
	const SPRITE_ASPECT = '578 / 342';
	const SPRITE_POS: Record<string, string> = {
		SUPERSPINS: '0% 0%',
		ANTE: '33.3333% 0%',
		BONUS: '66.6667% 0%',
		SUPERBONUS: '100% 0%',
		ULTIMATE: '0% 100%',
	};
	const heroStyle = (m: BetModeData) => {
		const pos = SPRITE_POS[m.mode.toUpperCase()];
		if (!pos) return '';
		return `background-image: url(${SPRITE_URL}); background-size: 400% 200%; background-position: ${pos};`;
	};

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
	<Popup zIndex={zIndex.modal} closeOnEscape={false} closeOnOutside={false} onclose={close}>
		<div class="buy-modal">
			<div class="bm-grid" use:dragScroll>
				{#each cards as m (m.mode)}
					{@const activate = isActivate(m)}
					{@const active = activate && isActive(m)}
					<div class="bm-card" class:active>
							<div class="bm-hero">
							<div class="bm-hero-art" style={heroStyle(m)} role="img" aria-label={m.text.title}></div>
							{#if active}<div class="bm-badge">{i18nDerived.active()}</div>{/if}
						</div>

						<div class="bm-panel">
							<div class="bm-title">{m.text.title}</div>
							<div class="bm-divider"></div>
							<div class="bm-desc">{m.text.dialog}</div>
							<div class="bm-price">{money(costOf(m))}</div>

							{#if activate && active}
								<button class="bm-action activate on" onclick={() => deactivate(m)}>
									{i18nDerived.deactivate()}
								</button>
							{:else if activate}
								<button
									class="bm-action activate"
									disabled={!affordable(m)}
									onclick={() => openConfirm(m)}
								>
									{i18nDerived.activate()}
								</button>
							{:else}
								<button
									class="bm-action buy"
									disabled={!affordable(m)}
									onclick={() => openConfirm(m)}
								>
									{affordable(m) ? i18nDerived.buy() : i18nDerived.lowFunds()}
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<div class="bm-bet">
				<span class="bm-bet-label">{i18nDerived.bet()}</span>
				<div class="bm-stepper">
					<button
						class="bm-step minus"
						disabled={decDisabled}
						onclick={dec}
						aria-label={i18nDerived.decreaseBet()}
					>
						−
					</button>
					<span class="bm-bet-value">{money(stateBet.betAmount)}</span>
					<button
						class="bm-step plus"
						disabled={incDisabled}
						onclick={inc}
						aria-label={i18nDerived.increaseBet()}
					>
						+
					</button>
				</div>
			</div>
		</div>
	</Popup>

	<!-- confirm step as its own stacked popup (avoids the shared Popup's double-render of an
	     in-modal overlay, which showed the panel twice) -->
	{#if pending}
		<Popup
			zIndex={zIndex.dialog}
			closeOnEscape={false}
			closeOnOutside={false}
			onclose={cancelConfirm}
		>
			<div class="bm-confirm-panel">
				<div
					class="bm-confirm-hero"
					style={heroStyle(pending)}
					role="img"
					aria-label={pending.text.title}
				></div>
				<div class="bm-confirm-title">{pending.text.title}</div>
				<div class="bm-confirm-dialog">{pending.text.dialog}</div>
				<div class="bm-confirm-cost">
					<span>{pending.type === 'activate' ? i18nDerived.perSpin() : i18nDerived.total()}</span>
					<strong>{money(costOf(pending))}</strong>
				</div>
				<div class="bm-confirm-actions">
					<button class="bm-action ghost" onclick={cancelConfirm}>{i18nDerived.cancel()}</button>
					<button
						class="bm-action {pending.type === 'activate' ? 'activate' : 'buy'}"
						onclick={confirmChoice}
					>
						{pending.type === 'activate' ? i18nDerived.activate() : i18nDerived.confirmBuy()}
					</button>
				</div>
			</div>
		</Popup>
	{/if}
{/if}

<style lang="scss">
	// Clean two-accent palette: green = activate, gold = buy. Everything else is ivory/navy.
	$ink: #14243a; // dark navy text
	$ink-soft: #51607a; // description text
	$card-bg: #f8f6f0; // ivory card body
	$card-line: rgba(20, 36, 58, 0.14);
	$hero-bg: #0b2130; // deep petrol behind the art
	$green: #17a56b;
	$green-deep: #0d7f50;
	$gold: #f0a81c;
	$gold-light: #ffd34d;

	// no panel background — the cards + bet pill float over the dimmed game
	.buy-modal {
		position: relative;
		z-index: 100;
		box-sizing: border-box;
		width: min(64rem, 100vw);
		max-width: 100vw;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: clamp(0.7rem, 1.6vw, 1.2rem);

		* {
			box-sizing: border-box;
		}
	}

	.bm-grid {
		display: flex;
		gap: clamp(0.55rem, 1.3vw, 0.9rem);
		// centre the cards when they fit; scroll horizontally when they don't (mobile / small).
		// `safe center` keeps the first card reachable instead of clipping it on overflow.
		justify-content: safe center;
		align-items: stretch;
		overflow-x: auto;
		overflow-y: visible;
		padding: 0.4rem 0.5rem 0.85rem;
		-webkit-overflow-scrolling: touch;
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

	// Cards: mode art on top (sprite crop), ivory body with title / divider / description /
	// price, and a single pill button. Two accent colours across the whole modal.
	// Sized so ALL FIVE cards are fully on screen (no scrolling) on every landscape device:
	// 5 × 17vw + gaps ≈ 90vw, capped at 10.5rem for large screens, floored for Popout L.
	.bm-card {
		flex: 0 0 auto;
		width: clamp(7rem, 17vw, 10.5rem);
		display: flex;
		flex-direction: column;
		border-radius: 1rem;
		overflow: hidden;
		background: $card-bg;
		border: 1px solid rgba(255, 255, 255, 0.75);
		box-shadow:
			0 10px 26px rgba(4, 12, 24, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.8);
		transition:
			transform 0.14s ease,
			box-shadow 0.14s ease;

		&:hover {
			transform: translateY(-3px);
			box-shadow: 0 18px 34px rgba(4, 12, 24, 0.55);
		}
		&.active {
			box-shadow:
				0 0 0 2px rgba(23, 165, 107, 0.75),
				0 0 22px rgba(23, 165, 107, 0.35);
		}
	}

	.bm-hero {
		position: relative;
		aspect-ratio: 578 / 342; // the sprite frames' native shape — no crop
		background: $hero-bg;
	}
	.bm-hero-art {
		position: absolute;
		inset: 0;
		background-repeat: no-repeat;
	}

	.bm-badge {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		z-index: 2;
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		color: #fff;
		background: $green;
		padding: 0.14rem 0.45rem;
		border-radius: 0.4rem;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	}

	.bm-panel {
		position: relative;
		z-index: 1;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.55rem 0.55rem 0.6rem;
	}

	.bm-title {
		min-height: 1.4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-size: 0.86rem;
		font-weight: 800;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		line-height: 1.1;
		color: $ink;
	}

	.bm-divider {
		height: 1px;
		margin: 0 0.4rem;
		background: $card-line;
	}

	.bm-desc {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		text-align: center;
		font-size: 0.66rem;
		line-height: 1.35;
		color: $ink-soft;
	}

	.bm-price {
		height: 1.7rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-size: 1.2rem;
		font-weight: 900;
		color: $ink;
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

		// gold BUY
		&.buy {
			background: linear-gradient(180deg, $gold-light, $gold);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.6),
				0 3px 8px rgba(240, 168, 28, 0.35);
			text-shadow: 0 1px 2px rgba(140, 90, 0, 0.4);
		}
		// green ACTIVATE
		&.activate {
			background: linear-gradient(180deg, $green, $green-deep);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.45),
				0 3px 8px rgba(23, 165, 107, 0.35);
			text-shadow: 0 1px 2px rgba(0, 70, 40, 0.45);
		}
		// active state → deeper green "deactivate"
		&.activate.on {
			background: linear-gradient(180deg, #0c6b45, #084b31);
			box-shadow: inset 0 0 0 1.5px rgba(120, 230, 180, 0.75);
		}
		// neutral cancel button in the confirm overlay
		&.ghost {
			color: $ink;
			background: rgba(20, 36, 58, 0.08);
			box-shadow: inset 0 0 0 1px rgba(20, 36, 58, 0.22);
		}
	}

	// --- bet stepper: a white-glass pill ------------------------------------------------------
	.bm-bet {
		align-self: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}
	.bm-bet-label {
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.22em;
		color: #f2f7ff;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
	}
	.bm-stepper {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.35rem 0.45rem;
		border-radius: 999px;
		border: 1px solid rgba(255, 255, 255, 0.8);
		background: linear-gradient(
			to bottom,
			rgba(255, 255, 255, 0.86),
			rgba(240, 244, 248, 0.78)
		);
		box-shadow:
			0 10px 24px rgba(4, 12, 24, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(8px);
	}
	.bm-bet-value {
		min-width: 6.2rem;
		padding: 0.3rem 0.8rem;
		border-radius: 999px;
		background: $hero-bg;
		text-align: center;
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-size: 1.02rem;
		font-weight: 900;
		color: #ffffff;
		box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5);
	}
	.bm-step {
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		border: none;
		color: #fff;
		font-size: 1.3rem;
		font-weight: 900;
		line-height: 1;
		cursor: pointer;
		transition: filter 0.12s ease;
		&:hover:not(:disabled) {
			filter: brightness(1.15);
		}
		&:disabled {
			opacity: 0.35;
			cursor: default;
		}
		// one colour for the whole stepper: navy, matching the value plate
		&.minus,
		&.plus {
			background: linear-gradient(180deg, #1d3a52, $hero-bg);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.25),
				0 2px 6px rgba(4, 12, 24, 0.4);
		}
	}

	// --- confirm panel: same ivory language ---------------------------------------------------
	.bm-confirm-panel {
		position: relative;
		z-index: 100;
		width: min(24rem, 92vw);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.6rem;
		padding: 1.2rem 1.15rem;
		border-radius: 1rem;
		background: $card-bg;
		border: 1px solid rgba(255, 255, 255, 0.8);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
		color: $ink;
	}
	.bm-confirm-hero {
		width: min(15rem, 80%);
		aspect-ratio: 578 / 342;
		border-radius: 0.6rem;
		background-color: $hero-bg;
		background-repeat: no-repeat;
		box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
	}
	.bm-confirm-title {
		font-family: 'Abyssal Cinzel', Georgia, serif;
		font-size: 1.2rem;
		font-weight: 900;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.bm-confirm-dialog {
		font-size: 0.78rem;
		line-height: 1.4;
		color: $ink-soft;
	}
	.bm-confirm-cost {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-top: 0.1rem;
		span {
			font-size: 0.68rem;
			letter-spacing: 0.16em;
			color: $ink-soft;
		}
		strong {
			font-family: 'Abyssal Cinzel', Georgia, serif;
			font-size: 1.5rem;
			color: $ink;
		}
	}
	.bm-confirm-actions {
		display: flex;
		gap: 0.7rem;
		width: 100%;
		margin-top: 0.3rem;
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
			// ~2.5 cards visible at a time, the rest reachable by horizontal swipe
			width: min(40vw, 160px);
			border-radius: 2.5vw;
		}
		.bm-title {
			min-height: 6vw;
			font-size: min(3.8vw, 17px);
		}
		.bm-desc {
			font-size: min(2.9vw, 13px);
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
			width: min(9vw, 40px);
			height: min(9vw, 40px);
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
			min-width: 62px;
			font-size: 13px;
			padding: 2px 8px;
		}
		.bm-stepper {
			gap: 4px;
			padding: 2px 3px;
		}
		.bm-step {
			width: 22px;
			height: 22px;
			font-size: 15px;
		}
		.bm-grid {
			gap: 6px;
			padding: 3px 6px 7px;
		}
		.bm-card {
			width: min(24vw, 104px);
			border-radius: 8px;
		}
		.bm-panel {
			gap: 2px;
			padding: 4px 5px 5px;
		}
		.bm-title {
			min-height: 13px;
			font-size: 10px;
		}
		.bm-desc {
			font-size: 8px;
			-webkit-line-clamp: 1;
			line-clamp: 1;
		}
		.bm-price {
			height: 15px;
			font-size: 12px;
		}
		.bm-action {
			padding: 4px 4px;
			font-size: 10px;
		}
		// confirm popup also has to fit the short height
		.bm-confirm-panel {
			gap: 5px;
			padding: 10px 12px;
		}
		.bm-confirm-hero {
			width: 10rem;
		}
		.bm-confirm-title {
			font-size: 14px;
		}
		.bm-confirm-dialog {
			font-size: 10px;
		}
		.bm-confirm-cost strong {
			font-size: 17px;
		}
	}
</style>
