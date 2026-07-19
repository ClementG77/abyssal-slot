<script lang="ts" module>
	import type { EyeType } from '../game/types';

	type ComboEye = { reel: number; row: number; eyeType: EyeType; startValue: number };

	export type EmitterEventEye =
		| { type: 'eyeShow'; reel: number; row: number; eyeType: EyeType; startValue: number }
		// The combine reveal: starts from the Gaze (`charge`) and folds in every opened Eye
		// (ADD first, then MUL) to arrive at `totalMult`. One Eye for base/feature, 1–5 for Ultimate.
		| { type: 'eyeBurst'; charge: number; totalMult: number; eyes: ComboEye[] }
		| { type: 'eyeHide' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	import { Container, Graphics, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { stateBetDerived } from 'state-shared';
	import { skippableWait } from '../game/skip.svelte';

	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { BOARD_SIZES, SYMBOL_SIZE } from '../game/constants';
	import { abyssalAmountTextStyle, abyssalLabelTextStyle, eyeValueTextStyle } from '../game/textStyles';
	import { getPositionX, getPositionY } from '../game/utils';

	const context = getContext();
	const ts = () => stateBetDerived.timeScale();

	const ADD_COLOR = 0x22dfff;
	const MUL_COLOR = 0xff5a2a;
	const GAZE_COLOR = 0x9a6bff;
	const TOTAL_COLOR = 0xffd76a;

	// board centre (board-local space) — the equation resolves here, then flies to the banner
	const center = { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 };

	let show = $state(false);
	let resolving = $state(false);
	let running = $state(0); // the live combining value (starts at the Gaze charge)
	let gazeLabel = $state(false); // "GAZE" caption while the seed is the raw charge
	let hasMul = $state(false);

	const dimFx = $state({ alpha: 0 });
	const centerFx = $state({ scale: 1, flash: 0 });
	// one chip animates at a time (eyes fold in sequence), so a single reusable object is enough
	const chip = $state({ x: 0, y: 0, scale: 0.5, alpha: 0, text: '', mul: false, active: false });

	onMount(() => {
		return () => {
			gsap.killTweensOf(dimFx);
			gsap.killTweensOf(centerFx);
			gsap.killTweensOf(chip);
		};
	});

	const popCenter = (big = false) => {
		gsap.killTweensOf(centerFx);
		gsap
			.timeline()
			// flash is deliberately gentle: the face is a near-white ivory, so an additive copy at
			// the old 0.85 blew the glyphs out into a white blob and erased the baked bevel. 0.35
			// reads as a lift on the punch without destroying the letterforms.
			.set(centerFx, { scale: big ? 1.0 : 0.9, flash: 0.35 })
			.to(centerFx, { scale: big ? 1.55 : 1.18, duration: 0.12, ease: 'back.out(3)' })
			.to(centerFx, { scale: 1, duration: big ? 0.6 : 0.34, ease: 'elastic.out(1, 0.5)' })
			.to(centerFx, { flash: 0, duration: 0.3, ease: 'power2.out' }, 0);
	};

	// The multiplier leaves the eye WITH the chip: the moment the chip departs, mark the board
	// eye spent — its number disappears (with the Symbol's pulse) and the plain empty eye stays.
	const spendBoardEye = (eye: ComboEye) => {
		const cell = context.stateGame.board[eye.reel]?.reelState.symbols[eye.row];
		if (cell?.rawSymbol.name === 'EYE') {
			cell.rawSymbol = { ...cell.rawSymbol, spent: true };
		}
	};

	// fold one Eye into the running value: its chip flies from its board cell into the centre, then
	// the value updates (ADD → +start, MUL → ×start) with a punch.
	const foldEye = (eye: ComboEye) =>
		new Promise<void>((resolve) => {
			chip.text = eye.eyeType === 'ADD' ? `+${eye.startValue}` : `×${eye.startValue}`;
			chip.mul = eye.eyeType === 'MUL';
			chip.active = true;
			gsap.killTweensOf(chip);
			const tl = gsap.timeline({
				onComplete: () => {
					chip.active = false;
					resolve();
				},
			});
			tl.timeScale(ts());
			tl.set(chip, { x: getPositionX(eye.reel), y: getPositionY(eye.row), scale: 0.5, alpha: 0 })
				.to(chip, { alpha: 1, scale: 1.2, duration: 0.2, ease: 'back.out(2.2)' })
				// the chip is fully formed — the multiplier has left the eye (the empty eye remains).
				// Deliberately SILENT: each Eye already sounds twice (its reveal on the board, then
				// its arrival at the centre below). A third cue per Eye turned an Ultimate's 2–5
				// folds into mush — the launch is carried by the visual alone.
				.add(() => spendBoardEye(eye))
				.to(chip, { x: center.x, y: center.y, duration: 0.42, ease: 'power2.inOut' }, '<0.05')
				.add(() => {
					running = eye.eyeType === 'ADD' ? running + eye.startValue : running * eye.startValue;
					popCenter();
					// forcePlay: Ultimate folds several eyes in quick succession — each must sound
					// (the once-player drops a repeat while the same clip is still ringing).
					// A MUL fold IS the burst — it owns sfx_eye_burst; ADD gets the small note.
					context.eventEmitter.broadcast({
						type: 'soundOnce',
						name: eye.eyeType === 'MUL' ? 'sfx_eye_burst' : 'sfx_eye_combine_add',
						forcePlay: true,
					});
				})
				.to(chip, { scale: 1.7, alpha: 0, duration: 0.16, ease: 'power2.in' });
		});

	context.eventEmitter.subscribeOnMount({
		eyeShow: (e) => {
			// each Eye opens on the board (its Symbol renders the reveal); play the open sound.
			// forcePlay: Ultimate reveals 2–5 eyes ~0.7s apart — without it the once-player drops
			// every reveal after the first while the clip is still ringing (only one eye heard).
			context.eventEmitter.broadcast({
				type: 'soundOnce',
				name: e.eyeType === 'MUL' ? 'sfx_eye_reveal_mul' : 'sfx_eye_reveal_add',
				forcePlay: true,
			});
		},
		eyeBurst: async (e) => {
			// ADD eyes first (they sum into the charge), then MUL eyes (they multiply the sum)
			const eyes = [...(e.eyes ?? [])].sort(
				(a, b) => (a.eyeType === 'MUL' ? 1 : 0) - (b.eyeType === 'MUL' ? 1 : 0),
			);
			hasMul = eyes.some((eye) => eye.eyeType === 'MUL');

			resolving = true;
			show = true;
			running = e.charge;
			gazeLabel = true;

			// board falls into shadow so the equation owns the screen
			gsap.killTweensOf(dimFx);
			gsap.to(dimFx, { alpha: 0.72, duration: 0.18 / ts(), ease: 'power2.out' });

			popCenter();
			// Deliberately SILENT: this is the PREAMBLE (the starting Gaze charge appearing), not
			// a beat of its own. The sequence's sounds belong to the values actually arriving.
			await skippableWait(450 / ts());
			gazeLabel = false;

			for (const eye of eyes) {
				await foldEye(eye);
				await skippableWait(120 / ts());
			}

			// The banked snowball ×M is the LAST arrival (feature only): it flies from the HUD
			// medallion (FreeSpinCounter owns the flight) and ADDS to the combine — per §6.3 the
			// snowball is additive: eyeValue + old M = totalMult (the new banked M). That holds
			// even at M=1 (first Eye spin: totalMult = eyeValue + 1), so the flight is
			// UNCONDITIONAL in the feature. The addition lands with a chip-style punch the moment
			// the token is absorbed, so the order reads gaze first, eyes next, total mult last.
			if (context.stateGame.gameType === 'freegame') {
				await context.eventEmitter.broadcastAsync({ type: 'snowballToCombine' });
				running = e.totalMult;
				popCenter();
				// Deliberately SILENT: this already lands on e.totalMult, and the hero punch below
				// re-states the SAME number ~220ms later — one number, one sound. sfx_mult_total
				// owns it; the snowball's arrival is carried by its flight + the centre punch.
				await skippableWait(220 / ts());
			}

			// land exactly on the math's total, with a hero punch. Deliberately SILENT: the burst
			// now belongs to the MUL fold above (each MUL arrival IS the explosion), and firing it
			// again here doubled it up. The visual punch carries the landing.
			running = e.totalMult;
			popCenter(true);
			await skippableWait(750 / ts());

			// fade out — the multiplier is carried to the tumble-win banner from here (setWin)
			gsap.killTweensOf(dimFx);
			await new Promise<void>((resolve) => {
				gsap.to(dimFx, { alpha: 0, duration: 0.3 / ts(), ease: 'power2.in', onComplete: resolve });
			});
		},
		eyeHide: () => {
			show = false;
			resolving = false;
			gsap.killTweensOf(dimFx);
			dimFx.alpha = 0;
		},
	});

	// The RUNNING TOTAL is the game's number, in the shared metal (see game/textStyles.ts). The
	// flying CHIPS carry the value straight off their eye's face, so their colour (ADD cyan /
	// MUL red) drives the gradient's accent — the chip reads as continuous with the eye it left.
	//
	// Deliberately on the UI face, NOT the display serif: the Eye lives on the board mid-spin, and
	// the serif is reserved for win presentation so it still means "you won something".
	const totalStyle = abyssalAmountTextStyle({ fontSize: SYMBOL_SIZE * 0.78 });
	const gazeStyle = abyssalLabelTextStyle({ fontSize: SYMBOL_SIZE * 0.22, letterSpacing: 3 });
	const chipStyle = $derived(
		eyeValueTextStyle({ fontSize: SYMBOL_SIZE * 0.6, fill: chip.mul ? MUL_COLOR : ADD_COLOR }),
	);

	// flat board shadow for the resolve beat (no gradient, so the draw can never throw)
	const drawVignette = (g: import('pixi.js').Graphics) => {
		g.rect(0, 0, BOARD_SIZES.width, BOARD_SIZES.height).fill({
			color: hasMul ? 0x140002 : 0x02060f,
			alpha: 1,
		});
	};
</script>

<FadeContainer {show}>
	<BoardContainer>
		{#if resolving}
			<Container alpha={dimFx.alpha}>
				<Graphics draw={drawVignette} />
			</Container>
		{/if}

		<!-- the running equation value, resolved at the board centre — the branded gold face,
		     matching the seed that just flew in from the meter's plaque -->
		<Container x={center.x} y={center.y}>
			{#if gazeLabel}
				<Text
					anchor={0.5}
					y={-SYMBOL_SIZE * 0.62}
					text={context.i18nDerived.gaze()}
					style={gazeStyle}
				/>
			{/if}
			<!-- No filter here on purpose: the bitmap font already bakes its own bevel, outline and
			     shadow into the glyphs. A GlowFilter on top washed that out (and its gold no longer
			     matched the frame-toned face). The punch scale carries the beat instead — and losing
			     the filter also removes a per-frame render-texture pass. -->
			<Container scale={centerFx.scale}>
				<Text anchor={0.5} text={`${running}`} style={totalStyle} />
				{#if centerFx.flash > 0}
					<!-- the punch flash: a gentle additive copy lifts the glyphs on impact -->
					<Container alpha={centerFx.flash} blendMode="add">
						<Text anchor={0.5} text={`${running}`} style={totalStyle} />
					</Container>
				{/if}
			</Container>
		</Container>

		<!-- the Eye chip flying from its cell into the centre -->
		{#if chip.active}
			<Container x={chip.x} y={chip.y} scale={chip.scale} alpha={chip.alpha}>
				<Text anchor={0.5} text={chip.text} style={chipStyle} />
			</Container>
		{/if}
	</BoardContainer>
</FadeContainer>
