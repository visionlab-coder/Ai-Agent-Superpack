/**
 * tts-engine.js — VIDEO HARNESS PRO TTS 엔진
 *
 * 2가지 모드:
 *   1. Web Speech API (무료, 시스템 음성)
 *   2. ElevenLabs (유료, 음성 클론)
 *
 * 사용법:
 *   const tts = new TTSEngine({ mode: "web" });
 *   await tts.speakScene(scene);         // 프리뷰 실시간 재생
 *   const blob = await tts.generate(scene); // 녹화용 오디오 생성
 */

// ══ Web Speech API 엔진 ══════════════════════════════════
class WebSpeechEngine {
  constructor(opts = {}) {
    this.rate = opts.rate || 0.93;
    this.pitch = opts.pitch || 1.0;
    this.volume = opts.volume || 1.0;
    this.lang = opts.lang || "ko-KR";
    this.voiceName = opts.voiceName || "";
    this._synth = window.speechSynthesis;
    this._currentUtterance = null;
    this._resumeTimer = null;
  }

  getVoices() {
    return this._synth.getVoices().filter(v => v.lang.startsWith("ko"));
  }

  // Chrome 버그 우회: 15초 이상 utterance 중단 방지
  _startResumeWorkaround() {
    this._clearResumeWorkaround();
    this._resumeTimer = setInterval(() => {
      if (this._synth.speaking && !this._synth.paused) {
        this._synth.pause();
        this._synth.resume();
      }
    }, 10000);
  }

  _clearResumeWorkaround() {
    if (this._resumeTimer) {
      clearInterval(this._resumeTimer);
      this._resumeTimer = null;
    }
  }

  _pickVoice() {
    const voices = this.getVoices();
    if (this.voiceName) {
      const match = voices.find(v => v.name === this.voiceName);
      if (match) return match;
    }
    // 한국어 음성 우선, 없으면 null (브라우저 기본 사용)
    return voices.length > 0 ? voices[0] : null;
  }

  speak(text) {
    return new Promise((resolve, reject) => {
      this.stop();

      // 긴 텍스트를 문장 단위로 분할 (Chrome 15초 제한 우회)
      const sentences = text.match(/[^.!?。]+[.!?。]?/g) || [text];
      const chunks = [];
      let current = "";
      for (const s of sentences) {
        if ((current + s).length > 150) {
          if (current.trim()) chunks.push(current.trim());
          current = s;
        } else {
          current += s;
        }
      }
      if (current.trim()) chunks.push(current.trim());

      const voice = this._pickVoice();
      let idx = 0;

      const speakNext = () => {
        if (idx >= chunks.length) {
          this._clearResumeWorkaround();
          this._currentUtterance = null;
          resolve();
          return;
        }

        const u = new SpeechSynthesisUtterance(chunks[idx]);
        u.lang = this.lang;
        u.rate = this.rate;
        u.pitch = this.pitch;
        u.volume = this.volume;
        if (voice) u.voice = voice;

        u.onend = () => { idx++; speakNext(); };
        u.onerror = (e) => {
          this._clearResumeWorkaround();
          this._currentUtterance = null;
          // "interrupted" 에러는 stop() 호출 시 정상 동작
          if (e.error === "interrupted" || e.error === "canceled") {
            resolve();
          } else {
            reject(e);
          }
        };

        this._currentUtterance = u;
        this._synth.speak(u);
      };

      this._startResumeWorkaround();
      speakNext();
    });
  }

  stop() {
    this._clearResumeWorkaround();
    this._synth.cancel();
    this._currentUtterance = null;
  }

  async generateAudioBlob(text) {
    // Web Speech API는 직접 Blob 생성 불가
    // AudioContext + MediaRecorder로 캡처
    return new Promise((resolve, reject) => {
      try {
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        const recorder = new MediaRecorder(dest.stream, { mimeType: "audio/webm;codecs=opus" });
        const chunks = [];

        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          audioCtx.close();
          resolve(new Blob(chunks, { type: "audio/webm" }));
        };

        // 시스템 오디오를 캡처하기 위한 우회: 직접 speak + 타이머
        const u = new SpeechSynthesisUtterance(text);
        u.lang = this.lang;
        u.rate = this.rate;
        u.pitch = this.pitch;
        u.volume = this.volume;

        const voices = this.getVoices();
        if (this.voiceName) {
          const match = voices.find(v => v.name === this.voiceName);
          if (match) u.voice = match;
        } else if (voices.length > 0) {
          u.voice = voices[0];
        }

        recorder.start(100);

        u.onend = () => {
          setTimeout(() => recorder.stop(), 200);
        };
        u.onerror = (e) => {
          recorder.stop();
          reject(e);
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) {
        reject(e);
      }
    });
  }
}

// ══ Google Cloud TTS 엔진 ════════════════════════════════
// 실제 뉴스 앵커 특성:
//   - 속도: 분당 280~320자 (일반 대화 350~400자 대비 느림)
//   - 피치: 약간 낮은 베이스, 문장 끝에서 하강
//   - 톤: 또박또박, 권위감, 신뢰감
class GoogleTTSEngine {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || "";
    this.voiceName = opts.voiceName || "ko-KR-Neural2-C";
    this.speakingRate = opts.speakingRate || 0.87;  // 앵커 속도 (0.85~0.90)
    this.pitch = opts.pitch || -1.5;                // 약간 낮은 톤 (권위감)
    this.audioEncoding = "MP3";
    this._currentAudio = null;
    this.useSSML = opts.useSSML !== false;           // SSML 기본 활성화
  }

  // 한국어 음성 목록 — 남성 우선, 고품질순 정렬
  static VOICES = [
    // ── 남성 (앵커 추천) ──
    { name: "ko-KR-Neural2-C", label: "★ Neural2-C (남성, 뉴스 앵커)", gender: "MALE", tier: "neural2" },
    { name: "ko-KR-Wavenet-C", label: "Wavenet-C (남성, 중후한 톤)", gender: "MALE", tier: "wavenet" },
    { name: "ko-KR-Wavenet-D", label: "Wavenet-D (남성, 밝은 톤)", gender: "MALE", tier: "wavenet" },
    { name: "ko-KR-Standard-C", label: "Standard-C (남성, 기본)", gender: "MALE", tier: "standard" },
    { name: "ko-KR-Standard-D", label: "Standard-D (남성, 기본2)", gender: "MALE", tier: "standard" },
    // ── 여성 ──
    { name: "ko-KR-Neural2-A", label: "Neural2-A (여성, 차분한 리포터)", gender: "FEMALE", tier: "neural2" },
    { name: "ko-KR-Neural2-B", label: "Neural2-B (여성, 밝은 앵커)", gender: "FEMALE", tier: "neural2" },
    { name: "ko-KR-Wavenet-A", label: "Wavenet-A (여성, 부드러움)", gender: "FEMALE", tier: "wavenet" },
    { name: "ko-KR-Wavenet-B", label: "Wavenet-B (여성, 명확함)", gender: "FEMALE", tier: "wavenet" },
    { name: "ko-KR-Standard-A", label: "Standard-A (여성, 기본)", gender: "FEMALE", tier: "standard" },
    { name: "ko-KR-Standard-B", label: "Standard-B (여성, 기본2)", gender: "FEMALE", tier: "standard" },
  ];

  // 앵커 프리셋 — 씬 타입별 속도/피치 미세 조정
  static ANCHOR_PRESETS = {
    opening:  { rate: 0.87, pitch: -1.0, breakBefore: "500ms" },   // 오프닝: 차분한 시작
    headline: { rate: 0.90, pitch: -1.5, breakBefore: "300ms" },   // 헤드라인: 약간 빠르게, 단호
    data:     { rate: 0.85, pitch: -1.0, breakBefore: "400ms" },   // 데이터: 느리게, 숫자 강조
    analysis: { rate: 0.86, pitch: -2.0, breakBefore: "400ms" },   // 분석: 깊은 톤
    expert:   { rate: 0.88, pitch: -1.0, breakBefore: "300ms" },   // 전문가: 신뢰감
    field:    { rate: 0.90, pitch: -0.5, breakBefore: "300ms" },   // 현장: 약간 생동감
    closing:  { rate: 0.84, pitch: -1.5, breakBefore: "600ms" },   // 클로징: 느리고 무게감
  };

  // 텍스트 → SSML 변환 (앵커 스타일)
  _toSSML(text, sceneType) {
    const preset = GoogleTTSEngine.ANCHOR_PRESETS[sceneType] || {};
    const breakMs = preset.breakBefore || "300ms";

    // 문장 분리 후 사이에 짧은 포즈 삽입 (앵커 호흡)
    const sentences = text.match(/[^.!?。]+[.!?。]+/g) || [text];
    const ssmlBody = sentences.map((s, i) => {
      const trimmed = s.trim();
      if (i === 0) return trimmed;
      return `<break time="350ms"/>${trimmed}`;
    }).join(" ");

    return `<speak><break time="${breakMs}"/>${ssmlBody}<break time="500ms"/></speak>`;
  }

  async generateAudioBlob(text, sceneType) {
    if (!this.apiKey) throw new Error("Google Cloud API 키가 필요합니다.");

    const preset = GoogleTTSEngine.ANCHOR_PRESETS[sceneType] || {};
    const rate = preset.rate || this.speakingRate;
    const pitch = preset.pitch || this.pitch;

    const input = this.useSSML
      ? { ssml: this._toSSML(text, sceneType) }
      : { text };

    const r = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          voice: {
            languageCode: "ko-KR",
            name: this.voiceName,
          },
          audioConfig: {
            audioEncoding: this.audioEncoding,
            speakingRate: rate,
            pitch,
            volumeGainDb: 1.0,
            effectsProfileId: ["headphone-class-device"],
          },
        }),
      }
    );

    const data = await r.json();
    if (data.error) throw new Error(data.error.message || `Google TTS 오류: ${data.error.code}`);

    const binary = atob(data.audioContent);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: "audio/mp3" });
  }

  async speak(text, sceneType) {
    this.stop();
    const blob = await this.generateAudioBlob(text, sceneType);
    const url = URL.createObjectURL(blob);
    this._currentAudio = new Audio(url);
    return new Promise((resolve, reject) => {
      this._currentAudio.onended = () => { URL.revokeObjectURL(url); this._currentAudio = null; resolve(); };
      this._currentAudio.onerror = (e) => { URL.revokeObjectURL(url); this._currentAudio = null; reject(e); };
      this._currentAudio.play();
    });
  }

  stop() {
    if (this._currentAudio) {
      this._currentAudio.pause();
      this._currentAudio = null;
    }
  }
}

// ══ ElevenLabs 엔진 ══════════════════════════════════════
class ElevenLabsEngine {
  constructor(opts = {}) {
    this.apiKey = opts.apiKey || "";
    this.voiceId = opts.voiceId || "";
    this.modelId = opts.modelId || "eleven_multilingual_v2";
    this.stability = opts.stability || 0.5;
    this.similarityBoost = opts.similarityBoost || 0.75;
  }

  async generateAudioBlob(text) {
    if (!this.apiKey) throw new Error("ElevenLabs API 키가 필요합니다.");
    if (!this.voiceId) throw new Error("ElevenLabs Voice ID가 필요합니다.");

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": this.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: this.modelId,
        voice_settings: {
          stability: this.stability,
          similarity_boost: this.similarityBoost,
        },
      }),
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.detail?.message || `ElevenLabs 오류: ${r.status}`);
    }

    return await r.blob();
  }

  async speak(text) {
    const blob = await this.generateAudioBlob(text);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    return new Promise((resolve, reject) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
      audio.play();
    });
  }

  stop() {
    // ElevenLabs는 서버 생성이라 진행 중 취소 불가
  }
}

// ══ 통합 TTS 엔진 ═══════════════════════════════════════
export { GoogleTTSEngine };

export class TTSEngine {
  constructor(opts = {}) {
    this.mode = opts.mode || "web"; // "web" | "google" | "elevenlabs"
    this.web = new WebSpeechEngine(opts.web || {});
    this.google = new GoogleTTSEngine(opts.google || {});
    this.elevenlabs = new ElevenLabsEngine(opts.elevenlabs || {});
    this._audioElements = [];
    this._isPlaying = false;
  }

  get engine() {
    if (this.mode === "google") return this.google;
    if (this.mode === "elevenlabs") return this.elevenlabs;
    return this.web;
  }

  setMode(mode) {
    this.mode = mode;
  }

  updateConfig(opts) {
    if (opts.web) Object.assign(this.web, opts.web);
    if (opts.google) Object.assign(this.google, opts.google);
    if (opts.elevenlabs) Object.assign(this.elevenlabs, opts.elevenlabs);
    if (opts.mode) this.mode = opts.mode;
  }

  // 씬 하나의 narration을 실시간 재생 (씬 타입별 톤 조절)
  async speakScene(scene) {
    if (!scene?.narration) return;
    this._isPlaying = true;
    try {
      await this.engine.speak(scene.narration, scene.type);
    } finally {
      this._isPlaying = false;
    }
  }

  // 모든 씬의 narration을 순차 재생 (씬 타입별 톤 자동 전환)
  async speakAll(scenes, onSceneStart) {
    this._isPlaying = true;
    for (let i = 0; i < scenes.length; i++) {
      if (!this._isPlaying) break;
      if (onSceneStart) onSceneStart(i);
      await this.engine.speak(scenes[i].narration, scenes[i].type);
      // 씬 전환 간격 (앵커 호흡)
      await new Promise(r => setTimeout(r, 400));
    }
    this._isPlaying = false;
  }

  // 씬별 오디오 Blob 배열 생성 (녹화용, 씬 타입별 톤 적용)
  async generateAll(scenes, onProgress) {
    const blobs = [];
    for (let i = 0; i < scenes.length; i++) {
      if (onProgress) onProgress(i, scenes.length);
      const blob = await this.engine.generateAudioBlob(scenes[i].narration, scenes[i].type);
      blobs.push(blob);
    }
    return blobs;
  }

  stop() {
    this._isPlaying = false;
    this.web.stop();
  }

  // 한국어 음성 목록 (Web Speech API 전용)
  getKoreanVoices() {
    return this.web.getVoices();
  }
}

// ══ 오디오 유틸리티 ═══════════════════════════════════════

// Audio blob을 AudioBuffer로 디코딩
export async function decodeAudioBlob(blob) {
  const ctx = new AudioContext();
  const buf = await blob.arrayBuffer();
  const decoded = await ctx.decodeAudioData(buf);
  ctx.close();
  return decoded;
}

// 씬별 오디오를 하나의 타임라인으로 합성하여 재생
export function playAudioTimeline(audioBlobs, scenes, onEnd) {
  const ctx = new AudioContext();
  let startTime = ctx.currentTime;

  const sources = [];
  let loadedCount = 0;

  audioBlobs.forEach((blob, i) => {
    blob.arrayBuffer().then(buf => ctx.decodeAudioData(buf)).then(decoded => {
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);

      const offset = scenes.slice(0, i).reduce((a, sc) => a + sc.duration, 0);
      source.start(startTime + offset);
      sources.push(source);

      loadedCount++;
      if (loadedCount === audioBlobs.length) {
        const totalDur = scenes.reduce((a, sc) => a + sc.duration, 0);
        setTimeout(() => {
          ctx.close();
          if (onEnd) onEnd();
        }, totalDur * 1000 + 500);
      }
    });
  });

  return {
    stop: () => {
      sources.forEach(s => { try { s.stop(); } catch (_) {} });
      ctx.close();
    }
  };
}
