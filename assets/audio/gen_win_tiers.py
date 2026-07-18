"""Generate the five win-tier stingers via the ElevenLabs sound-generation API.

The prompts follow the measured pro-slot pattern (docs/ABYSSAL_SOUND_DESIGN.md §3 "MEASURED
PATTERNS v3"): win tiers are warm LOW-register orchestral chords (measured peaks 94-516 Hz,
almost zero treble), one escalating FAMILY — each tier longer + lower + fuller than the last,
never sharper. Tier-ups overlap in-game (forcePlay), so all five stay in the same harmonic world.

Usage:
    set ELEVENLABS_API_KEY=sk_...        (or $env:ELEVENLABS_API_KEY='sk_...' in PowerShell)
    python assets/audio/gen_win_tiers.py [names...]   # default: all five

Writes assets/audio/src/<name>.mp3 (backs up existing to _backup_2026-07-15_wintiers/),
updates manifest.json, then run:  python assets/audio/pack_sprite.py
"""
import json, os, shutil, sys, urllib.request

API = "https://api.elevenlabs.io/v1/sound-generation"
KEY = os.environ.get("ELEVENLABS_API_KEY")
SRC = os.path.join(os.path.dirname(__file__), "src")
BACKUP = os.path.join(SRC, "_backup_2026-07-15_wintiers")
MANIFEST = os.path.join(SRC, "manifest.json")

# One escalating family: same "warm low orchestral chord" DNA, each step longer/lower/fuller.
SOUNDS = {
    "sfx_win_nice": {
        "prompt": "Video game sound effect, a short warm major chord on soft strings and harp, small cheerful win, low register, rounded and pleasant, brief",
        "duration_s": 1.5,
    },
    "sfx_win_big": {
        "prompt": "Video game sound effect, a warm triumphant low orchestral chord with soft brass and harp flourish, satisfying big win, rich and round, no harshness",
        "duration_s": 2.5,
    },
    "sfx_win_mega": {
        "prompt": "Video game sound effect, a fuller deep orchestral chord swelling with warm brass, choir touch and timpani roll, exciting mega win, low and rich",
        "duration_s": 3.0,
    },
    "sfx_win_epic": {
        "prompt": "Video game sound effect, a huge deep orchestral fanfare chord, layered low brass, choir and rolling timpani, epic win celebration, powerful and warm",
        "duration_s": 3.5,
    },
    "sfx_win_max": {
        "prompt": "Video game sound effect, a massive deep victory fanfare with a dragon roar, full low orchestra, choir and thundering drums, ultimate jackpot, warm and colossal",
        "duration_s": 4.0,
    },
}


def generate(name, spec):
    body = json.dumps({
        "text": spec["prompt"],
        "duration_seconds": spec["duration_s"],
        "prompt_influence": 0.5,
    }).encode()
    req = urllib.request.Request(API, data=body, headers={
        "xi-api-key": KEY,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req) as r:
        audio = r.read()

    out = os.path.join(SRC, name + ".mp3")
    if os.path.exists(out):
        os.makedirs(BACKUP, exist_ok=True)
        backup_path = os.path.join(BACKUP, name + ".mp3")
        if not os.path.exists(backup_path):
            shutil.copy2(out, backup_path)
    with open(out, "wb") as f:
        f.write(audio)

    manifest = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    manifest[name + ".mp3"] = {
        "prompt": spec["prompt"],
        "duration_s": spec["duration_s"],
        "loop": False,
        "model": "eleven_text_to_sound_v2",
        "prompt_influence": 0.5,
        "source": "ElevenLabs sound-generation API",
        "bytes": len(audio),
        "direction": "win-tier family (measured low-orchestral pattern)",
    }
    json.dump(manifest, open(MANIFEST, "w"), indent=1)
    print(f"{name}: {len(audio)//1024}kb ({spec['duration_s']}s)")


def main():
    if not KEY:
        raise SystemExit("Set ELEVENLABS_API_KEY first (the key is never stored in the repo).")
    names = sys.argv[1:] or list(SOUNDS)
    for name in names:
        if name not in SOUNDS:
            print(f"unknown: {name} — skipped"); continue
        generate(name, SOUNDS[name])
    print("\nNow repack:  python assets/audio/pack_sprite.py")


if __name__ == "__main__":
    main()
