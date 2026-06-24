import type { Application } from 'pixi.js';

import { ControlBar } from './ControlBar';

type SlotGameControls = {
	spin: () => void;
	decreaseBet: () => void;
	increaseBet: () => void;
	openAutoplay: () => void;
	openMenu: () => void;
	openBuyBonus: () => void;
};

export const createControlBarExample = async (app: Application, game: SlotGameControls) => {
	const controlBar = await ControlBar.create({
		atlasImage: '/assets/controlbar/controlbar_base.png',
		atlasJson: '/assets/controlbar/controlbar_base.json',
		layoutJson: '/assets/controlbar/controlbar_layout_1920.json',
	});

	app.stage.addChild(controlBar.container);

	controlBar.onSpin = () => game.spin();
	controlBar.onBetMinus = () => game.decreaseBet();
	controlBar.onBetPlus = () => game.increaseBet();
	controlBar.onAutoPlay = () => game.openAutoplay();
	controlBar.onMenu = () => game.openMenu();
	controlBar.onBuyBonus = () => game.openBuyBonus();

	const resize = () => controlBar.resize(app.screen.width, app.screen.height);
	resize();
	window.addEventListener('resize', resize);

	return {
		controlBar,
		destroy: () => {
			window.removeEventListener('resize', resize);
			controlBar.destroy();
		},
	};
};
