"""Reuse the scatter SDK-template sounds for Abyssal, shaped toward Valkyrie's MEASURED profile
(FFT-analyzed earlier): wins = warm low chords (~100-500 Hz), multiplier/eye hits = deep punch,
scatter = ominous depth. Per-event pitch (semitones, negative = deeper) + optional warmth EQ
(bass boost + treble cut to kill the 'too acute' brightness). Source = scatter's own sound sprite
(legit: it's the SDK template in our monorepo). Output -> apps/abyssal/assets/audio/src/<name>.mp3.

KEEPS (never touched): sfx_btn_general, sfx_btn_spin, sfx_reel_stop, bgm_*.
Re-run then repack: python assets/audio/pack_sprite.py
"""
import json, os, subprocess
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

WEB = r"C:/Users/cleme/Documents/perso/Stake-Engine/lantern/front/web-sdk"
SCAT_JSON = WEB + "/apps/scatter/static/assets/audio/sounds.json"
SCAT_SRC = WEB + "/apps/scatter/static/assets/audio/sounds.ogg"
OUT = WEB + "/apps/abyssal/assets/audio/src"

sprite = json.load(open(SCAT_JSON))["sprite"]

# warmth EQ toward Valkyrie's warm low-mid dominance (kills harsh highs)
WARMTH = "bass=g=4:f=110,treble=g=-3:f=5200"

# abyssal_name: (scatter_src, take_ms|None, inner_off_ms, is_loop, semitones, warmth)
MAP = {
    # scatter & feature — Leviathan: deep, ominous
    "sfx_scatter_land":    ("sfx_scatter_stop_3", None, 0, False, -4, True),  # recreated: deeper/heavier
    "sfx_anticipation":    ("sfx_anticipation", None, 0, True, -2, False),  # keep tension/air
    "sfx_scatter_win":     ("sfx_scatter_win", None, 0, False, -3, True),
    "sfx_fs_intro":        ("sfx_scatter_win_v2", None, 0, False, -3, True),
    # the Eye & Gaze — deep punchy hits; ADD lighter than MUL
    "sfx_gaze_fill":       ("sfx_multiplier_update", 600, 0, False, -2, False),  # unwired, keep audio
    "sfx_gaze_full":       ("sfx_scatter_reveal", None, 0, False, -2, True),
    "sfx_eye_land":        ("sfx_multiplier_landing", None, 0, False, -4, True),   # deep bomb drop
    "sfx_eye_reveal_add":  ("sfx_multiplier_win", 1600, 0, False, -2, False),      # ADD = lighter
    "sfx_eye_reveal_mul":  ("sfx_multiplier_explosion_b", 1600, 0, False, -4, True),  # MUL = big/dark
    "sfx_eye_combine_add": ("sfx_multiplier_combine_a", None, 0, False, -2, False),
    "sfx_eye_combine_mul": ("sfx_multiplier_combine_b", None, 0, False, -4, True),
    "sfx_eye_burst":       ("sfx_multiplier_explosion_a", None, 0, False, -4, True),
    "sfx_snowball_up":     ("sfx_multiplier_up", None, 0, False, -2, False),
    # wins — warm low chords (Valkyrie profile)
    "sfx_cluster_win":     ("tumble_win_2", None, 0, False, -2, True),  # real cascade pop, Valkyrie-ish
    "sfx_countup_loop":    ("sfx_bigwin_coinloop", 4000, 4000, True, -1, False),
    "sfx_win_nice":        ("sfx_winlevel_nice", None, 0, False, -3, True),
    "sfx_win_big":         ("sfx_winlevel_substantial", None, 0, False, -3, True),
    "sfx_win_mega":        ("bgm_winlevel_mega", 2200, 0, False, -3, True),
    "sfx_win_epic":        ("bgm_winlevel_epic", 2600, 0, False, -3, True),
    "sfx_win_max":         ("sfx_youwon_panel", None, 0, False, -4, True),  # biggest, deepest
    "sfx_transition":      ("sfx_anticipation_start", None, 0, False, -3, True),
}


def main():
    for name, (src, take, inner, is_loop, semis, warmth) in MAP.items():
        if src not in sprite:
            print(f"MISSING scatter src {src} for {name}"); continue
        off = (sprite[src][0] + inner) / 1000.0
        dur = (take if take else sprite[src][1]) / 1000.0
        r = 2 ** (semis / 12)
        af = f"asetrate=48000*{r:.5f},aresample=48000,atempo={1/r:.5f}"
        if warmth:
            af += "," + WARMTH
        if not is_loop:
            af += f",afade=t=out:st={max(0,dur-0.03):.3f}:d=0.03"
        out = os.path.join(OUT, name + ".mp3")
        cmd = [FF, "-y", "-ss", f"{off:.3f}", "-i", SCAT_SRC, "-t", f"{dur:.3f}",
               "-af", af, "-ar", "44100", "-ac", "2", "-b:a", "128k", out]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"FAIL {name}: {res.stderr[-200:]}")
        else:
            tag = f"{semis:+d}st" + (" +warm" if warmth else "")
            print(f"OK   {name:22} <- {src:26} {tag}")


if __name__ == "__main__":
    main()
