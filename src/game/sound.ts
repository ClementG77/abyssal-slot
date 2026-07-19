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
	| 'sfx_fs_intro'
	| 'sfx_fs_outro' // the bonus-end congratulations card presents
	// the Eye & Gaze (hero feature) — ADD = cyan, MUL = red
	| 'sfx_gaze_full' // the meter laps a colour band (GazeMeter)
	| 'sfx_eye_land'
	| 'sfx_eye_reveal_add'
	| 'sfx_eye_reveal_mul'
	| 'sfx_eye_combine_add' // an ADD value arrives at the combine centre
	| 'sfx_eye_burst' // a MUL value arrives — the multiplier explosion
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
	| 'sfx_transition';

export type SoundName = MusicName | SoundEffectName;

// --- Production enable-list ------------------------------------------------------------
// Every sound in the union is validated and shipping (2026-07-16) — the one-at-a-time
// validation pass is complete, and dormant names were removed rather than left muted, so the
// union IS the enable-list. Keep it that way: a name that earns a place here must have a call
// site and a clip in the sprite. To audition a NEW sound in isolation, temporarily narrow this
// set instead of re-introducing muted names. `soundStop`/`soundFade` are never gated.
export const ENABLED_SOUNDS = new Set<SoundName>([
	// music
	'bgm_main',
	'bgm_freespin',
	'bgm_win',
	// ui + reels
	'sfx_btn_general',
	'sfx_btn_toggle',
	'sfx_modal_open',
	'sfx_btn_spin',
	'sfx_reel_stop',
	// scatter & feature
	'sfx_scatter_land',
	'sfx_anticipation',
	'sfx_fs_intro',
	'sfx_fs_outro',
	// the Eye & Gaze
	'sfx_gaze_full',
	'sfx_eye_land',
	'sfx_eye_reveal_add',
	'sfx_eye_reveal_mul',
	'sfx_eye_combine_add',
	'sfx_eye_burst',
	'sfx_mult_moove',
	'sfx_snowball_up',
	// wins & transition
	'sfx_cluster_win',
	'sfx_countup_loop',
	'sfx_win_nice',
	'sfx_win_big',
	'sfx_win_mega',
	'sfx_win_epic',
	'sfx_win_max',
	'sfx_transition',
]);

export const isSoundEnabled = (name: SoundName) => ENABLED_SOUNDS.has(name);

const sound = createSound<SoundName>();

export { sound };
