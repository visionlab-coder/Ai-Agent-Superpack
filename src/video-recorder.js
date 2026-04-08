/**
 * video-recorder.js
 * VIDEO HARNESS PRO — 실제 WebM/MP4 캔버스 녹화 유틸리티
 *
 * 브라우저 MediaRecorder API를 사용하여
 * Canvas 스트림을 실제 WebM 파일로 저장합니다.
 */

export class HarnessRecorder {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.fps = opts.fps || 30;
    this.bitrate = opts.bitrate || 5_000_000; // 5 Mbps
    this.mimeType = this._detectMime();
    this.chunks = [];
    this.recorder = null;
    this.onProgress = opts.onProgress || (() => {});
    this.onComplete = opts.onComplete || (() => {});
    this.onError = opts.onError || console.error;
  }

  _detectMime() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    return candidates.find(m => MediaRecorder.isTypeSupported(m)) || "video/webm";
  }

  async record(renderer, totalDuration) {
    return new Promise((resolve, reject) => {
      try {
        const stream = this.canvas.captureStream(this.fps);

        // 오디오 컨텍스트에서 무음 트랙 추가 (코덱 호환성)
        try {
          const audioCtx = new AudioContext();
          const dest = audioCtx.createMediaStreamDestination();
          audioCtx.createOscillator().connect(dest); // 무음 오실레이터
          stream.addTrack(dest.stream.getAudioTracks()[0]);
        } catch (_) { /* 오디오 없이 진행 */ }

        this.recorder = new MediaRecorder(stream, {
          mimeType: this.mimeType,
          videoBitsPerSecond: this.bitrate,
        });

        this.chunks = [];
        this.recorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) this.chunks.push(e.data);
        };

        this.recorder.onstop = () => {
          const blob = new Blob(this.chunks, { type: this.mimeType });
          resolve(blob);
        };

        this.recorder.onerror = e => {
          this.onError("MediaRecorder 오류: " + e.error);
          reject(e.error);
        };

        this.recorder.start(200); // 200ms 청크

        // 프레임별 렌더링 루프
        const totalFrames = Math.round(totalDuration * this.fps);
        let frame = 0;
        const frameInterval = 1000 / this.fps;

        renderer.seek(0);

        const loop = setInterval(() => {
          if (frame >= totalFrames) {
            clearInterval(loop);
            this.recorder.stop();
            return;
          }
          renderer.seek(frame);
          this.onProgress(Math.round((frame / totalFrames) * 100));
          frame++;
        }, frameInterval);

      } catch (e) {
        this.onError(e.message);
        reject(e);
      }
    });
  }

  stop() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
  }

  static download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  static formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
}
