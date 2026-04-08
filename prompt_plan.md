# prompt_plan.md — RC EP01~EP10 Remotion 렌더링 파이프라인

> VIDEO HARNESS PRO v3.0.0
> 2026-04-08 승인

---

## 현재 상태

| 자산 | 상태 |
|------|:---:|
| 스크립트 JSON (10편 × 7씬) | OK |
| TTS 오디오 MP3 (70개, SSML 감정스타일) | OK |
| 보이스 디렉션 JSON | OK |
| 자막 SRT (10편) | 재생성 필요 |
| 렌더 설정 JSON (10편) | OK |
| Remotion 컴포넌트 (Root + NewsScene) | 기본 골격 |
| 배경 이미지 | 미확보 |
| 최종 MP4 | 미생성 |

## 구현 Phase

### Phase 1: 자막(SRT) 재생성 [병렬]
- 나레이션 수정 반영하여 SRT 자동 재생성
- 분당 300자 기준, 35자/2줄 청크

### Phase 2: Remotion 오디오 통합 [병렬]
- `<Audio>` 컴포넌트로 씬별 MP3 연결
- public/audio/에 MP3 복사
- Root.tsx에서 스크립트 JSON 동적 로드

### Phase 3: 배경 이미지 확보 [병렬]
- unsplash_query 기반 이미지 다운로드 (API 키 불필요)
- public/images/ 저장
- NewsScene.tsx 배경 레이어 추가

### Phase 4: 자막 컴포넌트 (Phase 1 후)
- SRT 파서 유틸
- SubtitleOverlay 컴포넌트
- NewsScene.tsx 통합

### Phase 5: 배치 렌더 (Phase 2,3,4 후)
- EP01~EP10 Composition 동적 등록
- 배치 렌더 스크립트
- output/render/rc_ep{01-10}.mp4

## DAG

```
Phase 1 ──→ Phase 4 ──┐
Phase 2 ──────────────→ Phase 5
Phase 3 ──────────────→┘
```

## 백업 플랜
- 이미지 품질 미흡 시: Gemma 4로 이미지 프롬프트 생성 후 로컬 생성
- 렌더 품질 미흡 시: Gemma 4로 씬 디자인 개선안 도출

## 이전 계획

<details>
<summary>v2 파이프라인 DAG (아카이브)</summary>

Wave 1: Task-A (리서치) → Wave 2: Task-B (대본) → Wave 3: Task-C,D,E (병렬)
→ Wave 4: Task-F (렌더설정) → Wave 5: Task-G (QA)

</details>
