"""Build a composite sfx_cluster_win that matches the animation: symbols GLOW + SCALE UP, then
EXPLODE INTO BUBBLES. = a rising magical shimmer (glow/scale) crossfaded into a wet shatter-into-
debris burst (explode+bubbles), pitched warm/underwater. Source = scatter template sprite (legal).
Run then repack: python assets/audio/pack_sprite.py
"""
import json, os, subprocess, tempfile
import imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()

WEB = r"C:/Users/cleme/Documents/perso/Stake-Engine/lantern/front/web-sdk"
SCAT_JSON = WEB + "/apps/scatter/static/assets/audio/sounds.json"
SCAT_SRC = WEB + "/apps/scatter/static/assets/audio/sounds.ogg"
OUT = WEB + "/apps/abyssal/assets/audio/src/sfx_cluster_win.mp3"

sprite = json.load(open(SCAT_JSON))["sprite"]

GLOW = ("sfx_scatter_reveal", 0.28)   # rising magical shimmer = glow / scale-up
BURST = ("sfx_wild_explode", 0.50)    # glass-and-water shatter into wet debris = explode into bubbles
XFADE = 0.06                          # crossfade so it's one continuous gesture
SEMIS = -2
WARMTH = "bass=g=4:f=110,treble=g=-3:f=5200"


def cut(seg, dur, path):
    off = sprite[seg][0] / 1000.0
    subprocess.run([FF, "-y", "-ss", f"{off:.3f}", "-i", SCAT_SRC, "-t", f"{dur:.3f}",
                    "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", path],
                   capture_output=True, text=True, check=True)


def main():
    tmp = tempfile.mkdtemp()
    g, b = os.path.join(tmp, "g.wav"), os.path.join(tmp, "b.wav")
    cut(*GLOW, g); cut(*BURST, b)
    r = 2 ** (SEMIS / 12)
    total = GLOW[1] + BURST[1] - XFADE
    fc = (f"[0][1]acrossfade=d={XFADE}:c1=tri:c2=tri[m];"
          f"[m]asetrate=48000*{r:.5f},aresample=48000,atempo={1/r:.5f},{WARMTH},"
          f"afade=t=out:st={total-0.04:.3f}:d=0.04[a]")
    res = subprocess.run([FF, "-y", "-i", g, "-i", b, "-filter_complex", fc, "-map", "[a]",
                          "-ar", "44100", "-ac", "2", "-b:a", "128k", OUT],
                         capture_output=True, text=True)
    if res.returncode != 0:
        print("FAIL:", res.stderr[-400:])
    else:
        print(f"OK  sfx_cluster_win = glow({GLOW[0]} {GLOW[1]}s) -> burst({BURST[0]} {BURST[1]}s), "
              f"{SEMIS}st +warm, ~{total:.2f}s, {os.path.getsize(OUT)//1024}kb")


if __name__ == "__main__":
    main()
