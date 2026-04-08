/**
 * gate-manager.js
 * VIDEO HARNESS PRO — 승인 게이트 관리 시스템
 *
 * GATE_01 (대본) → GATE_02 (비주얼) → GATE_03 (최종 QA)
 * 각 게이트는 자동 검증 + 사람의 수동 승인이 필요합니다.
 */

export const GATE_DEFS = {
  GATE_01: {
    id: "GATE_01",
    label: "대본 검토",
    description: "씬 구조·길이·캐릭터 준수 여부 검증",
    checks: [
      { id: "G01_C01", label: "씬 수 6-8개",          fn: (d) => d.scenes?.length >= 6 && d.scenes?.length <= 8 },
      { id: "G01_C02", label: "총 길이 180-600초",     fn: (d) => { const t = d.scenes?.reduce((a,s)=>a+s.duration,0)||0; return t>=180&&t<=600; }},
      { id: "G01_C03", label: "모든 씬 narration 존재", fn: (d) => d.scenes?.every(s=>s.narration?.length>40) },
      { id: "G01_C04", label: "opening 씬 존재",       fn: (d) => d.scenes?.some(s=>s.type==="opening") },
      { id: "G01_C05", label: "closing 씬 존재",       fn: (d) => d.scenes?.some(s=>s.type==="closing") },
      { id: "G01_C06", label: "lower_third 모두 존재",  fn: (d) => d.scenes?.every(s=>s.lower_third?.length>0) },
    ],
    passThreshold: 5, // 6개 중 5개 이상
  },
  GATE_02: {
    id: "GATE_02",
    label: "비주얼 검토",
    description: "Remotion 코드·자막·보이스 디렉션 완성도",
    checks: [
      { id: "G02_C01", label: "Remotion 코드 존재",      fn: (d) => d.remotionCode?.length > 100 },
      { id: "G02_C02", label: "SRT 파일 생성됨",         fn: (d) => d.srtContent?.includes("-->") },
      { id: "G02_C03", label: "보이스 디렉션 존재",      fn: (d) => d.voiceDirection?.length > 50 },
      { id: "G02_C04", label: "전환 효과 모두 지정됨",   fn: (d) => d.scenes?.every(s=>s.transition) },
      { id: "G02_C05", label: "accent 색상 모두 지정됨", fn: (d) => d.scenes?.every(s=>s.accent) },
    ],
    passThreshold: 4,
  },
  GATE_03: {
    id: "GATE_03",
    label: "최종 QA",
    description: "26개 QA 체크리스트 24개 이상 통과",
    checks: [
      { id: "G03_C01", label: "QA 리포트 존재",           fn: (d) => !!d.qaReport },
      { id: "G03_C02", label: "QA 점수 24/26 이상",       fn: (d) => (d.qaReport?.score||0) >= 24 },
      { id: "G03_C03", label: "렌더 설정 존재",           fn: (d) => !!d.renderConfig },
      { id: "G03_C04", label: "YouTube 설명란 생성됨",    fn: (d) => d.ytDesc?.length > 50 },
    ],
    passThreshold: 3,
  },
};

/**
 * 게이트 자동 검증 실행
 * @param {string} gateId - "GATE_01" | "GATE_02" | "GATE_03"
 * @param {Object} appState - 앱 전체 상태
 * @returns {{ passed: boolean, results: Array, score: number }}
 */
export function runGateChecks(gateId, appState) {
  const gate = GATE_DEFS[gateId];
  if (!gate) throw new Error(`알 수 없는 게이트: ${gateId}`);

  const results = gate.checks.map(check => {
    let passed = false;
    let error = null;
    try { passed = !!check.fn(appState); }
    catch (e) { error = e.message; }
    return { ...check, passed, error };
  });

  const score = results.filter(r => r.passed).length;
  const passed = score >= gate.passThreshold;

  return { passed, results, score, total: gate.checks.length, threshold: gate.passThreshold };
}

/**
 * 게이트 리포트 텍스트 생성
 */
export function formatGateReport(gateId, checkResult) {
  const gate = GATE_DEFS[gateId];
  const lines = [
    `━━ ${gate.label} (${gateId}) ━━`,
    `판정: ${checkResult.passed ? "✅ PASS" : "❌ FAIL"} (${checkResult.score}/${checkResult.total})`,
    "",
    "체크 결과:",
    ...checkResult.results.map(r => `  ${r.passed ? "✅" : "❌"} ${r.label}${r.error ? ` [오류: ${r.error}]` : ""}`),
    "",
    checkResult.passed
      ? "→ 다음 단계로 진행합니다."
      : `→ ${checkResult.results.filter(r=>!r.passed).map(r=>r.label).join(", ")} 항목을 수정 후 재검사하세요.`,
  ];
  return lines.join("\n");
}
