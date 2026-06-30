<script lang="ts">
	import { type FederatedPointerEvent, type FederatedWheelEvent } from 'pixi.js';
	import { Tween } from 'svelte/motion';
	import { cubicIn, cubicOut } from 'svelte/easing';

	import { Button } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi-svelte';
	import {
		AUTO_SPINS_TEXT_OPTION_MAP,
		INFINITY_MARK,
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateSound,
		stateUi,
		type AutoSpinsText,
	} from 'state-shared';
	import { bookEventAmountToCurrencyString, numberToCurrencyString } from 'utils-shared/amount';

	import { ABYSSAL_CONTROL_BAR_LAYOUT as HUD } from '../controlbar/hudLayout';
	import { drawControlGlyph } from '../controlbar/vectorIcons';
	import { getContext } from '../game/context';
	import { icons, type IconKey } from './controls/icons';

	const context = getContext();
	const BAR_FONT = 'Inter, Arial, sans-serif';
	const autoPopupOptions: AutoSpinsText[] = ['10', '25', '50', '100', '250', INFINITY_MARK];
	const AUTO_POPUP_SIZE = { w: 340, h: 168 };
	const BET_POPUP_COLUMNS = { desktop: 5, mobile: 3 };
	const BET_POPUP_PADDING = { x: 46, y: 48 };
	const AUTO_CHOICE = { w: 90, h: 48, gapX: 108, gapY: 58, fontSize: 18 };
	const BET_CHOICE = { w: 150, h: 62, gapX: 178, gapY: 82, fontSize: 26 };
	const BET_POPUP_SCROLL_ROWS = { popout: 3, tiny: 2 };
	const ACTIVE_ACCENT = 0xff4f57;
	const ACTIVE_ACCENT_BRIGHT = 0xfff0dc;
	const GLASS = {
		bg: 0x081c2a,
		bgDeep: 0x030912,
		bgHover: 0x0c2e44,
		border: 0xe1faff,
		borderSoft: 0x9eefff,
		glow: 0x5adcff,
		glowStrong: 0x5febff,
		shadow: 0x000812,
		textDim: 0xdff8ff,
	} as const;
	const MENU_SLIDER = { w: 124, h: 34, labelX: -100, trackX: 40, labelFontSize: 18 };
	const MENU_POPUP_PANEL = { w: 290, h: 248, centerY: -92 };
	const MENU_ACTION_BUTTON = { w: 232, h: 56, iconX: -82, labelX: -42, iconSize: 38, fontSize: 20 };
	const BET_STEP_BUTTON = { hitW: 68, hitH: 62, drawSize: 60, glyphSize: 36, y: 12 };
	const SELECTABLE_BUY_MODE_KEYS = new Set(['ANTE', 'SUPERSPINS']);

	let showAutoPopup = $state(false);
	let showBetPopup = $state(false);
	let renderAutoPopup = $state(false);
	let renderBetPopup = $state(false);
	let renderMenuPopup = $state(false);
	let autoSpinArmed = $state(false);
	let betScrollRow = $state(0);
	let betScrollDragging = $state(false);
	let betScrollMoved = $state(false);
	let betScrollDragStartY = $state(0);
	let betScrollDragStartRow = $state(0);
	let volumeSliderDragging = $state<'music' | 'sfx' | null>(null);
	let hoveredSlider = $state<'music' | 'sfx' | null>(null);
	let autoPopupMotionId = 0;
	let betPopupMotionId = 0;
	let menuPopupMotionId = 0;

	const POPUP_OPEN = { duration: 180, easing: cubicOut };
	const POPUP_CLOSE = { duration: 130, easing: cubicIn };
	const autoPopupFx = new Tween(0, { duration: 1 });
	const betPopupFx = new Tween(0, { duration: 1 });
	const menuPopupFx = new Tween(0, { duration: 1 });

	const LEFT_BOUNDS = { minX: -56, maxX: 335, minY: -215, maxY: 56 };
	const RIGHT_BOUNDS = { minX: -180, maxX: 196, minY: -243, maxY: 50 };

	const amountPanelWidth = (text: string, minWidth: number, maxWidth: number, fontSize: number) => {
		const estimatedWidth = Math.ceil(text.length * fontSize * 0.62 + 54);
		return Math.min(maxWidth, Math.max(minWidth, estimatedWidth));
	};
	const amountFontSize = (
		text: string,
		panelWidth: number,
		baseSize: number,
		minSize: number,
		targetFill = 0.82,
		targetWidth?: number,
	) => {
		const availableWidth = panelWidth - 46;
		const target = Math.min(availableWidth * targetFill, targetWidth ?? Number.POSITIVE_INFINITY);
		const fittedSize = Math.floor(target / Math.max(text.length * 0.62, 1));
		return Math.max(minSize, Math.min(baseSize, fittedSize));
	};
	const choiceFontSize = (text: string, chipWidth: number, baseSize: number, minSize: number) => {
		const availableWidth = chipWidth - 26;
		const fittedSize = Math.floor(availableWidth / Math.max(text.length * 0.62, 1));
		return Math.max(minSize, Math.min(baseSize, fittedSize));
	};

	const balanceText = $derived(numberToCurrencyString(stateBet.balanceAmount));
	const betText = $derived(numberToCurrencyString(stateBetDerived.betCost()));
	const balancePanelWidth = $derived(amountPanelWidth(balanceText, HUD.left.balance.w, 390, 36));
	const betPanelWidth = $derived(amountPanelWidth(betText, HUD.right.bet.w, 470, 34));
	const balanceValueFontSize = $derived(
		amountFontSize(balanceText, balancePanelWidth, 54, 26, 0.86, 210),
	);
	const betValueFontSize = $derived(amountFontSize(betText, betPanelWidth, 52, 25, 0.62, 198));
	const betButtonOffset = $derived(Math.max(116, betPanelWidth / 2 - 42));
	const options = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
	const popupAlpha = (progress: number) => clamp(progress, 0, 1);
	const popupScale = (progress: number) => 0.92 + popupAlpha(progress) * 0.08;
	const popupLift = (progress: number) => (1 - popupAlpha(progress)) * 14;
	const playPopupMotion = async (
		open: boolean,
		tween: Tween<number>,
		setRendered: (value: boolean) => void,
		token: number,
		currentToken: () => number,
	) => {
		if (open) {
			setRendered(true);
			await tween.set(1, POPUP_OPEN);
			return;
		}
		await tween.set(0, POPUP_CLOSE);
		if (token === currentToken()) setRendered(false);
	};
	const betPopupSize = (columns: number, maxVisibleRows: number) => {
		const rows = Math.max(1, Math.ceil(options.length / columns));
		const visibleRows = Math.min(maxVisibleRows, rows);
		const maxScrollRow = Math.max(0, rows - visibleRows);
		const scrollRow = clamp(betScrollRow, 0, maxScrollRow);
		return {
			columns,
			rows,
			visibleRows,
			maxScrollRow,
			scrollRow,
			w: (columns - 1) * BET_CHOICE.gapX + BET_CHOICE.w + BET_POPUP_PADDING.x * 2,
			h: (visibleRows - 1) * BET_CHOICE.gapY + BET_CHOICE.h + BET_POPUP_PADDING.y * 2,
		};
	};

	const screenSize = $derived(context.stateLayoutDerived.canvasSizes());
	const responsive = $derived.by(() => {
		const isPortrait = screenSize.height > screenSize.width * 1.15;
		const isTinyLandscape = !isPortrait && screenSize.width <= 500 && screenSize.height <= 300;
		const isPopoutLandscape = !isPortrait && screenSize.width < 900;
		const isCompactLandscape = !isPortrait && (screenSize.width < 900 || screenSize.height < 600);
		const portraitBaseScale = Math.min(screenSize.width / 460, screenSize.height / 780);
		const tinyLandscapeBaseScale = Math.min(screenSize.width / 800, screenSize.height / 440);
		const popoutLandscapeBaseScale = Math.min(screenSize.width / 1280, screenSize.height / 720);
		const compactLandscapeBaseScale = Math.min(screenSize.width / 1280, screenSize.height / 720);
		const desktopBaseScale = Math.min(
			screenSize.width / HUD.design.w,
			screenSize.height / HUD.design.h,
		);

		let scale: number;
		if (isPortrait) {
			scale = Math.min(0.48, Math.max(0.42, portraitBaseScale));
		} else if (isTinyLandscape) {
			scale = Math.min(0.26, Math.max(0.22, tinyLandscapeBaseScale));
		} else if (isPopoutLandscape) {
			scale = Math.min(0.34, Math.max(0.28, popoutLandscapeBaseScale));
		} else if (isCompactLandscape) {
			scale = Math.min(0.58, Math.max(0.46, compactLandscapeBaseScale));
		} else {
			scale = Math.min(1, Math.max(0.68, desktopBaseScale));
		}

		const edgeGap = isTinyLandscape ? 8 : isPortrait ? 14 : 42;
		const bottomGap = isTinyLandscape ? 8 : isPortrait ? 16 : isCompactLandscape ? 20 : 34;
		const baselineY =
			screenSize.height - bottomGap - Math.max(LEFT_BOUNDS.maxY, RIGHT_BOUNDS.maxY) * scale;
		const popupScaleFor = (width: number, height: number, desiredScale: number) =>
			Math.max(
				0.32,
				Math.min(
					desiredScale,
					(screenSize.width - edgeGap * 2) / width,
					(screenSize.height - edgeGap * 2 - 40) / height,
				),
			);
		const clampPopupX = (x: number, width: number, popupScale = scale) =>
			Math.min(
				screenSize.width - edgeGap - (width * popupScale) / 2,
				Math.max(edgeGap + (width * popupScale) / 2, x),
			);
		const mobileControls = isPortrait;
		const compactControls = isCompactLandscape && !isPopoutLandscape;
		const balanceCenterX = 205 + (balancePanelWidth - HUD.left.balance.w) / 2;
		const leftControlScale = isPopoutLandscape ? 1 : compactControls ? 0.76 : 0.84;
		const controls = {
			menuScale: leftControlScale,
			buyScale: leftControlScale * 1.12,
			balanceScale: leftControlScale,
			betScale: compactControls ? 0.84 : 0.88,
			sideScale: compactControls ? 0.96 : 1.12,
			spinScale: compactControls ? 0.9 : 1,
			menu: { x: 0, y: 0 },
			balance: { x: balanceCenterX, y: 0 },
			buy: { x: 34, y: -144 },
			auto: compactControls ? { x: 142, y: -178 } : { x: 188, y: -204 },
			turbo: compactControls ? { x: 142, y: -116 } : { x: 188, y: -118 },
			spin: compactControls ? { x: 0, y: -148 } : { x: 0, y: -162 },
			bet: compactControls ? { x: 0, y: -4 } : { x: 0, y: 0 },
			autoGlyph: compactControls ? 52 : 58,
			turboGlyph: compactControls ? 40 : 46,
		};
		const rightMaxX = Math.max(
			RIGHT_BOUNDS.maxX,
			controls.bet.x + (betPanelWidth * controls.betScale) / 2,
			controls.auto.x + (HUD.right.autoplay.size * controls.sideScale) / 2,
			controls.turbo.x + (HUD.right.turbo.size * controls.sideScale) / 2,
		);

		if (mobileControls) {
			const allMobileBetRows = Math.max(1, Math.ceil(options.length / BET_POPUP_COLUMNS.mobile));
			const betPopup = betPopupSize(BET_POPUP_COLUMNS.mobile, allMobileBetRows);
			const autoPopupScale = popupScaleFor(AUTO_POPUP_SIZE.w, AUTO_POPUP_SIZE.h, 0.78);
			const betPopupScale = popupScaleFor(betPopup.w, betPopup.h, 0.92);
			const centerX = screenSize.width * 0.5;
			const mobilePad = 14;
			const mobileBottomY = 74;
			const mobileMenuScale = 0.5;
			const mobileBalanceScale = 0.78;
			const mobileBetScale = 0.62;
			const mobileLeftGap = 8;
			const centerY = screenSize.height - bottomGap - 118 * scale;
			const menuWidth = HUD.left.menu.size * mobileMenuScale * scale;
			const balanceWidth = balancePanelWidth * mobileBalanceScale * scale;
			const menuX = (mobilePad + menuWidth / 2 - centerX) / scale;
			const balanceX = (mobilePad + menuWidth + mobileLeftGap + balanceWidth / 2 - centerX) / scale;
			const betX =
				(screenSize.width - mobilePad - (betPanelWidth * mobileBetScale * scale) / 2 - centerX) /
				scale;
			const mobileLayoutControls = {
				...controls,
				menuScale: mobileMenuScale,
				buyScale: 0.65,
				balanceScale: mobileBalanceScale,
				betScale: mobileBetScale,
				sideScale: 0.76,
				spinScale: 0.62,
				menu: { x: menuX, y: mobileBottomY + 18 },
				buy: { x: -224, y: -52 },
				balance: {
					x: balanceX,
					y: mobileBottomY,
				},
				spin: { x: 0, y: -52 },
				auto: { x: 126, y: -82 },
				turbo: { x: 126, y: -22 },
				bet: {
					x: betX,
					y: mobileBottomY,
				},
				autoGlyph: 52,
				turboGlyph: 38,
			};

			return {
				scale,
				controls: mobileLayoutControls,
				left: { x: centerX, y: centerY },
				right: { x: centerX, y: centerY },
				menuPopup: {
					x: clampPopupX(centerX + mobileLayoutControls.menu.x * scale, MENU_POPUP_PANEL.w),
					y: centerY + mobileLayoutControls.menu.y * scale - 84 * scale,
				},
				autoPopup: {
					...AUTO_POPUP_SIZE,
					scale: autoPopupScale,
					x: clampPopupX(
						centerX + mobileLayoutControls.auto.x * scale,
						AUTO_POPUP_SIZE.w,
						autoPopupScale,
					),
					y:
						centerY +
						mobileLayoutControls.auto.y * scale -
						(AUTO_POPUP_SIZE.h * autoPopupScale) / 2 -
						(HUD.right.autoplay.size * mobileLayoutControls.sideScale * 0.5 + 12) * scale,
				},
				betPopup: {
					...betPopup,
					scale: betPopupScale,
					x: clampPopupX(centerX + mobileLayoutControls.bet.x * scale, betPopup.w, betPopupScale),
					y:
						centerY +
						mobileLayoutControls.bet.y * scale -
						(betPopup.h * betPopupScale) / 2 -
						(HUD.right.bet.h * mobileLayoutControls.betScale * 0.5 + 12) * scale,
				},
				win: { x: centerX, y: centerY - 204 * scale },
			};
		}

		const rightX = screenSize.width - edgeGap - rightMaxX * scale;
		const autoX = rightX + controls.auto.x * scale;
		const autoY = baselineY + controls.auto.y * scale;
		const betX = rightX + controls.bet.x * scale;
		const betY = baselineY + controls.bet.y * scale;
		const allDesktopBetRows = Math.max(1, Math.ceil(options.length / BET_POPUP_COLUMNS.desktop));
		const desktopVisibleBetRows = isTinyLandscape
			? BET_POPUP_SCROLL_ROWS.tiny
			: isPopoutLandscape
				? BET_POPUP_SCROLL_ROWS.popout
				: allDesktopBetRows;
		const betPopup = betPopupSize(BET_POPUP_COLUMNS.desktop, desktopVisibleBetRows);
		const desiredPopupScale = isTinyLandscape
			? 0.42
			: isPopoutLandscape
				? 0.52
				: isCompactLandscape
					? 0.74
					: 1;
		const autoPopupScale = popupScaleFor(AUTO_POPUP_SIZE.w, AUTO_POPUP_SIZE.h, desiredPopupScale);
		const betPopupScale = popupScaleFor(betPopup.w, betPopup.h, desiredPopupScale);

		return {
			scale,
			controls,
			left: {
				x: edgeGap - LEFT_BOUNDS.minX * scale,
				y: baselineY,
			},
			right: {
				x: rightX,
				y: baselineY,
			},
			menuPopup: {
				x: clampPopupX(edgeGap - LEFT_BOUNDS.minX * scale, MENU_POPUP_PANEL.w),
				y: baselineY - 84 * scale,
			},
			autoPopup: {
				...AUTO_POPUP_SIZE,
				scale: autoPopupScale,
				x: clampPopupX(autoX, AUTO_POPUP_SIZE.w, autoPopupScale),
				y:
					autoY -
					(AUTO_POPUP_SIZE.h * autoPopupScale) / 2 -
					(HUD.right.autoplay.size * controls.sideScale * 0.5 + 12) * scale,
			},
			betPopup: {
				...betPopup,
				scale: betPopupScale,
				x: clampPopupX(betX, betPopup.w, betPopupScale),
				y:
					betY -
					(betPopup.h * betPopupScale) / 2 -
					(HUD.right.bet.h * controls.betScale * 0.5 + 12) * scale,
			},
			win: {
				x: screenSize.width * 0.5,
				y: baselineY,
			},
		};
	});

	const isIdle = $derived(context.stateXstateDerived.isIdle());
	const smallest = $derived(options[0]);
	const biggest = $derived(options[options.length - 1]);
	const autoActive = $derived(stateBetDerived.hasAutoBetCounter());
	const autoIndicatorActive = $derived(autoActive || autoSpinArmed);
	// an `activate` mode (Ante / Eye Spins / Ultimate) is currently toggled on → the buy-bonus
	// button turns red and acts as a one-tap "deactivate back to BASE".
	const buyBonusIndicatorActive = $derived(stateBetDerived.activeBetMode()?.type === 'activate');
	const autoDisabled = $derived(
		!autoActive && !autoSpinArmed && (!isIdle || !stateBetDerived.isBetCostAvailable()),
	);
	const turboDisabled = $derived(stateBet.isSpaceHold);
	const decDisabled = $derived(!isIdle || stateBet.betAmount <= smallest);
	const incDisabled = $derived(!isIdle || stateBet.betAmount >= biggest);
	const spinDisabled = $derived(!isIdle || !stateBetDerived.isBetCostAvailable());

	const winText = $derived(bookEventAmountToCurrencyString(stateBet.winBookEventAmount));
	const betLabelText = $derived(stateBetDerived.activeBetMode()?.text?.betAmountLabel || 'BET');

	const spinning = $derived(!isIdle);

	$effect(() => {
		const token = ++autoPopupMotionId;
		void playPopupMotion(
			showAutoPopup,
			autoPopupFx,
			(value) => (renderAutoPopup = value),
			token,
			() => autoPopupMotionId,
		);
	});
	$effect(() => {
		const token = ++betPopupMotionId;
		void playPopupMotion(
			showBetPopup,
			betPopupFx,
			(value) => (renderBetPopup = value),
			token,
			() => betPopupMotionId,
		);
	});
	$effect(() => {
		const token = ++menuPopupMotionId;
		void playPopupMotion(
			stateUi.menuOpen,
			menuPopupFx,
			(value) => (renderMenuPopup = value),
			token,
			() => menuPopupMotionId,
		);
	});

	const press = (fn: () => void) => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		fn();
	};
	const shouldResetBuyModeBeforeManualSpin = () =>
		stateBetDerived.activeBetMode()?.type === 'buy' &&
		stateBet.activeBetModeKey.toUpperCase() !== 'SUPERSPINS';

	const beginAutoSpin = () => {
		if (!stateBetDerived.isBetCostAvailable()) return;
		stateBet.autoSpinsCounter = AUTO_SPINS_TEXT_OPTION_MAP[stateUi.autoSpinsText];
		stateBet.autoSpinsLossLimitAmount = Infinity;
		stateBet.autoSpinsSingleWinLimitAmount = Infinity;
		const activeMode = stateBetDerived.activeBetMode();
		if (
			activeMode?.type === 'buy' &&
			!SELECTABLE_BUY_MODE_KEYS.has(stateBet.activeBetModeKey.toUpperCase())
		) {
			stateBet.activeBetModeKey = 'BASE';
		}
		autoSpinArmed = false;
		showAutoPopup = false;
		context.eventEmitter.broadcast({ type: 'autoBet' });
	};

	const spin = () => {
		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		if (spinDisabled) return;
		if (isIdle) {
			if (autoSpinArmed) {
				beginAutoSpin();
				return;
			}
			if (shouldResetBuyModeBeforeManualSpin()) stateBet.activeBetModeKey = 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
			return;
		}
		context.stateGameDerived.speedUpCurrentSpin();
	};

	const decreaseBet = () =>
		press(() => {
			if (!isIdle) return;
			const next = [...options].reverse().find((option) => option < stateBet.betAmount);
			stateBetDerived.setBetAmount(next ?? smallest);
		});

	const increaseBet = () =>
		press(() => {
			if (!isIdle) return;
			const next = options.find((option) => option > stateBet.betAmount);
			stateBetDerived.setBetAmount(next ?? biggest);
		});

	const autoplay = () =>
		press(() => {
			if (autoSpinArmed && !stateBetDerived.hasAutoBetCounter()) {
				autoSpinArmed = false;
				showAutoPopup = false;
				return;
			}
			if (autoDisabled) return;
			if (stateBetDerived.hasAutoBetCounter()) {
				stateBet.autoSpinsCounter = 0;
				autoSpinArmed = false;
				showAutoPopup = false;
				return;
			}
			showBetPopup = false;
			showAutoPopup = !showAutoPopup;
		});

	const toggleAutoSpinChoice = (option: AutoSpinsText) =>
		press(() => {
			if (!isIdle || !stateBetDerived.isBetCostAvailable()) return;
			if (autoSpinArmed && stateUi.autoSpinsText === option) {
				autoSpinArmed = false;
				showAutoPopup = false;
				return;
			}
			stateUi.autoSpinsText = option;
			autoSpinArmed = true;
			showAutoPopup = false;
		});

	const toggleTurbo = () =>
		press(() => {
			if (turboDisabled) return;
			if (stateBet.isTurbo) {
				stateBetDerived.updateIsTurbo(false, { persistent: true });
				return;
			}
			context.stateGameDerived.enableTurbo();
		});

	const openMenu = () => press(() => (stateUi.menuOpen = true));

	// Click-outside handling: a fullscreen scrim (below the popups) closes whichever of the
	// hamburger menu / bet / auto popups is open.
	const anyPopupOpen = $derived(showAutoPopup || showBetPopup || stateUi.menuOpen);
	const closeAllPopups = () =>
		press(() => {
			showAutoPopup = false;
			showBetPopup = false;
			stateUi.menuOpen = false;
		});
	const openBuyBonus = () =>
		press(() => {
			if (!isIdle) return;
			if (buyBonusIndicatorActive) {
				stateBet.activeBetModeKey = 'BASE';
				return;
			}
			stateModal.modal = { name: 'buyBonus' };
		});
	const openBetMenu = () =>
		press(() => {
			if (!isIdle) return;
			showAutoPopup = false;
			const popup = responsive.betPopup;
			const selectedIndex = Math.max(
				0,
				options.findIndex((option) => option === stateBet.betAmount),
			);
			const selectedRow = Math.floor(selectedIndex / popup.columns);
			betScrollRow = clamp(selectedRow - Math.floor(popup.visibleRows / 2), 0, popup.maxScrollRow);
			showBetPopup = !showBetPopup;
		});
	const scrollBetOptions = (direction: number) => {
		const popup = responsive.betPopup;
		betScrollRow = clamp(betScrollRow + direction, 0, popup.maxScrollRow);
	};
	const startBetScrollDrag = (event: FederatedPointerEvent) => {
		if (responsive.betPopup.maxScrollRow <= 0) return;
		event.stopPropagation();
		betScrollDragging = true;
		betScrollMoved = false;
		betScrollDragStartY = event.global.y;
		betScrollDragStartRow = responsive.betPopup.scrollRow;
	};
	const updateBetScrollDrag = (event: FederatedPointerEvent) => {
		if (!betScrollDragging) return;
		event.stopPropagation();
		const dragDelta = betScrollDragStartY - event.global.y;
		if (Math.abs(dragDelta) > 8) betScrollMoved = true;
		const rowDelta = Math.round(dragDelta / (BET_CHOICE.gapY * responsive.betPopup.scale));
		betScrollRow = clamp(betScrollDragStartRow + rowDelta, 0, responsive.betPopup.maxScrollRow);
	};
	const stopBetScrollDrag = () => {
		betScrollDragging = false;
		betScrollMoved = false;
	};
	const menuLocalX = (event: FederatedPointerEvent) =>
		(event.global.x - responsive.menuPopup.x) / responsive.scale;
	const setVolumeSliderValue = (key: 'music' | 'sfx', event: FederatedPointerEvent) => {
		event.stopPropagation();
		const trackLeft = MENU_SLIDER.trackX - MENU_SLIDER.w / 2;
		const nextValue = Math.round(
			clamp((menuLocalX(event) - trackLeft) / MENU_SLIDER.w, 0, 1) * 100,
		);
		if (nextValue > 0 && stateSound.volumeValueMaster === 0) stateSound.volumeValueMaster = 75;
		if (key === 'music') {
			stateSound.volumeValueMusic = nextValue;
		} else {
			stateSound.volumeValueSoundEffect = nextValue;
		}
	};
	const startVolumeSliderDrag = (key: 'music' | 'sfx', event: FederatedPointerEvent) => {
		volumeSliderDragging = key;
		setVolumeSliderValue(key, event);
	};
	const updateVolumeSliderDrag = (event: FederatedPointerEvent) => {
		if (!volumeSliderDragging) return;
		setVolumeSliderValue(volumeSliderDragging, event);
	};
	const stopVolumeSliderDrag = (event: FederatedPointerEvent) => {
		event.stopPropagation();
		volumeSliderDragging = null;
	};
	const wheelBetOptions = (event: FederatedWheelEvent) => {
		if (responsive.betPopup.maxScrollRow <= 0) return;
		event.preventDefault();
		event.stopPropagation();
		scrollBetOptions(event.deltaY > 0 ? 1 : -1);
	};
	const chooseBetAmount = (value: number) => {
		if (betScrollMoved || !isIdle) return;
		press(() => {
			stateBetDerived.setBetAmount(value);
			showBetPopup = false;
		});
	};

	const labelStyle = {
		fontFamily: BAR_FONT,
		fontWeight: '800',
		fontSize: 17,
		fill: GLASS.textDim,
		letterSpacing: 0.8,
		dropShadow: { color: GLASS.shadow, blur: 4, distance: 2, alpha: 0.8 },
	};
	const valueStyle = {
		fontFamily: BAR_FONT,
		fontWeight: '900',
		fontSize: 36,
		fill: 0xffffff,
		dropShadow: { color: GLASS.shadow, blur: 6, distance: 2, alpha: 0.78 },
	};
	const readoutLabelStyle = {
		...labelStyle,
		fill: 0xffd7b0,
		dropShadow: { color: 0x2a0710, blur: 5, distance: 2, alpha: 0.82 },
	};
	const readoutValueStyle = {
		...valueStyle,
		fill: 0xffffff,
		dropShadow: { color: 0x2a0710, blur: 7, distance: 2, alpha: 0.82 },
	};
	const buttonScale = (
		pressed: boolean,
		hovered: boolean,
		disabled = false,
		hoverScale = 1.07,
		pressScale = 0.94,
	) => {
		if (disabled) return 1;
		if (pressed) return pressScale;
		if (hovered) return hoverScale;
		return 1;
	};

	const displayAutoSpinText = (value: AutoSpinsText) => value;
	const autoCounterText = $derived(
		stateBet.autoSpinsCounter === Infinity ? INFINITY_MARK : `${stateBet.autoSpinsCounter}`,
	);
	const autoCounterFontSize = $derived.by(() => {
		if (stateBet.autoSpinsCounter === Infinity) return 78;
		if (stateBet.autoSpinsCounter > 99) return 54;
		if (stateBet.autoSpinsCounter > 9) return 68;
		return 78;
	});
	const menuActions: { icon: IconKey; label: string; y: number; onpress: () => void }[] = [
		{
			icon: 'info',
			label: 'info',
			y: -158,
			onpress: () => press(() => (stateModal.modal = { name: 'gameRules' })),
		},
	];
	const menuVolumeSliders: { key: 'music' | 'sfx'; label: string; y: number }[] = [
		{ key: 'music', label: 'MUSIC', y: -96 },
		{ key: 'sfx', label: 'SFX', y: -34 },
	];
	const menuPopupPanel = {
		...MENU_POPUP_PANEL,
	};

	const drawGlassPanel = (
		g: import('pixi.js').Graphics,
		w: number,
		h: number,
		radius = 24,
		active = false,
	) => {
		const hoverBoost = active ? 1 : 0;
		g.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, radius + 4).stroke({
			width: active ? 7 : 5,
			color: GLASS.glow,
			alpha: active ? 0.2 : 0.1,
		});
		g.roundRect(-w / 2, -h / 2, w, h, radius).fill({
			color: active ? GLASS.bgHover : GLASS.bg,
			alpha: active ? 0.48 : 0.34,
		});
		g.roundRect(-w / 2, -h / 2 + h * 0.42, w, h * 0.58, radius).fill({
			color: GLASS.bgDeep,
			alpha: 0.3,
		});
		g.roundRect(-w / 2, -h / 2, w, h * 0.5, radius).fill({
			color: 0xffffff,
			alpha: 0.06 + hoverBoost * 0.08,
		});
		g.roundRect(-w / 2 + 7, -h / 2 + 6, w - 14, h * 0.34, Math.max(6, radius - 7)).fill({
			color: 0xffffff,
			alpha: 0.035 + hoverBoost * 0.055,
		});
		g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({
			width: active ? 2 : 1.5,
			color: GLASS.border,
			alpha: active ? 0.88 : 0.62,
		});
		g.roundRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, Math.max(4, radius - 5)).stroke({
			width: 1.1,
			color: 0xffffff,
			alpha: active ? 0.3 : 0.18,
		});
	};

	const drawPopoverPanel = (
		g: import('pixi.js').Graphics,
		w: number,
		h: number,
		radius = 20,
		showArrow = true,
	) => {
		g.roundRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, radius + 4).stroke({
			width: 5,
			color: GLASS.glow,
			alpha: 0.12,
		});
		g.roundRect(-w / 2, -h / 2, w, h, radius).fill({ color: GLASS.bg, alpha: 0.74 });
		g.roundRect(-w / 2, -h / 2, w, h * 0.48, radius).fill({ color: 0xffffff, alpha: 0.08 });
		g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({
			width: 2,
			color: GLASS.border,
			alpha: 0.72,
		});
		if (!showArrow) return;
		g.poly([-16, h / 2 - 2, 16, h / 2 - 2, 0, h / 2 + 14], true).fill({
			color: GLASS.bg,
			alpha: 0.74,
		});
		g.poly([-16, h / 2 - 2, 16, h / 2 - 2, 0, h / 2 + 14], true).stroke({
			width: 1.2,
			color: GLASS.border,
			alpha: 0.4,
			join: 'round',
		});
	};

	const drawButtonAccentRing = (g: import('pixi.js').Graphics, size: number, color = 0xff3f36) => {
		const w = size;
		const h = size * 0.86;
		g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 22).stroke({
			width: 6,
			color,
			alpha: 0.36,
		});
		g.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 20).stroke({
			width: 2.8,
			color,
			alpha: 0.95,
		});
	};
	const drawPanelAccentRing = (
		g: import('pixi.js').Graphics,
		w: number,
		h: number,
		radius = 24,
		color = 0xff3f36,
	) => {
		g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, radius + 2).stroke({
			width: 6,
			color,
			alpha: 0.24,
		});
		g.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, radius - 2).stroke({
			width: 2.4,
			color,
			alpha: 0.92,
		});
	};
	const drawPanelHoverStroke = (
		g: import('pixi.js').Graphics,
		w: number,
		h: number,
		radius = 24,
	) => {
		g.roundRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, radius + 5).stroke({
			width: 6,
			color: GLASS.glow,
			alpha: 0.28,
		});
		g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({
			width: 2.8,
			color: GLASS.border,
			alpha: 0.96,
		});
	};
	const drawButtonHoverStroke = (g: import('pixi.js').Graphics, size: number) => {
		drawPanelHoverStroke(g, size, size * 0.86, 20);
	};

	const drawChoiceChip = (
		g: import('pixi.js').Graphics,
		w: number,
		h: number,
		selected = false,
		accent = 0xf6b23a,
	) => {
		const radius = Math.min(14, h * 0.28);
		g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, radius + 2).stroke({
			width: 4,
			color: selected ? accent : GLASS.glow,
			alpha: selected ? 0.16 : 0.08,
		});
		g.roundRect(-w / 2, -h / 2, w, h, radius).fill({
			color: selected ? accent : GLASS.bg,
			alpha: selected ? 0.24 : 0.38,
		});
		g.roundRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, Math.max(6, radius - 6)).fill({
			color: GLASS.bgDeep,
			alpha: selected ? 0.24 : 0.18,
		});
		g.roundRect(-w / 2, -h / 2, w, h * 0.52, radius).fill({
			color: 0xffffff,
			alpha: selected ? 0.18 : 0.08,
		});
		g.roundRect(-w / 2, -h / 2, w, h, radius).stroke({
			width: selected ? 2.1 : 1.35,
			color: selected ? accent : GLASS.border,
			alpha: selected ? 0.88 : 0.52,
		});
		if (!selected) return;
		g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, radius + 2).stroke({
			width: 2.4,
			color: accent,
			alpha: 0.34,
		});
	};
	const drawInfinityIcon = (g: import('pixi.js').Graphics, size: number, selected = false) => {
		const w = size * 0.78;
		const h = size * 0.34;
		const color = selected ? 0xfff2f0 : 0xffffff;
		const alpha = selected ? 1 : 0.92;
		const drawLoop = (width: number, strokeAlpha: number) => {
			g.moveTo(-w / 2, 0)
				.bezierCurveTo(-w / 2, -h, -w * 0.14, -h, 0, 0)
				.bezierCurveTo(w * 0.14, h, w / 2, h, w / 2, 0)
				.bezierCurveTo(w / 2, -h, w * 0.14, -h, 0, 0)
				.bezierCurveTo(-w * 0.14, h, -w / 2, h, -w / 2, 0)
				.stroke({ width, color, alpha: strokeAlpha, cap: 'round', join: 'round' });
		};
		if (selected) drawLoop(10, 0.18);
		drawLoop(4.8, alpha);
	};

	const drawRoundButton = (
		g: import('pixi.js').Graphics,
		size: number,
		active = false,
		disabled = false,
	) => {
		const w = size;
		const h = size * 0.86;
		drawGlassPanel(g, w, h, 20, active);
	};

	const drawVolumeSlider = (g: import('pixi.js').Graphics, value: number) => {
		const percent = clamp(value / 100, 0, 1);
		const trackLeft = -MENU_SLIDER.w / 2;
		const filledW = MENU_SLIDER.w * percent;
		const knobX = trackLeft + filledW;

		g.roundRect(trackLeft, -6, MENU_SLIDER.w, 12, 6).fill({
			color: GLASS.shadow,
			alpha: 0.48,
		});
		g.roundRect(trackLeft, -5, MENU_SLIDER.w, 10, 5).fill({
			color: GLASS.bgDeep,
			alpha: 0.78,
		});
		if (filledW > 0) {
			g.roundRect(trackLeft, -5, Math.max(10, filledW), 10, 5).fill({
				color: GLASS.glowStrong,
				alpha: 0.95,
			});
		}
		g.circle(knobX, 0, 15).fill({ color: GLASS.bg, alpha: 0.95 });
		g.circle(knobX, 0, 11).fill({ color: 0xffffff, alpha: 0.94 });
		g.circle(knobX, 0, 16).stroke({ width: 1.8, color: GLASS.border, alpha: 0.72 });
	};

	const drawMenuButton = (g: import('pixi.js').Graphics, size: number, active = false) => {
		drawRoundButton(g, size, active);
	};

	const drawSpinPanel = (g: import('pixi.js').Graphics, size: number) => {
		drawGlassPanel(g, size * 1.08, size * 0.76, 28, true);
	};
</script>

<OnHotkey hotkey="Space" disabled={spinDisabled} onpress={spin} />

<Container zIndex={30} sortableChildren>
	<!-- click-outside scrim: above the controls but below the popups (22/45/46); closes any open popup -->
	{#if anyPopupOpen}
		<Button
			sizes={{ width: screenSize.width, height: screenSize.height }}
			onpress={closeAllPopups}
			zIndex={15}
		>
			{#snippet children({ center })}
				<Rectangle
					anchor={0.5}
					x={center.x}
					y={center.y}
					width={screenSize.width}
					height={screenSize.height}
					backgroundAlpha={0.001}
				/>
			{/snippet}
		</Button>
	{/if}

	<!-- lower-left cluster -->
	<Container x={responsive.left.x} y={responsive.left.y} scale={responsive.scale} zIndex={5}>
		<Button
			x={responsive.controls.menu.x}
			y={responsive.controls.menu.y}
			anchor={0.5}
			sizes={{ width: HUD.left.menu.size, height: HUD.left.menu.size }}
			onpress={openMenu}
			zIndex={5}
		>
			{#snippet children({ center, hovered, pressed })}
				<Container
					x={center.x}
					y={center.y}
					scale={buttonScale(pressed, hovered) * responsive.controls.menuScale}
				>
					<Graphics
						draw={(g) => {
							drawMenuButton(g, HUD.left.menu.size, stateUi.menuOpen || hovered);
							if (hovered) drawButtonHoverStroke(g, HUD.left.menu.size);
						}}
					/>
					<Graphics draw={(g) => drawControlGlyph(g, 'menu', 74, { active: stateUi.menuOpen })} />
				</Container>
			{/snippet}
		</Button>

		<Button
			x={responsive.controls.balance.x}
			y={responsive.controls.balance.y}
			anchor={0.5}
			sizes={{ width: balancePanelWidth, height: HUD.left.balance.h }}
			onpress={() => undefined}
			zIndex={4}
		>
			{#snippet children({ center })}
				<Container x={center.x} y={center.y} scale={responsive.controls.balanceScale}>
					<Graphics draw={(g) => drawGlassPanel(g, balancePanelWidth, HUD.left.balance.h, 22)} />
					<Text anchor={0.5} y={-25} text="BALANCE" style={readoutLabelStyle} />
					<Text
						anchor={0.5}
						y={18}
						text={balanceText}
						style={{ ...readoutValueStyle, fontSize: balanceValueFontSize }}
					/>
				</Container>
			{/snippet}
		</Button>

		<Button
			x={responsive.controls.buy.x}
			y={responsive.controls.buy.y}
			anchor={0.5}
			sizes={{ width: HUD.left.buyBonus.w, height: HUD.left.buyBonus.h }}
			onpress={openBuyBonus}
			disabled={!isIdle}
			zIndex={5}
		>
			{#snippet children({ center, hovered, pressed })}
				<Container
					x={center.x}
					y={center.y}
					scale={buttonScale(pressed, hovered, !isIdle) * responsive.controls.buyScale}
					rotation={-0.055}
					alpha={isIdle ? 1 : 0.48}
				>
					<Graphics
						draw={(g) => {
							drawGlassPanel(
								g,
								HUD.left.buyBonus.w,
								HUD.left.buyBonus.h,
								26,
								buyBonusIndicatorActive || (hovered && isIdle),
							);
							if (buyBonusIndicatorActive) {
								// red "active" fill + ring — tap deactivates back to BASE
								g.roundRect(
									-HUD.left.buyBonus.w / 2,
									-HUD.left.buyBonus.h / 2,
									HUD.left.buyBonus.w,
									HUD.left.buyBonus.h,
									26,
								).fill({ color: 0xff3f36, alpha: 0.32 });
								drawPanelAccentRing(g, HUD.left.buyBonus.w, HUD.left.buyBonus.h, 26);
							}
							if (hovered && isIdle) {
								drawPanelHoverStroke(g, HUD.left.buyBonus.w, HUD.left.buyBonus.h, 26);
							}
						}}
					/>
					{#if buyBonusIndicatorActive}
						<!-- active mode → "DEACTIVATE" glyph instead of the provider logo -->
						<Text
							anchor={0.5}
							text="DEACTIVATE"
							style={{
								fontFamily: BAR_FONT,
								fontWeight: '900',
								fontSize: 24,
								fill: 0xffffff,
								letterSpacing: 0.6,
								dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.85 },
							}}
						/>
					{:else}
						<!-- provider logo as the buy-bonus glyph (parent Container handles the disabled dim) -->
						<Sprite key="providerLogo" anchor={0.5} y={-8} width={70} height={84} />
					{/if}
				</Container>
			{/snippet}
		</Button>
	</Container>

	<!-- right-side stack -->
	<Container x={responsive.right.x} y={responsive.right.y} scale={responsive.scale} zIndex={10}>
		<Button
			x={responsive.controls.auto.x}
			y={responsive.controls.auto.y}
			anchor={0.5}
			sizes={{
				width: HUD.right.autoplay.size * responsive.controls.sideScale,
				height: HUD.right.autoplay.size * responsive.controls.sideScale,
			}}
			onpress={autoplay}
			disabled={autoDisabled}
			zIndex={8}
		>
			{#snippet children({ center, hovered, pressed })}
				<Container
					x={center.x}
					y={center.y}
					scale={buttonScale(pressed, hovered, autoDisabled) * responsive.controls.sideScale}
					alpha={autoDisabled ? 0.45 : 1}
				>
					<Graphics
						draw={(g) => {
							drawRoundButton(g, HUD.right.autoplay.size, autoIndicatorActive || hovered);
							if (autoIndicatorActive) {
								drawButtonAccentRing(g, HUD.right.autoplay.size, ACTIVE_ACCENT);
							}
							if (hovered && !autoDisabled) drawButtonHoverStroke(g, HUD.right.autoplay.size);
						}}
					/>
					<Graphics
						draw={(g) =>
							drawControlGlyph(g, 'autoplay', responsive.controls.autoGlyph, {
								active: autoIndicatorActive,
								disabled: autoDisabled,
								color: autoIndicatorActive ? ACTIVE_ACCENT_BRIGHT : 0xffffff,
							})}
					/>
				</Container>
			{/snippet}
		</Button>

		<Button
			x={responsive.controls.turbo.x}
			y={responsive.controls.turbo.y}
			anchor={0.5}
			sizes={{
				width: HUD.right.turbo.size * responsive.controls.sideScale,
				height: HUD.right.turbo.size * responsive.controls.sideScale,
			}}
			onpress={toggleTurbo}
			disabled={turboDisabled}
			zIndex={8}
		>
			{#snippet children({ center, hovered, pressed })}
				<Container
					x={center.x}
					y={center.y}
					scale={buttonScale(pressed, hovered, turboDisabled) * responsive.controls.sideScale}
					alpha={turboDisabled ? 0.45 : 1}
				>
					<Graphics
						draw={(g) => {
							drawRoundButton(g, HUD.right.turbo.size, stateBet.isTurbo || hovered);
							if (stateBet.isTurbo) drawButtonAccentRing(g, HUD.right.turbo.size, ACTIVE_ACCENT);
							if (hovered && !turboDisabled) drawButtonHoverStroke(g, HUD.right.turbo.size);
						}}
					/>
					<Graphics
						draw={(g) =>
							drawControlGlyph(g, 'turbo', responsive.controls.turboGlyph, {
								active: stateBet.isTurbo,
								disabled: turboDisabled,
								color: stateBet.isTurbo ? ACTIVE_ACCENT_BRIGHT : 0xffffff,
							})}
					/>
				</Container>
			{/snippet}
		</Button>

		<Button
			x={responsive.controls.spin.x}
			y={responsive.controls.spin.y}
			anchor={0.5}
			sizes={{ width: HUD.right.spin.size, height: HUD.right.spin.size }}
			onpress={spin}
			disabled={spinDisabled}
			zIndex={12}
		>
			{#snippet children({ center, hovered, pressed })}
				<Container
					x={center.x}
					y={center.y}
					scale={buttonScale(pressed, hovered, spinDisabled) * responsive.controls.spinScale}
					rotation={-0.035}
					alpha={spinDisabled ? 0.48 : 1}
				>
					<Graphics
						draw={(g) => {
							drawSpinPanel(g, HUD.right.spin.size);
							if (hovered && !spinDisabled) {
								drawPanelHoverStroke(g, HUD.right.spin.size * 1.08, HUD.right.spin.size * 0.76, 28);
							}
						}}
					/>
					{#if autoActive}
						<Text
							anchor={0.5}
							rotation={0.035}
							text={autoCounterText}
							style={{
								fontFamily: BAR_FONT,
								fontWeight: '900',
								fontSize: autoCounterFontSize,
								fill: 0xffffff,
								dropShadow: { color: 0x000000, blur: 8, distance: 2, alpha: 0.9 },
							}}
						/>
					{:else}
						<Graphics
							rotation={0.035}
							draw={(g) =>
								drawControlGlyph(g, 'spin', HUD.right.spin.size * 0.72, {
									active: spinning,
									disabled: spinDisabled,
									stop: spinning,
								})}
						/>
					{/if}
				</Container>
			{/snippet}
		</Button>

		<Container
			x={responsive.controls.bet.x}
			y={responsive.controls.bet.y}
			scale={responsive.controls.betScale}
			zIndex={9}
		>
			<Button
				anchor={0.5}
				sizes={{ width: betPanelWidth, height: HUD.right.bet.h }}
				onpress={openBetMenu}
				disabled={!isIdle}
			>
				{#snippet children({ center, hovered, pressed })}
					<Container
						x={center.x}
						y={center.y}
						scale={buttonScale(pressed, hovered, !isIdle, 1.025, 0.99)}
					>
						<Graphics
							draw={(g) => {
								drawGlassPanel(g, betPanelWidth, HUD.right.bet.h, 22, hovered && isIdle);
								if (hovered && isIdle) drawPanelHoverStroke(g, betPanelWidth, HUD.right.bet.h, 22);
							}}
						/>
						<Text anchor={0.5} y={-28} text={betLabelText} style={readoutLabelStyle} />
						<Text
							anchor={0.5}
							y={16}
							text={betText}
							style={{ ...readoutValueStyle, fontSize: betValueFontSize }}
						/>
					</Container>
				{/snippet}
			</Button>

			<Button
				x={0 - betButtonOffset}
				y={BET_STEP_BUTTON.y}
				anchor={0.5}
				sizes={{ width: BET_STEP_BUTTON.hitW, height: BET_STEP_BUTTON.hitH }}
				onpress={decreaseBet}
				disabled={decDisabled}
			>
				{#snippet children({ center, hovered, pressed })}
					<Container
						x={center.x}
						y={center.y}
						scale={buttonScale(pressed, hovered, decDisabled)}
						alpha={decDisabled ? 0.42 : 1}
					>
						<Graphics
							draw={(g) => {
								drawRoundButton(g, BET_STEP_BUTTON.drawSize, hovered && !decDisabled);
								if (hovered && !decDisabled) drawButtonHoverStroke(g, BET_STEP_BUTTON.drawSize);
							}}
						/>
						<Graphics
							draw={(g) =>
								drawControlGlyph(g, 'minus', BET_STEP_BUTTON.glyphSize, { disabled: decDisabled })}
						/>
					</Container>
				{/snippet}
			</Button>

			<Button
				x={betButtonOffset}
				y={BET_STEP_BUTTON.y}
				anchor={0.5}
				sizes={{ width: BET_STEP_BUTTON.hitW, height: BET_STEP_BUTTON.hitH }}
				onpress={increaseBet}
				disabled={incDisabled}
			>
				{#snippet children({ center, hovered, pressed })}
					<Container
						x={center.x}
						y={center.y}
						scale={buttonScale(pressed, hovered, incDisabled)}
						alpha={incDisabled ? 0.42 : 1}
					>
						<Graphics
							draw={(g) => {
								drawRoundButton(g, BET_STEP_BUTTON.drawSize, hovered && !incDisabled);
								if (hovered && !incDisabled) drawButtonHoverStroke(g, BET_STEP_BUTTON.drawSize);
							}}
						/>
						<Graphics
							draw={(g) =>
								drawControlGlyph(g, 'plus', BET_STEP_BUTTON.glyphSize, { disabled: incDisabled })}
						/>
					</Container>
				{/snippet}
			</Button>
		</Container>
	</Container>

	{#if renderAutoPopup}
		<Container
			x={responsive.autoPopup.x}
			y={responsive.autoPopup.y + popupLift(autoPopupFx.current)}
			scale={responsive.autoPopup.scale * popupScale(autoPopupFx.current)}
			alpha={popupAlpha(autoPopupFx.current)}
			zIndex={45}
		>
			<Graphics
				draw={(g) => drawPopoverPanel(g, responsive.autoPopup.w, responsive.autoPopup.h, 22, false)}
			/>
			<!-- absorb clicks on the panel so they don't fall through to the close-scrim -->
			<Button
				anchor={0.5}
				sizes={{ width: responsive.autoPopup.w, height: responsive.autoPopup.h }}
				onpress={() => {}}
			>
				{#snippet children({ center })}
					<Rectangle
						anchor={0.5}
						x={center.x}
						y={center.y}
						width={responsive.autoPopup.w}
						height={responsive.autoPopup.h}
						backgroundAlpha={0.001}
					/>
				{/snippet}
			</Button>
			{#each autoPopupOptions as option, index}
				{@const selected = stateUi.autoSpinsText === option}
				<Button
					x={(index % 3) * AUTO_CHOICE.gapX - AUTO_CHOICE.gapX}
					y={Math.floor(index / 3) * AUTO_CHOICE.gapY - AUTO_CHOICE.gapY / 2}
					anchor={0.5}
					sizes={{ width: AUTO_CHOICE.w, height: AUTO_CHOICE.h }}
					onpress={() => toggleAutoSpinChoice(option)}
				>
					{#snippet children({ center, hovered, pressed })}
						<Container x={center.x} y={center.y} scale={buttonScale(pressed, hovered)}>
							<Graphics
								draw={(g) => {
									drawChoiceChip(
										g,
										AUTO_CHOICE.w,
										AUTO_CHOICE.h,
										(selected && autoSpinArmed) || hovered,
										GLASS.glowStrong,
									);
									if (hovered) drawPanelHoverStroke(g, AUTO_CHOICE.w, AUTO_CHOICE.h, 14);
								}}
							/>
							{#if option === INFINITY_MARK}
								<Graphics draw={(g) => drawInfinityIcon(g, 44, selected && autoSpinArmed)} />
							{:else}
								<Text
									anchor={0.5}
									text={displayAutoSpinText(option)}
									style={{
										fontFamily: BAR_FONT,
										fontWeight: '800',
										fontSize: AUTO_CHOICE.fontSize,
										fill: 0xffffff,
										dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.7 },
									}}
								/>
							{/if}
						</Container>
					{/snippet}
				</Button>
			{/each}
		</Container>
	{/if}

	{#if renderBetPopup}
		<Container
			x={responsive.betPopup.x}
			y={responsive.betPopup.y + popupLift(betPopupFx.current)}
			scale={responsive.betPopup.scale * popupScale(betPopupFx.current)}
			alpha={popupAlpha(betPopupFx.current)}
			zIndex={46}
		>
			<Graphics
				draw={(g) => drawPopoverPanel(g, responsive.betPopup.w, responsive.betPopup.h, 24, false)}
			/>
			<!-- absorb clicks on the panel so they don't fall through to the close-scrim -->
			<Button
				anchor={0.5}
				sizes={{ width: responsive.betPopup.w, height: responsive.betPopup.h }}
				onpress={() => {}}
			>
				{#snippet children({ center })}
					<Rectangle
						anchor={0.5}
						x={center.x}
						y={center.y}
						width={responsive.betPopup.w}
						height={responsive.betPopup.h}
						backgroundAlpha={0.001}
					/>
				{/snippet}
			</Button>
			{@const firstBetOptionIndex = responsive.betPopup.scrollRow * responsive.betPopup.columns}
			<Container
				eventMode={responsive.betPopup.maxScrollRow > 0 ? 'static' : 'passive'}
				cursor={responsive.betPopup.maxScrollRow > 0
					? betScrollDragging
						? 'grabbing'
						: 'grab'
					: 'default'}
				onpointerdown={startBetScrollDrag}
				onglobalpointermove={updateBetScrollDrag}
				onpointerup={stopBetScrollDrag}
				onpointerupoutside={stopBetScrollDrag}
				onwheel={wheelBetOptions}
			>
				<Graphics
					isMask
					draw={(g) => {
						g.roundRect(
							-responsive.betPopup.w / 2 + BET_POPUP_PADDING.x * 0.55,
							-responsive.betPopup.h / 2 + BET_POPUP_PADDING.y * 0.6,
							responsive.betPopup.w - BET_POPUP_PADDING.x * 1.1,
							responsive.betPopup.h - BET_POPUP_PADDING.y * 1.2,
							18,
						).fill({ color: 0xffffff, alpha: 1 });
					}}
				/>
				{#each options.slice(firstBetOptionIndex, firstBetOptionIndex + responsive.betPopup.visibleRows * responsive.betPopup.columns) as option, index}
					{@const selected = stateBet.betAmount === option}
					{@const optionText = numberToCurrencyString(option)}
					<Button
						x={(index % responsive.betPopup.columns) * BET_CHOICE.gapX -
							((responsive.betPopup.columns - 1) * BET_CHOICE.gapX) / 2}
						y={Math.floor(index / responsive.betPopup.columns) * BET_CHOICE.gapY -
							((responsive.betPopup.visibleRows - 1) * BET_CHOICE.gapY) / 2}
						anchor={0.5}
						sizes={{ width: BET_CHOICE.w, height: BET_CHOICE.h }}
						onpress={() => chooseBetAmount(option)}
					>
						{#snippet children({ center, hovered, pressed })}
							<Container x={center.x} y={center.y} scale={buttonScale(pressed, hovered)}>
								<Graphics
									draw={(g) => {
										drawChoiceChip(g, BET_CHOICE.w, BET_CHOICE.h, selected || hovered, 0xffffff);
										if (hovered) drawPanelHoverStroke(g, BET_CHOICE.w, BET_CHOICE.h, 14);
									}}
								/>
								<Text
									anchor={0.5}
									text={optionText}
									style={{
										fontFamily: BAR_FONT,
										fontWeight: '850',
										fontSize: choiceFontSize(optionText, BET_CHOICE.w, BET_CHOICE.fontSize, 14),
										fill: 0xffffff,
										dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.75 },
									}}
								/>
							</Container>
						{/snippet}
					</Button>
				{/each}
			</Container>
			{#if responsive.betPopup.maxScrollRow > 0}
				<Graphics
					draw={(g) => {
						const trackH = responsive.betPopup.h - 82;
						const trackX = responsive.betPopup.w / 2 - 23;
						const trackY = -trackH / 2;
						const knobH = Math.max(
							42,
							trackH * (responsive.betPopup.visibleRows / responsive.betPopup.rows),
						);
						const knobTravel = Math.max(0, trackH - knobH);
						const knobY =
							trackY +
							knobH / 2 +
							knobTravel * (responsive.betPopup.scrollRow / responsive.betPopup.maxScrollRow);
						g.roundRect(trackX - 5, trackY, 10, trackH, 5).fill({ color: 0xffffff, alpha: 0.22 });
						g.roundRect(trackX - 3, trackY + 2, 6, trackH - 4, 3).fill({
							color: 0x11182a,
							alpha: 0.72,
						});
						g.roundRect(trackX - 7, knobY - knobH / 2, 14, knobH, 7).fill({
							color: 0xf6b23a,
							alpha: 0.94,
						});
						g.roundRect(trackX - 7, knobY - knobH / 2, 14, knobH, 7).stroke({
							width: 1.2,
							color: 0xffffff,
							alpha: 0.52,
						});
					}}
				/>
			{/if}
		</Container>
	{/if}

	{#if renderMenuPopup}
		<Container
			x={responsive.menuPopup.x}
			y={responsive.menuPopup.y + popupLift(menuPopupFx.current)}
			scale={responsive.scale * popupScale(menuPopupFx.current)}
			alpha={popupAlpha(menuPopupFx.current)}
			zIndex={22}
		>
			<Graphics
				y={menuPopupPanel.centerY}
				draw={(g) => drawPopoverPanel(g, menuPopupPanel.w, menuPopupPanel.h, 22, false)}
			/>
			<Button
				y={menuPopupPanel.centerY}
				anchor={0.5}
				sizes={{ width: menuPopupPanel.w, height: menuPopupPanel.h }}
				onpress={() => {}}
			>
				{#snippet children({ center })}
					<Rectangle
						anchor={0.5}
						x={center.x}
						y={center.y}
						width={menuPopupPanel.w}
						height={menuPopupPanel.h}
						backgroundAlpha={0.001}
					/>
				{/snippet}
			</Button>
			{#each menuVolumeSliders as slider}
				{@const value =
					slider.key === 'music' ? stateSound.volumeValueMusic : stateSound.volumeValueSoundEffect}
				<Container
					y={slider.y}
					eventMode="static"
					alpha={hoveredSlider === slider.key || volumeSliderDragging === slider.key ? 1 : 0.72}
					cursor={volumeSliderDragging === slider.key ? 'grabbing' : 'pointer'}
					onpointerover={() => (hoveredSlider = slider.key)}
					onpointerout={() => (hoveredSlider = null)}
					onpointerdown={(event) => startVolumeSliderDrag(slider.key, event)}
					onglobalpointermove={updateVolumeSliderDrag}
					onpointerup={stopVolumeSliderDrag}
					onpointerupoutside={stopVolumeSliderDrag}
				>
					<Rectangle
						anchor={0.5}
						x={MENU_SLIDER.trackX}
						width={MENU_SLIDER.w + 38}
						height={MENU_SLIDER.h}
						backgroundAlpha={0.001}
					/>
					<Text
						anchor={{ x: 0, y: 0.5 }}
						x={MENU_SLIDER.labelX}
						text={slider.label}
						style={{
							fontFamily: BAR_FONT,
							fontWeight: '850',
							fontSize: MENU_SLIDER.labelFontSize,
							fill: 0xffffff,
							dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.75 },
						}}
					/>
					<Graphics x={MENU_SLIDER.trackX} draw={(g) => drawVolumeSlider(g, value)} />
				</Container>
			{/each}
			{#each menuActions as item}
				<Button
					y={item.y}
					anchor={0.5}
					sizes={{ width: MENU_ACTION_BUTTON.w, height: MENU_ACTION_BUTTON.h }}
					onpress={item.onpress}
				>
					{#snippet children({ center, hovered, pressed })}
						<Container
							x={center.x}
							y={center.y}
							scale={buttonScale(pressed, hovered)}
							alpha={hovered ? 1 : 0.72}
						>
							<Rectangle
								anchor={0.5}
								width={MENU_ACTION_BUTTON.w}
								height={MENU_ACTION_BUTTON.h}
								backgroundAlpha={0.001}
							/>
							<Graphics
								x={MENU_ACTION_BUTTON.iconX}
								draw={(g) => icons[item.icon](g, MENU_ACTION_BUTTON.iconSize, 0xffffff)}
							/>
							<Text
								anchor={{ x: 0, y: 0.5 }}
								x={MENU_ACTION_BUTTON.labelX}
								text={item.label}
								style={{
									fontFamily: BAR_FONT,
									fontWeight: '850',
									fontSize: MENU_ACTION_BUTTON.fontSize,
									fill: 0xffffff,
									dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.75 },
								}}
							/>
						</Container>
					{/snippet}
				</Button>
			{/each}
		</Container>
	{/if}

	{#if stateBet.winBookEventAmount > 0}
		<Container x={responsive.win.x} y={responsive.win.y} scale={responsive.scale} zIndex={7}>
			<Graphics draw={(g) => drawGlassPanel(g, 300, 78, 18)} />
			<Text anchor={0.5} y={-17} text="WIN" style={{ ...labelStyle, fontSize: 15 }} />
			<Text anchor={0.5} y={16} text={winText} style={{ ...valueStyle, fontSize: 28 }} />
		</Container>
	{/if}

	<Rectangle
		x={screenSize.width * 0.5}
		y={screenSize.height * 0.5}
		anchor={0.5}
		width={1}
		height={1}
		backgroundAlpha={0}
	/>
</Container>
