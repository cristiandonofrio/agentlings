#!/usr/bin/env python3
"""Synthesises each creature's alert sounds with no audio libraries.

Two per species: <species>-needs.wav when a session starts needing you (bright, rising)
and <species>-failed.wav when one fails (lower, falling). Run from the repo root:
    python3 tools/make-sounds.py
"""
import math, random, struct, wave
from pathlib import Path

RATE = 22050
OUT = Path('src-tauri/sounds')


def note(freq, dur, *, to=None, partials=((1, 1),), attack=0.006, decay=6.0, noise=0.0):
    """One sound: a pitch (gliding to `to` if given) made of partials, with a fast attack
    and an exponential fade. `partials` is (frequency ratio, loudness) pairs."""
    out, phase = [], [0.0] * len(partials)
    n = int(dur * RATE)
    for i in range(n):
        t = i / RATE
        f = freq if to is None else freq * (to / freq) ** (t / dur)
        s = 0.0
        for k, (ratio, amp) in enumerate(partials):
            phase[k] += 2 * math.pi * f * ratio / RATE
            s += amp * math.sin(phase[k])
        if noise:
            s += noise * (random.random() * 2 - 1) * math.exp(-t * 60)
        env = min(t / attack, 1) * math.exp(-t * decay)
        out.append(s * env)
    return out


def rest(dur):
    return [0.0] * int(dur * RATE)


def join(*parts):
    return [s for p in parts for s in p]


def save(name, samples, peak=0.45):
    top = max(abs(s) for s in samples) or 1
    fade = int(0.01 * RATE)
    for i in range(fade):
        samples[-1 - i] *= i / fade
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(s / top * peak * 32767)) for s in samples))


BELL = ((1, 1), (2.0, 0.35), (3.01, 0.15))
GLASS = ((1, 1), (1.51, 0.6), (2.29, 0.4))
SQUARE = ((1, 1), (3, 0.3), (5, 0.15))
SOFT = ((1, 1), (2, 0.15))
WOOD = ((1, 1), (2.76, 0.5), (5.4, 0.2))

SOUNDS = {
    # Noteling: two bell notes, up for a question, down when it fails.
    'noteling-needs': join(note(1046, 0.16, partials=BELL, decay=9), note(1568, 0.45, partials=BELL, decay=6)),
    'noteling-failed': join(note(784, 0.18, partials=BELL, decay=9), note(523, 0.5, partials=BELL, decay=5)),
    # Octopus: little bubbles rising, or sinking.
    'octopus-needs': join(*[join(note(380 + 120 * k, 0.07, to=760 + 200 * k, partials=SOFT, decay=20), rest(0.04)) for k in range(3)]),
    'octopus-failed': join(*[join(note(620 - 120 * k, 0.09, to=300 - 40 * k, partials=SOFT, decay=16), rest(0.05)) for k in range(2)]),
    # Snail: one slow, soft glide.
    'snail-needs': note(330, 0.5, to=520, partials=SOFT, attack=0.04, decay=4),
    'snail-failed': note(360, 0.6, to=220, partials=SOFT, attack=0.04, decay=3.5),
    # Mug: a spoon on a cup, twice. Failing is one dull knock.
    'mug-needs': join(note(2093, 0.12, partials=GLASS, attack=0.002, decay=22), note(2093, 0.4, partials=GLASS, attack=0.002, decay=12)),
    'mug-failed': note(1046, 0.35, partials=GLASS, attack=0.002, decay=18),
    # Palette: a wet pop of paint.
    'palette-needs': join(note(500, 0.08, to=1300, partials=SOFT, decay=18, noise=0.5), note(1300, 0.25, partials=SOFT, decay=12)),
    'palette-failed': note(700, 0.3, to=260, partials=SOFT, decay=9, noise=0.5),
    # Robot: beep boop.
    'bot-needs': join(note(880, 0.11, partials=SQUARE, attack=0.003, decay=4), rest(0.03), note(1320, 0.18, partials=SQUARE, attack=0.003, decay=6)),
    'bot-failed': join(note(660, 0.13, partials=SQUARE, attack=0.003, decay=4), rest(0.03), note(392, 0.3, partials=SQUARE, attack=0.003, decay=5)),
    # Beaver: knock knock on wood. Failing is a log thudding down.
    'beaver-needs': join(note(330, 0.07, partials=WOOD, attack=0.001, decay=45, noise=0.4), rest(0.09), note(440, 0.12, partials=WOOD, attack=0.001, decay=35, noise=0.4)),
    'beaver-failed': note(200, 0.35, to=110, partials=WOOD, attack=0.002, decay=14, noise=0.5),
    # Fluff: a soft pip.
    'fluff-needs': join(note(660, 0.09, to=990, partials=SOFT, decay=14), note(990, 0.3, partials=SOFT, decay=9)),
    'fluff-failed': note(560, 0.4, to=370, partials=SOFT, decay=7),
}

if __name__ == '__main__':
    random.seed(7)
    OUT.mkdir(parents=True, exist_ok=True)
    import sys
    only = sys.argv[1:]  # e.g. beaver-needs beaver-failed, to leave the other files alone
    for name, samples in SOUNDS.items():
        if not only or name in only:
            save(name, samples)
    print(f'wrote {len(only) or len(SOUNDS)} sounds to {OUT}')
