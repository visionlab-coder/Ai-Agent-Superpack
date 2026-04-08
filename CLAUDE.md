# VIDEO HARNESS PRO — Claude Cowork 하네스 엔지니어링

> **이 파일은 Claude Cowork 진입 시 자동 로드됩니다.**
> 모든 에이전트는 이 하네스 규칙을 반드시 준수해야 합니다.

---

## 🎯 시스템 정의

**프로젝트명**: VIDEO HARNESS PRO  
**목적**: AI 멀티에이전트 기반 롱폼 뉴스 영상 자동화 파이프라인  
**운영 조직**: (주)서원토건 미래전략 TF  
**담당**: 김무빈 차장 (visionlab@seowonenc.co.kr)

---

## 🐴 하네스(Harness) 엔지니어링 원칙

> "말의 방향을 잡아주는 마구(Harness)처럼, 에이전트가 의도된 방향으로만 움직이도록 제어한다."

### 핵심 4원칙

| 원칙 | 설명 |
|------|------|
| **역할 격리** | 각 에이전트는 자신의 단일 책임만 수행. 월권 금지 |
| **I/O 표준화** | 에이전트 간 데이터는 반드시 `harness/schemas/` 스키마를 따름 |
| **승인 게이트** | GATE_01(대본), GATE_02(비주얼), GATE_03(QA) 통과 없이 다음 단계 진행 불가 |
| **캐릭터 고정** | `harness/CHARACTER_GUIDE.md`의 톤앤매너를 모든 에이전트가 동일하게 적용 |

---

## 🤖 에이전트 팀 구성

```
리더 (Claude Cowork)
  ├── Agent-A: 리서처        → harness/agents/researcher.md
  ├── Agent-B: 스크립트라이터 → harness/agents/scriptwriter.md
  ├── Agent-C: 씬디자이너    → harness/agents/scene_designer.md
  ├── Agent-D: 자막엔지니어  → harness/agents/subtitle_engineer.md
  ├── Agent-E: 보이스디렉터  → harness/agents/voice_director.md
  ├── Agent-F: 렌더러        → harness/agents/renderer.md
  └── Agent-G: QA리뷰어     → harness/agents/qa_reviewer.md
```

### 실행 순서 (DAG)

```
A(리서치) ──→ B(대본) ──→ [GATE_01] ──→ C(씬디자인) ──→ D(자막)
                                    ↘                        ↓
                                     E(보이스) ──────→ [GATE_02] ──→ F(렌더) ──→ [GATE_03] ──→ G(QA)
```

---

## 📁 프로젝트 구조

```
video-harness-cowork/
├── CLAUDE.md                    ← 이 파일 (하네스 진입점)
├── HARNESS.md                   ← 전체 하네스 규칙 상세
├── prompt_plan.md               ← 에이전트 태스크 DAG
├── .claude/
│   └── commands/
│       ├── video-start.md       ← /video-start 커맨드
│       ├── video-agent.md       ← /video-agent 커맨드
│       ├── video-gate.md        ← /video-gate 커맨드
│       └── video-qa.md          ← /video-qa 커맨드
├── harness/
│   ├── CHARACTER_GUIDE.md       ← 톤앤매너 정의
│   ├── STYLE_RULES.md           ← 비주얼 스타일 기준
│   ├── GATE_RULES.md            ← 승인 게이트 기준
│   └── schemas/
│       ├── scene.schema.json    ← 씬 JSON 스키마
│       ├── script.schema.json   ← 대본 스키마
│       └── qa_report.schema.json← QA 리포트 스키마
├── agents/
│   ├── researcher.md
│   ├── scriptwriter.md
│   ├── scene_designer.md
│   ├── subtitle_engineer.md
│   ├── voice_director.md
│   ├── renderer.md
│   └── qa_reviewer.md
├── src/
│   └── video-harness-max.jsx    ← 프론트엔드 앱
├── output/                      ← 생성물 저장 디렉토리
│   ├── scripts/
│   ├── scenes/
│   ├── subtitles/
│   └── reports/
└── docs/
    └── COWORK_SETUP.md          ← Cowork 설정 가이드
```

---

## ⚡ 빠른 시작

```bash
# 1. 파이프라인 시작
/video-start --topic "주제" --anchor "앵커명"

# 2. 특정 에이전트 실행
/video-agent --agent researcher --topic "주제"

# 3. 승인 게이트 통과
/video-gate --gate GATE_01 --approve

# 4. QA 실행
/video-qa --scene all
```

---

## 🔒 절대 규칙 (에이전트 위반 금지)

1. **스키마 위반 금지** — 출력은 반드시 `harness/schemas/`의 JSON 스키마를 통과해야 함
2. **게이트 우회 금지** — 사람의 승인 없이 다음 단계 진행 불가
3. **캐릭터 이탈 금지** — CHARACTER_GUIDE.md의 어투에서 벗어난 대본 생성 금지
4. **병렬 파일 충돌 금지** — 같은 파일을 두 에이전트가 동시 편집 금지
5. **출력 경로 준수** — 생성물은 반드시 `output/` 하위에 저장

---

## 📊 토큰 사용 가이드

| 작업 | 권장 에이전트 수 | 예상 토큰 |
|------|----------------|-----------|
| 단일 씬 생성 | 1 (Agent-B만) | ~2K |
| 전체 파이프라인 | 7 (병렬 Wave) | ~25K |
| QA 검수 | 1 (Agent-G만) | ~3K |

---

## 🛠 Claude Code / Cowork 환경 설정

```json
// .claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "VIDEO_HARNESS_VERSION": "3.0.0",
    "OUTPUT_DIR": "./output"
  },
  "teammateMode": "in-process",
  "allowedTools": ["Read", "Write", "Edit", "Bash", "Task", "WebSearch"]
}
```
