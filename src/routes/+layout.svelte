<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import Game from '../components/Game.svelte';
	import AbyssalLoader from '../components/AbyssalLoader.svelte';
	import { setContext } from '../game/context';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	setContext();
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
			<!-- The loader reads localized copy, so it must mount after the locale is active. -->
			<AbyssalLoader />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

{@render props.children()}
