<script lang="ts">
	import { Container, Graphics, Text } from 'pixi-svelte';
	import { FadeContainer, LoadingProgress } from 'components-pixi';
	import { MainContainer } from 'components-layout';

	import { getContext } from '../game/context';
	import TransitionAnimation from './TransitionAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	let loadingType = $state<'start' | 'transition'>('start');
</script>

<!-- code-drawn logo + loading progress (replaces cloned loader spine + progressBar sprites) -->
<FadeContainer show={loadingType === 'start'}>
	<MainContainer>
		<Container
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height * 0.5}
		>
			<Text
				anchor={0.5}
				y={-40}
				text="ABYSSAL"
				style={{
					fontFamily: 'sans-serif',
					fontWeight: '900',
					fontSize: 76,
					fill: 0x22e0ff,
					letterSpacing: 8,
				}}
			/>
			{#if !context.stateApp.loaded}
				<LoadingProgress y={90} width={420} height={26}>
					{#snippet background(sizes)}
						<Graphics
							draw={(g) => {
								g.roundRect(0, 0, sizes.width, sizes.height, sizes.height / 2).fill({
									color: 0x05080f,
									alpha: 0.85,
								});
							}}
						/>
					{/snippet}
					{#snippet progress(sizes)}
						<Graphics
							draw={(g) => {
								g.roundRect(0, 0, sizes.width, sizes.height, sizes.height / 2).fill({
									color: 0x22e0ff,
									alpha: 0.95,
								});
							}}
						/>
					{/snippet}
					{#snippet frame(sizes)}
						<Graphics
							draw={(g) => {
								g.roundRect(0, 0, sizes.width, sizes.height, sizes.height / 2).stroke({
									width: 2,
									color: 0x22e0ff,
									alpha: 0.6,
								});
							}}
						/>
					{/snippet}
				</LoadingProgress>
			{/if}
		</Container>
	</MainContainer>
</FadeContainer>

<!-- press to continue -->
<FadeContainer show={loadingType === 'start' && context.stateApp.loaded}>
	<PressToContinue onpress={() => (loadingType = 'transition')} />
</FadeContainer>

<!-- transition between the loading screen and the game -->
<FadeContainer show={loadingType === 'transition'}>
	<TransitionAnimation oncomplete={props.onloaded} />
</FadeContainer>
