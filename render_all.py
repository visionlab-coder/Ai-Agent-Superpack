"""EP01~EP10 배치 렌더링 스크립트 — Remotion CLI로 각 에피소드를 MP4로 렌더링"""
import json
import subprocess
import sys
from pathlib import Path

OUTPUT_DIR = Path("output")
SCRIPTS_DIR = OUTPUT_DIR / "scripts"
SUBTITLES_DIR = OUTPUT_DIR / "subtitles"
RENDER_DIR = OUTPUT_DIR / "render"
PROPS_DIR = OUTPUT_DIR / "render_props"

EPISODES = [f"rc_ep{i:02d}" for i in range(1, 11)]


def generate_props(prefix):
    """에피소드의 Remotion props JSON 생성"""
    script_path = SCRIPTS_DIR / f"{prefix}_script.json"
    if not script_path.exists():
        print(f"[SKIP] {script_path} not found")
        return None

    with open(script_path, "r", encoding="utf-8") as f:
        scenes = json.load(f)

    # SRT 파일 읽기
    srt_path = SUBTITLES_DIR / f"{prefix}.srt"
    srt_content = ""
    if srt_path.exists():
        with open(srt_path, "r", encoding="utf-8") as f:
            srt_content = f.read()

    # Composition ID uses hyphens
    comp_prefix = prefix.replace("_", "-")

    props = {
        "scenes": scenes,
        "topic": scenes[0].get("title", prefix),
        "anchor": "김무빈 앵커",
        "episodePrefix": comp_prefix,
        "srtContent": srt_content,
    }

    props_path = PROPS_DIR / f"{prefix}_props.json"
    with open(props_path, "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False)

    return props_path


def render_episode(prefix, props_path):
    """Remotion CLI로 에피소드 렌더링"""
    output_path = RENDER_DIR / f"{prefix}.mp4"

    # Remotion Composition ID uses hyphens, file prefix uses underscores
    comp_id = prefix.replace("_", "-")
    cmd = [
        "npx", "remotion", "render",
        comp_id,
        str(output_path),
        "--props", str(props_path),
        "--codec", "h264",
        "--image-format", "jpeg",
        "--jpeg-quality", "90",
    ]

    print(f"\n=== Rendering {prefix} ===")
    print(f"  Output: {output_path}")
    print(f"  Command: {' '.join(cmd)}")

    result = subprocess.run(" ".join(cmd), capture_output=False, text=True, shell=True)

    if result.returncode == 0:
        if output_path.exists():
            size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"  [OK] {prefix}.mp4 ({size_mb:.1f}MB)")
            return True
        else:
            print(f"  [WARN] Command succeeded but file not found")
            return False
    else:
        print(f"  [FAIL] Exit code {result.returncode}")
        return False


def main():
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    PROPS_DIR.mkdir(parents=True, exist_ok=True)

    start_ep = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    episodes = [f"rc_ep{i:02d}" for i in range(start_ep, 11)]

    results = {}
    for prefix in episodes:
        props_path = generate_props(prefix)
        if props_path:
            success = render_episode(prefix, props_path)
            results[prefix] = "OK" if success else "FAIL"

    print("\n=== RENDER SUMMARY ===")
    for prefix, status in results.items():
        print(f"  {prefix}: {status}")

    ok_count = sum(1 for s in results.values() if s == "OK")
    print(f"\n  {ok_count}/{len(results)} episodes rendered successfully")


if __name__ == "__main__":
    main()
