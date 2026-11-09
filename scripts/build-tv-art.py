#!/usr/bin/env python3
"""
Build Android TV / Apple TV art on a dark background with the app logo
and wordmark. Overwrites the existing files in assets/tv_icons/ and the
native drawable-*/tv_banner.png copies.

Run from the project root:
    python3 scripts/build-tv-art.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "assets" / "images" / "android-icon-foreground.png"
TV_ICONS = ROOT / "assets" / "tv_icons"
NATIVE_DRAWABLE_DIRS = [
    ROOT / "android" / "app" / "src" / "main" / "res" / f"drawable{suf}"
    for suf in ("", "-mdpi", "-hdpi", "-xhdpi", "-xxhdpi", "-xxxhdpi")
]

BG = (7, 8, 12)
ACCENT_CYAN = (103, 232, 249)
ACCENT_VIOLET = (167, 139, 250)
TEXT = (246, 247, 250)

APP_NAME = "HiAnime"
APP_NAME_ACCENT = "TV"


def load_font(size):
    for p in (
        "/System/Library/Fonts/SF-Pro-Display-Bold.otf",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
    ):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except OSError:
                continue
    return ImageFont.load_default()


def ambient_bg(size):
    w, h = size
    img = Image.new("RGB", (w, h), BG).convert("RGBA")
    for cx, cy, color, alpha in (
        (int(w * 0.78), int(h * 0.22), ACCENT_VIOLET, 60),
        (int(w * 0.18), int(h * 0.82), ACCENT_CYAN, 45),
    ):
        overlay = Image.new("RGBA", (w, h), (*color, 0))
        d = ImageDraw.Draw(overlay)
        steps = 24
        radius = max(w, h)
        for i in range(steps, 0, -1):
            a = int(alpha * (i / steps) ** 2)
            r = int(radius * (1 - i / steps) * 1.1 + 40)
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, a))
        overlay = overlay.filter(ImageFilter.GaussianBlur(radius=max(w, h) // 18))
        img = Image.alpha_composite(img, overlay)
    return img.convert("RGB")


def paste_logo(canvas, logo, box):
    x, y, bw, bh = box
    lw, lh = logo.size
    scale = min(bw / lw, bh / lh)
    nw, nh = int(lw * scale), int(lh * scale)
    resized = logo.resize((nw, nh), Image.LANCZOS)
    off_x = x + (bw - nw) // 2
    off_y = y + (bh - nh) // 2
    canvas.paste(resized, (off_x, off_y), resized if resized.mode == "RGBA" else None)


def build_banner(w, h, with_wordmark):
    img = ambient_bg((w, h))
    logo = Image.open(LOGO).convert("RGBA")
    pad = int(h * 0.10)
    if with_wordmark:
        # Compact logo on the left, generous room for the wordmark.
        logo_side = int(h * 0.78)
        paste_logo(img, logo, (pad, (h - logo_side) // 2, logo_side, logo_side))
        text_x = pad + logo_side + int(w * 0.025)
        available_text_w = w - text_x - pad

        # Auto-fit: shrink font until "HiAnime" fits the available width.
        draw = ImageDraw.Draw(img)
        font_size = int(h * 0.36)
        while font_size > 10:
            font_main = load_font(font_size)
            bbox = draw.textbbox((0, 0), APP_NAME, font=font_main)
            tw = bbox[2] - bbox[0]
            if tw <= available_text_w:
                break
            font_size -= 2
        font_sub = load_font(int(font_size * 0.65))

        bbox = draw.textbbox((0, 0), APP_NAME, font=font_main)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        sub_bbox = draw.textbbox((0, 0), APP_NAME_ACCENT, font=font_sub)
        sub_h = sub_bbox[3] - sub_bbox[1]
        gap = int(h * 0.03)
        block_h = th + gap + sub_h
        name_y = (h - block_h) // 2 - bbox[1]  # correct for font ascent

        draw.text((text_x, name_y), APP_NAME, fill=TEXT, font=font_main)
        sub_y = name_y + th + gap
        draw.text((text_x + 2, sub_y), APP_NAME_ACCENT, fill=ACCENT_CYAN, font=font_sub)
    else:
        side = min(w, h) - 2 * pad
        paste_logo(img, logo, ((w - side) // 2, (h - side) // 2, side, side))
    return img


def build_square_icon(side):
    img = ambient_bg((side, side))
    logo = Image.open(LOGO).convert("RGBA")
    pad = int(side * 0.14)
    paste_logo(img, logo, (pad, pad, side - 2 * pad, side - 2 * pad))
    return img


def write(img, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)
    print(f"  wrote {dest.relative_to(ROOT)} ({img.size[0]}x{img.size[1]})")


def build_all():
    print("Building TV art on dark background…")
    banner_400 = build_banner(400, 240, with_wordmark=True)
    write(banner_400, TV_ICONS / "icon-400x240.png")
    write(build_banner(800, 480, True), TV_ICONS / "icon-800x480.png")
    write(build_banner(1280, 768, True), TV_ICONS / "icon-1280x768.png")
    write(build_banner(1920, 720, True), TV_ICONS / "icon-1920x720.png")
    write(build_banner(2320, 720, True), TV_ICONS / "icon-2320x720.png")
    write(build_banner(3840, 1440, True), TV_ICONS / "icon-3840x1440.png")
    write(build_banner(4640, 1440, True), TV_ICONS / "icon-4640x1440.png")
    write(build_square_icon(760), TV_ICONS / "icon-760x760.png")

    for d in NATIVE_DRAWABLE_DIRS:
        if d.exists():
            write(banner_400, d / "tv_banner.png")

    native_tv_icon = (
        ROOT / "android" / "app" / "src" / "main" / "res" / "drawable" / "tv_icon.png"
    )
    if native_tv_icon.parent.exists():
        write(build_square_icon(320), native_tv_icon)


if __name__ == "__main__":
    if not LOGO.exists():
        sys.exit(f"ERROR: logo not found at {LOGO}")
    build_all()
    print("Done.")
