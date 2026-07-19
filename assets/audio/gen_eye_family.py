"""Generate the Eye / Gaze family via the ElevenLabs sound-generation API.

PROMPT STYLE (learned the hard way — see docs/ABYSSAL_SOUND_DESIGN.md and the manifest):
describe a REAL, RECORDABLE EVENT — physical object + action + abyss/leviathan context. No
"video game sound effect" prefix, no synth/electric words, no emotion adjectives ("warm",
"satisfying", "punchy") — those render as generic synth mush. The user-validated
`sfx_scatter_land` came from exactly this style: "deep resonant monster bell with a low watery
growl, ancient leviathan stirring".

The ADD < MUL hierarchy reads through PHYSICAL SCALE, not adjectives: bubbles and coins for ADD,
stone and chains and whales for MUL.

Usage:
    ELEVENLABS_API_KEY=sk_... python assets/audio/gen_eye_family.py [names...]

Writes assets/audio/src/<name>.mp3 (backing up any existing clip), updates manifest.json, then:
    python assets/audio/pack_sprite.py
"""
import json, os, shutil, sys, urllib.request

API = "https://api.elevenlabs.io/v1/sound-generation"
KEY = os.environ.get("ELEVENLABS_API_KEY")
SRC = os.path.join(os.path.dirname(__file__), "src")
BACKUP = os.path.join(SRC, "_backup_2026-07-16_eyefamily")
MANIFEST = os.path.join(SRC, "manifest.json")

SOUNDS = {
    # v3 — the family is written as SIBLINGS OF THE TWO KEEPERS, which the user asked to preserve:
    #   sfx_eye_burst  = "a massive magical explosion, deep boom with a glittering energy shower"
    #   sfx_mult_moove = user-authored flight whoosh
    # That world is MAGICAL ENERGY, not real-world foley. Earlier passes generated wet-stone foley
    # (coins, anchor chains, slabs) next to a magical explosion, and the family never cohered.
    # Scale by SIZE within one world: ADD = small/bright, MUL = deep/heavy.
    # REVEALS — percussion-led, to match the wooden combines below (one instrument family) and
    # because a DRUM TRANSIENT is what actually makes a reveal hit hard. Structure: the drum lands
    # the impact, a tone blooms after it (the "multiplier landing on the board" feel).
    # Prior takes in src/_keepers/: "air bubble bursting" (validated, then wanted punchier) and
    # "colossal eye snapping open" (validated). Rejected: magical orb/shimmer, "magic prize" burst.
    "sfx_eye_reveal_add": {
        "prompt": "sharp drum hit with a bright glowing tone rising after it",
        "duration_s": 0.6,
    },
    "sfx_eye_reveal_mul": {
        "prompt": "huge deep drum boom with a dark powerful tone swelling after it",
        "duration_s": 1.2,
    },
    # COMBINES — these fire 2-5x in rapid succession, so they must be PITCHED NOTES (noise stacks
    # into mud; notes stack into a tally — the measured pro-slot pattern). NO METAL: coins, bells
    # and metallic rings are banned here by the user. Warm WOODEN mallet percussion instead —
    # pitched, short, and it layers without turning harsh. ADD = bright note, MUL = deep note.
    "sfx_eye_combine_add": {
        "prompt": "single warm marimba note, soft and bright, very short",
        "duration_s": 0.5,
    },
    "sfx_eye_combine_mul": {
        "prompt": "deep wooden taiko drum hit, warm and heavy, short",
        "duration_s": 0.7,
    },
    # DORMANT — the combine-centre preamble is silent now (see Eye.svelte). Kept for the sprite.
    "sfx_gaze_full": {
        "prompt": "underwater geyser surging upward, rushing pressure release",
        "duration_s": 1.0,
    },
    # the banked multiplier climbs one step — same warm wooden lane as the combines (no metal)
    "sfx_snowball_up": {
        "prompt": "short warm wooden mallet note rising in pitch",
        "duration_s": 0.5,
    },
    # DORMANT — the multiplier explosion now uses the sfx_eye_burst KEEPER (see Eye.svelte).
    "sfx_mult_total": {
        "prompt": "vast underwater explosion, deep concussive boom and long swell",
        "duration_s": 1.5,
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
        "direction": "real-world foley (leviathan/abyss physical events)",
    }
    json.dump(manifest, open(MANIFEST, "w"), indent=1)
    print(f"{name}: {len(audio)//1024}kb ({spec['duration_s']}s) — {spec['prompt']}")


def main():
    if not KEY:
        raise SystemExit("Set ELEVENLABS_API_KEY first (never stored in the repo).")
    for name in (sys.argv[1:] or list(SOUNDS)):
        if name not in SOUNDS:
            print(f"unknown: {name} — skipped"); continue
        generate(name, SOUNDS[name])
    print("\nNow repack:  python assets/audio/pack_sprite.py")


if __name__ == "__main__":
    main()
