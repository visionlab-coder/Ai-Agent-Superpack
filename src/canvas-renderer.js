/**
 * canvas-renderer.js — Canvas Renderer for VIDEO HARNESS PRO
 * Extracted from App.jsx to reduce monolithic file size.
 * Pure Canvas 2D rendering class — no React dependency.
 */

// ─── Design Tokens ──────────────────────────────────────
const T = {
  bg:"#080B10",panel:"#0F1318",panel2:"#131820",
  border:"#1C2330",border2:"#243040",
  accent:"#E8C547",blue:"#60A5FA",green:"#10B981",
  red:"#EF4444",purple:"#A78BFA",orange:"#F59E0B",cyan:"#34D399",
  text:"#CDD5E0",muted:"#3D4A5C",muted2:"#4A5568",
  font:"'Apple SD Gothic Neo','Malgun Gothic',sans-serif",
  mono:"'JetBrains Mono','Fira Code',monospace",
};

// ─── Scene-type accent colors ───────────────────────────
const SC_ACC = {
  opening:"#60A5FA",headline:"#EF4444",data:"#10B981",
  analysis:"#A78BFA",expert:"#F59E0B",field:"#34D399",closing:"#E8C547",
};

// ─── Scene-type color palettes for gradient overlays ────
const SC_GRAD = {
  opening:  ["rgba(14,40,90,.75)", "rgba(8,11,16,.92)"],
  headline: ["rgba(120,20,20,.70)", "rgba(8,11,16,.92)"],
  data:     ["rgba(10,70,50,.68)", "rgba(8,11,16,.92)"],
  analysis: ["rgba(60,30,100,.70)", "rgba(8,11,16,.92)"],
  expert:   ["rgba(90,60,10,.65)", "rgba(8,11,16,.92)"],
  field:    ["rgba(10,80,60,.65)", "rgba(8,11,16,.92)"],
  closing:  ["rgba(80,70,20,.65)", "rgba(8,11,16,.92)"],
};

// ─── Scene-type icons ───────────────────────────────────
const SC_ICONS = {
  opening: "◈", headline: "!", data: "◉", analysis: "◎",
  expert: "✦", field: "◆", closing: "◇",
};

class Renderer {
  constructor(canvas, scenes, imgMap, opts = {}) {
    this.cv = canvas;
    this.cx = canvas.getContext("2d");
    this.scenes = scenes;
    this.imgs = imgMap || new Map();
    this.W = canvas.width;
    this.H = canvas.height;
    this.fps = opts.fps || 30;
    this.frame = 0;
    this.playing = false;
    this.totalF = scenes.reduce((a, s) => a + s.duration * this.fps, 0);
    this.onUpdate = opts.onUpdate || (_ => _);
    this.aid = null;
  }

  sc(f) {
    let e = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      const sf = this.scenes[i].duration * this.fps;
      if (f < e + sf) return { s: this.scenes[i], lf: f - e, tf: sf, idx: i };
      e += sf;
    }
    const li = this.scenes.length - 1;
    return { s: this.scenes[li], lf: 0, tf: this.scenes[li].duration * this.fps, idx: li };
  }

  ease(t) { return 1 - Math.pow(1 - t, 3); }
  easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Extract numbers from narration text for data scenes
  _extractNumbers(text) {
    if (!text) return [];
    const matches = text.match(/[\d,]+\.?\d*\s*(%|억|만|천|조|건|명|개|원|달러|배|위|년)/g) || [];
    return matches.slice(0, 4).map(m => {
      const num = m.match(/[\d,]+\.?\d*/)?.[0] || "";
      const unit = m.replace(/[\d,.\s]+/, "");
      return { num, unit, raw: m };
    });
  }

  // Extract keywords for analysis flow diagram
  _extractFlowKeywords(s) {
    const kws = s.keywords || [];
    if (kws.length >= 2) return kws.slice(0, 4);
    const words = (s.narration || s.title || "").replace(/[^가-힣a-zA-Z\s]/g, " ").split(/\s+/).filter(w => w.length >= 2);
    return [...new Set(words)].slice(0, 4);
  }

  draw(f = this.frame) {
    const { s, lf, tf, idx } = this.sc(f % (this.totalF || 1));
    const { cx: c, W, H } = this;
    const t = this.ease(Math.min(1, lf / (this.fps * 0.55)));
    const prog = lf / tf;
    const TR = Math.round(this.fps * 0.4);
    c.clearRect(0, 0, W, H);

    // ═══ Background with scene-type-specific gradient overlays ═══
    const img = this.imgs.get(idx);
    if (img) {
      const ia = img.naturalWidth / img.naturalHeight, ca = W / H;
      let sw, sh, sx, sy;
      if (ia > ca) { sh = H; sw = H * ia; sx = (W - sw) / 2; sy = 0; }
      else { sw = W; sh = W / ia; sx = 0; sy = (H - sh) / 2; }
      const zoom = 1 + prog * 0.04;
      c.save();
      c.translate(W / 2, H / 2);
      c.scale(zoom, zoom);
      c.translate(-W / 2, -H / 2);
      c.drawImage(img, sx, sy, sw, sh);
      c.restore();
      // Scene-type-specific color grading overlay
      const gradColors = SC_GRAD[s.type] || SC_GRAD.opening;
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, gradColors[0]);
      g.addColorStop(0.35, "rgba(0,0,0,.22)");
      g.addColorStop(0.65, "rgba(0,0,0,.35)");
      g.addColorStop(1, gradColors[1]);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      // Subtle vignette
      const vg = c.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
      vg.addColorStop(0, "transparent");
      vg.addColorStop(1, "rgba(0,0,0,.45)");
      c.fillStyle = vg;
      c.fillRect(0, 0, W, H);
    } else {
      const g = c.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, s.bg || "#0D1525");
      g.addColorStop(0.5, "#0A101A");
      g.addColorStop(1, "#050810");
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      // Subtle radial glow from scene accent
      const ac0 = s.accent || SC_ACC[s.type] || T.accent;
      const rg = c.createRadialGradient(W * 0.35, H * 0.45, 0, W * 0.35, H * 0.45, W * 0.5);
      rg.addColorStop(0, ac0 + "0A");
      rg.addColorStop(1, "transparent");
      c.fillStyle = rg;
      c.fillRect(0, 0, W, H);
      this._viz(s, prog, lf);
    }

    // ═══ Grid (subtle scan lines for broadcast feel) ═══
    c.strokeStyle = "rgba(255,255,255,.015)";
    c.lineWidth = 0.5;
    for (let y = 0; y < H; y += 3) {
      c.globalAlpha = 0.03;
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    c.globalAlpha = 1;
    // Larger grid
    c.strokeStyle = "rgba(255,255,255,.012)";
    for (let x = 0; x < W; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (let y = 0; y < H; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    // ═══ Transition (improved) ═══
    if (lf < TR) {
      const tp = this.easeInOut(lf / TR);
      c.save();
      const tr = s.transition || "fade";
      if (tr === "fade") {
        c.fillStyle = `rgba(0,0,0,${1 - tp})`;
        c.fillRect(0, 0, W, H);
      } else if (tr === "wipe-left") {
        // Soft-edge wipe
        const edge = W * 0.08;
        const wx = W * tp;
        c.fillStyle = "rgba(0,0,0,.95)";
        c.fillRect(wx, 0, W - wx, H);
        const wg = c.createLinearGradient(wx - edge, 0, wx, 0);
        wg.addColorStop(0, "transparent");
        wg.addColorStop(1, "rgba(0,0,0,.95)");
        c.fillStyle = wg;
        c.fillRect(wx - edge, 0, edge, H);
      } else if (tr === "wipe-right") {
        const edge = W * 0.08;
        const wx = W * (1 - tp);
        c.fillStyle = "rgba(0,0,0,.95)";
        c.fillRect(0, 0, wx, H);
        const wg = c.createLinearGradient(wx, 0, wx + edge, 0);
        wg.addColorStop(0, "rgba(0,0,0,.95)");
        wg.addColorStop(1, "transparent");
        c.fillStyle = wg;
        c.fillRect(wx, 0, edge, H);
      } else if (tr === "zoom-in") {
        const sc2 = 1 + (1 - tp) * 0.15;
        const blur = (1 - tp) * 0.5;
        c.globalAlpha = tp;
        c.translate(W / 2, H / 2);
        c.scale(sc2, sc2);
        c.translate(-W / 2, -H / 2);
      } else if (tr === "zoom-out") {
        const sc2 = tp * 0.15 + 0.85;
        c.globalAlpha = tp;
        c.translate(W / 2, H / 2);
        c.scale(sc2, sc2);
        c.translate(-W / 2, -H / 2);
      } else if (tr === "slide-up") {
        c.fillStyle = "rgba(0,0,0,.95)";
        c.fillRect(0, 0, W, H * (1 - tp));
      } else if (tr === "slide-down") {
        c.fillStyle = "rgba(0,0,0,.95)";
        c.fillRect(0, H * tp, W, H * (1 - tp));
      } else if (tr === "flash") {
        if (tp < 0.3) {
          c.fillStyle = `rgba(255,255,255,${(1 - tp / 0.3) * 0.8})`;
          c.fillRect(0, 0, W, H);
        }
      } else {
        c.fillStyle = `rgba(0,0,0,${1 - tp})`;
        c.fillRect(0, 0, W, H);
      }
      c.restore();
    }

    // ═══ Top bar (broadcast header) ═══
    const BH = Math.round(H * 0.075);
    // Gradient bar background
    const tbg = c.createLinearGradient(0, 0, 0, BH);
    tbg.addColorStop(0, "rgba(0,0,0,.92)");
    tbg.addColorStop(1, "rgba(0,0,0,.75)");
    c.fillStyle = tbg;
    c.fillRect(0, 0, W, BH);
    // Bottom edge line
    c.fillStyle = T.accent + "40";
    c.fillRect(0, BH - 1, W, 1);
    // Accent sidebar
    c.fillStyle = T.accent;
    c.fillRect(10, 6, 3, BH - 12);
    c.fillStyle = T.accent;
    c.font = `bold ${Math.round(H * 0.026)}px monospace`;
    c.textAlign = "left";
    c.fillText("LIVE", 20, BH * 0.68);
    c.fillStyle = "rgba(255,255,255,.35)";
    c.font = `${Math.round(H * 0.020)}px monospace`;
    c.fillText("NEWS HARNESS PRO", Math.round(W * 0.075), BH * 0.68);
    c.fillStyle = "rgba(255,255,255,.55)";
    c.textAlign = "right";
    c.font = `${Math.round(H * 0.020)}px monospace`;
    c.fillText(new Date().toLocaleTimeString("ko-KR"), W - 14, BH * 0.68);

    // ON AIR blinking indicator
    if (Math.sin(lf * 0.14) > 0) {
      const oaX = W - 0.09 * W;
      c.fillStyle = "#EF4444";
      c.beginPath(); c.arc(oaX, BH / 2, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#EF4444";
      c.font = `bold ${Math.round(H * 0.018)}px monospace`;
      c.textAlign = "right";
      c.fillText("ON AIR", oaX - 10, BH * 0.68);
    }

    // ═══ Scene badge with icon ═══
    const ac = s.accent || SC_ACC[s.type] || T.accent;
    const badgeX = Math.round(W * 0.04);
    const badgeY = BH + 12;
    const badgeW = 82;
    const badgeH = 22;
    c.fillStyle = ac + "20";
    c.beginPath(); c.roundRect(badgeX, badgeY, badgeW, badgeH, 4); c.fill();
    c.strokeStyle = ac + "60";
    c.lineWidth = 0.8;
    c.stroke();
    const icon = SC_ICONS[s.type] || "◈";
    c.fillStyle = ac;
    c.font = `bold ${Math.round(H * 0.020)}px monospace`;
    c.textAlign = "center";
    c.fillText(`${icon} ${(s.type || "SCENE").toUpperCase()}`, badgeX + badgeW / 2, badgeY + 15);

    // ═══ Scene progress dots (1-7 indicator) ═══
    this._drawSceneDots(c, W, H, BH, idx, ac);

    // ═══ Title with text shadow ═══
    const tx = (-60) + (Math.round(W * 0.055) + 60) * t;
    const fs = Math.round(H * 0.05);
    c.save();
    c.globalAlpha = t;
    c.translate(tx, 0);
    c.font = `bold ${fs}px sans-serif`;
    c.textAlign = "left";
    const titleText = s.title || "";
    const tw = c.measureText(titleText).width;
    const titleX = Math.round(W * 0.055);
    const titleY = Math.round(H * 0.40);
    // Title backdrop with frosted effect
    c.fillStyle = "rgba(0,0,0,.45)";
    c.beginPath();
    c.roundRect(titleX - 10, titleY - fs - 4, tw + 28, fs + 16, 4);
    c.fill();
    // Accent sidebar on title
    c.fillStyle = ac;
    c.fillRect(titleX - 10, titleY - fs - 4, 3, fs + 16);
    // Text shadow for depth
    c.shadowColor = "rgba(0,0,0,.7)";
    c.shadowBlur = 12;
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 2;
    c.fillStyle = "rgba(255,255,255,.97)";
    c.fillText(titleText, titleX + 4, titleY);
    c.shadowColor = "transparent";
    c.shadowBlur = 0;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 0;

    // ═══ Subtitle (first ~30 chars of narration) ═══
    const narr = s.narration || "";
    if (narr.length > 0) {
      const subText = narr.length > 30 ? narr.slice(0, 29) + "..." : narr;
      const subFs = Math.round(H * 0.026);
      c.font = `${subFs}px sans-serif`;
      c.fillStyle = "rgba(255,255,255,.55)";
      c.fillText(subText, titleX + 6, titleY + subFs + 6);
    }
    c.restore();

    // ═══ Keyword badges (improved with icon indicators) ═══
    if (s.keywords?.length && t > 0.45) {
      c.save();
      c.globalAlpha = (t - 0.45) / 0.55;
      const kwIcons = ["#", "◆", "●", "▸"];
      s.keywords.slice(0, 4).forEach((kw, ki) => {
        const kwText = kw.length > 8 ? kw.slice(0, 7) + ".." : kw;
        const kFs = Math.round(H * 0.018);
        c.font = `bold ${kFs}px monospace`;
        const kwW = c.measureText(kwText).width + 30;
        const kx = Math.round(W * 0.058) + ki * (kwW + 10);
        const ky = Math.round(H * 0.49);
        // Badge background
        c.fillStyle = ac + "18";
        c.beginPath(); c.roundRect(kx, ky - 14, kwW, 22, 11); c.fill();
        c.strokeStyle = ac + "50";
        c.lineWidth = 0.7;
        c.stroke();
        // Icon dot
        c.fillStyle = ac;
        c.beginPath(); c.arc(kx + 10, ky - 3, 3, 0, Math.PI * 2); c.fill();
        // Text
        c.fillStyle = ac;
        c.font = `bold ${kFs}px monospace`;
        c.textAlign = "left";
        c.fillText(kwText, kx + 18, ky);
      });
      c.restore();
      c.globalAlpha = 1;
    }

    // ═══ Scene-specific content overlay ═══
    this._drawSceneOverlay(c, s, W, H, t, lf, prog, ac);

    // ═══ Avatar ═══
    if (["opening", "closing", "expert"].includes(s.type)) this._avatar(t, lf, ac);

    // ═══ Lower Third (professional two-line broadcast design) ═══
    this._drawLowerThird(c, s, W, H, t, ac);

    // ═══ Ticker ═══
    const tkY = H - 24;
    // Ticker background with gradient
    const tkGrad = c.createLinearGradient(0, tkY, 0, H);
    tkGrad.addColorStop(0, "#991B1B");
    tkGrad.addColorStop(1, "#7F1D1D");
    c.fillStyle = tkGrad;
    c.fillRect(0, tkY, W, 24);
    // Top edge highlight
    c.fillStyle = "#DC2626";
    c.fillRect(0, tkY, W, 1);
    // BREAKING label
    const brkGrad = c.createLinearGradient(0, tkY, 0, H);
    brkGrad.addColorStop(0, T.accent);
    brkGrad.addColorStop(1, "#C9A830");
    c.fillStyle = brkGrad;
    c.fillRect(0, tkY, 94, 24);
    c.fillStyle = "#0A0A0A";
    c.font = `bold ${Math.round(H * 0.020)}px monospace`;
    c.textAlign = "center";
    c.fillText("BREAKING", 47, tkY + 16);
    // Scrolling text
    const tkT = `  ${s.title || ""}  ·  NEWS HARNESS PRO  ·  AI 자동화  ·  LIVE  ·  `;
    const scrollSpeed = 1.6;
    const sx2 = 96 + (W - 96) - ((f % 350) * scrollSpeed);
    c.save();
    c.beginPath(); c.rect(96, tkY, W - 96, 24); c.clip();
    c.fillStyle = "#FFF";
    c.font = `${Math.round(H * 0.019)}px sans-serif`;
    c.textAlign = "left";
    c.fillText(tkT + tkT, sx2, tkY + 16);
    c.restore();

    // ═══ Progress bar ═══
    const globalProg = f % (this.totalF || 1) / (this.totalF || 1);
    c.fillStyle = "rgba(255,255,255,.06)";
    c.fillRect(0, H - 3, W, 3);
    // Accent gradient progress
    const pbGrad = c.createLinearGradient(0, 0, W * globalProg, 0);
    pbGrad.addColorStop(0, ac);
    pbGrad.addColorStop(1, T.accent);
    c.fillStyle = pbGrad;
    c.fillRect(0, H - 3, W * globalProg, 3);
    // Glow head
    c.fillStyle = "#FFF";
    c.fillRect(W * globalProg - 2, H - 3, 4, 3);

    // ═══ Out fade ═══
    if (lf > tf - TR) {
      const op = this.easeInOut((lf - (tf - TR)) / TR);
      c.fillStyle = `rgba(0,0,0,${op * 0.9})`;
      c.fillRect(0, 0, W, H);
    }

    this.onUpdate(f, this.totalF);
  }

  // ─── Scene progress dots ────────────────────────────
  _drawSceneDots(c, W, H, BH, activeIdx, ac) {
    const total = Math.min(this.scenes.length, 10);
    const dotR = 3.5;
    const gap = 14;
    const startX = W - 20 - total * gap;
    const dotY = BH + 22;
    for (let i = 0; i < total; i++) {
      const dx = startX + i * gap;
      if (i === activeIdx) {
        c.fillStyle = ac;
        c.beginPath(); c.arc(dx, dotY, dotR + 1, 0, Math.PI * 2); c.fill();
        // Glow ring
        c.strokeStyle = ac + "50";
        c.lineWidth = 1.5;
        c.beginPath(); c.arc(dx, dotY, dotR + 4, 0, Math.PI * 2); c.stroke();
      } else {
        c.fillStyle = i < activeIdx ? ac + "70" : "rgba(255,255,255,.2)";
        c.beginPath(); c.arc(dx, dotY, dotR, 0, Math.PI * 2); c.fill();
      }
    }
  }

  // ─── Scene-specific content overlay ────────────────
  _drawSceneOverlay(c, s, W, H, t, lf, prog, ac) {
    if (t < 0.5) return;
    const alpha = (t - 0.5) / 0.5;
    c.save();
    c.globalAlpha = alpha * 0.9;

    if (s.type === "data") {
      // Stats card with extracted numbers
      const nums = this._extractNumbers(s.narration);
      if (nums.length > 0) {
        const cardX = Math.round(W * 0.60);
        const cardY = Math.round(H * 0.30);
        const cardW = Math.round(W * 0.34);
        const cardH = Math.min(nums.length * 50 + 30, 230);
        // Card background
        c.fillStyle = "rgba(0,0,0,.55)";
        c.beginPath(); c.roundRect(cardX, cardY, cardW, cardH, 6); c.fill();
        c.strokeStyle = ac + "40";
        c.lineWidth = 1;
        c.stroke();
        // Card header
        c.fillStyle = ac + "20";
        c.fillRect(cardX, cardY, cardW, 28);
        c.fillStyle = ac;
        c.font = `bold ${Math.round(H * 0.018)}px monospace`;
        c.textAlign = "left";
        c.fillText("◉ DATA OVERVIEW", cardX + 12, cardY + 18);
        // Number entries with animated counters
        nums.forEach((n, i) => {
          const ny = cardY + 42 + i * 46;
          const animVal = Math.round(parseFloat(n.num.replace(/,/g, "")) * Math.min(1, prog * 2.5));
          const displayNum = animVal.toLocaleString();
          c.fillStyle = "rgba(255,255,255,.9)";
          c.font = `bold ${Math.round(H * 0.035)}px monospace`;
          c.textAlign = "left";
          c.fillText(displayNum + n.unit, cardX + 14, ny + 8);
          // Bar indicator
          const barW = (cardW - 28) * Math.min(1, prog * 2);
          c.fillStyle = ac + "30";
          c.fillRect(cardX + 14, ny + 14, cardW - 28, 4);
          c.fillStyle = ac;
          c.fillRect(cardX + 14, ny + 14, barW, 4);
        });
      }
    } else if (s.type === "expert") {
      // Quote-style layout
      const qX = Math.round(W * 0.58);
      const qY = Math.round(H * 0.32);
      const qW = Math.round(W * 0.36);
      c.fillStyle = "rgba(0,0,0,.50)";
      c.beginPath(); c.roundRect(qX, qY, qW, 110, 6); c.fill();
      c.strokeStyle = ac + "30";
      c.lineWidth = 1;
      c.stroke();
      // Large quote mark
      c.fillStyle = ac + "40";
      c.font = `bold ${Math.round(H * 0.08)}px serif`;
      c.textAlign = "left";
      c.fillText("\u201C", qX + 8, qY + 44);
      // Quote text (first ~40 chars of narration)
      const quoteText = (s.narration || "").slice(0, 40) + (s.narration?.length > 40 ? "..." : "");
      c.fillStyle = "rgba(255,255,255,.85)";
      c.font = `italic ${Math.round(H * 0.022)}px sans-serif`;
      c.textAlign = "left";
      // Word wrap simple
      const words = quoteText.split("");
      let line = "";
      let lineY = qY + 56;
      const maxLineW = qW - 24;
      for (const ch of words) {
        const test = line + ch;
        if (c.measureText(test).width > maxLineW) {
          c.fillText(line, qX + 14, lineY);
          line = ch;
          lineY += Math.round(H * 0.028);
          if (lineY > qY + 95) break;
        } else {
          line = test;
        }
      }
      if (line) c.fillText(line, qX + 14, lineY);
      // Expert label
      c.fillStyle = ac;
      c.font = `bold ${Math.round(H * 0.016)}px monospace`;
      c.fillText("— EXPERT INSIGHT", qX + 14, qY + 100);

    } else if (s.type === "field") {
      // LIVE REPORT badge
      const lrX = Math.round(W * 0.70);
      const lrY = Math.round(H * 0.25);
      const pulse = Math.sin(lf * 0.1) * 0.3 + 0.7;
      c.save();
      c.globalAlpha = alpha * pulse;
      // Badge bg
      c.fillStyle = "#DC2626";
      c.beginPath(); c.roundRect(lrX, lrY, 140, 32, 4); c.fill();
      // Inner accent
      c.fillStyle = "rgba(255,255,255,.15)";
      c.fillRect(lrX, lrY, 140, 1);
      // Dot
      c.fillStyle = "#FFF";
      c.beginPath(); c.arc(lrX + 16, lrY + 16, 4, 0, Math.PI * 2); c.fill();
      // Pulsing ring
      c.strokeStyle = "rgba(255,255,255,.5)";
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(lrX + 16, lrY + 16, 4 + pulse * 4, 0, Math.PI * 2); c.stroke();
      // Text
      c.fillStyle = "#FFF";
      c.font = `bold ${Math.round(H * 0.022)}px monospace`;
      c.textAlign = "left";
      c.fillText("LIVE REPORT", lrX + 30, lrY + 21);
      c.restore();
      c.globalAlpha = alpha * 0.9;
      // Location tag
      c.fillStyle = "rgba(0,0,0,.6)";
      c.beginPath(); c.roundRect(lrX, lrY + 38, 140, 22, 3); c.fill();
      c.fillStyle = "rgba(255,255,255,.7)";
      c.font = `${Math.round(H * 0.016)}px monospace`;
      c.textAlign = "center";
      c.fillText("◆ FIELD COVERAGE", lrX + 70, lrY + 53);
    } else if (s.type === "analysis") {
      // Flow diagram with keywords
      const flowKws = this._extractFlowKeywords(s);
      if (flowKws.length >= 2) {
        const fX = Math.round(W * 0.58);
        const fY = Math.round(H * 0.30);
        const fW = Math.round(W * 0.36);
        const fH = 120;
        // Container
        c.fillStyle = "rgba(0,0,0,.45)";
        c.beginPath(); c.roundRect(fX, fY, fW, fH, 6); c.fill();
        c.strokeStyle = ac + "30";
        c.lineWidth = 1;
        c.stroke();
        // Header
        c.fillStyle = ac;
        c.font = `bold ${Math.round(H * 0.016)}px monospace`;
        c.textAlign = "left";
        c.fillText("◎ ANALYSIS FLOW", fX + 12, fY + 18);
        // Flow nodes
        const nodeCount = Math.min(flowKws.length, 4);
        const nodeW = (fW - 40) / nodeCount - 8;
        const nodeY = fY + 40;
        const animProg = Math.min(1, prog * 3);
        flowKws.slice(0, nodeCount).forEach((kw, ki) => {
          const showAt = ki / nodeCount;
          if (animProg < showAt) return;
          const nodeAlpha = Math.min(1, (animProg - showAt) * nodeCount);
          c.save();
          c.globalAlpha = alpha * nodeAlpha * 0.9;
          const nx = fX + 16 + ki * (nodeW + 12);
          // Node box
          c.fillStyle = ac + "20";
          c.beginPath(); c.roundRect(nx, nodeY, nodeW, 50, 4); c.fill();
          c.strokeStyle = ac + "60";
          c.lineWidth = 0.8;
          c.stroke();
          // Node text
          const kwDisplay = kw.length > 5 ? kw.slice(0, 4) + ".." : kw;
          c.fillStyle = "rgba(255,255,255,.85)";
          c.font = `bold ${Math.round(H * 0.016)}px sans-serif`;
          c.textAlign = "center";
          c.fillText(kwDisplay, nx + nodeW / 2, nodeY + 30);
          // Arrow to next
          if (ki < nodeCount - 1 && animProg > (ki + 1) / nodeCount) {
            c.strokeStyle = ac + "70";
            c.lineWidth = 1.5;
            c.beginPath();
            c.moveTo(nx + nodeW + 2, nodeY + 25);
            c.lineTo(nx + nodeW + 10, nodeY + 25);
            c.stroke();
            // Arrowhead
            c.fillStyle = ac + "70";
            c.beginPath();
            c.moveTo(nx + nodeW + 10, nodeY + 21);
            c.lineTo(nx + nodeW + 10, nodeY + 29);
            c.lineTo(nx + nodeW + 14, nodeY + 25);
            c.closePath();
            c.fill();
          }
          c.restore();
        });
      }
    }

    c.restore();
  }

  // ─── Data scene visualization ───────────────────────
  _viz(s, p, lf) {
    const { cx: c, W, H } = this;

    if (s.type === "data") {
      const vals = [0.35, 0.65, 0.48, 0.88, 0.72, 0.55, 0.80];
      const labels = ["Q1", "Q2", "Q3", "MAX", "Q5", "Q6", "Q7"];
      const bw = W * 0.042;
      const gap = W * 0.014;
      const baseX = W * 0.54;
      const maxH = H * 0.34;

      vals.forEach((h, i) => {
        const bh = maxH * h * Math.min(1, p * 2.5);
        const x = baseX + i * (bw + gap);
        const y = H * 0.68 - bh;
        // Track background
        c.fillStyle = SC_ACC.data + "0C";
        c.fillRect(x, H * 0.34, bw, maxH);
        // Rounded bar with gradient
        const bg = c.createLinearGradient(x, y, x, H * 0.68);
        bg.addColorStop(0, i === 3 ? SC_ACC.data : SC_ACC.data + "80");
        bg.addColorStop(1, SC_ACC.data + "30");
        c.fillStyle = bg;
        c.beginPath(); c.roundRect(x, y, bw, bh, [3, 3, 0, 0]); c.fill();
        // Top highlight
        c.fillStyle = SC_ACC.data;
        c.fillRect(x, y, bw, 2);
        // Glow on max bar
        if (i === 3) {
          const glow = c.createRadialGradient(x + bw / 2, y, 0, x + bw / 2, y, bw);
          glow.addColorStop(0, SC_ACC.data + "30");
          glow.addColorStop(1, "transparent");
          c.fillStyle = glow;
          c.fillRect(x - 10, y - 10, bw + 20, 20);
        }
        // Value label
        if (p > 0.5) {
          c.fillStyle = "rgba(255,255,255,.5)";
          c.font = `${Math.round(H * 0.015)}px monospace`;
          c.textAlign = "center";
          c.fillText(labels[i], x + bw / 2, H * 0.72);
          c.fillStyle = SC_ACC.data;
          c.fillText(Math.round(h * 100), x + bw / 2, y - 6);
        }
      });
      // Grid lines
      c.strokeStyle = "rgba(255,255,255,.06)";
      c.lineWidth = 0.5;
      c.setLineDash([4, 4]);
      for (let i = 0; i <= 4; i++) {
        const gy = H * 0.34 + (maxH / 4) * i;
        c.beginPath(); c.moveTo(baseX - 10, gy); c.lineTo(baseX + 7 * (bw + gap), gy); c.stroke();
      }
      c.setLineDash([]);

    } else if (s.type === "analysis") {
      // Animated line chart with area fill
      const pts = [
        [0.54, 0.62], [0.60, 0.48], [0.66, 0.54],
        [0.72, 0.36], [0.78, 0.30], [0.84, 0.38], [0.90, 0.42]
      ];
      const vis = pts.slice(0, Math.max(2, Math.round(p * pts.length)));
      // Area fill
      c.save();
      c.beginPath();
      c.moveTo(W * vis[0][0], H * 0.68);
      vis.forEach(([x, y]) => c.lineTo(W * x, H * y));
      c.lineTo(W * vis[vis.length - 1][0], H * 0.68);
      c.closePath();
      const aFill = c.createLinearGradient(0, H * 0.3, 0, H * 0.68);
      aFill.addColorStop(0, SC_ACC.analysis + "25");
      aFill.addColorStop(1, SC_ACC.analysis + "05");
      c.fillStyle = aFill;
      c.fill();
      c.restore();
      // Line
      c.strokeStyle = SC_ACC.analysis + "80";
      c.lineWidth = 2.5;
      c.beginPath();
      vis.forEach(([x, y], i) => i === 0 ? c.moveTo(W * x, H * y) : c.lineTo(W * x, H * y));
      c.stroke();
      // Dots
      vis.forEach(([x, y], i) => {
        const isLast = i === vis.length - 1;
        c.fillStyle = isLast ? SC_ACC.analysis : SC_ACC.analysis + "70";
        c.beginPath(); c.arc(W * x, H * y, isLast ? 5 : 3, 0, Math.PI * 2); c.fill();
        if (isLast) {
          c.strokeStyle = SC_ACC.analysis + "40";
          c.lineWidth = 1.5;
          c.beginPath(); c.arc(W * x, H * y, 9, 0, Math.PI * 2); c.stroke();
        }
      });
      // Grid
      c.strokeStyle = "rgba(255,255,255,.05)";
      c.lineWidth = 0.5;
      c.setLineDash([3, 3]);
      for (let i = 0; i < 5; i++) {
        const gy = H * 0.28 + i * (H * 0.10);
        c.beginPath(); c.moveTo(W * 0.52, gy); c.lineTo(W * 0.92, gy); c.stroke();
      }
      c.setLineDash([]);
    }
  }

  // ─── Avatar ─────────────────────────────────────────
  _avatar(t, lf, ac) {
    const { cx: c, W, H } = this;
    const x = Math.round(W * 0.845), y = Math.round(H * 0.37), oy = (1 - t) * 28;
    c.save();
    c.globalAlpha = t;
    c.translate(0, oy);
    // Glow background
    const g = c.createRadialGradient(x, y + 18, 0, x, y + 18, 72);
    g.addColorStop(0, ac + "15");
    g.addColorStop(1, "transparent");
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y + 18, 72, 0, Math.PI * 2); c.fill();
    // Body
    c.fillStyle = "#1A2A4A";
    c.beginPath(); c.roundRect(x - 30, y + 24, 60, 42, 4); c.fill();
    c.strokeStyle = ac + "40";
    c.lineWidth = 1;
    c.stroke();
    c.fillStyle = ac;
    c.fillRect(x - 2, y + 30, 4, 22);
    // Head
    c.fillStyle = "#2A3A5A";
    c.beginPath(); c.arc(x, y, 22, 0, Math.PI * 2); c.fill();
    c.strokeStyle = ac;
    c.lineWidth = 2;
    c.stroke();
    // Pulse ring
    const pulse = Math.sin(lf * 0.11) * 0.5 + 0.5;
    c.strokeStyle = ac + Math.round(pulse * 80).toString(16).padStart(2, "0");
    c.lineWidth = 1.5;
    c.setLineDash([4, 4]);
    c.beginPath(); c.arc(x, y, 28 + pulse * 4, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
    // Label
    c.fillStyle = "rgba(0,0,0,.82)";
    c.beginPath(); c.roundRect(x - 40, y + 70, 80, 22, 3); c.fill();
    c.strokeStyle = ac + "58";
    c.lineWidth = 0.5;
    c.stroke();
    c.fillStyle = ac;
    c.font = `bold ${Math.round(H * 0.021)}px monospace`;
    c.textAlign = "center";
    c.fillText("ANCHOR", x, y + 84);
    c.restore();
  }

  // ─── Lower Third (professional two-line broadcast) ──
  _drawLowerThird(c, s, W, H, t, ac) {
    const ltH = Math.round(H * 0.13);
    const ltY = H - ltH - 26;
    c.save();
    c.globalAlpha = t * 0.95;

    // Semi-transparent backdrop with layered gradient
    const bg1 = c.createLinearGradient(0, ltY, 0, ltY + ltH);
    bg1.addColorStop(0, "rgba(0,0,0,.80)");
    bg1.addColorStop(1, "rgba(0,0,0,.92)");
    c.fillStyle = bg1;
    c.beginPath(); c.roundRect(0, ltY, Math.round(W * 0.55), ltH, [0, 6, 6, 0]); c.fill();

    // Fade-out edge
    const fadeW = Math.round(W * 0.12);
    const fadeG = c.createLinearGradient(Math.round(W * 0.55), ltY, Math.round(W * 0.55) + fadeW, ltY);
    fadeG.addColorStop(0, "rgba(0,0,0,.92)");
    fadeG.addColorStop(1, "transparent");
    c.fillStyle = fadeG;
    c.fillRect(Math.round(W * 0.55), ltY, fadeW, ltH);

    // Accent sidebar (thicker, gradient)
    const sideG = c.createLinearGradient(0, ltY, 0, ltY + ltH);
    sideG.addColorStop(0, ac);
    sideG.addColorStop(1, ac + "80");
    c.fillStyle = sideG;
    c.fillRect(0, ltY, 5, ltH);

    // Accent panel behind name
    c.fillStyle = ac + "18";
    c.fillRect(6, ltY, Math.round(W * 0.20), ltH);

    // Top accent line
    c.fillStyle = ac + "60";
    c.fillRect(0, ltY, Math.round(W * 0.55), 1);

    // Line 1: Anchor name
    c.fillStyle = ac;
    c.font = `bold ${Math.round(H * 0.034)}px sans-serif`;
    c.textAlign = "left";
    c.fillText("앵커", 18, ltY + Math.round(ltH * 0.38));

    // Small role tag
    c.fillStyle = ac + "40";
    c.beginPath();
    c.roundRect(18 + c.measureText("앵커").width + 10, ltY + Math.round(ltH * 0.22), 60, 18, 9);
    c.fill();
    c.fillStyle = ac + "90";
    c.font = `${Math.round(H * 0.015)}px monospace`;
    c.fillText("ANCHOR", 18 + c.measureText("앵커").width + 22, ltY + Math.round(ltH * 0.35));

    // Divider line
    c.fillStyle = ac + "35";
    c.fillRect(16, ltY + Math.round(ltH * 0.50), Math.round(W * 0.36), 1);

    // Line 2: Topic / lower third text
    const lt = s.lower_third || s.title || "";
    c.fillStyle = "rgba(255,255,255,.92)";
    c.font = `${Math.round(H * 0.027)}px sans-serif`;
    c.fillText(lt.length > 36 ? lt.slice(0, 35) + "..." : lt, 18, ltY + Math.round(ltH * 0.78));

    c.restore();
  }

  play() {
    this.playing = true;
    const L = () => {
      if (!this.playing) return;
      this.frame = (this.frame + 1) % (this.totalF || 1);
      this.draw();
      this.aid = requestAnimationFrame(L);
    };
    L();
  }
  pause() { this.playing = false; if (this.aid) cancelAnimationFrame(this.aid); }
  seek(f) { this.frame = Math.max(0, Math.min(Math.round(f), this.totalF - 1)); this.draw(); }
  destroy() { this.pause(); }
}

export { Renderer, T, SC_ACC };
