/**
 * App.jsx — VIDEO HARNESS PRO v3.1 FINAL
 * MediaRecorder + Unsplash + Gate Manager 완전 통합
 * Refactored: Canvas renderer, pipeline hook, UI components extracted
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { HarnessRecorder } from "./video-recorder.js";
import { Renderer, T, SC_ACC } from "./canvas-renderer.js";
import { TTSEngine, GoogleTTSEngine } from "./tts-engine.js";
import { useVideoPipeline, dlBlob } from "./hooks/useVideoPipeline.js";
import SetupPanel from "./components/SetupPanel.jsx";
import AgentsPanel from "./components/AgentsPanel.jsx";
import PreviewPanel from "./components/PreviewPanel.jsx";

const TRANS = ["fade", "wipe-left", "wipe-right", "zoom-in", "zoom-out", "slide-up", "slide-down", "flash"];
const AGENTS = [
  { id: "A", label: "리서처", icon: "🔍", color: T.blue },
  { id: "B", label: "스크립트라이터", icon: "✍️", color: T.accent },
  { id: "C", label: "씬디자이너", icon: "🎨", color: T.purple },
  { id: "D", label: "자막엔지니어", icon: "📝", color: T.green },
  { id: "E", label: "보이스디렉터", icon: "🎙️", color: T.orange },
  { id: "F", label: "렌더러", icon: "🎬", color: T.red },
  { id: "G", label: "QA리뷰어", icon: "✅", color: T.cyan },
];
const STEPS = [
  { id: "setup", label: "설정", icon: "◈" },
  { id: "agents", label: "멀티에이전트", icon: "◉" },
  { id: "preview", label: "프리뷰", icon: "▶" },
  { id: "timeline", label: "타임라인", icon: "▤" },
  { id: "export", label: "내보내기", icon: "↓" },
];

// ─── 메인 ───────────────────────────────────────────────
export default function App() {
  const {
    state: s, dispatch: d, set, merge, log,
    loadFromFiles, runPipeline, runGate,
  } = useVideoPipeline();

  const cvRef = useRef(null);
  const rendRef = useRef(null);
  const dragFrom = useRef(null);
  const ttsRef = useRef(new TTSEngine({ mode: "web", web: { rate: 0.93 } }));
  const ttsPlayRef = useRef(null);

  // ── 렌더러 초기화 ─────────────────────────────────────
  useEffect(() => {
    if (s.step !== "preview" || !s.scenes || !cvRef.current) return;
    if (rendRef.current) rendRef.current.destroy();
    const imgMap = s.imgMap || new Map();
    const r = new Renderer(cvRef.current, s.scenes, imgMap, {
      fps: 30,
      onUpdate: (f, tot) => {
        d({ type: "M", v: { playFrame: f, playPct: (f / tot) * 100 } });
      },
    });
    rendRef.current = r;
    r.draw(0);
    return () => r.destroy();
  }, [s.step, s.scenes, s.imgMap]);

  // ── MediaRecorder 실제 녹화 ───────────────────────────
  const startRecord = useCallback(async () => {
    const r = rendRef.current;
    const cv = cvRef.current;
    if (!r || !cv || s.isRecording) return;
    r.pause(); set("isPlaying", false);
    set("isRecording", true); set("recordPct", 0); r.seek(0);
    const rec = new HarnessRecorder(cv, {
      fps: 30, bitrate: 5_000_000,
      onProgress: p => set("recordPct", p),
      onError: e => log("녹화 오류: " + e, "", "error"),
    });
    try {
      log("⏺ WebM 녹화 시작...", "", "run");
      const totalDur = s.scenes.reduce((a, sc) => a + sc.duration, 0);
      const blob = await rec.record(r, totalDur);
      set("recordedBlob", blob);
      const fname = `${s.topic.slice(0, 12).replace(/\s/g, "_")}_harness.webm`;
      HarnessRecorder.download(blob, fname);
      log(`✅ 녹화 완료 — ${HarnessRecorder.formatSize(blob.size)}`, "", "ok");
    } catch (e) { log("녹화 실패: " + e.message, "", "error"); }
    set("isRecording", false);
    r.seek(0); r.draw(0);
  }, [s.scenes, s.isRecording]);

  // TTS 설정 동기화
  useEffect(() => {
    const tts = ttsRef.current;
    tts.setMode(s.ttsMode);
    tts.updateConfig({
      web: { rate: 0.93, voiceName: s.ttsVoiceName },
      google: { apiKey: s.googleApiKey, voiceName: s.googleVoice, speakingRate: 0.93 },
      elevenlabs: { apiKey: s.elevenApiKey, voiceId: s.elevenVoiceId },
    });
  }, [s.ttsMode, s.ttsVoiceName, s.googleApiKey, s.googleVoice, s.elevenApiKey, s.elevenVoiceId]);

  // 한국어 음성 목록 (Web Speech API)
  const [koreanVoices, setKoreanVoices] = useState([]);
  useEffect(() => {
    const load = () => setKoreanVoices(ttsRef.current.getKoreanVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  const togglePlay = useCallback(() => {
    const r = rendRef.current;
    if (!r) return;
    if (s.isPlaying) {
      r.pause(); set("isPlaying", false);
      ttsRef.current.stop();
      if (ttsPlayRef.current) { ttsPlayRef.current.stop(); ttsPlayRef.current = null; }
    } else {
      r.play(); set("isPlaying", true);
      if (s.scenes) {
        ttsRef.current.speakAll(s.scenes, () => {}).then(() => set("isPlaying", false)).catch(() => {});
      }
    }
  }, [s.isPlaying, s.scenes]);

  // TTS 음성 미리 생성 (녹화용)
  const generateTtsAudio = useCallback(async () => {
    if (!s.scenes) return;
    set("isTtsGenerating", true);
    log("🎙 TTS 음성 생성 중...", "E", "run");
    try {
      const blobs = await ttsRef.current.generateAll(s.scenes, (i, total) => {
        log(`🎙 TTS ${i + 1}/${total} 씬 생성 중...`, "E", "run");
      });
      set("ttsAudioBlobs", blobs);
      log(`✅ TTS ${blobs.length}개 씬 음성 생성 완료`, "E", "ok");
    } catch (e) {
      log("✗ TTS 오류: " + e.message, "E", "error");
    }
    set("isTtsGenerating", false);
  }, [s.scenes]);

  const totalDur = useMemo(() => s.scenes?.reduce((a, sc) => a + sc.duration, 0) || 0, [s.scenes]);
  const playTimeFmt = useMemo(() => {
    const sec = Math.round(s.playFrame / 30);
    return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  }, [s.playFrame]);

  // ── 공통 스타일 ──────────────────────────────────────
  const SS = {
    lbl: { fontSize: 10, color: T.muted, letterSpacing: 2, display: "block", marginBottom: 6 },
    ta: { width: "100%", background: "#070A0D", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "10px 12px", fontSize: 12.5, fontFamily: T.font, outline: "none", resize: "none", lineHeight: 1.65, boxSizing: "border-box" },
    inp: { width: "100%", background: "#070A0D", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "9px 12px", fontSize: 12.5, fontFamily: T.font, outline: "none", boxSizing: "border-box" },
    sel: { width: "100%", background: "#070A0D", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "9px 12px", fontSize: 12.5, fontFamily: T.font, outline: "none" },
    btnA: { background: T.accent, color: "#070A0D", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: T.font, fontWeight: 700, fontSize: 12, padding: "10px 18px", transition: "all .2s" },
    btnO: { background: "transparent", border: `1px solid ${T.border}`, color: T.text, borderRadius: 7, cursor: "pointer", fontFamily: T.font, fontSize: 12, padding: "6px 14px", transition: "all .15s" },
    card: { background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" },
  };

  // ── STEP NAV ─────────────────────────────────────────
  const nav = (
    <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${T.border}`, background: T.panel, padding: "0 18px", overflowX: "auto", flexShrink: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginRight: 18, whiteSpace: "nowrap", padding: "12px 0" }}>▶ HARNESS MAX</div>
      {STEPS.map((st, i) => {
        const isA = s.step === st.id, isDone = s.scenes && i > 0 && !isA, isL = !s.scenes && st.id !== "setup" && st.id !== "agents";
        return (
          <div key={st.id} style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => !isL && set("step", st.id)} disabled={isL} style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 13px", border: "none", background: "transparent", cursor: isL ? "not-allowed" : "pointer", color: isA ? T.accent : isDone ? T.green : T.muted, fontSize: 11.5, fontWeight: isA ? 700 : 400, fontFamily: T.font, borderBottom: `2px solid ${isA ? T.accent : "transparent"}`, marginBottom: -1, transition: "all .15s", whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 12 }}>{isDone ? "✓" : st.icon}</span>{st.label}
            </button>
            {i < STEPS.length - 1 && <span style={{ color: T.muted, fontSize: 10, padding: "0 1px" }}>›</span>}
          </div>
        );
      })}
      <div style={{ flex: 1 }} />
      {s.scenes && <span style={{ fontSize: 10, color: T.muted, whiteSpace: "nowrap" }}>{s.scenes.length}씬·{totalDur}초</span>}
    </div>
  );

  // ── TIMELINE ─────────────────────────────────────────
  const timeline = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: `1px solid ${T.border}`, background: T.panel, flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: T.muted, letterSpacing: 2 }}>MULTI-TRACK TIMELINE</span>
        <span style={{ fontSize: 11, color: T.text }}>{s.scenes?.length || 0}씬 · {totalDur}초</span>
        <div style={{ flex: 1 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        {[{ lb: "VIDEO", key: "v" }, { lb: "L3RD", key: "l" }, { lb: "BGM", key: "b" }, { lb: "SFX", key: "s" }].map(track => (
          <div key={track.lb} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 46, fontSize: 9, color: T.muted, letterSpacing: 1, fontFamily: T.mono, textAlign: "right", flexShrink: 0 }}>{track.lb}</div>
            <div style={{ flex: 1, height: 36, background: "#060A10", border: `1px solid ${T.border}`, borderRadius: 6, position: "relative", overflow: "hidden" }}>
              {track.key === "v" && (s.scenes || []).map((sc, i) => { const left = s.scenes.slice(0, i).reduce((a, x) => a + x.duration, 0) / totalDur * 100; const width = sc.duration / totalDur * 100; const ac = SC_ACC[sc.type] || T.accent; return <div key={i} title={`SC${i + 1}: ${sc.title}`} style={{ position: "absolute", top: 4, bottom: 4, left: `${left}%`, width: `calc(${width}% - 2px)`, background: `${ac}18`, border: `1px solid ${ac}38`, borderRadius: 4, display: "flex", alignItems: "center", padding: "0 5px", fontSize: 8.5, color: ac, fontWeight: 700, cursor: "pointer", overflow: "hidden", whiteSpace: "nowrap" }} onClick={() => set("selectedScene", i)}>SC{i + 1}</div>; })}
              {track.key === "b" && <div style={{ position: "absolute", inset: 4, background: `${T.orange}12`, border: `1px solid ${T.orange}28`, borderRadius: 4, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 8.5, color: T.orange }}>♪ NEWS BGM</div>}
              {track.key === "l" && (s.scenes || []).map((sc, i) => { const left = s.scenes.slice(0, i).reduce((a, x) => a + x.duration, 0) / totalDur * 100; const width = sc.duration / totalDur * 100; return <div key={i} style={{ position: "absolute", top: 4, bottom: 4, left: `${left}%`, width: `calc(${width}% - 2px)`, background: `${T.green}10`, border: `1px solid ${T.green}28`, borderRadius: 3, display: "flex", alignItems: "center", padding: "0 4px", fontSize: 8, color: T.green }}>L3</div>; })}
              {track.key === "s" && <div style={{ position: "absolute", top: 4, bottom: 4, left: "2%", width: "10%", background: `${T.red}10`, border: `1px solid ${T.red}28`, borderRadius: 3, display: "flex", alignItems: "center", padding: "0 4px", fontSize: 8, color: T.red }}>SFX</div>}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 10 }}>드래그&드롭 씬 순서 편집</div>
          {(s.scenes || []).map((sc, i) => (
            <div key={`${i}-${sc.title}`} draggable onDragStart={() => { dragFrom.current = i; }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragFrom.current !== null && dragFrom.current !== i) { d({ type: "SR", f: dragFrom.current, t: i }); dragFrom.current = null; } }} onDragEnd={() => { dragFrom.current = null; }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "grab", marginBottom: 5, userSelect: "none", transition: "all .15s" }}>
              <span style={{ fontSize: 13, color: T.muted }}>⠿</span>
              <span style={{ fontSize: 9, color: T.accent, fontFamily: T.mono, fontWeight: 700, width: 26 }}>SC{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 8.5, background: `${SC_ACC[sc.type] || T.accent}18`, color: SC_ACC[sc.type] || T.accent, padding: "1px 6px", borderRadius: 3 }}>{sc.type}</span>
              <span style={{ fontSize: 11.5, color: T.text, flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{sc.title}</span>
              <span style={{ fontSize: 9, color: T.muted }}>{sc.duration}s</span>
              <select value={sc.transition || "fade"} onChange={e => d({ type: "SU", i, d: { transition: e.target.value } })} onClick={e => e.stopPropagation()}
                style={{ background: "#060810", border: `1px solid ${T.border}`, borderRadius: 4, color: T.blue, fontSize: 8.5, padding: "2px 4px", fontFamily: T.mono, outline: "none" }}>
                {TRANS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── EXPORT ───────────────────────────────────────────
  const exportPanel = (
    <div style={{ flex: 1, overflowY: "auto", padding: "18px", display: "flex", gap: 14, flexWrap: "wrap", alignContent: "flex-start" }}>
      <div style={{ ...SS.card, width: 250 }}>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 14 }}>렌더링 설정</div>
        {[["해상도", ["1920×1080", "1280×720", "3840×2160"]], ["FPS", ["30", "24", "60"]], ["포맷", ["WebM", "MP4", "MOV"]]].map(([label, opts]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: T.text }}>{label}</span>
            <select style={{ background: "#060810", border: `1px solid ${T.border}`, borderRadius: 5, color: T.accent, fontSize: 11, padding: "3px 8px", fontWeight: 700, outline: "none" }}>{opts.map(o => <option key={o}>{o}</option>)}</select>
          </div>
        ))}
        <button onClick={startRecord} disabled={s.isRecording} style={{ ...SS.btnA, width: "100%", padding: 10, marginTop: 8 }}>
          {s.isRecording ? `⏺ ${s.recordPct}%` : "⏺ WebM 파일 생성"}
        </button>
        {s.isRecording && <div style={{ height: 3, background: T.border, borderRadius: 2, marginTop: 8, overflow: "hidden" }}><div style={{ height: "100%", width: `${s.recordPct}%`, background: T.red, transition: "width .3s" }} /></div>}
        {s.recordedBlob && <div style={{ marginTop: 8, fontSize: 10, color: T.green }}>✅ 녹화 완료 — {HarnessRecorder.formatSize(s.recordedBlob.size)}</div>}
      </div>
      <div style={{ ...SS.card, width: 260 }}>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 14 }}>파일 패키지</div>
        {[
          { label: "씬 JSON", tag: "JSON", fn: () => dlBlob(JSON.stringify(s.scenes, null, 2), "scenes.json", "application/json") },
          { label: "SRT 자막", tag: "SRT", fn: () => dlBlob(s.srtContent, "subtitle.srt") },
          { label: "WebVTT", tag: "VTT", fn: () => dlBlob(s.srtContent?.replace(/,/g, "."), "subtitle.vtt") },
          { label: "Remotion TSX", tag: "TSX", fn: () => dlBlob(s.remotionCode, "video.tsx") },
          { label: "YouTube 설명란", tag: "TXT", fn: () => dlBlob(s.ytDesc, "youtube_desc.txt") },
          { label: "렌더 설정", tag: "CFG", fn: () => dlBlob(JSON.stringify(s.renderConfig, null, 2), "render_config.json", "application/json") },
          { label: "QA 리포트", tag: "QA", fn: () => dlBlob(JSON.stringify(s.qaReport, null, 2), "qa_report.json", "application/json") },
          { label: "리서치 데이터", tag: "RES", fn: () => dlBlob(s.researchData, "research.json", "application/json") },
        ].map(({ label, tag, fn }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 8.5, fontWeight: 700, color: T.accent, background: `${T.accent}14`, padding: "2px 6px", borderRadius: 3, fontFamily: T.mono }}>{tag}</span>
              <span style={{ fontSize: 11.5 }}>{label}</span>
            </div>
            <button onClick={fn} style={{ ...SS.btnO, fontSize: 10, padding: "3px 9px" }}>↓</button>
          </div>
        ))}
        <button onClick={() => { dlBlob(JSON.stringify(s.scenes, null, 2), "scenes.json", "application/json"); setTimeout(() => dlBlob(s.srtContent, "subtitle.srt"), 200); setTimeout(() => dlBlob(s.remotionCode, "video.tsx"), 400); setTimeout(() => dlBlob(s.ytDesc, "youtube_desc.txt"), 600); }} style={{ ...SS.btnA, width: "100%", marginTop: 10, padding: 9 }}>↓ 전체 다운로드</button>
      </div>
      <div style={{ ...SS.card, flex: "1 0 280px" }}>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 12 }}>YouTube 자동 생성</div>
        <pre style={{ margin: 0, padding: "12px", background: "#060810", borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 11, lineHeight: 1.85, color: T.text, overflowY: "auto", maxHeight: 220, whiteSpace: "pre-wrap", fontFamily: T.font }}>{s.ytDesc || "대본 생성 후 자동 생성됩니다."}</pre>
        <button onClick={() => navigator.clipboard.writeText(s.ytDesc || "")} style={{ ...SS.btnO, width: "100%", marginTop: 10, padding: 9, color: T.red, borderColor: `${T.red}44` }}>📋 YouTube 설명란 복사</button>
      </div>
      <div style={{ ...SS.card, width: "100%" }}>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 14 }}>Cowork 적용 — Galaxy Book5 Ultra</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            { n: "1", t: "프로젝트 압축해제", c: "tar -xzf video-harness-cowork.tar.gz" },
            { n: "2", t: "Claude Code 진입", c: "claude (CLAUDE.md 자동 로드)" },
            { n: "3", t: "파이프라인 실행", c: "/video-start --topic \"주제\"" },
            { n: "4", t: "GATE_01 승인", c: "/video-gate --gate GATE_01 --approve" },
            { n: "5", t: "QA 실행", c: "/video-qa --scene all" },
            { n: "6", t: "결과물 확인", c: "ls output/ → 전체 파일 저장됨" },
          ].map(({ n, t, c }) => (
            <div key={n} style={{ padding: "11px 13px", background: "#060810", border: `1px solid ${T.border}`, borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${T.accent}20`, color: T.accent, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{t}</div>
              </div>
              <div style={{ fontSize: 9.5, fontFamily: T.mono, color: T.green, background: "#070A0D", padding: "5px 8px", borderRadius: 4, wordBreak: "break-all" }}>{c}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", minHeight: 580, background: T.bg, color: T.text, fontFamily: T.font, fontSize: 13 }}>
      {nav}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {s.step === "setup" && <SetupPanel state={s} set={set} runPipeline={runPipeline} loadFromFiles={loadFromFiles} SS={SS} />}
        {s.step === "agents" && <AgentsPanel state={s} set={set} runGate={runGate} SS={SS} AGENTS={AGENTS} />}
        {s.step === "preview" && <PreviewPanel state={s} set={set} dispatch={d} togglePlay={togglePlay} startRecord={startRecord} cvRef={cvRef} rendRef={rendRef} totalDur={totalDur} playTimeFmt={playTimeFmt} ttsRef={ttsRef} koreanVoices={koreanVoices} generateTtsAudio={generateTtsAudio} SS={SS} TRANS={TRANS} />}
        {s.step === "timeline" && timeline}
        {s.step === "export" && exportPanel}
      </div>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
        select option{background:${T.panel}}
      `}</style>
    </div>
  );
}
