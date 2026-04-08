# App.jsx 1,576줄 모놀리스 해체 작전 (Claude Code Action Required)

Claude Code에게 지시합니다. 다음 단계에 따라 `App.jsx`를 리팩토링 및 로직 단일화를 수행하세요.

## 1. 커스텀 훅 분리 (`src/hooks/useVideoPipeline.js`)
- `App.jsx` 내부에 있는 거대한 `INIT` 상태와 `reducer` 로직, 그리고 `fetchPreGen`, `claude` API 호출부 등 파이프라인 제어 로직을 `useVideoPipeline` 훅으로 분리하세요.

## 2. 게이트 검증 로직 중복 제거 (SSOT 통폐합)
- `App.jsx` 내부의 `runGateChecks` 등 자체 하드코딩된 게이트 검증 로직을 모두 삭제하세요.
- 대신 최근 구축한 `src/validators/validate-cli.mjs` 또는 `gate-manager`를 유일한 진실의 원천(SSOT)으로 import 하여 활용하도록 수정하세요.

## 3. QA 스코어 하드코딩/Random 수정
- `Math.random()`으로 점수가 부여되거나 하드코딩된 QA 로직이 있다면 완벽히 제거하고, 실제 데이터(텍스트 길이 측정 등) 기반의 Validator 로직이 점수를 반환하도록 코드를 수정하세요.

## 4. UI 컴포넌트 분리 (`src/components/`)
- `setup` (초기 파이프라인 세팅), `agentsPanel` (에이전트 로그 콘솔), `preview` (실시간 캔버스 렌더러) 화면을 각각 독립된 리액트 컴포넌트로 분리하세요.
- 각 분리된 컴포넌트는 `App.jsx`에서 Import 하여 화면에 마운트되도록 깔끔하게 조합하세요.

> **주의사항**: 리팩토링 후 기존 파이프라인 UI와 `/video-start` 연동 로직이 100% 동일하게 동작해야 합니다. 컴포넌트 렌더링 최적화를 고려하세요!
