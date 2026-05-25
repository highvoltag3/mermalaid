#!/usr/bin/env python3
"""Build 1200x630 Open Graph / Twitter images from the Tauri app icon."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ICON = ROOT / "src-tauri/icons/icon_512x512@2x.png"
OG_SIZE = (1200, 630)
THEME_BLUE = (37, 99, 235)  # #2563eb — matches index.html theme-color


def build_social_image() -> Image.Image:
    width, height = OG_SIZE
    canvas = Image.new("RGBA", OG_SIZE, THEME_BLUE + (255,))
    icon = Image.open(ICON).convert("RGBA")
    max_icon = int(min(width, height) * 0.62)
    icon.thumbnail((max_icon, max_icon), Image.Resampling.LANCZOS)
    canvas.paste(icon, ((width - icon.width) // 2, (height - icon.height) // 2), icon)
    return canvas.convert("RGB")


def main() -> None:
    image = build_social_image()
    for name in ("og-image.png", "twitter-image.png"):
        path = ROOT / "public" / name
        image.save(path, format="PNG", optimize=True)
        print(f"Wrote {path} ({path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
