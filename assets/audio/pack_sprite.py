"""Pack assets/audio/src/*.mp3 into one audio.m4a + sounds.json (Howler sprite, Valkyrie-style).
Sample-accurate offsets via WAV intermediates; 1s gap between segments; aac 128k output.
bgm_main / bgm_freespin alias the bgm_win segment until real beds are authored.
"""
import json, os, subprocess, sys, wave, tempfile

import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

SRC = r"C:/Users/cleme/Documents/perso/Stake-Engine/lantern/front/web-sdk/apps/abyssal/assets/audio/src"
OUT = r"C:/Users/cleme/Documents/perso/Stake-Engine/lantern/front/web-sdk/apps/abyssal/static/assets/sounds"
# ---------------------------------------------------------------------------------------------
# MONO, AND WHY (2026-07-20) — this is an iOS memory fix, not a quality decision.
#
# Howler plays this sprite through Web Audio, which decodes the WHOLE file to an uncompressed
# Float32 AudioBuffer up front. At 334s stereo that is ~112 MB resident from a 4.8 MB download,
# and it was the single largest allocation in the app — the probe caught iOS killing the tab
# outright (no webglcontextlost, no pagehide, just the log stopping) at ~263 MB total footprint.
#
# CH = 1 halves that to ~56 MB. Nothing else about the game changes: same sprite, same offsets
# map, same code path, music still plays. On a phone speaker the loss of stereo width is
# inaudible; on headphones the beds go centre-panned.
#
# WHAT DOES NOT WORK, so nobody retries it: lowering SR. `decodeAudioData` resamples to the
# AudioContext's own rate (44.1k or 48k on iOS), so a 22k file is upsampled straight back to full
# size in memory. Only CHANNELS and DURATION move the decoded number. Duration is the other real
# lever — bgm_main and bgm_freespin are 120s EACH, 270s of the 307s total, so shorter loops would
# buy more than anything else here if the music can take it (see loop_trim.py).
# ---------------------------------------------------------------------------------------------
SR, CH = 44100, 1

# Was 1.0s. 27 boundaries x 1s = 27s of pure silence, ~9 MB of the decoded buffer spent on nothing.
# The gap only has to exceed AAC's encoder padding (~20ms) so a seek cannot catch the previous
# clip's tail; 0.4s is 20x that and still saves ~16s of buffer. Raise it if you ever hear bleed
# between sprite segments.
GAP_S = 0.4

# Must stay 1:1 with the SoundName union in src/game/sound.ts. Names with no call site were
# REMOVED (2026-07-16) rather than shipped silently — their source clips are still in src/ if a
# moment ever wants them back: amb_underwater, sfx_scatter_win, sfx_gaze_fill,
# sfx_eye_combine_mul, sfx_mult_total.
ORDER = [
    "bgm_main", "bgm_freespin", "bgm_win",
    "sfx_btn_general", "sfx_btn_toggle", "sfx_modal_open", "sfx_btn_spin", "sfx_reel_stop",
    "sfx_scatter_land", "sfx_anticipation", "sfx_fs_intro", "sfx_fs_outro",
    "sfx_gaze_full",
    "sfx_eye_land", "sfx_eye_reveal_add", "sfx_eye_reveal_mul",
    "sfx_eye_combine_add", "sfx_eye_burst",
    "sfx_mult_moove", "sfx_snowball_up",
    "sfx_cluster_win", "sfx_countup_loop",
    "sfx_win_nice", "sfx_win_big", "sfx_win_mega", "sfx_win_epic", "sfx_win_max",
    "sfx_transition",
]

# measured loudness hierarchy (hits ~1.0, UI/ticks 12-15dB under, beds/ambience low)
VOLUMES = {
    "bgm_main": 0.175, "bgm_freespin": 0.25, "bgm_win": 0.3,
    "sfx_btn_general": 0.5, "sfx_btn_toggle": 0.55, "sfx_modal_open": 0.5, "sfx_btn_spin": 0.8, "sfx_reel_stop": 1.0,
    "sfx_scatter_land": 0.9, "sfx_anticipation": 0.7, "sfx_fs_intro": 0.9,
    "sfx_fs_outro": 0.9, "sfx_mult_moove": 0.9,
    "sfx_gaze_full": 0.8,
    # ADD < MUL by design: the cyan eye is common/small, the red eye must turn the player's head.
    # USER-VALIDATED balance — do not change without asking.
    "sfx_eye_land": 1.0, "sfx_eye_reveal_add": 0.7, "sfx_eye_reveal_mul": 1.0,
    "sfx_eye_combine_add": 0.9, "sfx_eye_burst": 1.0,
    "sfx_snowball_up": 0.7, "sfx_cluster_win": 0.7, "sfx_countup_loop": 0.45,
    "sfx_win_nice": 0.85, "sfx_win_big": 0.9, "sfx_win_mega": 0.95, "sfx_win_epic": 0.95,
    "sfx_win_max": 1.0, "sfx_transition": 0.9,
}


def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-500:])


def wav_samples(path):
    with wave.open(path, "rb") as w:
        assert w.getframerate() == SR and w.getnchannels() == CH
        return w.getnframes()


def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="sprite_")
    silence = os.path.join(tmp, "silence.wav")
    # channel layout follows CH — hardcoding stereo here worked only because -ac downmixed it
    run([FF, "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl={'mono' if CH == 1 else 'stereo'}",
         "-t", str(GAP_S), "-ar", str(SR), "-ac", str(CH), "-c:a", "pcm_s16le", silence])

    pieces, sprite, cursor = [], {}, 0  # cursor in samples
    gap = wav_samples(silence)
    for name in ORDER:
        src = os.path.join(SRC, name + ".mp3")
        if not os.path.exists(src):
            print(f"MISSING {name}.mp3 — skipped"); continue
        piece = os.path.join(tmp, name + ".wav")
        run([FF, "-y", "-i", src, "-ar", str(SR), "-ac", str(CH), "-c:a", "pcm_s16le", piece])
        n = wav_samples(piece)
        sprite[name] = [round(cursor / SR * 1000), round(n / SR * 1000)]
        pieces.append(piece); pieces.append(silence)
        cursor += n + gap
        print(f"{name}: offset {sprite[name][0]}ms dur {sprite[name][1]}ms")

    concat = os.path.join(tmp, "list.txt")
    with open(concat, "w") as f:
        for p in pieces:
            f.write(f"file '{p}'\n")
    m4a = os.path.join(OUT, "audio.m4a")
    run([FF, "-y", "-f", "concat", "-safe", "0", "-i", concat,
         "-c:a", "aac", "-b:a", "128k", "-ar", str(SR), "-ac", str(CH), m4a])

    out = {
        "src": ["./assets/sounds/audio.m4a"],
        "sprite": sprite,
        "config": {k: {"volume": v} for k, v in VOLUMES.items() if k in sprite},
    }
    with open(os.path.join(OUT, "sounds.json"), "w") as f:
        json.dump(out, f, indent=1)
    print(f"\nPacked {len(sprite)} segments -> {m4a} ({os.path.getsize(m4a)//1024}kb) + sounds.json")


if __name__ == "__main__":
    main()
