<script lang="ts">
	import { Container, Rectangle, Sprite } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBet, stateBetDerived } from 'state-shared';

	import { getContext } from '../../game/context';
	type Props = { x?: number; y?: number; size?: number };

	const props: Props = $props();
	const context = getContext();
	const EYE_ASSET_KEY = 'controlbar-7.png';

	const size = $derived(props.size ?? 150);
	const hitW = $derived(size * 1.52);
	const hitH = $derived(size);
	let stopDisabled = $state(false);

	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => (stopDisabled = true),
		stopButtonEnable: () => (stopDisabled = false),
	});

	const isIdle = $derived(context.stateXstateDerived.isIdle());
	const disabled = $derived.by(() => {
		if (isIdle) return !stateBetDerived.isBetCostAvailable();
		if (stopDisabled) return true;
		if (stateBetDerived.hasAutoBetCounter()) return false;
		if (stateBet.isTurbo) return true;
		return false;
	});

	const onpress = () => {
		if (isIdle) {
			// only STARTING a spin plays the spin sound — pressing the button again mid-spin
			// (to stop/skip) must not replay it
			context.eventEmitter.broadcast({ type: 'soundPressBet' });
			if (stateBetDerived.activeBetMode()?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
		} else {
			if (stopDisabled) return;
			if (stateBetDerived.hasAutoBetCounter()) stateBet.autoSpinsCounter = 0;
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};
</script>

<OnHotkey hotkey="Space" {disabled} {onpress} />

<Button
	x={props.x}
	y={props.y}
	anchor={0.5}
	sizes={{ width: hitW, height: hitH }}
	{disabled}
	{onpress}
>
	{#snippet children({ center, hovered, pressed })}
		<Container x={center.x} y={center.y}>
			<Rectangle
				anchor={0.5}
				width={hitW}
				height={hitH}
				backgroundColor={0x000000}
				backgroundAlpha={0.001}
			/>
			<Container scale={pressed ? 0.96 : 1} alpha={disabled ? 0.55 : hovered ? 1 : 0.94}>
				<Sprite key={EYE_ASSET_KEY} anchor={0.5} width={hitW * 1.06} height={hitH * 1.06} />
			</Container>
		</Container>
	{/snippet}
</Button>
