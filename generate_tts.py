"""EP01~EP10 전체 TTS 배치 생성 스크립트 (SSML 감정 스타일 적용)"""
import json
import asyncio
import os
import edge_tts
from pathlib import Path

OUTPUT_DIR = Path("output")
AUDIO_DIR = OUTPUT_DIR / "audio"
SCRIPTS_DIR = OUTPUT_DIR / "scripts"

VOICE = "ko-KR-HyunsuMultilingualNeural"
RATE = "-2%"

# 씬 타입별 감정 스타일 매핑
STYLE_MAP = {
    "opening": "newscast-formal",
    "closing": "newscast-formal",
    "headline": "newscast-formal",
    "analysis": "newscast-formal",
    "data": "newscast-formal",
    "expert": "calm",
    "field": "newscast-casual",
}
DEFAULT_STYLE = "newscast-formal"


def build_ssml(narration, style):
    """SSML 마크업 생성"""
    return (
        "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' "
        "xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='ko-KR'>"
        f"<voice name='{VOICE}'>"
        f"<mstts:express-as style='{style}'>"
        f"<prosody rate='{RATE}'>"
        f"{narration}"
        "</prosody>"
        "</mstts:express-as>"
        "</voice>"
        "</speak>"
    )


async def generate_scene_audio(ep_prefix, scene_id, narration, scene_type, max_retries=3):
    """씬 하나의 TTS 오디오 생성 (SSML 감정 스타일 적용, 재시도 포함)"""
    filename = f"{ep_prefix}_{scene_id}.mp3"
    filepath = AUDIO_DIR / filename

    style = STYLE_MAP.get(scene_type, DEFAULT_STYLE)
    ssml = build_ssml(narration, style)

    for attempt in range(max_retries):
        try:
            communicate = edge_tts.Communicate(ssml, VOICE)
            await communicate.save(str(filepath))
            size_kb = filepath.stat().st_size / 1024
            print(f"  [OK] {filename} ({size_kb:.0f}KB) [{style}]")
            return filepath
        except Exception as e:
            if attempt < max_retries - 1:
                wait = 3 * (attempt + 1)
                print(f"  [RETRY] {filename} - {e} (waiting {wait}s)")
                await asyncio.sleep(wait)
            else:
                print(f"  [FAIL] {filename} - {e}")
                raise


async def process_episode(ep_num):
    """에피소드 하나의 전체 씬 TTS 생성"""
    prefix = f"rc_ep{ep_num:02d}"
    script_path = SCRIPTS_DIR / f"{prefix}_script.json"

    if not script_path.exists():
        print(f"[SKIP] {script_path} not found")
        return []

    with open(script_path, "r", encoding="utf-8") as f:
        scenes = json.load(f)

    print(f"\n=== {prefix} ({len(scenes)} scenes) ===")

    results = []
    for scene in scenes:
        scene_id = scene["id"].split("-")[1]
        narration = scene.get("narration", "")
        scene_type = scene.get("type", "")
        if not narration:
            print(f"  [SKIP] {scene['id']} - no narration")
            continue

        path = await generate_scene_audio(prefix, scene_id, narration, scene_type)
        results.append({
            "scene_id": scene["id"],
            "audio_file": str(path),
            "style": STYLE_MAP.get(scene_type, DEFAULT_STYLE),
        })

    return results


async def main():
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    all_results = {}
    start_ep = int(os.environ.get("START_EP", "1"))
    for ep_num in range(start_ep, 11):
        results = await process_episode(ep_num)
        if results:
            all_results[f"rc_ep{ep_num:02d}"] = results

    manifest_path = AUDIO_DIR / "audio_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    total = sum(len(v) for v in all_results.values())
    print(f"\n=== COMPLETE: {total} audio files generated ===")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    asyncio.run(main())
