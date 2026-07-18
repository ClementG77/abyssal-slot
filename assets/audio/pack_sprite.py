"""Pack assets/audio/src/*.mp3 into one audio.m4a + sounds.json (Howler sprite, Valkyrie-style).
Sample-accurate offsets via WAV intermediates; 1s gap between segments; aac 128k output.
bgm_main / bgm_freespin alias the bgm_win segment until real beds are authored.
"""
import json, os, subprocess, sys, wave, tempfile

import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

SRC = r"C:/Users/cleme/Documents/perso/Stake-Engine/lantern/front/web-sdk/apps/abyssal/assets/audio/src"
OUT = r"C:/Users/cleme/Documents/perso/Stake-Engine/lantern/front/web-sdk/apps/abyssal/static/assets/sounds"
SR, CH, GAP_S = 44100, 2, 1.0

ORDER = [
    "bgm_main", "bgm_freespin", "bgm_win", "amb_underwater",
    "sfx_btn_general", "sfx_btn_toggle", "sfx_modal_open", "sfx_btn_spin", "sfx_reel_stop",
    "sfx_scatter_land", "sfx_anticipation", "sfx_scatter_win", "sfx_fs_intro", "sfx_fs_outro",
    "sfx_gaze_fill", "sfx_gaze_full",
    "sfx_eye_land", "sfx_eye_reveal_add", "sfx_eye_reveal_mul",
    "sfx_eye_combine_add", "sfx_eye_combine_mul", "sfx_eye_burst", "sfx_mult_moove",
    "sfx_snowball_up",
    "sfx_cluster_win", "sfx_countup_loop",
    "sfx_win_nice", "sfx_win_big", "sfx_win_mega", "sfx_win_epic", "sfx_win_max",
    "sfx_transition",
]

# measured loudness hierarchy (hits ~1.0, UI/ticks 12-15dB under, beds/ambience low)
VOLUMES = {
    "bgm_main": 0.175, "bgm_freespin": 0.25, "bgm_win": 0.3, "amb_underwater": 0.25,
    "sfx_btn_general": 0.5, "sfx_btn_toggle": 0.55, "sfx_modal_open": 0.5, "sfx_btn_spin": 0.8, "sfx_reel_stop": 1.0,
    "sfx_scatter_land": 0.9, "sfx_anticipation": 0.7, "sfx_scatter_win": 0.9, "sfx_fs_intro": 0.9,
    "sfx_fs_outro": 0.9, "sfx_mult_moove": 0.9,
    "sfx_gaze_fill": 0.5, "sfx_gaze_full": 0.8,
    "sfx_eye_land": 1.0, "sfx_eye_reveal_add": 0.9, "sfx_eye_reveal_mul": 0.9,
    "sfx_eye_combine_add": 0.9, "sfx_eye_combine_mul": 0.9, "sfx_eye_burst": 1.0,
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
    run([FF, "-y", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=stereo", "-t", str(GAP_S),
         "-ar", str(SR), "-ac", str(CH), "-c:a", "pcm_s16le", silence])

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
