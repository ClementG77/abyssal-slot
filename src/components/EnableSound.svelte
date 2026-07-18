<script lang="ts">
	import { onMount } from 'svelte';

	import type { LoadedAudio } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { sound, type SoundName } from '../game/sound';

	const context = getContext();

	// The sound system stays inert until the audio sprite is loaded. It becomes live the moment the
	// `sound` asset is registered in `game/assets.ts` (currently commented out until the real
	// `assets/audio/audio.m4a` + `sounds.json` exist — see docs/ABYSSAL_SOUND_DESIGN.md §4.2).
	// This load is GUARDED: with no `sound` asset loaded, `loadedAssets['sound']` is undefined and we
	// no-op, so the game runs silently without errors. `sound.players` stays undefined and every
	// play/stop/fade call is already guarded. Drop the sprite in + uncomment the assets.ts entry and
	// audio starts playing with zero further changes.
	onMount(() => {
		const loadedAudio = $state.snapshot(context.stateApp.loadedAssets['sound']) as
			| LoadedAudio<SoundName>
			| undefined;
		if (!loadedAudio) return; // no sprite yet — stay silent

		const { destroy } = sound.load(loadedAudio);
		return () => destroy();
	});

	sound.enableEffect();
	sound.volumeEffect();
</script>
