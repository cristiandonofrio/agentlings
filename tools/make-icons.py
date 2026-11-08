#!/usr/bin/env python3
"""Draws Agentlings' original fluff icon with no image libraries: menu bar glyphs and the app icon source."""
import math, struct, sys, zlib
from pathlib import Path

def png(path, size, pixel, samples=3):
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            acc = [0.0, 0.0, 0.0, 0.0]
            for j in range(samples):
                for i in range(samples):
                    r, g, b, a = pixel((x + (i + .5) / samples) / size, (y + (j + .5) / samples) / size)
                    acc[0] += r * a; acc[1] += g * a; acc[2] += b * a; acc[3] += a
            n = samples * samples
            alpha = acc[3] / n
            rgb = [round(c / acc[3]) if acc[3] else 0 for c in acc[:3]]
            rows += bytes(rgb + [round(alpha * 255)])
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
    Path(path).write_bytes(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
                           + chunk(b'IDAT', zlib.compress(bytes(rows), 9)) + chunk(b'IEND', b''))

def in_fluff(x, y, cx=.5, cy=.54, r=.37):
    """A soft ball with a scalloped, tufted edge."""
    dx, dy = x - cx, y - cy
    edge = r * (1 + .07 * abs(math.sin(math.atan2(dy, dx) * 7)))
    return math.hypot(dx, dy) <= edge

def in_eye(x, y, cx=.5, cy=.54):
    return any(math.hypot((x - ex) / .085, (y - (cy - .02)) / .105) <= 1 for ex in (cx - .15, cx + .15))

def glyph(alert):
    def pixel(x, y):
        dot = math.hypot(x - .83, y - .2)
        if alert and dot <= .17:
            return (0, 0, 0, 1)
        if alert and dot <= .24:
            return (0, 0, 0, 0)
        return (0, 0, 0, 1 if in_fluff(x, y) and not in_eye(x, y) else 0)
    return pixel

def app_icon(x, y):
    corner = .22
    qx, qy = max(abs(x - .5) - (.5 - corner - .05), 0), max(abs(y - .5) - (.5 - corner - .05), 0)
    if math.hypot(qx, qy) > corner:
        return (0, 0, 0, 0)
    if in_eye(x, y):
        pupil = any(math.hypot(x - ex - .012, y - .532) <= .05 for ex in (.35, .65))
        return (38, 33, 92, 1) if pupil else (255, 255, 255, 1)
    if in_fluff(x, y):
        light = max(0, 1 - math.hypot(x - .38, y - .36) / .55)
        return (round(127 + 90 * light), round(119 + 90 * light), round(221 + 30 * light), 1)
    return (33, 28, 46, 1)

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'src-tauri/icons')
png(out / 'tray.png', 44, glyph(False), 4)
png(out / 'tray-alert.png', 44, glyph(True), 4)
png(out / 'source.png', 1024, app_icon, 2)
