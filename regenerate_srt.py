"""
SRT 재생성 스크립트
- 입력: output/scripts/rc_ep{01-10}_script.json
- 출력: output/subtitles/rc_ep{01-10}.srt
- 규칙: 분당 300자, 자막 단위 35자 이내 최대 2줄, 씬 시작시간 = 이전 duration 누적합
"""

import json
import os
import re

CHARS_PER_MINUTE = 300
CHARS_PER_SECOND = CHARS_PER_MINUTE / 60  # 5 chars/sec
MAX_LINE_CHARS = 35
MAX_LINES = 2
MAX_BLOCK_CHARS = MAX_LINE_CHARS * MAX_LINES  # 70

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(BASE_DIR, "output", "scripts")
SUBTITLES_DIR = os.path.join(BASE_DIR, "output", "subtitles")


def format_timestamp(seconds):
    """초를 SRT 타임스탬프 형식으로 변환 (HH:MM:SS,mmm)"""
    # 밀리초 반올림으로 1000이 되는 경우를 방지
    total_ms = int(round(seconds * 1000))
    hours = total_ms // 3600000
    total_ms %= 3600000
    minutes = total_ms // 60000
    total_ms %= 60000
    secs = total_ms // 1000
    millis = total_ms % 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def split_into_sentences(narration):
    """나레이션을 한국어 문장 종결 패턴 기준으로 분리한다.

    마침표(.), 물음표(?), 느낌표(!) 뒤에서 분할한다.
    한국어 종결어미(다, 니다, 습니다 등) 뒤의 마침표를 기준으로 한다.
    """
    # 마침표/물음표/느낌표 뒤 공백 또는 끝에서 분할
    sentences = re.split(r'(?<=[.?!])\s+', narration.strip())
    return [s.strip() for s in sentences if s.strip()]


def split_into_blocks(narration):
    """나레이션 텍스트를 자막 블록(최대 70자) 단위로 분할한다."""
    sentences = split_into_sentences(narration)

    blocks = []
    buffer = ""

    for sentence in sentences:
        # 현재 버퍼 + 새 문장이 블록 한도 이내면 합침
        if buffer and len(buffer) + 1 + len(sentence) <= MAX_BLOCK_CHARS:
            buffer = buffer + " " + sentence
        elif buffer:
            blocks.append(buffer)
            buffer = sentence
        else:
            buffer = sentence

    if buffer:
        blocks.append(buffer)

    # 블록 한도를 초과하는 항목을 재분할
    final_blocks = []
    for block in blocks:
        if len(block) <= MAX_BLOCK_CHARS:
            final_blocks.append(block)
        else:
            final_blocks.extend(split_long_text(block))

    return final_blocks


def split_long_text(text):
    """긴 텍스트를 MAX_BLOCK_CHARS 이내의 청크로 분할한다."""
    result = []
    while len(text) > MAX_BLOCK_CHARS:
        cut_pos = find_best_cut(text, MAX_BLOCK_CHARS)
        chunk = text[:cut_pos].strip()
        if chunk:
            result.append(chunk)
        text = text[cut_pos:].strip()
    if text:
        result.append(text)
    return result


def find_best_cut(text, max_len):
    """max_len 이내에서 가장 적절한 분할 지점을 찾는다."""
    # 우선순위: 마침표 > 쉼표+공백 > 쉼표 > 공백
    for sep in ['. ', ', ', ',', ' ']:
        pos = text.rfind(sep, 0, max_len)
        if pos > max_len // 4:
            return pos + len(sep)
    return max_len


def format_block_lines(block):
    """블록 텍스트를 최대 2줄, 줄당 35자 이내로 포맷한다."""
    if len(block) <= MAX_LINE_CHARS:
        return block

    # 2줄로 나누기: 쉼표, 마침표, 공백 경계에서 분할
    mid = len(block) // 2

    for offset in range(0, len(block) // 2):
        for pos in [mid + offset, mid - offset]:
            if 0 < pos < len(block):
                ch = block[pos]
                prev = block[pos - 1] if pos > 0 else ''
                if ch == ' ' or prev in ',.':
                    line1 = block[:pos].strip()
                    line2 = block[pos:].strip()
                    if len(line1) <= MAX_LINE_CHARS and len(line2) <= MAX_LINE_CHARS:
                        return f"{line1}\n{line2}"

    # 분할점을 못 찾으면 35자에서 강제 분할
    return f"{block[:MAX_LINE_CHARS]}\n{block[MAX_LINE_CHARS:MAX_LINE_CHARS * 2]}"


def generate_srt(scenes):
    """씬 배열로부터 SRT 문자열을 생성한다."""
    srt_entries = []
    subtitle_index = 1
    scene_start_time = 0.0

    for scene in scenes:
        duration = scene["duration"]
        narration = scene.get("narration", "")

        if not narration:
            scene_start_time += duration
            continue

        blocks = split_into_blocks(narration)
        total_chars = sum(len(b) for b in blocks)

        if total_chars == 0:
            scene_start_time += duration
            continue

        # 각 블록의 표시 시간을 글자 수 비례로 씬 duration에 맞춤
        current_time = scene_start_time
        for block in blocks:
            block_chars = len(block)
            block_duration = duration * (block_chars / total_chars)

            # 최소 0.5초 보장
            block_duration = max(block_duration, 0.5)

            # 씬 경계를 넘지 않도록 조정
            if current_time + block_duration > scene_start_time + duration:
                block_duration = (scene_start_time + duration) - current_time
                if block_duration <= 0:
                    break

            start_ts = format_timestamp(current_time)
            end_ts = format_timestamp(current_time + block_duration)
            formatted_text = format_block_lines(block)

            srt_entries.append(
                f"{subtitle_index}\n{start_ts} --> {end_ts}\n{formatted_text}"
            )
            subtitle_index += 1
            current_time += block_duration

        scene_start_time += duration

    return "\n\n".join(srt_entries) + "\n"


def main():
    os.makedirs(SUBTITLES_DIR, exist_ok=True)

    for ep_num in range(1, 11):
        ep_str = f"{ep_num:02d}"
        script_path = os.path.join(SCRIPTS_DIR, f"rc_ep{ep_str}_script.json")
        srt_path = os.path.join(SUBTITLES_DIR, f"rc_ep{ep_str}.srt")

        if not os.path.exists(script_path):
            print(f"[SKIP] {script_path} not found")
            continue

        with open(script_path, "r", encoding="utf-8") as f:
            scenes = json.load(f)

        srt_content = generate_srt(scenes)

        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        block_count = srt_content.count("\n\n") + 1
        print(f"[OK] rc_ep{ep_str}.srt - {len(scenes)} scenes, {block_count} subtitles")


if __name__ == "__main__":
    main()
