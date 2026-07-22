// ---------------------------------------------------------------------------------------------
// Per-symbol WIN MOTION — the character each symbol shows while it is part of a winning cluster.
//
// WHY THIS IS CODE AND NOT ART
// A tumbling slot shows its symbol-win animation on every single win, so it is the most-watched
// animation in the game. Frame animations were priced and rejected: 8 frames x 9 symbols at the
// atlas's native 495x501 is ~68 MB of VRAM, on a client that was already being killed by iOS at
// ~500 MB. Vertex deformation of the EXISTING sprite costs no texture memory at all.
//
// It also protects art consistency. Nine separately-generated animations would drift in lighting,
// timing and motion character — the exact "mismatched visual elements" the review flagged. One
// deformation system driven by per-symbol parameters is uniform by construction: every symbol
// moves in the same visual language, only its personality differs.
//
// TUNING NOTE: `amp` is a FRACTION OF THE SYMBOL'S OWN SIZE, so it reads identically at every
// board scale and on every device. Keep it small — the goal is "this thing is alive", not rubber.
// Rigid objects (helmet, gems) get far less than soft ones (jellyfish); an over-warped gem reads
// as a bug, not as polish.
// ---------------------------------------------------------------------------------------------

export type WarpMode =
	/** travelling wave along the body, extremities move most — fish, anything that swims */
	| 'undulate'
	/** anisotropic squash: widens as it shortens — a jellyfish bell contracting */
	| 'pulse'
	/** whole body leans, anchored at the base — drifting/floating objects */
	| 'sway'
	/** uniform breathe from the centre — rigid objects that must not deform */
	| 'breathe';

export type WarpProfile = {
	mode: WarpMode;
	/** peak displacement as a fraction of the symbol's size (0.03 = 3%) */
	amp: number;
	/** oscillation speed, radians per second */
	freq: number;
	/** spatial cycles across the sprite — only used by `undulate` / `sway` */
	waves: number;
};

// The neutral fallback: any symbol without an entry still animates, just minimally.
const DEFAULT_PROFILE: WarpProfile = { mode: 'breathe', amp: 0.018, freq: 6.5, waves: 1 };

// KEYED BY ATLAS FRAME (the art), NOT by the paytable symbol name. Symbol.svelte's SYMBOL_FRAME
// remaps the two on purpose — paytable H1 draws the `H3` helmet frame, paytable H3 draws the `H1`
// anglerfish frame — so anything keyed on the name would bend the wrong objects. Always look these
// up with the frame.
//
// Each entry is a deliberate read of what the ART is. The four highs are creatures/objects with
// real-world behaviour to borrow; the five gems are faceted crystal and must stay rigid, so they
// only breathe — their spectacle comes from the additive glow already on them, not from bending.
const PROFILES: Record<string, WarpProfile> = {
	// Anglerfish — the top symbol, so it earns the most obvious motion: a body wave down its length.
	H1: { mode: 'undulate', amp: 0.038, freq: 7.4, waves: 1.35 },
	// Nautilus — a heavy shell; it drifts rather than flexes.
	H2: { mode: 'sway', amp: 0.03, freq: 5.6, waves: 1 },
	// Diving helmet — solid brass. It must NOT bend; it bobs in the current.
	H3: { mode: 'breathe', amp: 0.022, freq: 5.2, waves: 1 },
	// Jellyfish — the softest thing on the board and the one that sells the whole effect.
	H4: { mode: 'pulse', amp: 0.052, freq: 6.2, waves: 1 },

	// Gems: rigid, so `breathe` only. Slightly staggered speeds so five gems on one board do not
	// throb in lockstep, which reads as a UI effect rather than as the board being alive.
	L1: { mode: 'breathe', amp: 0.02, freq: 7.1, waves: 1 },
	L2: { mode: 'breathe', amp: 0.019, freq: 6.6, waves: 1 },
	L3: { mode: 'breathe', amp: 0.021, freq: 7.6, waves: 1 },
	L4: { mode: 'breathe', amp: 0.018, freq: 6.1, waves: 1 },
	L5: { mode: 'breathe', amp: 0.02, freq: 8.1, waves: 1 },
};

/** @param frame the ATLAS FRAME name (see the note on PROFILES — not the paytable symbol name). */
export const getWarpProfile = (frame: string): WarpProfile => PROFILES[frame] ?? DEFAULT_PROFILE;

/**
 * Writes the deformed vertex positions for one frame into `out`, from the undeformed `base`.
 *
 * Always derived FROM `base` rather than from the previous frame — accumulating displacement onto
 * live positions drifts, and a symbol that slowly wanders off its cell is the classic version of
 * this bug.
 *
 * `phase` is a per-symbol constant so that twelve winning symbols do not pulse in perfect unison.
 * `amount` (0..1) scales the whole effect, which is what lets the win ease in and out.
 */
export const applyWarp = ({
	base,
	out,
	width,
	height,
	profile,
	time,
	phase,
	amount,
}: {
	base: Float32Array;
	out: Float32Array;
	width: number;
	height: number;
	profile: WarpProfile;
	time: number;
	phase: number;
	amount: number;
}) => {
	const { mode, amp, freq, waves } = profile;
	const a = amp * amount;
	const t = time * freq + phase;
	const TAU = Math.PI * 2;

	for (let i = 0; i < base.length; i += 2) {
		const x = base[i];
		const y = base[i + 1];
		// normalised position within the sprite, 0..1
		const u = width > 0 ? x / width : 0;
		const v = height > 0 ? y / height : 0;
		let dx = 0;
		let dy = 0;

		switch (mode) {
			case 'undulate': {
				// Envelope keeps the centre of mass still and lets the extremities travel, so the
				// symbol flexes in place instead of sliding around its cell. Direction-agnostic on
				// purpose — the art may face either way and this reads correctly for both.
				const env = 0.15 + 0.85 * Math.abs(u - 0.5) * 2;
				dy = Math.sin(t + u * waves * TAU) * a * height * env;
				dx = Math.cos(t + u * waves * TAU) * a * width * 0.25 * env;
				break;
			}
			case 'pulse': {
				// Anisotropic: wider as it gets shorter, and back. Volume reads as roughly preserved,
				// which is what makes it look like a bell swimming rather than a scaling image.
				const s = Math.sin(t);
				dx = (u - 0.5) * width * a * s;
				dy = (v - 0.5) * height * -a * s;
				break;
			}
			case 'sway': {
				// Anchored at the bottom (v = 1), free at the top — the lean of something floating
				// while its base stays put.
				const s = Math.sin(t + v * waves * Math.PI);
				dx = s * a * width * (1 - v);
				break;
			}
			case 'breathe':
			default: {
				// Uniform scale about the centre. No shear, no bend — safe for rigid geometry.
				const s = Math.sin(t);
				dx = (u - 0.5) * width * a * s;
				dy = (v - 0.5) * height * a * s;
				break;
			}
		}

		out[i] = x + dx;
		out[i + 1] = y + dy;
	}
};
