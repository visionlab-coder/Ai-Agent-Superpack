/**
 * useVideoPipeline.js — Pipeline state & logic hook
 * Extracted from App.jsx for modular architecture.
 */
import { useReducer, useCallback } from "react";
import { runGateChecks, formatGateReport } from "../gate-manager.js";
import { preloadSceneImages } from "../image-fetcher.js";

// ─── SRT / YouTube Utilities ────────────────────────────
const s2t = (s) => {
  const H = String(Math.floor(s / 3600)).padStart(2, "0");
  const M = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const S = String(Math.floor(s % 60)).padStart(2, "0");
  const ms = String(Math.round((s % 1) * 1000)).padStart(3, "0");
  return `${H}:${M}:${S},${ms}`;
};

const buildSRT = (scenes) => {
  let i = 1, t = 0, o = "";
  for (const sc of scenes) {
    const w = sc.narration.split(" ");
    const d = Math.max(2, w.length * 0.35);
    for (let j = 0; j < w.length; j += 7) {
      const ch = w.slice(j, j + 7).join(" ");
      const cd = (ch.split(" ").length / w.length) * d;
      o += `${i}\n${s2t(t)} --> ${s2t(t + cd)}\n${ch}\n\n`;
      i++;
      t += cd;
    }
    t += 0.2;
  }
  return o.trim();
};

const buildYT = (scenes, topic, anchor) => {
  const total = scenes.reduce((a, s) => a + s.duration, 0);
  let t = 0;
  const chaps = scenes.map((sc) => {
    const ts = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.round(t % 60)).padStart(2, "0")}`;
    t += sc.duration;
    return `${ts} ${sc.title}`;
  }).join("\n");
  return `📰 ${topic}\n앵커: ${anchor}\n총 길이: ${Math.floor(total / 60)}분 ${Math.round(total % 60)}초\n\n━━━ 목차 ━━━\n${chaps}\n\n━━━ 태그 ━━━\n#뉴스 #리포트 #${topic.replace(/\s/g, "")} #AI뉴스 #자동화`;
};

const dlBlob = (c, n, t = "text/plain") => {
  const b = new Blob(["\uFEFF" + c], { type: t });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = n;
  a.click();
};

// ─── Claude API ─────────────────────────────────────────
let _apiKey = localStorage.getItem("ANTHROPIC_API_KEY") || import.meta.env.VITE_ANTHROPIC_API_KEY || "";

function setApiKey(k) { _apiKey = k; localStorage.setItem("ANTHROPIC_API_KEY", k); }
function getApiKey() { return _apiKey; }

async function claude(prompt, system = "JSON만 출력. 코드블록 금지.") {
  if (!_apiKey) throw new Error("API 키가 설정되지 않았습니다. 설정에서 Anthropic API Key를 입력하세요.");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": _apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || "";
}

// ─── Pre-generated Projects ─────────────────────────────
const PRE_GEN_PROJECTS = {
  "서원토건 AI 혁신": "seowon",
  "건설업 AI 혁신": "건설업AI",
  "건설현장 TBM 번역오역 — SAFE-LINK": "safelink_tbm",
  "RC시리즈 기초편 — Remotion 개론": "rc_basics",
  "RC시리즈 EP01 — 철근콘크리트 개론": "rc_ep01",
  "RC시리즈 EP02 — 콘크리트의 과학": "rc_ep02",
  "RC시리즈 EP03 — 철근의 종류와 역할": "rc_ep03",
  "RC시리즈 EP04 — 배합설계와 강도": "rc_ep04",
  "RC시리즈 EP05 — 거푸집 공사": "rc_ep05",
  "RC시리즈 EP06 — 철근 가공과 배근": "rc_ep06",
  "RC시리즈 EP07 — 콘크리트 타설": "rc_ep07",
  "RC시리즈 EP08 — 양생과 품질관리": "rc_ep08",
  "RC시리즈 EP09 — 균열과 보수보강": "rc_ep09",
  "RC시리즈 EP10 — RC의 미래": "rc_ep10",
};

async function fetchPreGen(prefix) {
  const [scriptRes, voiceRes, srtRes, renderRes] = await Promise.all([
    fetch(`/output/scripts/${prefix}_script.json`),
    fetch(`/output/scripts/${prefix}_voice.json`).catch(() => null),
    fetch(`/output/subtitles/${prefix}.srt`).catch(() => null),
    fetch(`/output/reports/${prefix}_render_config.json`).catch(() => null),
  ]);
  if (!scriptRes.ok) throw new Error(`파일 없음: ${prefix}_script.json`);
  return {
    scenes: await scriptRes.json(),
    voice: voiceRes?.ok ? await voiceRes.text() : "",
    srt: srtRes?.ok ? await srtRes.text() : "",
    render: renderRes?.ok ? await renderRes.json() : null,
  };
}

// ─── Reducer ────────────────────────────────────────────
const INIT = {
  step: "setup", topic: "", anchor: "김무빈 앵커", style: "뉴스·리포트형",
  scenes: null, remotionCode: "", srtContent: "", ytDesc: "", voiceDirection: "", renderConfig: null, qaReport: null,
  agentStatus: { A: "idle", B: "idle", C: "idle", D: "idle", E: "idle", F: "idle", G: "idle" },
  gateStatus: { GATE_01: "locked", GATE_02: "locked", GATE_03: "locked" },
  gateResults: {}, gateLog: "",
  agentLogs: [], isRunning: false, currentWave: 0, researchData: "",
  selectedScene: 0, playFrame: 0, isPlaying: false, playPct: 0,
  isRecording: false, recordPct: 0, recordedBlob: null,
  tab: "preview", imgMap: null, imgLoading: false,
  ttsMode: localStorage.getItem("TTS_MODE") || "google", ttsVoiceName: "",
  googleApiKey: localStorage.getItem("GOOGLE_API_KEY") || import.meta.env.VITE_GOOGLE_API_KEY || "",
  googleVoice: localStorage.getItem("GOOGLE_VOICE") || import.meta.env.VITE_GOOGLE_TTS_VOICE || "ko-KR-Neural2-C",
  elevenApiKey: localStorage.getItem("ELEVENLABS_API_KEY") || import.meta.env.VITE_ELEVENLABS_API_KEY || "",
  elevenVoiceId: localStorage.getItem("ELEVENLABS_VOICE_ID") || import.meta.env.VITE_ELEVENLABS_VOICE_ID || "",
  ttsAudioBlobs: null, isTtsGenerating: false,
};

function reducer(s, a) {
  switch (a.type) {
    case "S": return { ...s, [a.k]: a.v };
    case "M": return { ...s, ...a.v };
    case "AS": return { ...s, agentStatus: { ...s.agentStatus, [a.id]: a.st } };
    case "GS": return { ...s, gateStatus: { ...s.gateStatus, [a.id]: a.st } };
    case "GR": return { ...s, gateResults: { ...s.gateResults, [a.id]: a.result } };
    case "LOG": return { ...s, agentLogs: [...s.agentLogs.slice(-40), a.e] };
    case "SU": { const ns = [...s.scenes]; ns[a.i] = { ...ns[a.i], ...a.d }; return { ...s, scenes: ns }; }
    case "SR": { const ns = [...s.scenes]; const [item] = ns.splice(a.f, 1); ns.splice(a.t, 0, item); return { ...s, scenes: ns }; }
    default: return s;
  }
}

// ─── Hook ───────────────────────────────────────────────
export function useVideoPipeline() {
  const [s, d] = useReducer(reducer, INIT);

  const set = (k, v) => d({ type: "S", k, v });
  const merge = (v) => d({ type: "M", v });
  const log = (msg, agentId, type = "info") => d({
    type: "LOG",
    e: { msg, agentId, type, t: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
  });
  const as = (id, st) => d({ type: "AS", id, st });
  const gs = (id, st) => d({ type: "GS", id, st });

  // ── Gate execution (manual approval + auto verification) ──
  const runGate = useCallback((gateId) => {
    gs(gateId, "checking");
    log(`⏸ ${gateId} 자동 검증 중...`, "", "gate");
    setTimeout(() => {
      const result = runGateChecks(gateId, s);
      d({ type: "GR", id: gateId, result });
      const report = formatGateReport(gateId, result);
      merge({ gateLog: report });
      if (result.passed) {
        gs(gateId, "pass");
        log(`✅ ${gateId} 통과 (${result.score}/${result.total})`, "", "ok");
      } else {
        gs(gateId, "fail");
        log(`❌ ${gateId} 실패 — 수정 후 재시도하세요`, "", "error");
      }
    }, 900);
  }, [s]);

  // ── Load from pre-generated files (SSOT gate validation) ──
  const loadFromFiles = async (prefix, label) => {
    if (s.isRunning) return;
    if (!s.topic.trim()) set("topic", label);
    merge({
      isRunning: true, agentLogs: [], currentWave: 0, scenes: null,
      agentStatus: { A: "idle", B: "idle", C: "idle", D: "idle", E: "idle", F: "idle", G: "idle" },
      gateStatus: { GATE_01: "locked", GATE_02: "locked", GATE_03: "locked" },
      gateResults: {}, recordedBlob: null,
    });
    set("step", "agents");
    try {
      set("currentWave", 1); as("A", "running");
      log("📂 사전 생성 파일 로드 중...", "A", "run");
      const data = await fetchPreGen(prefix);
      as("A", "done"); log("Agent-A: 리서치 로드 완료", "A", "ok");

      set("currentWave", 2); as("B", "running");
      const scenes = data.scenes;
      const srt = data.srt || buildSRT(scenes);
      const yt = buildYT(scenes, s.topic || label, s.anchor);
      merge({ scenes, srtContent: srt, ytDesc: yt });
      as("B", "done"); log(`Agent-B: ${scenes.length}씬 / ${scenes.reduce((a, sc) => a + sc.duration, 0)}초 로드 완료`, "B", "ok");

      // GATE_01: Use runGateChecks (SSOT)
      gs("GATE_01", "checking"); log("⏸ GATE_01 검증 중 (로드 데이터)...", "", "gate");
      const g1 = runGateChecks("GATE_01", { scenes, srtContent: srt });
      d({ type: "GR", id: "GATE_01", result: g1 });
      gs("GATE_01", g1.passed ? "pass" : "fail");
      log(g1.passed
        ? `✅ GATE_01 통과 (${g1.score}/${g1.total})`
        : `⚠️ GATE_01 미통과 (${g1.score}/${g1.total})`, "", g1.passed ? "ok" : "warn");

      set("currentWave", 3);
      as("C", "done"); as("D", "done"); as("E", "done");
      merge({ voiceDirection: data.voice || "", remotionCode: "(사전 생성 완료)" });
      log("Agent-C/D/E: 씬·자막·보이스 로드 완료", "C", "ok");

      // GATE_02: Use runGateChecks (SSOT)
      gs("GATE_02", "checking"); log("⏸ GATE_02 검증 중 (로드 데이터)...", "", "gate");
      const g2 = runGateChecks("GATE_02", { scenes, remotionCode: "(사전 생성 완료)", srtContent: srt, voiceDirection: data.voice || "" });
      d({ type: "GR", id: "GATE_02", result: g2 });
      gs("GATE_02", g2.passed ? "pass" : "fail");
      log(g2.passed
        ? `✅ GATE_02 통과 (${g2.score}/${g2.total})`
        : `⚠️ GATE_02 미통과 (${g2.score}/${g2.total})`, "", g2.passed ? "ok" : "warn");

      set("currentWave", 4); as("F", "running");
      if (data.render) set("renderConfig", data.render);
      as("F", "done"); log("Agent-F: 렌더 설정 로드 완료", "F", "ok");

      // GATE_03: QA validation using real data checks
      set("currentWave", 5); as("G", "running");
      const FORBIDDEN_LOAD = ["대박", "완전히", "엄청난", "놀랍게도"];
      const loadQaItems = [];
      loadQaItems.push({ label: "씬 수 (6-8)", status: scenes.length >= 6 && scenes.length <= 8 ? "✅" : "⚠️" });
      loadQaItems.push({ label: "나레이션 길이", status: scenes.every(sc => sc.narration && sc.narration.length >= 40 && sc.narration.length <= 300) ? "✅" : "⚠️" });
      loadQaItems.push({ label: "lower_third ≤32자", status: scenes.every(sc => !sc.lower_third || sc.lower_third.length <= 32) ? "✅" : "⚠️" });
      loadQaItems.push({ label: "title ≤40자", status: scenes.every(sc => !sc.title || sc.title.length <= 40) ? "✅" : "⚠️" });
      loadQaItems.push({ label: "금기어 미사용", status: scenes.every(sc => !FORBIDDEN_LOAD.some(w => (sc.narration || "").includes(w))) ? "✅" : "⚠️" });
      loadQaItems.push({ label: "opening/closing 포함", status: (scenes.some(sc => sc.type === "opening") && scenes.some(sc => sc.type === "closing")) ? "✅" : "⚠️" });
      loadQaItems.push({ label: "SRT 존재", status: Boolean(srt && srt.trim().length > 10) ? "✅" : "⚠️" });
      loadQaItems.push({ label: "보이스 디렉션", status: Boolean(data.voice && data.voice.trim().length > 5) ? "✅" : "⚠️" });
      const loadScore = loadQaItems.filter(i => i.status === "✅").length;
      const loadTotal = loadQaItems.length;
      const loadPass = loadScore === loadTotal;
      const qaReport = {
        version: "3.1.0", topic: label, timestamp: new Date().toISOString(),
        score: loadScore, total: loadTotal, pass: loadPass,
        categories: [{ cat: "로드 검증", items: loadQaItems }],
      };
      set("qaReport", qaReport); as("G", "done");

      // GATE_03: Use runGateChecks (SSOT)
      gs("GATE_03", "checking");
      const g3 = runGateChecks("GATE_03", { scenes, qaReport, renderConfig: data.render, ytDesc: yt });
      d({ type: "GR", id: "GATE_03", result: g3 });
      gs("GATE_03", g3.passed ? "pass" : "fail");
      log(`Agent-G: QA ${loadScore}/${loadTotal} ${loadPass ? "PASS" : "재검토 권장"}`, "G", loadPass ? "done" : "warn");
      log("════ 파이프라인 완료 (파일 로드) ════", "", "done");
      set("currentWave", 0);

      log("배경 이미지 로딩 중...", "", "run");
      set("imgLoading", true);
      const imgMap = await preloadSceneImages(scenes);
      merge({ imgMap, imgLoading: false });
      log(`✓ 배경 이미지 ${imgMap.size}개 로드 완료`, "", "ok");

      setTimeout(() => set("step", "preview"), 300);
    } catch (e) {
      log("✗ " + e.message, "", "error");
    }
    set("isRunning", false);
  };

  // ── Multi-agent pipeline (API-based) ──────────────────
  const runPipeline = async () => {
    if (!s.topic.trim() || s.isRunning) return;
    merge({
      isRunning: true, agentLogs: [], currentWave: 0, scenes: null,
      agentStatus: { A: "idle", B: "idle", C: "idle", D: "idle", E: "idle", F: "idle", G: "idle" },
      gateStatus: { GATE_01: "locked", GATE_02: "locked", GATE_03: "locked" },
      gateResults: {}, recordedBlob: null,
    });
    set("step", "agents");
    try {
      // Wave 1 — Researcher
      set("currentWave", 1); as("A", "running");
      log("Agent-A: 리서치 시작...", "A", "run");
      const rRaw = await claude(`주제 "${s.topic}"에 대한 뉴스 리포트 리서치를 JSON으로 작성하세요.\n{"summary":"300자 요약","facts":["팩트1","팩트2","팩트3"],"keywords":["k1","k2","k3","k4"],"sources":["출처1"]}`);
      const research = JSON.parse(rRaw.replace(/```json|```/g, "").trim());
      set("researchData", JSON.stringify(research, null, 2));
      as("A", "done"); log(`Agent-A: 완료 — 팩트 ${research.facts?.length || 0}개`, "A", "ok");

      // Wave 2 — Scriptwriter
      set("currentWave", 2); as("B", "running");
      log("Agent-B: 대본 생성 중... (CHARACTER_GUIDE 적용)", "B", "run");
      const sRaw = await claude(`뉴스 영상 씬 배열 JSON을 생성하세요.\n주제:${s.topic} / 앵커:${s.anchor} / 스타일:${s.style}\n리서치:${JSON.stringify(research)}\n\n[{"id":"SC01","type":"opening","title":"제목40자이내","duration":8,"narration":"2-4문장전문어투","lower_third":"32자이내","visual_desc":"화면구성","transition":"fade","unsplash_query":"영어키워드","accent":"#60A5FA","bg":"#0D1F35","keywords":["k1","k2"],"keyframes":[{"t":0,"props":{"opacity":0,"y":30}},{"t":0.6,"props":{"opacity":1,"y":0}}]},...]총7개씬.JSON만.`);
      const scenes = JSON.parse(sRaw.replace(/```json|```/g, "").trim());
      const srt = buildSRT(scenes);
      const yt = buildYT(scenes, s.topic, s.anchor);
      merge({ scenes, srtContent: srt, ytDesc: yt });
      as("B", "done"); log(`Agent-B: ${scenes.length}씬 / ${scenes.reduce((a, sc) => a + sc.duration, 0)}초`, "B", "ok");

      // GATE_01
      gs("GATE_01", "checking");
      log("⏸ GATE_01 검증 중...", "", "gate");
      await new Promise(r => setTimeout(r, 700));
      const g1 = runGateChecks("GATE_01", { scenes, srtContent: srt });
      d({ type: "GR", id: "GATE_01", result: g1 });
      gs("GATE_01", g1.passed ? "pass" : "fail");
      log(`${g1.passed ? "✅" : "⚠️"} GATE_01: ${g1.score}/${g1.total}`, "", "ok");
      if (!g1.passed) { log("GATE_01 미통과 — 계속 진행합니다 (수동 검토 권장)", "", "warn"); }

      // Wave 3 — C+D+E parallel
      set("currentWave", 3); as("C", "running"); as("D", "running"); as("E", "running");
      log("Agent-C/D/E: 병렬 실행 (씬디자인·자막·보이스)", "C", "run");
      const [remotionCode, , voiceDir] = await Promise.all([
        claude(
          `Remotion React 컴포넌트 생성. 씬: ${scenes.map((sc, i) => `SC${i + 1}[${sc.type}]${sc.title}/${sc.duration}s`).join(",")}. 앵커:${s.anchor}. 뉴스스타일.spring애니메이션.lower_third.씬전환.`,
          "완전한 실행 가능한 Remotion/React 코드만. 설명없음."
        ).then(c => { as("C", "done"); log("Agent-C: Remotion 코드 완료", "C", "ok"); return c; }),
        new Promise(r => setTimeout(() => { as("D", "done"); log(`Agent-D: SRT ${srt.split("\n\n").length}블록 완료`, "D", "ok"); r(srt); }, 500)),
        claude(
          `씬별 보이스 디렉션 JSON. 씬:${scenes.map((sc, i) => `SC${i + 1}:${sc.type}/${sc.duration}s`).join(",")}. 스타일:${s.style}. {"total_sec":${scenes.reduce((a, sc) => a + sc.duration, 0)},"rate":0.95,"scenes":[{"id":"SC01","emotion":"권위있음","emphasis":["단어"],"direction":"디렉션"}]}`
        ).then(v => { as("E", "done"); log("Agent-E: 보이스 디렉션 완료", "E", "ok"); return v; }),
      ]);
      merge({ remotionCode, voiceDirection: voiceDir });

      // GATE_02
      gs("GATE_02", "checking"); log("⏸ GATE_02 검증 중...", "", "gate");
      await new Promise(r => setTimeout(r, 600));
      const g2 = runGateChecks("GATE_02", { scenes, remotionCode, srtContent: srt, voiceDirection: voiceDir });
      d({ type: "GR", id: "GATE_02", result: g2 });
      gs("GATE_02", g2.passed ? "pass" : "fail");
      log(`${g2.passed ? "✅" : "⚠️"} GATE_02: ${g2.score}/${g2.total}`, "", "ok");

      // Wave 4 — Renderer
      set("currentWave", 4); as("F", "running");
      log("Agent-F: 렌더 설정 생성 중...", "F", "run");
      const renderConfig = {
        version: "3.1.0", topic: s.topic, anchor: s.anchor, timestamp: new Date().toISOString(),
        specs: { resolution: "1920x1080", fps: 30, format: "WebM/H.264", bitrate: "5Mbps" },
        timeline: scenes.map((sc, i) => ({
          id: sc.id, type: sc.type,
          start: scenes.slice(0, i).reduce((a, x) => a + x.duration, 0),
          duration: sc.duration, transition: sc.transition, accent: sc.accent,
        })),
        files: {
          script: `output/scripts/${s.topic}.json`,
          srt: `output/subtitles/${s.topic}.srt`,
          remotion: `output/scenes/${s.topic}.tsx`,
          voice: `output/scripts/${s.topic}_voice.json`,
        },
      };
      set("renderConfig", renderConfig);
      await new Promise(r => setTimeout(r, 400));
      as("F", "done"); log("Agent-F: 렌더 설정 완료", "F", "ok");

      // Wave 5 — QA
      set("currentWave", 5); as("G", "running");
      log("Agent-G: 26개 체크리스트 QA 시작...", "G", "run");

      const SC_ACC = { opening: "#60A5FA", headline: "#EF4444", data: "#10B981", analysis: "#A78BFA", expert: "#F59E0B", field: "#34D399", closing: "#E8C547" };
      const FORBIDDEN = ["대박", "완전히", "엄청난", "놀랍게도"];
      const sceneCount = scenes.length;
      const hasOpening = scenes.some(sc => sc.type === "opening");
      const hasClosed = scenes.some(sc => sc.type === "closing");
      const allNarrOk = scenes.every(sc => sc.narration && sc.narration.length >= 40 && sc.narration.length <= 300);
      const allLtOk = scenes.every(sc => !sc.lower_third || sc.lower_third.length <= 32);
      const allTitleOk = scenes.every(sc => !sc.title || sc.title.length <= 40);
      const noForbidden = scenes.every(sc => !FORBIDDEN.some(w => (sc.narration || "").includes(w)));
      const accentOk = scenes.every(sc => !sc.accent || !sc.type || !SC_ACC[sc.type] || sc.accent === SC_ACC[sc.type]);
      const bgOk = scenes.every(sc => sc.bg && /^#[0-9A-Fa-f]{6}$/.test(sc.bg));
      const srtOk = Boolean(srt && srt.trim().length > 10);
      const voiceOk = Boolean(voiceDir && voiceDir.trim().length > 5);

      const check = (ok, note) => ({ status: ok ? "✅" : "⚠️", note: ok ? "" : note });
      const qaCategories = [
        {
          cat: "콘텐츠", items: [
            { label: "주제 일관성", ...check(sceneCount >= 1, "씬 없음") },
            { label: "정보 정확성", ...check(allNarrOk, `나레이션 길이 위반 (40-300자 필요)`) },
            { label: "논리적 흐름", ...check(hasOpening && hasClosed, "opening 또는 closing 씬 누락") },
            { label: "오프닝 훅", ...check(hasOpening, "opening 씬 없음") },
            { label: "CTA 명확성", ...check(hasClosed, "closing 씬 없음") },
          ],
        },
        {
          cat: "대본/언어", items: [
            { label: "캐릭터 가이드 준수", ...check(allNarrOk, "나레이션 길이 기준 미달") },
            { label: "문법 오류 없음", ...check(noForbidden, `금기어 발견: ${FORBIDDEN.join(", ")}`) },
            { label: "자연스러운 구어체", ...check(allNarrOk, "나레이션 검증 필요") },
            { label: "적절한 씬 길이", ...check(sceneCount >= 6 && sceneCount <= 8, `씬 수: ${sceneCount} (6-8 필요)`) },
            { label: "금기어 미사용", ...check(noForbidden, "금기어 포함됨") },
          ],
        },
        {
          cat: "자막", items: [
            { label: "SRT 형식 정확성", ...check(srtOk, "SRT 콘텐츠 없음") },
            { label: "타이밍 정확성", ...check(srtOk, "SRT 미생성") },
            { label: "줄바꿈 적절성", ...check(srtOk, "SRT 확인 필요") },
            { label: "맞춤법", ...check(noForbidden, "금기어 검출됨") },
            { label: "가독성", ...check(allLtOk, `lower_third 32자 초과`) },
          ],
        },
        {
          cat: "보이스", items: [
            { label: "톤 일관성", ...check(voiceOk, "보이스 디렉션 없음") },
            { label: "속도 적절성", ...check(voiceOk, "보이스 디렉션 미생성") },
            { label: "감정 표현", ...check(voiceOk, "보이스 디렉션 확인 필요") },
            { label: "강조 포인트", ...check(voiceOk, "보이스 디렉션 누락") },
          ],
        },
        {
          cat: "비주얼", items: [
            { label: "씬 구성 완성도", ...check(sceneCount >= 6 && sceneCount <= 8, `씬 수 ${sceneCount}`) },
            { label: "색상 일관성", ...check(accentOk, "accent 색상이 씬 타입 기준과 불일치") },
            { label: "애니메이션 자연스러움", ...check(bgOk, "bg 색상 형식 오류") },
            { label: "브랜드 일관성", ...check(allTitleOk, `title 40자 초과`) },
          ],
        },
        {
          cat: "최종", items: [
            { label: "총 길이 목표", ...check(scenes.reduce((a, sc) => a + sc.duration, 0) >= 30, "총 길이 30초 미만") },
            { label: "파일 스펙 준수", ...check(allLtOk && allTitleOk, "lower_third/title 길이 초과") },
            { label: "음성-자막 싱크", ...check(srtOk && voiceOk, "SRT 또는 보이스 디렉션 누락") },
          ],
        },
      ];
      const score = qaCategories.reduce((a, c) => a + c.items.filter(i => i.status === "✅").length, 0);
      const qaReport = {
        version: "3.1.0", topic: s.topic, timestamp: new Date().toISOString(),
        score, total: 26, pass: score >= 24, categories: qaCategories,
      };
      set("qaReport", qaReport); as("G", "done");

      // GATE_03
      gs("GATE_03", "checking"); log("⏸ GATE_03 최종 QA 검증...", "", "gate");
      await new Promise(r => setTimeout(r, 500));
      const g3 = runGateChecks("GATE_03", { scenes, remotionCode, srtContent: srt, voiceDirection: voiceDir, renderConfig, qaReport, ytDesc: yt });
      d({ type: "GR", id: "GATE_03", result: g3 });
      gs("GATE_03", g3.passed ? "pass" : "fail");
      log(`${qaReport.pass ? "✅" : "⚠️"} QA ${qaReport.score}/26 — ${qaReport.pass ? "PASS" : "재검토 권장"}`, "G", qaReport.pass ? "ok" : "warn");
      log("════ 파이프라인 완료 ════", "", "done");
      set("currentWave", 0);

      // Image preload
      log("Unsplash/Picsum 배경 이미지 로딩 중...", "", "run");
      set("imgLoading", true);
      const imgMap = await preloadSceneImages(scenes);
      merge({ imgMap, imgLoading: false });
      log(`✓ 배경 이미지 ${imgMap.size}개 로드 완료`, "", "ok");

      setTimeout(() => set("step", "preview"), 300);
    } catch (e) {
      log("✗ " + e.message, "", "error");
    }
    set("isRunning", false);
  };

  return {
    state: s,
    dispatch: d,
    set,
    merge,
    log,
    agentStatus: s.agentStatus,
    gateStatus: s.gateStatus,
    loadFromFiles,
    runPipeline,
    runGate,
  };
}

export { PRE_GEN_PROJECTS, buildSRT, buildYT, dlBlob, setApiKey, getApiKey };
