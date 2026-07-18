import { createSound } from 'utils-sound';

// Abyssal's finalized production sound set — 27 clips, one `audio.m4a` sprite (see
// docs/ABYSSAL_SOUND_DESIGN.md §3). Names are feature-accurate. A name MUST exist here to be
// playable; the union is closed, so a typo won't compile.

export type MusicName =
	| 'bgm_main' // base game loop
	| 'bgm_freespin' // free spins + super spins bed
	| 'bgm_win'; // one shared win-tier bed (stingers ride over it)

export type SoundEffectName =
	// UI & reels
	| 'sfx_btn_general' // bet-amount controls ONLY (stepper, bet-menu open/pick)
	| 'sfx_btn_toggle' // on/off switches + selections: turbo, autoSpin count pick, close popups
	| 'sfx_modal_open' // revealing a panel: auto popup, buy bonus modal, info/rules, menu
	| 'sfx_btn_spin'
	| 'sfx_reel_stop'
	// scatter & feature
	| 'sfx_scatter_land'
	| 'sfx_anticipation' // loop
	| 'sfx_scatter_win'
	| 'sfx_fs_intro'
	| 'sfx_fs_outro' // the bonus-end congratulations card presents
	// the Eye & Gaze (hero feature) — ADD = cyan, MUL = red
	| 'sfx_gaze_fill'
	| 'sfx_gaze_full'
	| 'sfx_eye_land'
	| 'sfx_eye_reveal_add'
	| 'sfx_eye_reveal_mul'
	| 'sfx_eye_combine_add'
	| 'sfx_eye_combine_mul'
	| 'sfx_eye_burst'
	| 'sfx_mult_moove' // the combined final multiplier flies from the Eye to the tumble banner
	| 'sfx_snowball_up'
	// wins & transition
	| 'sfx_cluster_win'
	| 'sfx_countup_loop' // loop
	| 'sfx_win_nice'
	| 'sfx_win_big'
	| 'sfx_win_mega'
	| 'sfx_win_epic'
	| 'sfx_win_max'
	| 'sfx_transition'
	// optional ambient bed (loop) — unwired until authored
	| 'amb_underwater';

export type SoundName = MusicName | SoundEffectName;

// --- Production enable-list ------------------------------------------------------------
// We validate sounds ONE AT A TIME in the live game (too many at once = noise). Only names
// in this set actually PLAY; every other sound stays generated + wired but MUTED. To test a
// new sound: add its name here, verify in-game, and keep it if it's good — then move to the
// next. `soundStop`/`soundFade` are NOT gated (stopping is always allowed).
export const ENABLED_SOUNDS = new Set<SoundName>([
	// music (validated)
	'bgm_main',
	'bgm_freespin',
	'bgm_win',
	// ui + reels (validated)
	'sfx_btn_general',
	'sfx_btn_spin',
	'sfx_reel_stop',
	// --- add sounds below one at a time as they pass validation ---
	// batch under test (2026-07-14) — user-authored clips imported from the drop folder
	'sfx_cluster_win',
	'sfx_anticipation',
	'sfx_countup_loop',
	'sfx_eye_burst',
	'sfx_eye_land',
	'sfx_fs_intro',
	'sfx_scatter_land',
	'sfx_transition',
	// batch under test (2026-07-15) — new button-sound split
	'sfx_btn_toggle',
	'sfx_modal_open',
	// batch under test (2026-07-15) — win-tier stingers
	'sfx_win_nice',
	'sfx_win_big',
	'sfx_win_mega',
	'sfx_win_epic',
	'sfx_win_max',
	// batch under test (2026-07-16) — outro card + multiplier flight
	'sfx_fs_outro',
	'sfx_mult_moove',
]);

export const isSoundEnabled = (name: SoundName) => ENABLED_SOUNDS.has(name);

const sound = createSound<SoundName>();

export { sound };
