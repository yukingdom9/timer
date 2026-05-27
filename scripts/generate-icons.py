#!/usr/bin/env python3
"""
Simple icon generator for Timer PWA.

Install Pillow before use:
  pip install pillow

Run:
  python scripts/generate-icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'icons')
ICON_SIZES = [120, 152, 167, 180, 192, 256, 384, 512]
BACKGROUND = (28, 32, 78, 255)
FOREGROUND = (255, 255, 255, 255)

os.makedirs(OUTPUT_DIR, exist_ok=True)

try:
    font = ImageFont.truetype('arial.ttf', 1)
except Exception:
    font = ImageFont.load_default()

for size in ICON_SIZES:
    image = Image.new('RGBA', (size, size), BACKGROUND)
    draw = ImageDraw.Draw(image)
    radius = size * 0.2
    draw.ellipse(
        [(size * 0.15, size * 0.15), (size * 0.85, size * 0.85)],
        fill=(124, 131, 253, 255)
    )

    text = 'T'
    font_size = int(size * 0.5)
    try:
        font = ImageFont.truetype('arial.ttf', font_size)
    except Exception:
        font = ImageFont.load_default()

    text_width, text_height = draw.textsize(text, font=font)
    text_position = (
        (size - text_width) / 2,
        (size - text_height) / 2 - (size * 0.05)
    )
    draw.text(text_position, text, font=font, fill=FOREGROUND)

    path = os.path.join(OUTPUT_DIR, f'icon-{size}.png')
    image.save(path)
    print(f'Generated {path}')
