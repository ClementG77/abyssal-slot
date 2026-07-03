<script lang="ts">
	import { onMount } from 'svelte';

	import { Container, Graphics } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		MOBILE_REEL_DISPLAY_SCALE,
		getReelDisplayGrid,
		getReelDisplayHeight,
		getReelPosition,
	} from '../game/constants';

	type Props = {
		layer?: 'background' | 'overlay';
		debug?: boolean;
	};

	type Palette = {
		deep: number;
		panel: number;
		panelEdge: number;
		rail: number;
		accent: number;
		highlight: number;
		glow: number;
		cloud: number;
		cloudCore: number;
		frame: number;
		frameLight: number;
		frameShadow: number;
	};

	type CloudSeed = {
		x: number;
		width: number;
		height: number;
		phase: number;
	};

	const CLOUD_SEEDS: CloudSeed[] = [
		{ x: 0.08, width: 42, height: 14, phase: 0.1 },
		{ x: 0.22, width: 58, height: 19, phase: 0.9 },
		{ x: 0.39, width: 48, height: 16, phase: 1.8 },
		{ x: 0.54, width: 64, height: 21, phase: 2.7 },
		{ x: 0.71, width: 52, height: 17, phase: 3.8 },
		{ x: 0.88, width: 43, height: 14, phase: 4.9 },
	];

	const props: Props = $props();
	const context = getContext();

	const isFreeSpins = $derived(context.stateGame.gameType === 'freegame');
	const layer = $derived(props.layer ?? 'background');
	const layout = $derived(context.stateGameDerived.reelLayout());
	const grid = $derived(getReelDisplayGrid(layout));
	const position = $derived(getReelPosition(layout));
	const frameWidth = $derived(layout.displayWidth);
	const frameHeight = $derived(getReelDisplayHeight(layout));
	const frameCenter = $derived({
		x: position.x + frameWidth / 2,
		y: position.y + frameHeight / 2,
	});
	const framePivot = $derived({ x: frameWidth / 2, y: frameHeight / 2 });
	const mobileReelScale = $derived(
		context.stateLayoutDerived.layoutType() === 'portrait' ? MOBILE_REEL_DISPLAY_SCALE : 1,
	);
	const palette = $derived<Palette>(
		isFreeSpins
			? {
					deep: 0x16030a,
					panel: 0x380719,
					panelEdge: 0x7c1532,
					rail: 0x2e0712,
					accent: 0xff3f67,
					highlight: 0xffc5d0,
					glow: 0xff254f,
					cloud: 0xff244f,
					cloudCore: 0xffc55f,
					frame: 0x8c163a,
					frameLight: 0xffa6b7,
					frameShadow: 0x26050f,
				}
			: {
					deep: 0x07051c,
					panel: 0x101d5d,
					panelEdge: 0x364b9e,
					rail: 0x12104a,
					accent: 0x9d6cff,
					highlight: 0xdde7ff,
					glow: 0x7c43ff,
					cloud: 0x7c43ff,
					cloudCore: 0x62e9ff,
					frame: 0x45318f,
					frameLight: 0xc3b5ff,
					frameShadow: 0x0d0829,
				},
	);

	let time = $state(0);
	let boosted = $state(false);
	let launchStartedAt = $state(-1);

	onMount(() => {
		const start = performance.now();
		let raf = 0;
		const tick = (now: number) => {
			time = (now - start) / 1000;
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});

	context.eventEmitter.subscribeOnMount({
		reelFrameGlowShow: () => (boosted = true),
		reelFrameGlowHide: () => (boosted = false),
		reelFrameSpinLaunch: () => (launchStartedAt = time),
	});

	const pulse = $derived((Math.sin(time * 1.7) + 1) / 2);
	const glowAlpha = $derived((boosted ? 0.46 : 0.16) + pulse * (boosted ? 0.28 : 0.12));
	const glintX = $derived(grid.x + ((time * 140) % Math.max(grid.width, 1)));
	const launchElapsed = $derived(launchStartedAt < 0 ? Infinity : time - launchStartedAt);
	const launchEnergy = $derived(launchElapsed < 0.62 ? Math.max(0, 1 - launchElapsed / 0.62) : 0);
	const launchProgress = $derived(1 - launchEnergy);
	const frameShakeY = $derived(
		launchEnergy > 0 ? Math.sin(launchProgress * Math.PI) * launchEnergy * 26 : 0,
	);
	const bottomCloudY = $derived(grid.y + grid.height + Math.max(18, grid.height * 0.04) * 0.78);
	const clouds = $derived(
		CLOUD_SEEDS.map((cloud) => {
			const wave = (Math.sin(time * 2.7 + cloud.phase) + 1) / 2;
			return {
				...cloud,
				x: grid.x + grid.width * cloud.x + Math.sin(time * 1.7 + cloud.phase) * 10,
				y: bottomCloudY + wave * 5,
				scaleX: cloud.width * (0.88 + wave * 0.16),
				scaleY: cloud.height * (0.82 + wave * 0.24),
				alpha: 0.24 + wave * 0.28 + launchEnergy * 0.18,
			};
		}),
	);

	const chamferPath = (
		g: import('pixi.js').Graphics,
		x: number,
		y: number,
		width: number,
		height: number,
		chamfer: number,
	) =>
		g
			.moveTo(x + chamfer, y)
			.lineTo(x + width - chamfer, y)
			.lineTo(x + width, y + chamfer)
			.lineTo(x + width, y + height - chamfer)
			.lineTo(x + width - chamfer, y + height)
			.lineTo(x + chamfer, y + height)
			.lineTo(x, y + height - chamfer)
			.lineTo(x, y + chamfer)
			.closePath();

	const drawCornerBracket = (
		g: import('pixi.js').Graphics,
		x: number,
		y: number,
		dx: number,
		dy: number,
		size: number,
	) => {
		const outer = [
			x,
			y,
			x + dx * size,
			y,
			x + dx * (size * 0.78),
			y + dy * (size * 0.22),
			x + dx * (size * 0.34),
			y + dy * (size * 0.22),
			x + dx * (size * 0.22),
			y + dy * (size * 0.78),
			x,
			y + dy * size,
		];
		g.poly(outer, true).fill({ color: palette.frameShadow, alpha: 1 });
		g.poly(outer, true).stroke({ width: 3, color: palette.frameLight, alpha: 0.95 });
		g.poly(
			[
				x + dx * 6,
				y + dy * 6,
				x + dx * (size * 0.74),
				y + dy * 6,
				x + dx * (size * 0.6),
				y + dy * (size * 0.14),
				x + dx * (size * 0.16),
				y + dy * (size * 0.14),
				x + dx * (size * 0.14),
				y + dy * (size * 0.6),
				x + dx * 6,
				y + dy * (size * 0.74),
			],
			true,
		).fill({ color: palette.frame, alpha: 0.95 });
	};

	const drawBackground = (g: import('pixi.js').Graphics) => {
		const border = Math.max(18, grid.height * 0.04);
		const railWidth = Math.max(26, grid.width * 0.032);
		const columnWidth = grid.width / layout.columns;
		const frameX = grid.x - border - railWidth;
		const frameY = grid.y - border;
		const frameWidth = grid.width + (border + railWidth) * 2;
		const frameHeight = grid.height + border * 2;
		const chamfer = Math.max(16, border * 1.1);

		// Overlapping structural bands keep the cabinet seamless at every rail join.
		chamferPath(g, frameX, frameY, frameWidth, frameHeight, chamfer).fill({
			color: palette.frameShadow,
			alpha: 1,
		});
		g.rect(frameX + chamfer, frameY, frameWidth - chamfer * 2, frameHeight).fill({
			color: palette.frameShadow,
			alpha: 1,
		});
		g.rect(frameX, frameY + chamfer, frameWidth, frameHeight - chamfer * 2).fill({
			color: palette.frameShadow,
			alpha: 1,
		});
		chamferPath(g, frameX + 5, frameY + 5, frameWidth - 10, frameHeight - 10, chamfer - 3).fill({
			color: palette.frame,
			alpha: 1,
		});
		chamferPath(
			g,
			grid.x - border,
			grid.y - border,
			grid.width + border * 2,
			grid.height + border * 2,
			18,
		).fill({
			color: palette.rail,
			alpha: 1,
		});
		g.roundRect(grid.x, grid.y, grid.width, grid.height, 14).fill({
			color: palette.panel,
			alpha: 1,
		});
		g.roundRect(grid.x, grid.y, grid.width, grid.height, 14).stroke({
			width: 3,
			color: palette.panelEdge,
			alpha: 0.9,
		});

		for (let column = 1; column < layout.columns; column++) {
			const x = grid.x + columnWidth * column;
			g.rect(x - 2, grid.y + 8, 4, grid.height - 16).fill({
				color: palette.frameShadow,
				alpha: 0.85,
			});
			g.rect(x - 0.75, grid.y + 10, 1.5, grid.height - 20).fill({
				color: palette.frameLight,
				alpha: 0.68,
			});
		}
	};

	const drawOverlay = (g: import('pixi.js').Graphics) => {
		const border = Math.max(18, grid.height * 0.04);
		const railWidth = Math.max(26, grid.width * 0.032);
		const centerX = grid.x + grid.width / 2;
		const frameX = grid.x - border - railWidth;
		const frameY = grid.y - border;
		const fullWidth = grid.width + (border + railWidth) * 2;
		const fullHeight = grid.height + border * 2;
		const chamfer = Math.max(16, border * 1.1);
		const topRailY = grid.y - border;
		const bottomRailY = grid.y + grid.height + border * 0.52;

		chamferPath(g, frameX, frameY, fullWidth, fullHeight, chamfer).stroke({
			width: 4,
			color: palette.frameLight,
			alpha: 0.98,
		});
		chamferPath(g, frameX + 10, frameY + 10, fullWidth - 20, fullHeight - 20, chamfer - 6).stroke({
			width: 2,
			color: palette.frameShadow,
			alpha: 1,
		});
		g.roundRect(grid.x - border, topRailY, grid.width + border * 2, border * 0.52, 8).fill({
			color: palette.frameShadow,
			alpha: 1,
		});
		g.roundRect(grid.x - border, bottomRailY, grid.width + border * 2, border * 0.52, 8).fill({
			color: palette.frameShadow,
			alpha: 1,
		});

		const segmentCount = 12;
		const segmentWidth = (grid.width + border * 2) / segmentCount;
		for (let segment = 0; segment < segmentCount; segment++) {
			const x = grid.x - border + segment * segmentWidth;
			const inset = segment % 2 === 0 ? 4 : 8;
			g.roundRect(x + inset, topRailY + 3, segmentWidth - inset * 1.5, border * 0.3, 4).fill({
				color: palette.frame,
				alpha: 0.95,
			});
			g.roundRect(x + inset, bottomRailY + 3, segmentWidth - inset * 1.5, border * 0.3, 4).fill({
				color: palette.frame,
				alpha: 0.95,
			});
		}

		drawCornerBracket(g, frameX, frameY, 1, 1, chamfer * 1.35);
		drawCornerBracket(g, frameX + fullWidth, frameY, -1, 1, chamfer * 1.35);
		drawCornerBracket(g, frameX, frameY + fullHeight, 1, -1, chamfer * 1.35);
		drawCornerBracket(g, frameX + fullWidth, frameY + fullHeight, -1, -1, chamfer * 1.35);

		const plaqueWidth = Math.min(grid.width * 0.25, 210);
		const plaqueHeight = border * 0.64;
		chamferPath(
			g,
			centerX - plaqueWidth / 2,
			frameY - plaqueHeight * 0.28,
			plaqueWidth,
			plaqueHeight,
			10,
		).fill({
			color: palette.frameShadow,
			alpha: 1,
		});
		chamferPath(
			g,
			centerX - plaqueWidth / 2,
			frameY - plaqueHeight * 0.28,
			plaqueWidth,
			plaqueHeight,
			10,
		).stroke({
			width: 3,
			color: palette.frameLight,
			alpha: 0.95,
		});
		g.circle(centerX, frameY + plaqueHeight * 0.03, 5).fill({ color: palette.accent, alpha: 0.95 });
	};

	const drawGlow = (g: import('pixi.js').Graphics) => {
		g.roundRect(grid.x - 8, grid.y - 8, grid.width + 16, grid.height + 16, 20).stroke({
			width: 16,
			color: palette.glow,
			alpha: 0.16,
		});
		g.roundRect(grid.x - 2, grid.y - 2, grid.width + 4, grid.height + 4, 16).stroke({
			width: 3,
			color: palette.highlight,
			alpha: 0.72,
		});
	};

	const drawGlint = (g: import('pixi.js').Graphics) => {
		g.moveTo(-16, 0).lineTo(16, 0).stroke({ width: 2, color: palette.highlight, alpha: 0.9 });
		g.moveTo(0, -10).lineTo(0, 10).stroke({ width: 2, color: palette.highlight, alpha: 0.9 });
		g.circle(0, 0, 3).fill({ color: palette.highlight, alpha: 1 });
	};

	const drawBottomLaunch = (g: import('pixi.js').Graphics) => {
		const border = Math.max(18, grid.height * 0.04);
		const y = grid.y + grid.height + border * 0.58;
		const height = border * 0.7;

		g.roundRect(
			grid.x - border * 0.8,
			y - height * 0.5,
			grid.width + border * 1.6,
			height,
			12,
		).fill({
			color: palette.glow,
			alpha: 0.48,
		});
		g.roundRect(
			grid.x - border * 0.35,
			y - height * 0.26,
			grid.width + border * 0.7,
			height * 0.52,
			8,
		).stroke({
			width: 3,
			color: palette.highlight,
			alpha: 0.86,
		});
		g.rect(grid.x + border, y - 1.5, grid.width - border * 2, 3).fill({
			color: palette.highlight,
			alpha: 0.9,
		});
	};

	const drawColorCloud = (g: import('pixi.js').Graphics) => {
		g.moveTo(0, 0)
			.bezierCurveTo(-0.88, -0.1, -1.05, -0.52, -0.54, -0.68)
			.bezierCurveTo(-0.12, -1.04, 0.3, -0.72, 0.52, -0.54)
			.bezierCurveTo(1.06, -0.42, 0.92, -0.08, 0, 0)
			.closePath()
			.fill({ color: palette.cloud, alpha: 0.76 });
		g.moveTo(-0.34, -0.08)
			.bezierCurveTo(-0.24, -0.43, 0.12, -0.66, 0.38, -0.42)
			.bezierCurveTo(0.64, -0.24, 0.38, -0.08, -0.34, -0.08)
			.closePath()
			.fill({ color: palette.cloudCore, alpha: 0.82 });
	};

	const drawDebugGrid = (g: import('pixi.js').Graphics) => {
		g.rect(grid.x, grid.y, grid.width, grid.height).stroke({
			width: 2,
			color: 0x00ffff,
			alpha: 0.9,
		});
	};
</script>

<Container
	x={frameCenter.x}
	y={frameCenter.y + frameShakeY}
	pivot={framePivot}
	scale={mobileReelScale}
>
	{#if layer === 'background'}
		<Graphics draw={(g) => drawBackground(g)} />
	{:else}
		<Graphics draw={(g) => drawOverlay(g)} />
		<Graphics draw={(g) => drawGlow(g)} alpha={glowAlpha} blendMode="add" />
		<Graphics draw={(g) => drawBottomLaunch(g)} alpha={launchEnergy} blendMode="add" />
		{#each clouds as cloud (cloud.x)}
			<Graphics
				x={cloud.x}
				y={cloud.y}
				scale={{ x: cloud.scaleX, y: cloud.scaleY }}
				alpha={cloud.alpha}
				draw={(g) => drawColorCloud(g)}
				blendMode="add"
			/>
		{/each}
		<Graphics
			x={glintX}
			y={grid.y - 6}
			draw={(g) => drawGlint(g)}
			alpha={0.35 + pulse * 0.45 + launchEnergy * 0.3}
			blendMode="add"
		/>
		{#if props.debug}
			<Graphics draw={(g) => drawDebugGrid(g)} />
		{/if}
	{/if}
</Container>
