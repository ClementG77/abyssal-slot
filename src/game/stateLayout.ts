import { createLayout } from 'utils-layout';

import { GAME_HEIGHT, GAME_WIDTH } from './constants';

export const { stateLayout, stateLayoutDerived } = createLayout({
	backgroundRatio: {
		normal: 2039 / 1000,
		portrait: 1242 / 2208,
	},
	mainSizesMap: {
		desktop: { width: GAME_WIDTH, height: GAME_HEIGHT },
		tablet: { width: GAME_WIDTH, height: GAME_HEIGHT },
		landscape: { width: GAME_WIDTH, height: GAME_HEIGHT },
		portrait: { width: GAME_WIDTH, height: GAME_HEIGHT },
	},
});
