<script lang="ts">
	// SCREEN LIGHTNING — a lightning strike on the Eye reveal, SCOPED TO THE REEL WINDOW (not the
	// whole canvas). The reel window darkens and a bolt cracks down through it. See
	// game/screenLightning.svelte.ts for the why and the revert steps.
	//
	// Board space, not canvas space: mounted inside a BoardContainer, so (0,0) is the top-left of
	// the reel grid and the window is [0,0 .. BOARD_SIZES]. Everything is masked to that rectangle,
	// so the dim and the flash never bleed past the reels onto the rest of the screen.
	import { untrack } from 'svelte';
	import gsap from 'gsap';

	import { Container, Graphics } from 'pixi-svelte';

	import BoardContainer from './BoardContainer.svelte';
	import { BOARD_SIZES } from '../game/constants';
	import { screenLightning } from '../game/screenLightning.svelte';

	// Exactly the reel window — the same rectangle Eye.svelte's combine dim uses
	// (`rect(0, 0, BOARD_SIZES.width, BOARD_SIZES.height)`), which fills the frame window cleanly
	// with no border artifact. An earlier rounded-rect mask here cut the corners INSIDE the window,
	// which is what showed as a "black border"; a plain full-window rect has no such edge.
	const BW = BOARD_SIZES.width;
	const BH = BOARD_SIZES.height;

	// ACCESSIBILITY, not optional. A strobing flash is the classic photosensitivity trigger, and the
	// app already honours the OS setting elsewhere (AbyssalPixiLogo, Background). Reduced motion →
	// skip the strike entirely; the Eye's own local arcs still play, so the reveal isn't left flat.
	const reducedMotion =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// `dark` dims the reel window (normal blend); `flash` is the additive illumination and drives the
	// bolt brightness so they flicker together; `bolt` reveals the jagged path top-to-target.
	const darkFx = $state({ a: 0 });
	const flashFx = $state({ a: 0 });
	const boltFx = $state({ progress: 0 });

	type Bolt = { points: { x: number; y: number }[]; forks: { x: number; y: number }[][] };
	let bolt = $state<Bolt | null>(null);
	let mult = $state(false);

	const boltColor = $derived(mult ? 0xff5a4a : 0x9fdcff);
	const flashColor = $derived(mult ? 0xffe0d6 : 0xdff2ff);

	// Bolt tearing the FULL HEIGHT of the reel window — top edge to near the bottom — so the strike
	// spans the whole board, not just the upper half. Jittered, with forks. Board space.
	const buildBolt = (forked: boolean): Bolt => {
		const targetX = BW * (0.5 + (Math.random() - 0.5) * 0.28);
		const targetY = BH * 0.96;
		const startX = BW * (0.5 + (Math.random() - 0.5) * 0.4);

		const SEGS = 10;
		const points: { x: number; y: number }[] = [];
		for (let i = 0; i <= SEGS; i++) {
			const t = i / SEGS;
			const x = startX + (targetX - startX) * t;
			const y = t * targetY;
			const jitter = (Math.random() - 0.5) * BW * 0.11 * Math.sin(t * Math.PI);
			points.push({ x: x + jitter, y });
		}

		const forks: { x: number; y: number }[][] = [];
		const forkCount = forked ? 3 : 1;
		for (let f = 0; f < forkCount; f++) {
			const from = 2 + Math.floor(Math.random() * (SEGS - 4));
			const root = points[from];
			const dir = Math.random() < 0.5 ? -1 : 1;
			const branch: { x: number; y: number }[] = [root];
			let bx = root.x;
			let by = root.y;
			const steps = 2 + Math.floor(Math.random() * 2);
			for (let s = 0; s < steps; s++) {
				bx += dir * BW * (0.04 + Math.random() * 0.06);
				by += BH * (0.05 + Math.random() * 0.06);
				branch.push({ x: bx, y: by });
			}
			forks.push(branch);
		}
		return { points, forks };
	};

	let tl: gsap.core.Timeline | undefined;
	$effect(() => {
		// ONLY `key` is a dependency — reading mult here too would replay the last strike on any
		// unrelated re-render. It is read untracked.
		const key = screenLightning.key;
		if (key === 0) return; // never fire on mount
		if (reducedMotion) return; // no strobe for photosensitive users
		const isMult = untrack(() => screenLightning.mult);

		mult = isMult;
		bolt = buildBolt(isMult);

		tl?.kill();
		tl = gsap
			.timeline()
			.set(darkFx, { a: 0 })
			.set(flashFx, { a: 0 })
			.set(boltFx, { progress: 0 })
			// the reel window dims a beat before the strike
			.to(darkFx, { a: isMult ? 0.5 : 0.38, duration: 0.1, ease: 'power2.out' })
			// CRACK — flash snaps on, the bolt tears down through the window
			.to(flashFx, { a: 1, duration: 0.04, ease: 'power2.out' })
			.to(boltFx, { progress: 1, duration: 0.09, ease: 'power2.out' }, '<')
			// flicker: the illumination stutters like a real strike
			.to(flashFx, { a: 0.15, duration: 0.06, ease: 'power1.in' })
			.to(flashFx, { a: 0.8, duration: 0.05, ease: 'power1.out' })
			.to(flashFx, { a: 0.05, duration: 0.07, ease: 'power1.in' })
			.to(flashFx, { a: isMult ? 0.5 : 0.3, duration: 0.05, ease: 'power1.out' })
			// release — dim and flash fade back to the game
			.to(flashFx, { a: 0, duration: isMult ? 0.34 : 0.24, ease: 'power2.out' })
			.to(darkFx, { a: 0, duration: isMult ? 0.4 : 0.3, ease: 'power2.inOut' }, '<');

		return () => tl?.kill();
	});

	// Plain full-window mask — just contains the bolt within the reels; no corner rounding, so no
	// black border. Same rectangle as the dim below.
	const drawMask = (g: import('pixi.js').Graphics) => {
		g.rect(0, 0, BW, BH).fill(0xffffff);
	};

	const drawDark = (g: import('pixi.js').Graphics) => {
		if (darkFx.a <= 0.001) return;
		// same colours as Eye.svelte's combine dim: dark red for a MUL strike, deep blue otherwise
		g.rect(0, 0, BW, BH).fill({ color: mult ? 0x140002 : 0x02060f, alpha: darkFx.a });
	};

	const drawStrike = (g: import('pixi.js').Graphics) => {
		if (flashFx.a <= 0.001) return;

		// Illumination across the WHOLE board — the strike lights the full window. A second
		// full-height rect deepens it slightly (two cheap rects, no gradient texture).
		g.rect(0, 0, BW, BH).fill({ color: flashColor, alpha: flashFx.a * 0.18 });
		g.rect(0, 0, BW, BH).fill({ color: flashColor, alpha: flashFx.a * 0.12 });

		if (!bolt || boltFx.progress <= 0) return;

		const p = boltFx.progress;
		const trace = () => {
			const pts = bolt!.points;
			const shown = 1 + Math.floor((pts.length - 1) * p);
			g.moveTo(pts[0].x, pts[0].y);
			for (let i = 1; i < shown && i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
			for (const branch of bolt!.forks) {
				if (branch[0].y > pts[Math.min(shown, pts.length) - 1].y) continue;
				g.moveTo(branch[0].x, branch[0].y);
				for (let i = 1; i < branch.length; i++) g.lineTo(branch[i].x, branch[i].y);
			}
		};

		const w = Math.max(2, BW * (mult ? 0.012 : 0.008));
		// coloured body, then a white-hot core over the same path (traced twice — stroke→stroke path
		// retention isn't promised; only fill→stroke is)
		trace();
		g.stroke({ width: w * 2.4, color: boltColor, alpha: flashFx.a * 0.5, cap: 'round', join: 'round' });
		trace();
		g.stroke({ width: w, color: 0xffffff, alpha: flashFx.a, cap: 'round', join: 'round' });
	};
</script>

<!-- SCREEN LIGHTNING, reel-window-scoped. Inside BoardContainer (board space); a rounded-rect mask
     confines the dim + flash + bolt to the reels. Mounted BELOW the Eye in Game.svelte, so the Eye
     stays bright while the window behind it darkens and cracks. -->
<BoardContainer>
	<Container>
		<Graphics isMask draw={drawMask} />
		<Graphics draw={drawDark} />
		<Container blendMode="add">
			<Graphics draw={drawStrike} />
		</Container>
	</Container>
</BoardContainer>
