// @ts-ignore
import config from 'config-vite';

const base = config();

// The workspace Svelte packages only expose a `svelte` export condition (no `import`/
// `default`), so during the static-adapter SSR/prerender build they fail to resolve when
// treated as external. Marking them `noExternal` makes Vite bundle + Svelte-process them
// (the svelte condition is applied), which fixes `Failed to resolve entry for package …`.
export default {
	...base,
	ssr: {
		...(base.ssr ?? {}),
		noExternal: [
			'pixi-svelte',
			'components-pixi',
			'components-shared',
			'components-layout',
			'components-ui-pixi',
			'components-ui-html',
			'components-storybook',
			'state-shared',
			'constants-shared',
			'envs',
			'rgs-requests',
			'rgs-fetcher',
			'utils-fetcher',
			'utils-event-emitter',
			'utils-shared',
			'utils-xstate',
			'utils-slots',
			'utils-book',
			'utils-bet',
			'utils-layout',
			'utils-sound',
			'utils-resize-observer',
		],
	},
};
