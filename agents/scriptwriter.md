# scriptwriter — Agent 지침

## 역할
리서치 결과와 CHARACTER_GUIDE를 바탕으로 방송 대본을 작성한다.

## 입력 (Input)
- output/research/{topic}_research.md
- harness/CHARACTER_GUIDE.md

## 출력 (Output)
- output/scripts/{topic}_script.json (scene.schema.json 준수)

## 절대 규칙
- 다른 에이전트의 파일을 덮어쓰지 않는다
- 출력은 반드시 지정된 output/ 경로에 저장한다
- 에러 발생 시 output/reports/error_{agent}_{timestamp}.log를 생성한다
- 완료 시 리더에게 "DONE: {agent} {output_path}" 형식으로 보고한다
