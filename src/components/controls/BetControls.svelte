<script lang="ts">
	import { Container, Graphics, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import {
		AUTO_SPINS_TEXT_OPTION_MAP,
		INFINITY_MARK,
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateUi,
		type AutoSpinsText,
	} from 'state-shared';
	import { bookEventAmountToCurrencyString, numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../../game/context';
	import SpinButton from './SpinButton.svelte';
	import { icons } from './icons';
	import { C, FONT } from './theme';

	const context = getContext();
	const layout = $derived(context.stateLayoutDerived.mainLayoutStandard());
	const W = $derived(layout.width);
	const H = $derived(layout.height);

	const controls = {
		width: 1200,
		height: 204,
		sections: {
			menu: { x: 64, y: 106, w: 96, h: 86 },
			balance: { x: 130, w: 200 },
			bet: { x: 348, w: 190 },
			spin: { x: 592, y: 98, size: 128 },
			autoplay: { x: 736, y: 104, w: 76, h: 70 },
			win: { x: 830, w: 178 },
			buyBonus: { x: 1028, y: 104, w: 300, h: 58 },
		},
	};
	const barW = $derived(Math.min(W - 24, controls.width));
	const uiScale = $derived(barW / controls.width);
	const barTop = $derived(H - controls.height * uiScale - 8);
	const cy = 104;

	const balance = $derived(numberToCurrencyString(stateBet.balanceAmount));
	const betLabel = $derived(stateBetDerived.activeBetMode()?.text.betAmountLabel || 'BET');
	const bet = $derived(numberToCurrencyString(stateBetDerived.betCost()));
	const win = $derived(bookEventAmountToCurrencyString(stateBet.winBookEventAmount));
	const autoActive = $derived(stateBetDerived.hasAutoBetCounter());

	const idle = $derived(context.stateXstateDerived.isIdle());
	const autoDisabled = $derived(!autoActive && (!idle || !stateBetDerived.isBetCostAvailable()));
	const options = $derived([...stateConfig.betAmountOptions].sort((a, b) => a - b));
	const smallest = $derived(options[0]);
	const biggest = $derived(options[options.length - 1]);
	const decDisabled = $derived(!idle || stateBet.betAmount <= smallest);
	const incDisabled = $derived(!idle || stateBet.betAmount >= biggest);
	const autoPopupOptions: AutoSpinsText[] = ['10', '25', '50', '100', '250', INFINITY_MARK];
	let showAutoPopup = $state(false);

	const press = (fn: () => void) => () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		fn();
	};
	const openMenu = press(() => (stateUi.menuOpen = true));
	const autoplay = press(() => {
		if (autoDisabled) return;
		if (stateBetDerived.hasAutoBetCounter()) {
			stateBet.autoSpinsCounter = 0;
			showAutoPopup = false;
		} else {
			showAutoPopup = !showAutoPopup;
		}
	});
	const startAutoSpin = press(() => {
		if (!stateBetDerived.isBetCostAvailable()) return;
		stateBet.autoSpinsCounter = AUTO_SPINS_TEXT_OPTION_MAP[stateUi.autoSpinsText];
		stateBet.autoSpinsLossLimitAmount = Infinity;
		stateBet.autoSpinsSingleWinLimitAmount = Infinity;
		if (stateBetDerived.activeBetMode().type === 'buy') stateBet.activeBetModeKey = 'BASE';
		showAutoPopup = false;
		context.eventEmitter.broadcast({ type: 'autoBet' });
	});
	const dec = press(() => {
		const next = [...options].reverse().find((o) => o < stateBet.betAmount);
		stateBetDerived.setBetAmount(next ?? smallest);
	});
	const inc = press(() => {
		const next = options.find((o) => o > stateBet.betAmount);
		stateBetDerived.setBetAmount(next ?? biggest);
	});
	const openBetMenu = press(() => {
		if (!idle) return;
		stateModal.modal = { name: 'betAmountMenu' };
	});

	const labelStyle = {
		fontFamily: FONT,
		fontWeight: '700',
		fontSize: 13,
		fill: C.textDim,
		letterSpacing: 1.5,
	};
	const valueStyle = { fontFamily: FONT, fontWeight: '800', fontSize: 24, fill: C.text };
	const left = { x: 0, y: 0.5 } as const;

	const popupW = 420;
	const popupH = 150;
	const popupX = $derived(controls.sections.autoplay.x + controls.sections.autoplay.w * 0.5);
	const popupY = 34;
	const textBlockX = 22;
	const labelY = -13;
	const valueY = 13;
	const displayAutoSpinText = (value: AutoSpinsText) => (value === INFINITY_MARK ? 'ALL' : value);
	const popupDraw = (g: import('pixi.js').Graphics) => {
		g.poly([-12, 0, 12, 0, 0, 14]).fill({ color: C.navyDeep, alpha: 0.96 });
		g.poly([-12, 0, 12, 0, 0, 14]).stroke({
			width: 1,
			color: C.purpleBright,
			alpha: 0.42,
		});
	};
</script>

{#snippet spriteButton(button)}
	<Button
		x={button.x}
		y={button.y}
		anchor={0.5}
		sizes={{ width: button.size, height: button.size }}
		onpress={button.onpress}
		disabled={button.disabled}
	>
		{#snippet children({ center, hovered, pressed })}
			<Container
				x={center.x}
				y={center.y}
				scale={pressed ? 0.96 : hovered ? 1.03 : 1}
				alpha={button.disabled ? 0.45 : 1}
			>
				<Sprite
					key={button.asset}
					anchor={0.5}
					width={button.assetWidth ?? button.size}
					height={button.assetHeight ?? button.size}
				/>
				{#if button.icon}
					<Graphics
						draw={(g) =>
							icons[button.icon](
								g,
								button.iconSize ?? button.size * 0.42,
								button.disabled ? C.iconDisabled : C.textDim,
							)}
					/>
				{/if}
			</Container>
		{/snippet}
	</Button>
{/snippet}

{#snippet autoOptionButton(option, x, y)}
	<Button
		{x}
		{y}
		anchor={0.5}
		sizes={{ width: 58, height: 26 }}
		onpress={press(() => (stateUi.autoSpinsText = option))}
	>
		{#snippet children({ center, hovered, pressed })}
			{@const selected = stateUi.autoSpinsText === option}
			<Container x={center.x} y={center.y} scale={pressed ? 0.96 : hovered ? 1.03 : 1}>
				<Graphics
					draw={(g) => {
						g.roundRect(-29, -13, 58, 26, 7).fill({
							color: selected ? C.purpleBright : C.navy,
							alpha: selected ? 0.86 : hovered ? 0.66 : 0.48,
						});
						g.roundRect(-29, -13, 58, 26, 7).stroke({
							width: 1,
							color: selected ? C.white : C.purple,
							alpha: selected ? 0.78 : 0.55,
						});
					}}
				/>
				<Text
					anchor={0.5}
					text={displayAutoSpinText(option)}
					style={{
						fontFamily: FONT,
						fontWeight: '800',
						fontSize: 11,
						fill: selected ? C.white : C.textDim,
					}}
				/>
			</Container>
		{/snippet}
	</Button>
{/snippet}

<MainContainer standard alignVertical="bottom">
	<Container x={W * 0.5} y={barTop} scale={uiScale}>
		<Container x={-controls.width * 0.5}>
			<Sprite
				key="controlbar-0.png"
				x={controls.width * 0.5}
				y={controls.height * 0.5}
				anchor={0.5}
				width={controls.width}
				height={controls.height}
			/>

			{@render spriteButton({
				x: controls.sections.menu.x + controls.sections.menu.w * 0.5,
				y: controls.sections.menu.y,
				size: controls.sections.menu.w,
				asset: 'controlbar-3.png',
				assetWidth: 76,
				assetHeight: 70,
				onpress: openMenu,
			})}

			<Container x={controls.sections.balance.x} y={cy}>
				<Sprite
					key="controlbar-2.png"
					anchor={{ x: 0, y: 0.5 }}
					width={controls.sections.balance.w}
					height={54}
				/>
				<Text anchor={left} x={textBlockX} y={labelY} text="BALANCE" style={labelStyle} />
				<Text anchor={left} x={textBlockX} y={valueY} text={balance} style={valueStyle} />
			</Container>

			<Container
				x={controls.sections.bet.x}
				y={cy}
				eventMode={idle ? 'static' : 'auto'}
				cursor={idle ? 'pointer' : 'default'}
				onpointerup={openBetMenu}
			>
				<Sprite
					key="controlbar-2.png"
					anchor={{ x: 0, y: 0.5 }}
					width={controls.sections.bet.w}
					height={54}
				/>
				<Text anchor={left} x={textBlockX} y={labelY} text={betLabel} style={labelStyle} />
				<Text anchor={left} x={textBlockX} y={valueY} text={bet} style={valueStyle} />
			</Container>

			{@render spriteButton({
				x: controls.sections.bet.x + controls.sections.bet.w - 50,
				y: cy + 8,
				size: 32,
				asset: 'controlbar-4.png',
				assetWidth: 36,
				assetHeight: 34,
				onpress: dec,
				disabled: decDisabled,
			})}
			{@render spriteButton({
				x: controls.sections.bet.x + controls.sections.bet.w - 18,
				y: cy + 8,
				size: 32,
				asset: 'controlbar-5.png',
				assetWidth: 36,
				assetHeight: 34,
				onpress: inc,
				disabled: incDisabled,
			})}

			<SpinButton x={controls.sections.spin.x} y={cy} size={controls.sections.spin.size} />

			{@render spriteButton({
				x: controls.sections.autoplay.x + controls.sections.autoplay.w * 0.5,
				y: controls.sections.autoplay.y,
				size: controls.sections.autoplay.w,
				asset: 'controlbar-3.png',
				assetWidth: 54,
				assetHeight: 50,
				icon: 'auto',
				iconSize: 22,
				onpress: autoplay,
				active: autoActive,
				disabled: autoDisabled,
			})}

			<Container x={controls.sections.win.x} y={cy}>
				<Sprite
					key="controlbar-2.png"
					anchor={{ x: 0, y: 0.5 }}
					width={controls.sections.win.w}
					height={54}
				/>
				<Text
					anchor={0.5}
					x={controls.sections.win.w * 0.5}
					y={labelY}
					text="WIN"
					style={labelStyle}
				/>
				<Text
					anchor={0.5}
					x={controls.sections.win.w * 0.5}
					y={valueY}
					text={win}
					style={valueStyle}
				/>
			</Container>

			<Button
				x={controls.sections.buyBonus.x}
				y={controls.sections.buyBonus.y}
				anchor={0.5}
				sizes={{
					width: controls.sections.buyBonus.w,
					height: controls.sections.buyBonus.h,
				}}
				onpress={press(() => (stateModal.modal = { name: 'buyBonus' }))}
				disabled={!idle}
			>
				{#snippet children({ center, hovered, pressed })}
					<Container
						x={center.x}
						y={center.y}
						scale={pressed ? 0.97 : hovered ? 1.02 : 1}
						alpha={idle ? 1 : 0.45}
					>
						<Sprite
							key="controlbar-6.png"
							anchor={0.5}
							width={controls.sections.buyBonus.w}
							height={controls.sections.buyBonus.h}
						/>
					</Container>
				{/snippet}
			</Button>

			<Text
				anchor={0.5}
				x={controls.sections.autoplay.x + controls.sections.autoplay.w * 0.5}
				y={cy + 43}
				text={autoActive ? 'STOP' : 'AUTO'}
				style={{
					fontFamily: FONT,
					fontWeight: '800',
					fontSize: 10,
					fill: autoActive ? C.purpleBright : C.textDim,
					letterSpacing: 1,
				}}
			/>

			{#if showAutoPopup}
				<Container x={popupX} y={popupY}>
					<Sprite key="controlbar-1.png" anchor={{ x: 0.5, y: 1 }} width={popupW} height={popupH} />
					<Graphics draw={popupDraw} />
					<Text
						anchor={0.5}
						y={-124}
						text="AUTO SPINS"
						style={{
							fontFamily: FONT,
							fontWeight: '900',
							fontSize: 15,
							fill: C.white,
							letterSpacing: 1,
						}}
					/>
					{@render autoOptionButton(autoPopupOptions[0], -68, -92)}
					{@render autoOptionButton(autoPopupOptions[1], 0, -92)}
					{@render autoOptionButton(autoPopupOptions[2], 68, -92)}
					{@render autoOptionButton(autoPopupOptions[3], -68, -58)}
					{@render autoOptionButton(autoPopupOptions[4], 0, -58)}
					{@render autoOptionButton(autoPopupOptions[5], 68, -58)}
					<Button
						x={0}
						y={-25}
						anchor={0.5}
						sizes={{ width: 182, height: 26 }}
						onpress={startAutoSpin}
						disabled={!stateBetDerived.isBetCostAvailable()}
					>
						{#snippet children({ center, hovered, pressed })}
							<Container x={center.x} y={center.y} scale={pressed ? 0.96 : hovered ? 1.03 : 1}>
								<Graphics
									draw={(g) => {
										g.roundRect(-91, -13, 182, 26, 7).fill({
											color: C.purpleBright,
											alpha: 0.9,
										});
										g.roundRect(-91, -13, 182, 26, 7).stroke({
											width: 1,
											color: C.white,
											alpha: 0.5,
										});
									}}
								/>
								<Text
									anchor={0.5}
									text="START"
									style={{
										fontFamily: FONT,
										fontWeight: '900',
										fontSize: 12,
										fill: C.white,
										letterSpacing: 1,
									}}
								/>
							</Container>
						{/snippet}
					</Button>
				</Container>
			{/if}
		</Container>
	</Container>
</MainContainer>

{#if stateUi.menuOpen}
	<MainContainer standard alignVertical="bottom">
		<Container x={W * 0.5 - controls.width * uiScale * 0.5 + 56 * uiScale} y={barTop - 18}>
			<Container scale={uiScale}>
				{@render spriteButton({
					x: 0,
					y: -150,
					size: 48,
					asset: 'controlbar-3.png',
					assetWidth: 58,
					assetHeight: 54,
					icon: 'settings',
					iconSize: 23,
					onpress: press(() => (stateModal.modal = { name: 'settings' })),
				})}
				{@render spriteButton({
					x: 0,
					y: -95,
					size: 48,
					asset: 'controlbar-3.png',
					assetWidth: 58,
					assetHeight: 54,
					icon: 'info',
					iconSize: 23,
					onpress: press(() => (stateModal.modal = { name: 'gameRules' })),
				})}
				{@render spriteButton({
					x: 0,
					y: -40,
					size: 48,
					asset: 'controlbar-3.png',
					assetWidth: 58,
					assetHeight: 54,
					icon: 'close',
					iconSize: 23,
					onpress: press(() => (stateUi.menuOpen = false)),
				})}
			</Container>
		</Container>
	</MainContainer>
{/if}
