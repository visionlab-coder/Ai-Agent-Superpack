# HARNESS.md — 전체 하네스 엔지니어링 명세서

> Version: 3.0.0 | VIDEO HARNESS PRO

---

## 1. 캐릭터 가이드 (Character Guide)

### 뉴스·리포트형 (기본값)

```
톤: 전문적, 권위있음, 신뢰감
속도: 분당 280-320자 (표준 뉴스 앵커 속도)
문체: 단정한 경어체 ("~입니다", "~했습니다")
금지어: 너무 구어체적 표현, 감탄사, 과장 수식어
강조: 숫자와 데이터 중심, 팩트 우선
```

### 심층분석형

```
톤: 학술적, 논리적, 체계적
속도: 분당 250-280자 (천천히 명확하게)
문체: 분석적 어투 ("이를 통해 알 수 있는 것은", "데이터가 시사하는 바는")
구조: 문제 → 원인 → 해결 → 전망
```

### 현장취재형

```
톤: 생동감, 현장감, 긴박감
속도: 분당 300-350자 (빠르고 에너지틱)
문체: 현재형 중심 ("현재 현장에서는", "방금 확인된")
특징: 짧은 문장, 구체적 묘사
```

---

## 2. 스타일 규칙 (Style Rules)

### 색상 팔레트

```
Primary Background: #080B10
Panel:              #0F1318
Accent (Gold):      #E8C547
Accent (Blue):      #60A5FA
Accent (Green):     #10B981
Accent (Purple):    #A78BFA
Text Primary:       #CDD5E0
Text Muted:         #3D4A5C
Border:             #1C2330
```

### 씬 타입별 색상

| 씬 타입 | 배경색 | 액센트 |
|---------|--------|--------|
| opening | #0D1F35 | #60A5FA |
| headline | #1F0D0D | #EF4444 |
| data | #0D1F14 | #10B981 |
| analysis | #1A0D2E | #A78BFA |
| expert | #1F1A0D | #F59E0B |
| field | #0D1A1F | #34D399 |
| closing | #0D0D1F | #E8C547 |

### 타이포그래피 규칙

```
메인 타이틀:  bold, 52-60px, 흰색 95% 불투명
하단 자막:    regular, 26-30px, 흰색 90%
앵커명:       bold, 28-32px, Accent 색상
Lower Third:  18-22px, 흰색 85%
타임코드:     monospace, 10-12px
```

### 전환 효과 가이드

| 씬 타입 → 다음 타입 | 권장 전환 |
|-------------------|----------|
| opening → * | fade (0.5s) |
| * → headline | wipe-left (0.4s) |
| * → data | zoom-in (0.5s) |
| * → closing | fade (0.8s) |
| * → * (기본) | fade (0.4s) |

---

## 3. 승인 게이트 규칙 (Gate Rules)

### GATE_01 — 대본 검토

**통과 조건:**
- [ ] 씬 수: 6-8개 (±1 허용)
- [ ] 총 길이: 180-600초 (3-10분)
- [ ] 캐릭터 가이드 준수율 ≥ 90%
- [ ] 팩트/수치 데이터 포함 ≥ 2개
- [ ] 오프닝 훅 (15초 이내 임팩트 문장) 존재
- [ ] 클로징 CTA 존재

**실패 시:** Agent-B(스크립트라이터)에게 재작성 요청

---

### GATE_02 — 비주얼 검토

**통과 조건:**
- [ ] 모든 씬에 배경 비주얼 존재
- [ ] Lower Third 자막 모든 씬 적용
- [ ] Breaking News 티커 존재
- [ ] 앵커 아바타 opening/closing 씬에 존재
- [ ] 전환 효과 모든 씬 지정
- [ ] 색상 팔레트 스타일 규칙 준수

**실패 시:** Agent-C(씬디자이너)에게 수정 요청

---

### GATE_03 — 최종 QA

**통과 조건 (26개 체크리스트):**

**[콘텐츠]** (5개)
- [ ] 주제 일관성 유지
- [ ] 정보 정확성 (명백한 오류 없음)
- [ ] 논리적 흐름 (기승전결)
- [ ] 오프닝 훅 임팩트
- [ ] CTA 명확성

**[대본/언어]** (5개)
- [ ] 캐릭터 가이드 어투 준수
- [ ] 문법 오류 없음
- [ ] 자연스러운 구어체
- [ ] 적절한 씬 길이
- [ ] 금기어 미사용

**[자막]** (5개)
- [ ] SRT 형식 정확성
- [ ] 타이밍 정확성 (±0.5초)
- [ ] 줄바꿈 적절성 (35자 이내)
- [ ] 맞춤법
- [ ] 가독성

**[보이스]** (4개)
- [ ] 톤 일관성
- [ ] 속도 적절성 (280-320자/분)
- [ ] 감정 표현
- [ ] 강조 포인트

**[비주얼]** (4개)
- [ ] 씬 구성 완성도
- [ ] 색상 일관성
- [ ] 애니메이션 자연스러움
- [ ] 브랜드 일관성

**[최종]** (3개)
- [ ] 총 길이 목표 ±10% 이내
- [ ] 파일 스펙 준수
- [ ] 음성-자막 싱크 확인

**통과 기준:** 26개 중 24개 이상 ✅  
**실패 시:** 해당 항목 담당 에이전트에게 재작업 요청

---

## 4. I/O 스키마 (Input/Output Schemas)

### 씬 스키마 (scene.schema.json)

```json
{
  "type": "object",
  "required": ["id", "type", "title", "duration", "narration", "lower_third", "transition", "unsplash_query"],
  "properties": {
    "id": {"type": "string"},
    "type": {"enum": ["opening", "headline", "data", "analysis", "expert", "field", "closing"]},
    "title": {"type": "string", "maxLength": 40},
    "duration": {"type": "number", "minimum": 5, "maximum": 30},
    "narration": {"type": "string", "minLength": 50},
    "lower_third": {"type": "string", "maxLength": 35},
    "visual_desc": {"type": "string"},
    "transition": {"enum": ["fade", "wipe-left", "wipe-right", "zoom-in", "zoom-out", "slide-up", "slide-down", "flash"]},
    "unsplash_query": {"type": "string"},
    "accent": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
    "keyframes": {"type": "array"},
    "keywords": {"type": "array", "items": {"type": "string"}, "maxItems": 5}
  }
}
```

---

## 5. 에이전트 프롬프트 템플릿

### Agent-A: 리서처

```
역할: 전문 뉴스 리서처
입력: topic(주제), style(스타일)
출력: harness/schemas/research_report.md
제약:
  - 뉴스·블로그·데이터 3가지 관점 필수
  - 수치 데이터 최소 3개 포함
  - 출처 표기 필수
  - 500자 이내 요약 포함
게이트: 없음 (다음: Agent-B)
```

### Agent-B: 스크립트라이터

```
역할: 방송 뉴스 전문 대본 작가
입력: research_report.md + CHARACTER_GUIDE.md
출력: output/scripts/{topic}_script.json (scene.schema.json 준수)
제약:
  - CHARACTER_GUIDE.md 어투 100% 준수
  - 씬 수: 6-8개
  - 각 씬 narration: 2-4문장
  - 오프닝 훅 필수
게이트: GATE_01 → 통과 시 Agent-C, Agent-D, Agent-E 병렬 실행
```

### Agent-C: 씬디자이너

```
역할: Remotion 영상 씬 설계 전문가
입력: script.json + STYLE_RULES.md
출력: output/scenes/{topic}_remotion.tsx
제약:
  - STYLE_RULES.md 색상 팔레트 준수
  - 모든 씬 전환 효과 지정
  - spring 애니메이션 필수
  - lower_third 모든 씬 적용
게이트: GATE_02
```

### Agent-D: 자막엔지니어

```
역할: SRT/WebVTT 자막 전문 엔지니어
입력: script.json
출력: output/subtitles/{topic}.srt, {topic}.vtt
제약:
  - SRT 표준 형식 엄수
  - 한 자막 최대 35자, 2줄
  - 타이밍: 분당 300자 기준
  - UTF-8 BOM 포함
게이트: GATE_02 (Agent-C와 병렬)
```

### Agent-E: 보이스디렉터

```
역할: TTS/성우 디렉팅 전문가
입력: script.json + CHARACTER_GUIDE.md
출력: output/scripts/{topic}_voice_direction.md
제약:
  - 씬별 감정 디렉션 필수
  - 강조 단어 목록 제공
  - 예상 오디오 길이 초 단위 명시
  - 읽기 속도: 분당 280-320자
게이트: GATE_02 (Agent-C, D와 병렬)
```

### Agent-F: 렌더러

```
역할: 영상 렌더링 설정 엔지니어
입력: remotion.tsx + voice_direction.md + .srt
출력: output/reports/{topic}_render_config.json
제약:
  - 기본 스펙: 1920×1080, 30fps, H.264
  - 씬 타임라인 JSON 포함
  - 파일명 규칙: {날짜}_{주제}_{해상도}.mp4
게이트: GATE_03 전 준비
```

### Agent-G: QA리뷰어

```
역할: 26개 체크리스트 기반 영상 품질 검수
입력: 전체 output/ 디렉토리
출력: output/reports/{topic}_qa_report.json
제약:
  - 26개 항목 전부 평가 (✅/⚠️/❌)
  - 각 ❌ 항목에 구체적 수정 지시 포함
  - 담당 에이전트 명시
  - 통과 기준: 24/26 이상
게이트: GATE_03 → 통과 시 파이프라인 완료
```

---

## 6. 오류 처리 프로토콜

```
에이전트 실패 시:
  1. output/reports/error_{agent}_{timestamp}.log 생성
  2. 리더(Cowork)에게 즉시 보고
  3. 재시도 1회 (동일 입력)
  4. 재시도 실패 시 → 리더가 수동 개입 결정

게이트 실패 시:
  1. 실패 항목 목록화
  2. 담당 에이전트에게 구체적 수정 지시
  3. 수정 완료 후 게이트 재심사
  4. 2회 연속 실패 시 → 리더에게 에스컬레이션
```
