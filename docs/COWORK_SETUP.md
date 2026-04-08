# Claude Cowork 적용 가이드

## Galaxy Book5 Ultra에서 즉시 실행하기

### 1단계: 프로젝트 준비

```bash
# 터미널에서 실행
cd ~/Desktop
# video-harness-cowork/ 폴더가 있다고 가정

cd video-harness-cowork
ls  # CLAUDE.md, HARNESS.md, prompt_plan.md 확인
```

### 2단계: Claude Code 설치 (미설치 시)

```bash
npm install -g @anthropic-ai/claude-code
```

### 3단계: Cowork 진입

```bash
# 기본 실행
claude

# 또는 권한 자동 승인 모드 (개발 환경)
claude --dangerously-skip-permissions
```

> CLAUDE.md가 자동으로 읽히면서 하네스 규칙이 적용됩니다.

### 4단계: 멀티 에이전트 활성화

```bash
# settings.json에 이미 설정되어 있음
# 확인: cat .claude/settings.json
```

### 5단계: 파이프라인 실행

```bash
/video-start --topic "2025 건설업 AI 현장 혁신" --anchor "김무빈 앵커" --style "뉴스·리포트형"
```

### 6단계: 게이트 승인

파이프라인이 GATE_01에서 멈추면:

```bash
/video-gate --gate GATE_01 --approve
```

### 7단계: 결과물 확인

```bash
ls output/
# scripts/    → 대본 JSON, 보이스 디렉션
# scenes/     → Remotion TSX
# subtitles/  → SRT, VTT
# reports/    → 렌더 설정, QA 리포트
```

---

## 프론트엔드 앱 실행

```bash
cd src/
npx create-react-app video-harness-app
cp video-harness-max.jsx video-harness-app/src/App.jsx
cd video-harness-app
npm start
```

## 문제 해결

| 문제 | 해결 |
|------|------|
| Agent Teams 비활성화 | settings.json에 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1"` 확인 |
| CLAUDE.md 미로드 | `claude` 실행 디렉토리가 video-harness-cowork/ 인지 확인 |
| 스키마 오류 | `harness/schemas/` 파일 존재 여부 확인 |
