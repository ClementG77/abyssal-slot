<script lang="ts" module>
	export type EmitterEventPersistentMultiplier =
		| { type: 'snowballShow' }
		| { type: 'snowballHide' }
		| { type: 'snowballUpdate'; mult: number };
</script>

<script lang="ts">
	import { Tween } from 'svelte/motion';

	import { Container, Graphics, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_SIZES } from '../game/constants';

	const context = getContext();

	// The snowball persistent multiplier `M` for the feature (setPersistentMult). Sits just
	// above the board; punches up each time it climbs.
	let show = $state(false);
	let mult = $state(1);
	const pop = new Tween(1, { duration: 160 });

	context.eventEmitter.subscribeOnMount({
		snowballShow: () => (show = true),
		snowballHide: () => (show = false),
		snowballUpdate: async (e) => {
			const climbed = e.mult > mult;
			mult = e.mult;
			if (climbed) {
				context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_multiplier_up' });
				await pop.set(1.35);
				await pop.set(1);
			}
		},
	});

	const draw = (g: import('pixi.js').Graphics) => {
		g.roundRect(-95, -36, 190, 72, 18).fill({ color: 0x0a1a2e, alpha: 0.85 });
		g.roundRect(-95, -36, 190, 72, 18).stroke({ width: 3, color: 0xffb13c, alpha: 0.9 });
	};
</script>

<FadeContainer {show}>
	<BoardContainer>
		<Container x={BOARD_SIZES.width / 2} y={-SYMBOL_SIZE * 0.72} scale={pop.current}>
			<Graphics {draw} />
			<Text
				anchor={0.5}
				text={`M  ×${mult}`}
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '700',
					fontSize: SYMBOL_SIZE * 0.34,
					fill: 0xffb13c,
				}}
			/>
		</Container>
	</BoardContainer>
</FadeContainer>
