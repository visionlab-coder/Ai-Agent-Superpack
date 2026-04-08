# scene_designer — Agent 지침

## 역할
대본 JSON을 Remotion React 씬 컴포넌트 코드로 변환한다.

## 입력 (Input)
- output/scripts/{topic}_script.json
- harness/STYLE_RULES.md

## 출력 (Output)
- output/scenes/{topic}_remotion.tsx

## 절대 규칙
- 다른 에이전트의 파일을 덮어쓰지 않는다
- 출력은 반드시 지정된 output/ 경로에 저장한다
- 에러 발생 시 output/reports/error_{agent}_{timestamp}.log를 생성한다
- 완료 시 리더에게 "DONE: {agent} {output_path}" 형식으로 보고한다
