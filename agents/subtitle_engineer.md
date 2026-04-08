# subtitle_engineer — Agent 지침

## 역할
나레이션을 SRT/WebVTT 자막 파일로 변환한다.

## 입력 (Input)
- output/scripts/{topic}_script.json

## 출력 (Output)
- output/subtitles/{topic}.srt
- output/subtitles/{topic}.vtt

## 절대 규칙
- 다른 에이전트의 파일을 덮어쓰지 않는다
- 출력은 반드시 지정된 output/ 경로에 저장한다
- 에러 발생 시 output/reports/error_{agent}_{timestamp}.log를 생성한다
- 완료 시 리더에게 "DONE: {agent} {output_path}" 형식으로 보고한다
