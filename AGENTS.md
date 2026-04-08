# AGENTS.md — VIDEO HARNESS PRO v3.1
# 안티그래비티(Antigravity) 자동 인식 에이전트 규칙 파일
# Antigravity v1.20.3+ AGENTS.md 표준 준수

## 프로젝트 정체성
- 이름: VIDEO HARNESS PRO
- 버전: 3.1.0
- 조직: (주)서원토건 미래전략TF
- 담당: 김무빈 차장
- 목적: 2026 건설업 AI 뉴스 영상 자동화 파이프라인

## 에이전트 역할 분담 (Antigravity Manager View 기준)

### Gemini 담당 (Antigravity 네이티브)
- 씬 구조 기획 및 아키텍처 설계
- 리서치 태스크 오케스트레이션
- Agent Teams 태스크 생성·배분
- Mission Control 전체 진행 모니터링

### Claude Code 담당 (사이드바 패널)
- CLAUDE.md + HARNESS.md 규칙 기반 실행
- /video-start → /video-gate → /video-qa 커맨드 처리
- output/ 디렉토리 파일 생성·저장
- GATE_01/02/03 자동 검증 로직 실행

## 파일 소유권 (충돌 방지)
| 파일/디렉토리 | 담당 |
|---|---|
| output/research/ | Gemini (Agent-A) |
| output/scripts/ | Claude Code (Agent-B) |
| output/scenes/ | Claude Code (Agent-C) |
| output/subtitles/ | Claude Code (Agent-D) |
| output/scripts/*_voice.json | Claude Code (Agent-E) |
| output/reports/ | Claude Code (Agent-F, G) |

## 절대 규칙
1. 같은 파일을 Gemini와 Claude가 동시 편집 금지
2. output/ 외부 경로에 결과물 저장 금지
3. GATE 통과 없이 다음 Wave 진행 금지
4. harness/CHARACTER_GUIDE.md 어투 이탈 금지
5. 연도 표기는 반드시 2026년 기준

## 현재 주제
- 주제: 2026 건설업 AI 자동화 현장 혁신
- 앵커: 김무빈 앵커
- 스타일: 뉴스·리포트형
- 씬: 7개 (output/scripts/건설업AI_script.json)

## Ghost Runtime 설정 (Antigravity 내장)
- 프리뷰 포트: 3000
- 핫리로드: enabled
- 파일 감시: src/, output/
