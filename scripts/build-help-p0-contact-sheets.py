#!/usr/bin/env python3
"""Build deterministic P0 Help visual contact sheets from Playwright crops."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs/04-ux/evidence/wariba-help-p0-visual-clarity"
IDS = [
    "HLP-VIS-001",
    "HLP-VIS-002",
    "HLP-VIS-003",
    "HLP-VIS-004",
    "HLP-VIS-005",
    "HLP-VIS-006",
    "HLP-VIS-008",
    "HLP-VIS-009",
    "HLP-VIS-010",
    "HLP-VIS-011",
    "HLP-VIS-012",
    "HLP-VIS-013",
    "HLP-VIS-014",
    "HLP-VIS-015",
    "HLP-SCR-001",
    "HLP-SCR-002",
    "HLP-SCR-003",
    "HLP-SCR-004",
    "HLP-SCR-005",
    "HLP-SCR-006",
    "HLP-SCR-007",
    "HLP-VIS-016",
    "HLP-VIS-017",
    "HLP-VIS-018",
    "HLP-VIS-019",
]

BACKGROUND = "#080B12"
SURFACE = "#111722"
BORDER = "#2A3342"
TEXT = "#F4F0E8"
MUTED = "#A7B0C0"
BLUE = "#7D94FF"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("/System/Library/Fonts/SFNS.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def contain(source: Image.Image, width: int, height: int) -> Image.Image:
    image = source.convert("RGB")
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    return image


def build(mode: str, columns: int, tile_width: int, tile_height: int, output_name: str) -> dict[str, object]:
    source_dir = EVIDENCE / "raw" / mode
    missing = [asset_id for asset_id in IDS if not (source_dir / f"{asset_id}.png").exists()]
    if missing:
        raise SystemExit(f"Missing {mode} captures: {', '.join(missing)}")

    margin = 32
    gap = 16
    title_height = 112
    label_height = 48
    rows = (len(IDS) + columns - 1) // columns
    width = margin * 2 + columns * tile_width + (columns - 1) * gap
    height = margin * 2 + title_height + rows * tile_height + (rows - 1) * gap
    sheet = Image.new("RGB", (width, height), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, margin), f"WARIBA HELP P0 — {mode.upper()}", fill=TEXT, font=font(30, True))
    draw.text(
        (margin, margin + 46),
        "25/25 · revue de clarté éducative · 2026-08-24",
        fill=MUTED,
        font=font(18),
    )

    for index, asset_id in enumerate(IDS):
        row, column = divmod(index, columns)
        x = margin + column * (tile_width + gap)
        y = margin + title_height + row * (tile_height + gap)
        draw.rounded_rectangle(
            (x, y, x + tile_width, y + tile_height),
            radius=14,
            fill=SURFACE,
            outline=BORDER,
            width=2,
        )
        draw.text((x + 16, y + 13), asset_id, fill=BLUE, font=font(18, True))
        with Image.open(source_dir / f"{asset_id}.png") as source:
            preview = contain(source, tile_width - 24, tile_height - label_height - 20)
        image_x = x + (tile_width - preview.width) // 2
        image_y = y + label_height + (tile_height - label_height - preview.height) // 2
        sheet.paste(preview, (image_x, image_y))

    output = EVIDENCE / output_name
    sheet.save(output, format="PNG", optimize=True)
    return {
        "file": output.name,
        "mode": mode,
        "assets": len(IDS),
        "columns": columns,
        "rows": rows,
        "width": width,
        "height": height,
        "sources": [str((source_dir / f"{asset_id}.png").relative_to(ROOT)) for asset_id in IDS],
    }


def main() -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    exports = [
        build("desktop", 5, 520, 400, "00-contact-sheet-desktop.png"),
        build("mobile", 3, 360, 540, "01-contact-sheet-mobile.png"),
    ]
    manifest = {
        "title": "WARIBA Help P0 visual clarity closure",
        "date": "2026-08-24",
        "assetCount": len(IDS),
        "sourcePreservation": "Playwright element captures from the current Help runtime; no screenshot retouching.",
        "exports": exports,
    }
    (EVIDENCE / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
