/**
 * PreviewPanel.jsx — Real-time canvas preview, tabs, scene list
 * Extracted from App.jsx
 */
import { T, SC_ACC } from "../canvas-renderer.js";
import { dlBlob } from "../hooks/useVideoPipeline.js";
import { GoogleTTSEngine } from "../tts-engine.js";
import { HarnessRecorder } from "../video-recorder.js";

export default function PreviewPanel({
  state: s, set, dispatch: d, togglePlay, startRecord,
  cvRef, rendRef, totalDur, playTimeFmt, ttsRef, koreanVoices, generateTtsAudio,
  SS, TRANS,
}) {
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 14, gap: 10, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[["preview", "▶ 프리뷰"], ["code", "◉ Remotion"], ["qa", "✅ QA"], ["research", "🔍 리서치"]].map(([id, label]) => (
            <button key={id} onClick={() => set("tab", id)} style={{ ...SS.btnO, fontSize: 11, padding: "5px 11px", background: s.tab === id ? `${T.accent}14` : T.panel2, color: s.tab === id ? T.accent : T.muted, borderColor: s.tab === id ? `${T.accent}44` : T.border }}>{label}</button>
          ))}
        </div>
        {s.tab === "preview" && <>
          <div style={{ flex: 1, background: "#050710", borderRadius: 10, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", minHeight: 200 }}>
            <canvas ref={cvRef} width={960} height={540} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
            {s.imgLoading && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.7)", flexDirection: "column", gap: 10 }}>
              <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 11, color: T.muted }}>이미지 로딩 중...</span>
            </div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <button onClick={togglePlay} style={{ ...SS.btnO, minWidth: 76, fontWeight: 700, background: s.isPlaying ? `${T.red}14` : `${T.accent}14`, color: s.isPlaying ? T.red : T.accent, borderColor: s.isPlaying ? `${T.red}44` : `${T.accent}44`, fontSize: 11 }}>
              {s.isPlaying ? "⏸ 정지" : "▶ 재생"}
            </button>
            <button onClick={() => { rendRef.current?.seek(0); set("isPlaying", false); }} style={{ ...SS.btnO, fontSize: 11, padding: "5px 9px" }}>↩</button>
            <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2, cursor: "pointer", overflow: "hidden" }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); rendRef.current?.seek(Math.round((e.clientX - r.left) / r.width * (rendRef.current?.totalF || 1))); }}>
              <div style={{ height: "100%", width: `${s.playPct}%`, background: T.accent, borderRadius: 2, transition: "width .05s" }} />
            </div>
            <span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono, whiteSpace: "nowrap" }}>{playTimeFmt} / {String(Math.floor(totalDur / 60)).padStart(2, "0")}:{String(totalDur % 60).padStart(2, "0")}</span>
            <button onClick={startRecord} disabled={s.isRecording} style={{ ...SS.btnO, fontSize: 10, padding: "5px 10px", background: s.isRecording ? `${T.red}14` : "transparent", color: s.isRecording ? T.red : T.muted, borderColor: s.isRecording ? `${T.red}44` : T.border }}>
              {s.isRecording ? `⏺ ${s.recordPct}%` : "⏺ WebM 녹화"}
            </button>
            {s.isRecording && <div style={{ flex: 1, height: 2, background: T.border, borderRadius: 1, overflow: "hidden" }}><div style={{ height: "100%", width: `${s.recordPct}%`, background: T.red, transition: "width .3s" }} /></div>}
          </div>
          {/* TTS settings panel */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: T.muted, letterSpacing: 2 }}>🎙 TTS 음성</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => { set("ttsMode", "web"); localStorage.setItem("TTS_MODE", "web"); }} style={{ ...SS.btnO, fontSize: 9, padding: "3px 8px", background: s.ttsMode === "web" ? `${T.muted}22` : "transparent", color: s.ttsMode === "web" ? T.text : T.muted, borderColor: s.ttsMode === "web" ? `${T.muted}55` : T.border }}>기본</button>
                <button onClick={() => { set("ttsMode", "google"); localStorage.setItem("TTS_MODE", "google"); }} style={{ ...SS.btnO, fontSize: 9, padding: "3px 8px", background: s.ttsMode === "google" ? `${T.blue}22` : "transparent", color: s.ttsMode === "google" ? T.blue : T.muted, borderColor: s.ttsMode === "google" ? `${T.blue}55` : T.border }}>Google TTS</button>
                <button onClick={() => { set("ttsMode", "elevenlabs"); localStorage.setItem("TTS_MODE", "elevenlabs"); }} style={{ ...SS.btnO, fontSize: 9, padding: "3px 8px", background: s.ttsMode === "elevenlabs" ? `${T.orange}22` : "transparent", color: s.ttsMode === "elevenlabs" ? T.orange : T.muted, borderColor: s.ttsMode === "elevenlabs" ? `${T.orange}55` : T.border }}>ElevenLabs</button>
              </div>
            </div>
            {s.ttsMode === "web" && koreanVoices.length > 0 && (
              <select value={s.ttsVoiceName} onChange={e => set("ttsVoiceName", e.target.value)} style={{ ...SS.sel, fontSize: 10, padding: "5px 8px" }}>
                <option value="">기본 한국어 음성</option>
                {koreanVoices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
              </select>
            )}
            {s.ttsMode === "google" && <>
              <input placeholder="Google Cloud API Key" type="password" value={s.googleApiKey} onChange={e => { set("googleApiKey", e.target.value); localStorage.setItem("GOOGLE_API_KEY", e.target.value); }} style={{ ...SS.inp, fontSize: 10, padding: "5px 8px" }} />
              <select value={s.googleVoice} onChange={e => { set("googleVoice", e.target.value); localStorage.setItem("GOOGLE_VOICE", e.target.value); }} style={{ ...SS.sel, fontSize: 10, padding: "5px 8px" }}>
                {GoogleTTSEngine.VOICES.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 9, color: T.muted, whiteSpace: "nowrap", width: 32 }}>속도</span>
                <input type="range" min="0.70" max="1.05" step="0.01" value={s.googleRate || 0.87}
                  onChange={e => { const v = parseFloat(e.target.value); set("googleRate", v); ttsRef.current.google.speakingRate = v; }}
                  style={{ flex: 1, accentColor: T.accent, height: 3 }} />
                <span style={{ fontSize: 9, color: T.accent, fontFamily: "monospace", width: 30, textAlign: "right" }}>{(s.googleRate || 0.87).toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 9, color: T.muted, whiteSpace: "nowrap", width: 32 }}>피치</span>
                <input type="range" min="-5.0" max="3.0" step="0.5" value={s.googlePitch || -1.5}
                  onChange={e => { const v = parseFloat(e.target.value); set("googlePitch", v); ttsRef.current.google.pitch = v; }}
                  style={{ flex: 1, accentColor: T.accent, height: 3 }} />
                <span style={{ fontSize: 9, color: T.accent, fontFamily: "monospace", width: 30, textAlign: "right" }}>{(s.googlePitch || -1.5).toFixed(1)}</span>
              </div>
              <div style={{ fontSize: 8, color: T.muted, lineHeight: 1.5 }}>
                씬 타입별 자동 톤 조절 적용 (opening 차분 → headline 단호 → closing 무게감)
              </div>
            </>}
            {s.ttsMode === "elevenlabs" && (
              <div style={{ display: "flex", gap: 6 }}>
                <input placeholder="API Key" type="password" value={s.elevenApiKey} onChange={e => { set("elevenApiKey", e.target.value); localStorage.setItem("ELEVENLABS_API_KEY", e.target.value); }} style={{ ...SS.inp, fontSize: 10, padding: "5px 8px", flex: 1 }} />
                <input placeholder="Voice ID" value={s.elevenVoiceId} onChange={e => { set("elevenVoiceId", e.target.value); localStorage.setItem("ELEVENLABS_VOICE_ID", e.target.value); }} style={{ ...SS.inp, fontSize: 10, padding: "5px 8px", flex: 1 }} />
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { if (s.scenes?.[s.selectedScene]) ttsRef.current.speakScene(s.scenes[s.selectedScene]); }} style={{ ...SS.btnO, fontSize: 10, padding: "4px 10px", flex: 1 }}>🔊 현재 씬 미리듣기</button>
              <button onClick={() => ttsRef.current.stop()} style={{ ...SS.btnO, fontSize: 10, padding: "4px 10px", color: T.red, borderColor: `${T.red}44` }}>⏹ 정지</button>
            </div>
          </div>
          <div style={{ background: "#B91C1C", borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center" }}>
            <div style={{ background: T.accent, color: "#080B10", fontSize: 9, fontWeight: 900, padding: "5px 11px", letterSpacing: 1, flexShrink: 0 }}>BREAKING</div>
            <div style={{ overflow: "hidden", flex: 1 }}><div style={{ fontSize: 10, color: "#fff", whiteSpace: "nowrap", padding: "0 14px", animation: "tickerScroll 18s linear infinite" }}>{s.topic} · NEWS HARNESS PRO · AI 멀티에이전트 자동화 · LIVE · {s.topic} · BREAKING ·</div></div>
          </div>
        </>}
        {s.tab === "code" && <div style={{ flex: 1, background: "#060810", border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", borderBottom: `1px solid ${T.border}`, background: "#0C1018" }}>
            <span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono }}>output/scenes/video.tsx</span>
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={() => navigator.clipboard.writeText(s.remotionCode)} style={{ ...SS.btnO, fontSize: 10, padding: "3px 9px" }}>복사</button>
              <button onClick={() => dlBlob(s.remotionCode, "video.tsx", "text/plain")} style={{ ...SS.btnO, fontSize: 10, padding: "3px 9px", color: T.accent, borderColor: `${T.accent}44` }}>↓</button>
            </div>
          </div>
          <pre style={{ flex: 1, margin: 0, padding: 14, overflowY: "auto", fontSize: 10.5, lineHeight: 1.8, fontFamily: T.mono, color: "#8A9BB0", whiteSpace: "pre-wrap" }}>{s.remotionCode || "대본 생성 후 표시됩니다."}</pre>
        </div>}
        {s.tab === "qa" && s.qaReport && <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, padding: "12px 14px", background: s.qaReport.pass ? `${T.green}10` : `${T.orange}10`, border: `1px solid ${s.qaReport.pass ? T.green + "33" : T.orange + "33"}`, borderRadius: 8 }}>
            <span style={{ fontSize: 22 }}>{s.qaReport.pass ? "✅" : "⚠️"}</span>
            <div><div style={{ fontSize: 14, fontWeight: 700, color: s.qaReport.pass ? T.green : T.orange }}>QA {s.qaReport.pass ? "PASS" : "REVIEW"} — {s.qaReport.score}/{s.qaReport.total}</div><div style={{ fontSize: 11, color: T.muted }}>통과 기준: 24/26</div></div>
          </div>
          {s.qaReport.categories.map(cat => (
            <div key={cat.cat} style={{ ...SS.card }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 10 }}>{cat.cat}</div>
              {cat.items.map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 13 }}>{item.status}</span>
                  <span style={{ fontSize: 11.5, color: T.text }}>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>}
        {s.tab === "research" && <div style={{ flex: 1, background: "#060810", border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, marginBottom: 10 }}>Agent-A 리서치 결과</div>
          <pre style={{ margin: 0, fontSize: 11, lineHeight: 1.85, fontFamily: T.mono, color: "#8A9BB0", whiteSpace: "pre-wrap" }}>{s.researchData || "없음"}</pre>
        </div>}
      </div>
      {/* Scene list panel */}
      <div style={{ width: 220, borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ padding: "10px 13px", borderBottom: `1px solid ${T.border}`, fontSize: 10, color: T.muted, letterSpacing: 2 }}>씬 목록</div>
        {(s.scenes || []).map((sc, i) => (
          <div key={i} onClick={() => { set("selectedScene", i); rendRef.current?.seek(s.scenes.slice(0, i).reduce((a, x) => a + x.duration * 30, 0)); }}
            style={{ padding: "9px 13px", borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: s.selectedScene === i ? `${T.accent}08` : "transparent", borderLeft: `3px solid ${s.selectedScene === i ? T.accent : "transparent"}`, transition: "all .15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: T.accent, fontFamily: T.mono, fontWeight: 700 }}>SC{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 8, background: `${SC_ACC[sc.type] || T.accent}20`, color: SC_ACC[sc.type] || T.accent, padding: "1px 5px", borderRadius: 3 }}>{sc.type}</span>
              <span style={{ fontSize: 8, color: T.muted, marginLeft: "auto" }}>{sc.duration}s</span>
            </div>
            <div style={{ fontSize: 10.5, color: T.text, fontWeight: 600, marginBottom: 3 }}>{sc.title}</div>
            <select value={sc.transition || "fade"} onChange={e => { e.stopPropagation(); d({ type: "SU", i, d: { transition: e.target.value } }); if (rendRef.current) { rendRef.current.scenes = s.scenes; rendRef.current.draw(); } }} onClick={e => e.stopPropagation()}
              style={{ width: "100%", background: "#060810", border: `1px solid ${T.border}`, borderRadius: 4, color: T.blue, fontSize: 8.5, padding: "2px 4px", marginTop: 3, fontFamily: T.mono, outline: "none" }}>
              {TRANS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        ))}
        <div style={{ padding: "12px 13px", borderTop: `1px solid ${T.border}`, marginTop: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px", background: "#060810", borderRadius: 8, border: `1px solid ${T.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#2a3a5a,#1a2540)", border: `2px solid ${T.accent}`, animation: "pulse 2s ease infinite" }} />
            <div style={{ fontSize: 9.5, color: T.accent, fontWeight: 700 }}>{s.anchor}</div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.green, animation: "blink 1.2s infinite" }} />
              <span style={{ fontSize: 8.5, color: T.green }}>ON AIR</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
