<script lang="ts" module>
	import {
		sound,
		isSoundEnabled,
		type MusicName,
		type SoundEffectName,
		type SoundName,
	} from '../game/sound';

	export type EmitterEventSound =
		| { type: 'soundMusic'; name: MusicName; restart?: boolean }
		| { type: 'soundOnce'; name: SoundEffectName; forcePlay?: boolean }
		| { type: 'soundLoop'; name: SoundEffectName }
		| { type: 'soundStop'; name: SoundName }
		| { type: 'soundFade'; name: SoundName; from: number; to: number; duration: number }
		| { type: 'soundScatterCounterIncrease' }
		| { type: 'soundScatterCounterClear' }
		| { type: 'soundPressGeneral' }
		| { type: 'soundPressBet' }
		| { type: 'soundPressToggle' }
		| { type: 'soundPressModalOpen' };
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';

	const context = getContext();

	context.eventEmitter.subscribeOnMount({
		// ui
		// Selecting a bet mode never switches the bed: bgm_freespin belongs to the FREE GAME only
		// (a bonus earned or bought), and bgm_main keeps looping through every base-scene mode —
		// Super Spins and Ultimate included. Only the fanfare marks the Super Spins buy.
		soundBetMode: async ({ betModeKey }) => {
			if (betModeKey === 'SUPERSPINS') playOnce('sfx_fs_intro');
		},
		// forcePlay: rapid presses (bet stepper spam, quick UI taps) must EACH click — without it the
		// once-player silently drops any play while the same clip is still ringing.
		soundPressGeneral: () => playOnce('sfx_btn_general', true),
		soundPressBet: () => playOnce('sfx_btn_spin', true),
		soundPressToggle: () => playOnce('sfx_btn_toggle', true),
		soundPressModalOpen: () => playOnce('sfx_modal_open', true),
		// scatterCounter
		soundScatterCounterIncrease: () => (context.stateGame.scatterCounter = context.stateGame.scatterCounter + 1), // prettier-ignore
		soundScatterCounterClear: () => (context.stateGame.scatterCounter = 0),
		// game — every play route is gated by the production enable-list (see sound.ts)
		soundMusic: ({ name, restart }) => playMusic(name, restart),
		soundLoop: ({ name }) => isSoundEnabled(name) && sound.players?.loop?.play({ name }),
		soundOnce: ({ name, forcePlay }) => playOnce(name, forcePlay),
		soundStop: ({ name }) => sound.stop({ name }), // stopping is never gated
		soundFade: async ({ name, duration, from, to }) => await sound.fade({ name, duration, from, to }), // prettier-ignore
	});

	// enable-list gates: a muted sound is skipped entirely (never reaches the player)
	function playOnce(name: SoundEffectName, forcePlay?: boolean) {
		if (isSoundEnabled(name)) sound.players?.once?.play({ name, forcePlay });
	}
	function playMusic(name: MusicName, restart?: boolean) {
		if (!isSoundEnabled(name)) return;
		// restart: the music player's default is pause/resume — a repeated track picks up where it
		// left off. Stopping first clears it from the player's map, so the play starts from 0:00.
		// Used for the feature bed (every bonus entry opens on the track's intro, never mid-song).
		if (restart) sound.stop({ name });
		sound.players?.music?.play({ name });
	}

	onMount(() => {
		if (context.stateGame.gameType === 'freegame') {
			// Mid-bonus resume (createBonusSnapshot may have run before this component mounted) —
			// come back on the feature bed. Every other launch, incl. single-spin modes, is base.
			playMusic('bgm_freespin');
		} else {
			playMusic('bgm_main');

			//How to control volume per soundfile(use fade)
			// sound.players.music.fade({ name: 'bgm_main', from: 0, to: 1, duration: 3000 });

			//How to control rate per soundfile
			// sound.players.music.rate({ rate: 2, name: 'bgm_main'}); // change play back rate(1: default, 0: slow, 1+ fasterm and higher pitch )
		}
	});
</script>
