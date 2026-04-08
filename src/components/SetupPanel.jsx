/**
 * SetupPanel.jsx — Initial pipeline setup screen
 * Extracted from App.jsx
 */
import { PRE_GEN_PROJECTS, setApiKey, getApiKey } from "../hooks/useVideoPipeline.js";
import { T } from "../canvas-renderer.js";

export default function SetupPanel({ state: s, set, runPipeline, loadFromFiles, SS }) {
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ width: 300, borderRight: `1px solid ${T.border}`, padding: "22px 18px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>
        <div><label style={SS.lbl}>뉴스 주제</label><textarea rows={4} value={s.topic} onChange={e => set("topic", e.target.value)} style={SS.ta} placeholder="예: 2025년 건설업 AI 자동화 현장 혁신 리포트" /></div>
        <div><label style={SS.lbl}>앵커 이름</label><input value={s.anchor} onChange={e => set("anchor", e.target.value)} style={SS.inp} /></div>
        <div><label style={SS.lbl}>영상 스타일</label>
          <select value={s.style} onChange={e => set("style", e.target.value)} style={SS.sel}>
            {["뉴스·리포트형", "심층분석형", "현장취재형", "특집기획형"].map(o => <option key={o}>{o}</option>)}
          </select></div>
        <div style={{ background: "#070A0D", border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 8 }}>COWORK COMMANDS</div>
          {["/video-start --topic ... --anchor ...", "  /orchestrate --type feature", "  /video-gate --gate GATE_01 --approve", "  /video-qa --scene all"].map((cmd, i) => (
            <div key={i} style={{ fontSize: 9.5, fontFamily: T.mono, color: cmd.startsWith("  ") ? T.muted2 : T.green, marginBottom: 3 }}>{cmd}</div>
          ))}
        </div>
        <div><label style={SS.lbl}>API Key <span style={{ color: T.muted, fontSize: 9 }}>(선택)</span></label>
          <input type="password" defaultValue={getApiKey()} onChange={e => setApiKey(e.target.value)} style={SS.inp} placeholder="sk-ant-... (API 실행 시 필요)" /></div>

        <button onClick={runPipeline} disabled={!s.topic.trim() || s.isRunning || !getApiKey()} style={{ ...SS.btnA, padding: "13px", fontSize: 13, width: "100%", boxShadow: `0 0 22px ${T.accent}33`, opacity: (!s.topic.trim() || !getApiKey()) ? .5 : 1 }}>
          {s.isRunning ? "⏳ 실행 중..." : "⚡ 멀티 에이전트 실행 (API)"}
        </button>

        <div style={{ background: "#070A0D", border: `1px solid ${T.green}44`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ fontSize: 10, color: T.green, letterSpacing: 2, marginBottom: 8 }}>📂 사전 생성 파일 로드 (API 불필요)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(PRE_GEN_PROJECTS).map(([label, prefix]) => (
              <button key={prefix} onClick={() => loadFromFiles(prefix, label)} disabled={s.isRunning}
                style={{ background: "transparent", border: `1px solid ${T.green}55`, color: T.text, borderRadius: 6, cursor: "pointer", fontFamily: T.font, fontSize: 11, padding: "8px 12px", textAlign: "left", transition: "all .15s" }}>
                📁 {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: -.5 }}>VIDEO HARNESS PRO</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 3, marginTop: 3 }}>COWORK MULTI-AGENT PIPELINE v3.1 FINAL</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { icon: "⚡", t: "멀티 Claude 에이전트", d: "7개 에이전트 Wave 병렬 실행" },
            { icon: "🖼", t: "Unsplash 실제 이미지", d: "키워드→API→캔버스 실제 배경" },
            { icon: "⏺", t: "MediaRecorder 녹화", d: "Canvas→WebM 실제 파일 생성" },
            { icon: "↔", t: "드래그&드롭 리오더", d: "씬 순서 실시간 재배치" },
            { icon: "✅", t: "3단계 승인 게이트", d: "자동검증+수동승인 하이브리드" },
            { icon: "◆", t: "키프레임 에디터", d: "opacity·y·scale 타임라인" },
            { icon: "🔀", t: "8종 전환 효과", d: "Fade·Wipe·Zoom·Slide·Flash" },
            { icon: "📺", t: "YouTube 패키지", d: "챕터+설명란+태그 자동 생성" },
          ].map(({ icon, t, d }) => (
            <div key={t} style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 16, marginBottom: 5 }}>{icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 3 }}>{t}</div>
              <div style={{ fontSize: 10.5, color: T.muted }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
