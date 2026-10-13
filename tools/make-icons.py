"""Génère les icônes PNG (motif de rosettes de léopard). Usage : python3 tools/make-icons.py"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
AMBER = (232, 163, 61)
AMBER_DEEP = (201, 128, 30)
DARK = (38, 26, 14)
BG = (20, 17, 14)
SS = 4  # suréchantillonnage pour lisser les bords


def rosette(draw, cx, cy, r, rng):
    """Anneau interrompu, façon rosette de léopard, avec un centre plus foncé."""
    draw.ellipse([cx - r * 0.62, cy - r * 0.62, cx + r * 0.62, cy + r * 0.62], fill=AMBER_DEEP)
    arcs = rng.randint(4, 5)
    start = rng.uniform(0, 360)
    span = 360 / arcs
    for i in range(arcs):
        a0 = start + i * span + span * 0.08
        a1 = start + (i + 1) * span - span * 0.14
        draw.arc([cx - r, cy - r, cx + r, cy + r], a0, a1, fill=DARK, width=max(2, int(r * 0.34)))


def pattern(size, safe=1.0, seed=7):
    rng = random.Random(seed)
    big = size * SS
    img = Image.new("RGB", (big, big), AMBER)
    d = ImageDraw.Draw(img)
    step = big / 4.2
    r = step * 0.36
    rows = int(big / step) + 2
    for row in range(-1, rows):
        for col in range(-1, rows):
            cx = col * step + (step / 2 if row % 2 else 0) + rng.uniform(-step * .06, step * .06)
            cy = row * step * 0.9 + rng.uniform(-step * .06, step * .06)
            rosette(d, cx, cy, r * rng.uniform(.85, 1.1), rng)
    return img


def rounded(img, radius_ratio):
    size = img.size[0]
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def save(img, name, size):
    img.resize((size, size), Image.LANCZOS).save(OUT / name)


OUT.mkdir(exist_ok=True)
base = pattern(512)

# Icône "any" : coins arrondis, fond transparent aux angles.
save(rounded(base, 0.22), "icon-512.png", 512)
save(rounded(base, 0.22), "icon-192.png", 192)
save(rounded(base, 0.22), "icon-180.png", 180)
# Icône "maskable" : plein cadre, Android applique son propre masque.
save(base, "icon-maskable-512.png", 512)
print("icônes générées dans", OUT)
