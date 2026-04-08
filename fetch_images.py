"""
fetch_images.py
EP01~EP10 배경 이미지 다운로드 스크립트
- Unsplash Source API (키 불필요)로 시도
- 실패 시 Pillow로 그라디언트 폴백 이미지 생성
"""

import json
import os
import glob
import time
import urllib.request
import urllib.error
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path("D:/project/video-harness-cowork")
SCRIPTS_DIR = BASE_DIR / "output" / "scripts"
IMAGES_DIR = BASE_DIR / "public" / "images"
WIDTH, HEIGHT = 1920, 1080
MAX_RETRIES = 3
RETRY_DELAY = 3
REQUEST_DELAY = 1


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color string to RGB tuple."""
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def create_gradient_image(
    output_path: Path,
    accent: str,
    bg: str,
    scene_id: str,
    query: str,
) -> None:
    """Create a gradient fallback image using accent and bg colors."""
    bg_rgb = hex_to_rgb(bg)
    accent_rgb = hex_to_rgb(accent)

    img = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(img)

    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(bg_rgb[0] + (accent_rgb[0] - bg_rgb[0]) * ratio * 0.6)
        g = int(bg_rgb[1] + (accent_rgb[1] - bg_rgb[1]) * ratio * 0.6)
        b = int(bg_rgb[2] + (accent_rgb[2] - bg_rgb[2]) * ratio * 0.6)
        r = max(0, min(255, r))
        g = max(0, min(255, g))
        b = max(0, min(255, b))
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

    # Add scene ID text
    try:
        font = ImageFont.truetype("arial.ttf", 48)
    except (OSError, IOError):
        font = ImageFont.load_default()

    text = f"{scene_id}\n{query[:60]}"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (WIDTH - text_w) // 2
    y = (HEIGHT - text_h) // 2

    # Shadow
    draw.text((x + 2, y + 2), text, fill=(0, 0, 0), font=font)
    # Main text
    draw.text((x, y), text, fill=(255, 255, 255), font=font)

    img.save(str(output_path), "JPEG", quality=85)


def download_image(query: str, output_path: Path) -> bool:
    """Try to download image from Unsplash Source API."""
    encoded_query = urllib.request.quote(query)
    url = f"https://source.unsplash.com/1920x1080/?{encoded_query}"

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as response:
                content_type = response.headers.get("Content-Type", "")
                if "image" not in content_type:
                    print(f"    Attempt {attempt}: Not an image (Content-Type: {content_type})")
                    if attempt < MAX_RETRIES:
                        time.sleep(RETRY_DELAY)
                    continue

                data = response.read()
                if len(data) < 5000:
                    print(f"    Attempt {attempt}: Response too small ({len(data)} bytes)")
                    if attempt < MAX_RETRIES:
                        time.sleep(RETRY_DELAY)
                    continue

                with open(str(output_path), "wb") as f:
                    f.write(data)
                return True

        except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
            print(f"    Attempt {attempt}: Error - {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)

    return False


def main():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    script_files = sorted(glob.glob(str(SCRIPTS_DIR / "rc_ep*_script.json")))
    if not script_files:
        print("No script files found!")
        return

    total = 0
    downloaded = 0
    fallback = 0
    skipped = 0

    for script_path in script_files:
        ep_num = Path(script_path).stem.split("_ep")[1][:2]
        print(f"\n{'='*60}")
        print(f"Processing EP{ep_num}")
        print(f"{'='*60}")

        with open(script_path, "r", encoding="utf-8") as f:
            scenes = json.load(f)

        for scene in scenes:
            total += 1
            scene_id = scene["id"]
            query = scene.get("unsplash_query", "abstract background")
            accent = scene.get("accent", "#60A5FA")
            bg = scene.get("bg", "#0D1F35")

            # Build filename: rc_ep01_SC01.jpg
            sc_num = scene_id.split("-")[1]
            filename = f"rc_ep{ep_num}_{sc_num}.jpg"
            output_path = IMAGES_DIR / filename

            if output_path.exists() and output_path.stat().st_size > 5000:
                print(f"  [{scene_id}] Already exists, skipping")
                skipped += 1
                continue

            print(f"  [{scene_id}] Query: {query[:50]}...")
            success = download_image(query, output_path)

            if success:
                size_kb = output_path.stat().st_size / 1024
                print(f"  [{scene_id}] Downloaded ({size_kb:.0f} KB)")
                downloaded += 1
            else:
                print(f"  [{scene_id}] Download failed, creating gradient fallback")
                create_gradient_image(output_path, accent, bg, scene_id, query)
                size_kb = output_path.stat().st_size / 1024
                print(f"  [{scene_id}] Fallback created ({size_kb:.0f} KB)")
                fallback += 1

            time.sleep(REQUEST_DELAY)

    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"Total scenes:  {total}")
    print(f"Downloaded:    {downloaded}")
    print(f"Fallback:      {fallback}")
    print(f"Skipped:       {skipped}")
    print(f"Images dir:    {IMAGES_DIR}")


if __name__ == "__main__":
    main()
