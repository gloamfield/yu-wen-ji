from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "themes-v2" / "sea-glass" / "avatars.webp"
TARGET = ROOT / "assets" / "themes-v2" / "lilac-dawn" / "avatars.webp"


def smoothstep(edge0: float, edge1: float, values: np.ndarray) -> np.ndarray:
    scaled = np.clip((values - edge0) / (edge1 - edge0), 0.0, 1.0)
    return scaled * scaled * (3.0 - 2.0 * scaled)


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    hsv = np.asarray(source.convert("HSV"), dtype=np.float32) / 255.0
    hue, saturation, value = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    weight = (
        smoothstep(0.38, 0.46, hue)
        * (1.0 - smoothstep(0.58, 0.66, hue))
        * smoothstep(0.03, 0.12, saturation)
    )
    target_hue = 0.735 + (hue - 0.50) * 0.45
    hue = hue * (1.0 - weight) + target_hue * weight
    saturation = saturation * (1.0 - 0.22 * weight)
    value = np.clip(value * (1.0 + 0.035 * weight), 0.0, 1.0)

    graded = np.stack([hue, saturation, value], axis=-1)
    result = Image.fromarray(np.round(graded * 255.0).astype(np.uint8), "HSV").convert("RGB")
    result = ImageEnhance.Color(result).enhance(0.96)
    result = ImageEnhance.Contrast(result).enhance(0.98)

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    result.save(TARGET, format="WEBP", quality=92, method=6)
    print(f"wrote {TARGET} ({TARGET.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
