"""Loop-trim a one-shot clip in assets/audio/src/ so Howler's `loop:true` sprite playback (see
createPlayLoop.svelte.ts / createSound.svelte.ts) doesn't produce an audible click or a dead re-attack
each cycle. Three steps: (1) drop leading silence so the loop doesn't restart on dead air, (2) crossfade
the clip's tail into its head (equal-power) to build a seamless seam, (3) splice that seam back onto the
untouched middle so the result is one loop-length clip whose end flows into its own start.

Usage: python assets/audio/loop_trim.py <name> [--head-silence-db -35] [--crossfade-ms 80]
Backs up the original to assets/audio/src/_backup_loop_trim/<name>.mp3 first (skips if already backed up).
"""
import argparse, os, re, subprocess, wave

import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

SRC = os.path.join(os.path.dirname(__file__), "src")
BACKUP = os.path.join(SRC, "_backup_loop_trim")


def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-800:])
    return r.stderr


def wav_duration_s(path):
    with wave.open(path, "rb") as w:
        return w.getnframes() / w.getframerate()


def detect_head_silence(path, noise_db, min_dur=0.03):
    out = run([FF, "-i", path, "-af", f"silencedetect=noise={noise_db}dB:d={min_dur}", "-f", "null", "-"])
    starts = [float(m) for m in re.findall(r"silence_start:\s*([0-9.]+)", out)]
    ends = [float(m) for m in re.findall(r"silence_end:\s*([0-9.]+)", out)]
    if starts and starts[0] < 0.02 and ends:
        return ends[0]
    return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--head-silence-db", type=float, default=-35)
    ap.add_argument("--crossfade-ms", type=int, default=80)
    args = ap.parse_args()

    src = os.path.join(SRC, args.name + ".mp3")
    if not os.path.exists(src):
        raise SystemExit(f"missing {src}")

    os.makedirs(BACKUP, exist_ok=True)
    backup_path = os.path.join(BACKUP, args.name + ".mp3")
    if not os.path.exists(backup_path):
        run([FF, "-y", "-i", src, "-c", "copy", backup_path])
        print(f"backed up -> {backup_path}")
    else:
        print(f"backup already exists at {backup_path} (not overwritten)")

    head_trim = detect_head_silence(src, args.head_silence_db)
    trimmed = os.path.join(SRC, f"_tmp_{args.name}_trimmed.wav")
    run([FF, "-y", "-i", src, "-ss", str(head_trim), "-ar", "44100", "-ac", "2",
         "-c:a", "pcm_s16le", trimmed])

    L = wav_duration_s(trimmed)
    d = args.crossfade_ms / 1000
    if d * 2 >= L:
        raise SystemExit(f"{args.name}: clip too short ({L:.2f}s) for a {args.crossfade_ms}ms crossfade")

    # seam = tail(L-d..L) crossfaded onto head(0..d) -> becomes the new loop START
    # middle = d..L-d, unchanged -> follows the seam, and its end now flows into the seam's own
    # tail-derived half, so the loop point (end of middle -> start of seam) is a real match, not
    # a hard cut.
    out_wav = os.path.join(SRC, f"_tmp_{args.name}_looped.wav")
    filter_complex = (
        f"[0:a]atrim=start={L - d}:end={L},asetpts=PTS-STARTPTS[tail];"
        f"[0:a]atrim=start=0:end={d},asetpts=PTS-STARTPTS[head];"
        f"[tail][head]acrossfade=d={d}:c1=tri:c2=tri[seam];"
        f"[0:a]atrim=start={d}:end={L - d},asetpts=PTS-STARTPTS[middle];"
        f"[seam][middle]concat=n=2:v=0:a=1[out]"
    )
    run([FF, "-y", "-i", trimmed, "-filter_complex", filter_complex, "-map", "[out]", out_wav])

    out_mp3 = src
    run([FF, "-y", "-i", out_wav, "-c:a", "libmp3lame", "-b:a", "192k", out_mp3])

    new_len = wav_duration_s(out_wav)
    for f in (trimmed, out_wav):
        os.remove(f)

    print(f"{args.name}: trimmed {head_trim*1000:.0f}ms head silence, {args.crossfade_ms}ms crossfade "
          f"seam, {L:.2f}s -> {new_len:.2f}s seamless loop -> {out_mp3}")


if __name__ == "__main__":
    main()
