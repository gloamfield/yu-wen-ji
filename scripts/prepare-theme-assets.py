from __future__ import annotations

import base64
import importlib.util
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parent.parent
V2 = ROOT / "assets" / "themes-v2"
READY = ROOT / "assets" / "ready"
OUTPUT_JS = ROOT / "src" / "theme-assets.js"

_icon_spec = importlib.util.spec_from_file_location(
    "generate_theme_icons",
    Path(__file__).with_name("generate-theme-icons.py"),
)
_icon_module = importlib.util.module_from_spec(_icon_spec)
_icon_spec.loader.exec_module(_icon_module)
ICON_KEYS = _icon_module.ICON_KEYS
icon_svg = _icon_module.icon_svg

THEMES = [
    "rose-frost",
    "moon-ink",
    "celadon-mist",
    "sea-glass",
    "amber-dusk",
    "lilac-dawn",
]

def center_crop(image: Image.Image, ratio: float, centering: tuple[float, float] = (0.5, 0.5)) -> Image.Image:
    width, height = image.size
    target_width = int(height * ratio)
    if target_width <= width:
        left = int((width - target_width) * centering[0])
        return image.crop((left, 0, left + target_width, height))
    target_height = int(width / ratio)
    top = int((height - target_height) * centering[1])
    return image.crop((0, top, width, top + target_height))


def encode_webp(image: Image.Image, quality: int) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=quality, method=6)
    return buffer.getvalue()


def data_uri(payload: bytes) -> str:
    return "data:image/webp;base64," + base64.b64encode(payload).decode("ascii")


def make_wallpaper(theme_id: str) -> tuple[Image.Image, Image.Image]:
    source = Image.open(V2 / theme_id / "wallpaper.png").convert("RGB")
    cropped = center_crop(source, 720 / 1560, (0.5, 0.42))
    wallpaper = cropped.resize((720, 1560), Image.Resampling.LANCZOS)
    wallpaper = ImageEnhance.Sharpness(wallpaper).enhance(1.06)

    thumb_source = center_crop(source, 320 / 210, (0.5, 0.46))
    thumb = thumb_source.resize((320, 210), Image.Resampling.LANCZOS)
    thumb = ImageEnhance.Sharpness(thumb).enhance(1.04)
    return wallpaper, thumb


def make_avatars(theme_id: str) -> list[Image.Image]:
    source = Image.open(V2 / theme_id / "avatars.webp").convert("RGB")
    width, height = source.size
    cell_width = width / 3
    cell_height = height / 3
    inset = max(2, int(min(cell_width, cell_height) * 0.009))
    avatars: list[Image.Image] = []
    for row in range(3):
        for col in range(3):
            box = (
                int(col * cell_width) + inset,
                int(row * cell_height) + inset,
                int((col + 1) * cell_width) - inset,
                int((row + 1) * cell_height) - inset,
            )
            avatar = source.crop(box).resize((224, 224), Image.Resampling.LANCZOS)
            avatar = ImageEnhance.Sharpness(avatar).enhance(1.04)
            avatars.append(avatar)
    return avatars


def main() -> None:
    READY.mkdir(parents=True, exist_ok=True)
    assets: dict[str, dict[str, object]] = {}
    manifest: dict[str, dict[str, object]] = {}
    selected = sys.argv[1:] or THEMES

    for theme_id in selected:
        if theme_id not in THEMES:
            raise ValueError(f"Unknown theme: {theme_id}")
        wallpaper_path = V2 / theme_id / "wallpaper.png"
        avatars_path = V2 / theme_id / "avatars.webp"
        if not wallpaper_path.exists() or not avatars_path.exists():
            raise FileNotFoundError(f"Missing source assets for {theme_id}")

        target = READY / theme_id
        target.mkdir(parents=True, exist_ok=True)

        wallpaper, thumb = make_wallpaper(theme_id)
        wallpaper_bytes = encode_webp(wallpaper, 80)
        thumb_bytes = encode_webp(thumb, 78)
        (target / "wallpaper.webp").write_bytes(wallpaper_bytes)
        (target / "wallpaper-thumb.webp").write_bytes(thumb_bytes)

        avatar_images = make_avatars(theme_id)
        avatar_payloads = [encode_webp(image, 80) for image in avatar_images]
        avatar_files = []
        for index, payload in enumerate(avatar_payloads, start=1):
            name = f"avatar-{index:02d}.webp"
            (target / name).write_bytes(payload)
            avatar_files.append(name)

        icon_svgs = [icon_svg(theme_id, key) for key in ICON_KEYS]
        icon_files = {}
        for key, svg in zip(ICON_KEYS, icon_svgs):
            name = f"icon-{key}.svg"
            (target / name).write_text(svg, encoding="utf-8")
            icon_files[key] = name

        assets[theme_id] = {
            "wallpaper": data_uri(wallpaper_bytes),
            "wallpaperThumb": data_uri(thumb_bytes),
            "avatars": [data_uri(payload) for payload in avatar_payloads],
            "icons": {
                key: "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")
                for key, svg in zip(ICON_KEYS, icon_svgs)
            },
        }
        manifest[theme_id] = {
            "wallpaper": "wallpaper.webp",
            "wallpaperThumb": "wallpaper-thumb.webp",
            "avatars": avatar_files,
            "icons": icon_files,
            "counts": {
                "wallpaper": 1,
                "avatars": len(avatar_files),
                "icons": len(icon_files),
            },
        }
        print(f"prepared {theme_id}: 1 wallpaper, {len(avatar_files)} avatars, {len(icon_files)} icons")

    OUTPUT_JS.write_text(
        "window.EmberThemeAssets = " + json.dumps(assets, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    (READY / "theme-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUTPUT_JS} ({OUTPUT_JS.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
