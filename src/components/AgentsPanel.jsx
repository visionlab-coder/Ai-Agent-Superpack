/**
 * AgentsPanel.jsx — Agent status & console log panel
 * Extracted from App.jsx
 */
import { GATE_DEFS } from "../gate-manager.js";
import { T } from "../canvas-renderer.js";

export default function AgentsPanel({ state: s, set, runGate, SS, AGENTS }) {
  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ width: 250, borderRight: `1px solid ${T.border}`, padding: "16px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 10 }}>에이전트 상태</div>
        {AGENTS.map(ag => {
          const st = s.agentStatus[ag.id];
          return (
            <div key={ag.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 7, marginBottom: 5, background: st === "running" ? `${ag.color}0E` : st === "done" ? `${T.green}08` : T.panel2, border: `1px solid ${st === "running" ? ag.color + "30" : st === "done" ? T.green + "20" : T.border}`, transition: "all .3s" }}>
              <span style={{ fontSize: 14 }}>{ag.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: st === "running" ? ag.color : st === "done" ? T.green : T.muted }}>Agent-{ag.id} {ag.label}</div>
              </div>
              <div style={{ fontSize: 9, fontFamily: T.mono, color: st === "running" ? ag.color : st === "done" ? T.green : T.muted, animation: st === "running" ? "blink 1s infinite" : "none" }}>
                {st === "running" ? "●" : st === "done" ? "✓" : "○"}
              </div>
            </div>
          );
        })}
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginTop: 14, marginBottom: 10 }}>승인 게이트</div>
        {Object.entries(GATE_DEFS).map(([id, def]) => {
          const st = s.gateStatus[id];
          const result = s.gateResults[id];
          return (
            <div key={id} style={{ marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 7, background: st === "pass" ? `${T.green}08` : st === "checking" ? `${T.accent}08` : st === "fail" ? `${T.red}08` : T.panel2, border: `1px solid ${st === "pass" ? T.green + "30" : st === "checking" ? T.accent + "30" : st === "fail" ? T.red + "30" : T.border}`, transition: "all .3s" }}>
                <span style={{ fontSize: 13 }}>{st === "pass" ? "✅" : st === "checking" ? "⏳" : st === "fail" ? "❌" : "🔒"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: st === "pass" ? T.green : st === "checking" ? T.accent : st === "fail" ? T.red : T.muted }}>{id}</div>
                  <div style={{ fontSize: 9, color: T.muted }}>{def.label}</div>
                </div>
                {result && <span style={{ fontSize: 9, color: st === "pass" ? T.green : T.red, fontFamily: T.mono }}>{result.score}/{result.total}</span>}
              </div>
              {st === "fail" && <button onClick={() => runGate(id)} style={{ ...SS.btnO, width: "100%", marginTop: 4, fontSize: 10, padding: "4px", color: T.orange, borderColor: `${T.orange}44` }}>↻ 재검증</button>}
            </div>
          );
        })}
        {s.scenes && <button onClick={() => set("step", "preview")} style={{ ...SS.btnA, marginTop: "auto", width: "100%", padding: "10px" }}>▶ 프리뷰 →</button>}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, color: T.muted, letterSpacing: 2 }}>AGENT CONSOLE</span>
          {s.isRunning && <span style={{ fontSize: 10, color: T.blue }}>Wave {s.currentWave} 실행 중</span>}
        </div>
        <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg,${T.blue},${T.accent})`, width: `${Math.round((Object.values(s.agentStatus).filter(v => v === "done").length / 7) * 100)}%`, transition: "width .5s" }} />
        </div>
        <div style={{ flex: 1, background: "#060810", border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
          {s.agentLogs.length === 0
            ? <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono }}>▸ 파이프라인 대기 중...</span>
            : s.agentLogs.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "baseline", fontFamily: T.mono, fontSize: 10.5 }}>
                <span style={{ color: "#1E2530", flexShrink: 0 }}>{l.t}</span>
                {l.agentId && <span style={{ color: AGENTS.find(a => a.id === l.agentId)?.color || T.muted, flexShrink: 0 }}>[{l.agentId}]</span>}
                <span style={{ color: l.type === "ok" ? T.green : l.type === "error" ? T.red : l.type === "done" ? T.accent : l.type === "gate" ? T.orange : l.type === "warn" ? "#FCD34D" : l.type === "run" ? T.blue : T.muted }}>{l.msg}</span>
              </div>
            ))}
          {s.isRunning && <div style={{ display: "flex", gap: 3, marginTop: 5 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, animation: `blink ${.8 + i * .2}s infinite ${i * .15}s` }} />)}</div>}
        </div>
        {s.gateLog && (
          <div style={{ background: "#060810", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", maxHeight: 120, overflowY: "auto" }}>
            <pre style={{ margin: 0, fontSize: 10, fontFamily: T.mono, color: T.muted2, whiteSpace: "pre-wrap" }}>{s.gateLog}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
