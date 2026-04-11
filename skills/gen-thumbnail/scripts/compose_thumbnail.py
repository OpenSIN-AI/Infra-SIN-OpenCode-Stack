#!/usr/bin/env python3
"""
Reference-aware thumbnail compositor for OpenSIN.

This script generates professional 16:9 YouTube thumbnails by compositing
a mascot image, headline text, and stylistic elements (sub-badge, laptop,
arrow) onto a background image.

It is designed to match a reference composition while allowing configurable
layout via command-line arguments.

Usage:
    python compose_thumbnail.py <raw_bg> <final_output> <mascot_image> <headline> [--sub-badge TEXT] [--layout reference|custom]

Example:
    python compose_thumbnail.py background.png final.png mascot.png "AUTO|PROFIT?" --sub-badge "AI AGENT MAKES MONEY ALONE" --layout reference
"""

import argparse
import sys
from pathlib import Path
from typing import Tuple, Optional

from PIL import Image, ImageDraw, ImageFont

# Canvas dimensions for YouTube thumbnail (16:9)
CANVAS_WIDTH = 1920
CANVAS_HEIGHT = 1080

# Color definitions (RGB)
COLOR_WHITE = (255, 255, 255)
COLOR_YELLOW = (255, 230, 0)
COLOR_GREEN_GLOW = (0, 255, 128, 100)  # with alpha for glow
COLOR_DARK_BG = (15, 15, 25, 255)
COLOR_LAPTOP_BG = (30, 30, 40, 255)
COLOR_CHART_GREEN = (0, 220, 100)

# Font sizes (adjust if needed)
FONT_SIZE_HEADLINE = 180
FONT_SIZE_SUB_BADGE = 60

def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Compose a thumbnail image.")
    parser.add_argument("raw_bg", type=Path, help="Background image path (used as base)")
    parser.add_argument("final_output", type=Path, help="Output PNG path")
    parser.add_argument("mascot_image", type=Path, help="Mascot face/character image (PNG with alpha)")
    parser.add_argument("headline", type=str, help="Headline text, use '|' for line breaks (e.g., 'AUTO|PROFIT?')")
    parser.add_argument("--sub-badge", type=str, default="AI AGENT MAKES MONEY ALONE", help="Sub-badge text")
    parser.add_argument("--layout", choices=["reference", "custom"], default="reference", help="Layout mode")
    return parser.parse_args()

def load_image(path: Path, mode: str = "RGBA") -> Image.Image:
    """Load an image, converting to the specified mode."""
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    img = Image.open(path).convert(mode)
    return img

def create_canvas(base_bg: Optional[Image.Image] = None) -> Image.Image:
    """Create a new canvas, optionally using a base background."""
    if base_bg:
        # Resize base to canvas dimensions
        canvas = base_bg.resize((CANVAS_WIDTH, CANVAS_HEIGHT), Image.Resampling.LANCZOS)
        # Ensure RGBA
        if canvas.mode != "RGBA":
            canvas = canvas.convert("RGBA")
    else:
        canvas = Image.new("RGBA", (CANVAS_WIDTH, CANVAS_HEIGHT), COLOR_DARK_BG)
    return canvas

def apply_dark_green_glow(canvas: Image.Image) -> None:
    """Apply a dark overlay with subtle green glow vignette effect."""
    draw = ImageDraw.Draw(canvas, "RGBA")
    # Draw a radial gradient approximation: semi-transparent black with green tint
    # For performance, we draw a few large transparent rectangles with gradient stops
    # But for simplicity, we overlay a translucent dark layer and leave the glow to the background itself
    # Since background may already have glow, we just darken slightly
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 80))  # 80/255 alpha darken
    canvas.alpha_composite(overlay, (0, 0))

def resize_mascot(mascot: Image.Image, canvas_width: int) -> Tuple[Image.Image, int, int]:
    """
    Resize mascot to occupy ~40% of canvas width while preserving aspect ratio.
    Returns: resized_mascot, x_offset, y_offset (top-left corner)
    """
    target_width = int(canvas_width * 0.40)
    w_percent = target_width / float(mascot.width)
    target_height = int(float(mascot.height) * w_percent)
    resized = mascot.resize((target_width, target_height), Image.Resampling.LANCZOS)

    # Position: left side, vertically centered
    x_offset = int(canvas_width * 0.05)  # 5% left margin
    y_offset = (CANVAS_HEIGHT - target_height) // 2
    return resized, x_offset, y_offset

def draw_angled_text(
    draw: ImageDraw.Draw,
    text_lines: list,
    position: Tuple[int, int],
    font_path: Optional[Path] = None,
    angle: float = -15,
    fill: Tuple[int, int, int] = COLOR_WHITE,
) -> None:
    """
    Draw multi-line text at a specified angle around a given position.
    Position is the top-left corner of the text block before rotation.
    """
    # Load a bold display font; if none available, default
    try:
        if font_path and font_path.exists():
            font = ImageFont.truetype(str(font_path), FONT_SIZE_HEADLINE)
        else:
            # Try common bold display fonts; fallback to default
            for name in ["Arial-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
                if Path(name).exists():
                    font = ImageFont.truetype(name, FONT_SIZE_HEADLINE)
                    break
            else:
                font = ImageFont.load_default()
    except Exception as e:
        print(f"Warning: font loading failed: {e}, using default", file=sys.stderr)
        font = ImageFont.load_default()

    # Render each line to its own image, then rotate and composite onto main canvas
    line_images = []
    for line in text_lines:
        # Measure text
        dummy = Image.new("RGBA", (1, 1))
        ddraw = ImageDraw.Draw(dummy)
        bbox = ddraw.textbbox((0, 0), line, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        line_img = Image.new("RGBA", (text_w, text_h), (0, 0, 0, 0))
        ImageDraw.Draw(line_img).text((0, 0), line, font=font, fill=fill)
        line_images.append(line_img)

    # Stack lines vertically
    total_h = sum(img.height for img in line_images) + (len(line_images) - 1) * 10
    max_w = max(img.width for img in line_images) if line_images else 0
    text_block = Image.new("RGBA", (max_w, total_h), (0, 0, 0, 0))
    y = 0
    for img in line_images:
        text_block.alpha_composite(img, ((max_w - img.width) // 2, y))
        y += img.height + 10

    # Rotate the whole block
    rotated = text_block.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    # Composite onto canvas at given position (top-left of rotated block)
    draw._image.alpha_composite(rotated, position)

def draw_sub_badge(
    draw: ImageDraw.Draw,
    text: str,
    bottom_margin: int = 80,
    corner_radius: int = 20,
    padding: int = 30,
) -> None:
    """Draw a dark rounded rectangle badge with centered text at the bottom of the canvas."""
    # Load font
    try:
        for name in ["Arial-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
            if Path(name).exists():
                font = ImageFont.truetype(name, FONT_SIZE_SUB_BADGE)
                break
        else:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    # Measure text
    dummy = Image.new("RGBA", (1, 1))
    ddraw = ImageDraw.Draw(dummy)
    bbox = ddraw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    rect_w = text_w + 2 * padding
    rect_h = text_h + 2 * padding
    rect_x = (CANVAS_WIDTH - rect_w) // 2
    rect_y = CANVAS_HEIGHT - rect_h - bottom_margin

    # Draw rounded rectangle (dark with slight opacity)
    draw.rounded_rectangle(
        [rect_x, rect_y, rect_x + rect_w, rect_y + rect_h],
        radius=corner_radius,
        fill=(20, 20, 30, 230),
        outline=(60, 255, 120, 200),
        width=3,
    )

    # Draw centered text
    text_x = rect_x + (rect_w - text_w) // 2
    text_y = rect_y + (rect_h - text_h) // 2
    draw.text((text_x, text_y), text, font=font, fill=COLOR_WHITE)

def draw_laptop(draw: ImageDraw.Draw) -> None:
    """Draw a laptop with a green chart in the bottom-right corner."""
    # Laptop base dimensions
    laptop_w = 300
    laptop_h = 200
    margin = 80
    x = CANVAS_WIDTH - laptop_w - margin
    y = CANVAS_HEIGHT - laptop_h - margin

    # Laptop body (dark)
    draw.rectangle([x, y, x + laptop_w, y + laptop_h], fill=COLOR_LAPTOP_BG, outline=(100, 100, 120), width=4)

    # Screen area (inside)
    screen_pad = 15
    screen_x = x + screen_pad
    screen_y = y + screen_pad
    screen_w = laptop_w - 2 * screen_pad
    screen_h = laptop_h - 2 * screen_pad - 20  # leave room for bottom bezel
    draw.rectangle([screen_x, screen_y, screen_x + screen_w, screen_y + screen_h], fill=(10, 30, 20))

    # Green chart bars (simple representation)
    bar_count = 5
    bar_width = screen_w // (bar_count * 2)
    bar_spacing = bar_width
    max_bar_h = screen_h - 20
    bar_heights = [int(max_bar_h * f) for f in [0.6, 0.8, 0.5, 0.9, 0.7]]
    for i, h in enumerate(bar_heights):
        bx = screen_x + i * (bar_width + bar_spacing) + 10
        by = screen_y + screen_h - h
        draw.rectangle([bx, by, bx + bar_width, screen_y + screen_h - 5], fill=COLOR_CHART_GREEN)

    # "$$$" text below laptop
    try:
        font = ImageFont.truetype("Arial-Bold.ttf", 36) if Path("Arial-Bold.ttf").exists() else ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    $$$_text = "$$$"
    text_bbox = draw.textbbox((0, 0), $$$_text, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    tx = x + (laptop_w - text_w) // 2
    ty = y + laptop_h + 5
    draw.text((tx, ty), $$$_text, font=font, fill=COLOR_YELLOW)

def draw_arrow(draw: ImageDraw.Draw, start: Tuple[int, int], end: Tuple[int, int]) -> None:
    """Draw a curved yellow arrow from start to end."""
    # Compute control point for quadratic Bezier (midpoint with offset)
    mid_x = (start[0] + end[0]) // 2
    mid_y = (start[1] + end[1]) // 2
    # Offset control point perpendicular to direction (roughly upward)
    ctrl = (mid_x, mid_y - 100)

    # Sample points along quadratic Bezier
    points = []
    for t in [i / 20 for i in range(21)]:
        x = int((1 - t)**2 * start[0] + 2 * (1 - t) * t * ctrl[0] + t**2 * end[0])
        y = int((1 - t)**2 * start[1] + 2 * (1 - t) * t * ctrl[1] + t**2 * end[1])
        points.append((x, y))

    # Draw thick line with arrowhead
    if len(points) >= 2:
        draw.line(points, fill=COLOR_YELLOW, width=8)
        # Arrowhead at end
        import math
        dx = end[0] - points[-2][0]
        dy = end[1] - points[-2][1]
        angle = math.atan2(dy, dx)
        head_len = 25
        p1 = (end[0] - head_len * math.cos(angle - math.pi/6), end[1] - head_len * math.sin(angle - math.pi/6))
        p2 = (end[0] - head_len * math.cos(angle + math.pi/6), end[1] - head_len * math.sin(angle + math.pi/6))
        draw.polygon([end, p1, p2], fill=COLOR_YELLOW)

def compute_text_block_bbox(
    text_lines: list,
    font_size: int = FONT_SIZE_HEADLINE,
    line_spacing: int = 10,
) -> Tuple[int, int]:
    """Compute width and height of a multi-line text block."""
    try:
        for name in ["Arial-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
            if Path(name).exists():
                font = ImageFont.truetype(name, font_size)
                break
        else:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    dummy = Image.new("RGBA", (1, 1))
    ddraw = ImageDraw.Draw(dummy)
    widths = []
    heights = []
    for line in text_lines:
        bbox = ddraw.textbbox((0, 0), line, font=font)
        widths.append(bbox[2] - bbox[0])
        heights.append(bbox[3] - bbox[1])
    total_h = sum(heights) + line_spacing * (len(text_lines) - 1)
    max_w = max(widths) if widths else 0
    return max_w, total_h

def main():
    args = parse_args()

    # Load images
    raw_bg = load_image(args.raw_bg, mode="RGBA")
    mascot = load_image(args.mascot_image, mode="RGBA")

    # Split headline into lines
    headline_lines = args.headline.split("|")

    # Create canvas based on background
    canvas = create_canvas(raw_bg)

    # Apply dark + green glow overlay
    apply_dark_green_glow(canvas)

    # Composite mascot on left side (~40% width)
    mascot_resized, mx, my = resize_mascot(mascot, CANVAS_WIDTH)
    canvas.alpha_composite(mascot_resized, (mx, my))

    # Draw angled headline on right side
    draw = ImageDraw.Draw(canvas)
    # Position: right third, roughly center vertically but slightly up
    # We'll compute text block size to anchor properly
    # Estimate text block dimensions
    text_block_w, text_block_h = compute_text_block_bbox(headline_lines)
    # Angle offset placement: right side, about 60% from left
    text_x = int(CANVAS_WIDTH * 0.60)
    text_y = (CANVAS_HEIGHT - text_block_h) // 2 - 50  # slightly up
    draw_angled_text(draw, headline_lines, (text_x, text_y), angle=-15, fill=COLOR_WHITE)
    # We'll make "PROFIT?" yellow by second line if present
    # For simplicity, we drew all white; a more advanced approach would split colors

    # Draw sub-badge near bottom center
    draw_sub_badge(draw, args.sub_badge)

    # Draw laptop in bottom-right
    draw_laptop(draw)

    # Draw arrow from text area to laptop
    # Start near end of text block; end near laptop
    arrow_start = (text_x + text_block_w - 100, text_y + text_block_h // 2)
    arrow_end = (CANVAS_WIDTH - 200, CANVAS_HEIGHT - 250)
    draw_arrow(draw, arrow_start, arrow_end)

    # Save final image
    args.final_output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.final_output, "PNG")
    print(f"Thumbnail saved to {args.final_output}")

if __name__ == "__main__":
    main()
