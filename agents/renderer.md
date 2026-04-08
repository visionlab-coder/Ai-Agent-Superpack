# renderer — Agent 지침

## 역할
모든 결과물을 통합하여 렌더링 설정과 타임라인 JSON을 생성한다.

## 입력 (Input)
- output/scenes/{topic}_remotion.tsx
- output/subtitles/{topic}.srt
- output/scripts/{topic}_voice_direction.md

## 출력 (Output)
- output/reports/{topic}_render_config.json

## 절대 규칙
- 다른 에이전트의 파일을 덮어쓰지 않는다
- 출력은 반드시 지정된 output/ 경로에 저장한다
- 에러 발생 시 output/reports/error_{agent}_{timestamp}.log를 생성한다
- 완료 시 리더에게 "DONE: {agent} {output_path}" 형식으로 보고한다
