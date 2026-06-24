<script lang="ts">
	import { sound } from '../game/sound';

	// The cloned scatter-template sound bank has been removed (nothing to ship to Stake
	// Engine yet), so there is no audio to load. The sound system stays wired up but inert:
	// `sound.players` is undefined until `load()`, and every play/stop/fade call is guarded,
	// so the game runs silently without errors. Drop a real `sound` asset back into assets.ts
	// + restore the `sound.load(...)` here once Abyssal's own audio exists.
	sound.enableEffect();
	sound.volumeEffect();
</script>
