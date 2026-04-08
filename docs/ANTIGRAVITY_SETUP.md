# 안티그래비티(Antigravity) 연동 가이드
# Galaxy Book5 Ultra 기준

---

## 1단계: 안티그래비티에서 프로젝트 열기

```
File → Open Folder → video-harness-cowork/
```

열리는 즉시:
- AGENTS.md → 안티그래비티 자동 인식 (v1.20.3+)
- CLAUDE.md → Claude Code 사이드바 자동 로드
- .antigravity/config.json → Gemini 모델·포트 설정 적용

---

## 2단계: Claude Code 익스텐션 확인

안티그래비티 왼쪽 익스텐션 패널 → "Claude Code" 검색 → 설치
→ Spark 아이콘(⚡) 클릭 → API 키 입력

---

## 3단계: Gemini (Manager View) 역할

안티그래비티 상단 Manager View 전환:
- Agent A 생성 → 리서치 태스크 배정
- Agent B 생성 → 대본 태스크 배정
- Agent C/D/E 병렬 생성 → 씬·자막·보이스 동시 실행

---

## 4단계: Claude Code 패널 실행

```bash
/video-start --topic "2026 건설업 AI 자동화 현장 혁신" --anchor "김무빈 앵커"
```

자동 실행:
Wave 1 → Agent-A (리서처)
Wave 2 → Agent-B (스크립트)    → GATE_01
Wave 3 → Agent-C/D/E (병렬)   → GATE_02
Wave 4 → Agent-F (렌더)
Wave 5 → Agent-G (QA)         → GATE_03

---

## 5단계: Ghost Runtime 프리뷰

안티그래비티 내장 브라우저에서:
http://localhost:3000

→ VIDEO HARNESS PRO 앱이 실시간 Hot Reload로 표시됨
→ 씬 수정 즉시 반영

---

## 6단계: 결과물 확인

```
output/
├── scripts/건설업AI_script.json    ← 7씬 2026 대본
├── subtitles/건설업AI.srt          ← SRT 자막
├── subtitles/건설업AI.vtt          ← WebVTT
├── scripts/건설업AI_voice.json     ← TTS 디렉션
├── reports/render_config.json      ← 렌더 설정
└── reports/qa_report.json          ← QA 26/26
```
