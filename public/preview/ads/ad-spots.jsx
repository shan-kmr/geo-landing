/* ad-spots.jsx — Janus social spots · 3 × 15 s · 1080×1920 (IG/FB Reels & Stories)
   Requires window.{Stage, useTime, Easing} (animations.jsx) + window.JanusScene (atlas-scene.js).
   Deterministic in t — scrub-safe, export-safe. */

const { Stage, useTime, Easing } = window;

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const GROT = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const INK = "#16181A", MUT = "#7A7F85", FNT = "#B9BCC1", LINE = "#E9EAEC", SIG = "#D9480F", PAPER = "#FCFCFB";
const f01 = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const eO = (x) => 1 - Math.pow(1 - x, 3);
const eIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
/* offscreen-canvas → <img> rendering: the video exporter serializes the
   stage SVG, and <canvas> bitmaps don't survive serialization — <img> with
   a data: URL does. Every scene layer draws offscreen and commits to an img. */
function getOff(ref, w, h) {
  if (!ref.current) { const c = document.createElement("canvas"); c.width = w; c.height = h; ref.current = c; }
  return ref.current;
}

/* ---------- shared type ---------- */
function CaptionTop({ t, beats, y }) {
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: y || 290, textAlign: "center", pointerEvents: "none" }}>
      {beats.map((b, i) => {
        const k = f01(t, b.t0, b.t0 + 0.55) - f01(t, b.t1 - 0.4, b.t1);
        if (k <= 0) return null;
        return (
          <div key={i} style={{
            position: "absolute", left: 0, right: 0,
            fontFamily: GROT, fontWeight: 600, fontSize: b.size || 66, letterSpacing: "-.014em",
            lineHeight: 1.12, color: INK, opacity: k, transform: `translateY(${(1 - eO(k)) * 16}px)`
          }}>{b.text}</div>
        );
      })}
    </div>
  );
}
function Chip({ children, style }) {
  return (
    <div style={Object.assign({
      fontFamily: MONO, fontSize: 25, letterSpacing: ".04em", color: INK,
      background: "rgba(252,252,251,.94)", border: "1.5px solid " + LINE,
      borderRadius: 8, padding: "15px 22px", whiteSpace: "nowrap"
    }, style)}>{children}</div>
  );
}
function ChipStack({ t, items, x, y }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
      {items.map((it, i) => {
        const k = f01(t, it.t0, it.t0 + 0.45) - (it.t1 ? f01(t, it.t1 - 0.3, it.t1) : 0);
        if (k <= 0) return null;
        return <Chip key={i} style={{ opacity: k, transform: `translateY(${(1 - eO(k)) * 10}px)` }}>{it.el}</Chip>;
      })}
    </div>
  );
}
function EndCard({ t, t0, tagline, sub, subline, globe }) {
  const imgRef = React.useRef(null);
  const bufRef = React.useRef(null);
  React.useLayoutEffect(() => {
    if (!imgRef.current || !window.JanusScene || t < t0) return;
    if (!bufRef.current) {
      bufRef.current = document.createElement("canvas");
      bufRef.current.width = 1080; bufRef.current.height = 1920;
    }
    const ctx = bufRef.current.getContext("2d");
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, 1080, 1920);
    if (globe) {
      // alive, not static: the globe turns at the hero rig's natural rate,
      // set whisper-light behind the type
      window.JanusScene.drawGlobe(ctx, 1080, 1920, {
        cx: 540, cy: 1140, R: 560, rot: -2.86 + (t - t0) * 0.09, tilt: 0.55,
        alpha: 0.10, pulse: { lat: 40.7, lon: -74, amt: 0.25 }
      });
    }
    window.JanusScene.blitToImg(bufRef.current, imgRef.current, true, 0.9);
  }, [t, t0, globe]);
  const k = f01(t, t0, t0 + 0.4);
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, background: PAPER, opacity: k, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 90px" }}>
      <img ref={imgRef} width={1080} height={1920} alt="" style={{ position: "absolute", inset: 0, opacity: f01(t, t0 + 0.1, t0 + 0.6) }} />
      {/* relative wrapper: keeps the type painting ABOVE the absolutely-
          positioned backdrop img even after fade ramps hit opacity 1 */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {tagline && <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 76, letterSpacing: "-.015em", lineHeight: 1.1, color: INK, opacity: f01(t, t0 + 0.1, t0 + 0.5) }}>{tagline}</div>}
        <div style={{ width: 60, borderTop: "2px solid " + INK, margin: tagline ? "44px 0" : "0 0 40px", opacity: f01(t, t0 + 0.25, t0 + 0.6) }}></div>
        <div style={{ fontFamily: MONO, fontSize: 25, letterSpacing: ".28em", fontWeight: 700, color: INK, opacity: f01(t, t0 + 0.35, t0 + 0.7) }}>JANUS</div>
        <div style={{ fontFamily: GROT, fontWeight: 500, fontSize: 31, color: "#4A4E54", marginTop: 20, opacity: f01(t, t0 + 0.45, t0 + 0.8) }}>{sub || "The context layer for the physical world."}</div>
        {subline && <div style={{ fontFamily: MONO, fontSize: 21, letterSpacing: ".1em", color: MUT, marginTop: 16, opacity: f01(t, t0 + 0.5, t0 + 0.85) }}>{subline}</div>}
        <div style={{ fontFamily: MONO, fontSize: 25, color: INK, marginTop: 46, opacity: f01(t, t0 + 0.55, t0 + 0.95) }}>
          <span style={{ borderBottom: "2px solid " + INK, paddingBottom: 4 }}>janus.earth →</span>
        </div>
      </div>
    </div>
  );
}

/* ---------- side-view street scenes (canvas) ---------- */
function gaitFigure(ctx, x, yG, H, phase, walking) {
  // minimal ink pictogram, ~H tall
  const ink = "rgba(22,24,26,.9)";
  const head = H * 0.115, neckY = yG - H * 0.78, hipY = yG - H * 0.44;
  const sw = walking ? Math.sin(phase) : 0;
  ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineCap = "round";
  ctx.lineWidth = H * 0.062;
  // legs
  for (const dir of [1, -1]) {
    const a = sw * 0.52 * dir;
    const kneeX = x + Math.sin(a) * H * 0.24, kneeY = hipY + Math.cos(a) * H * 0.24;
    const a2 = a + (dir > 0 ? Math.max(0, -sw) : Math.max(0, sw)) * 0.6;
    ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(kneeX + Math.sin(a2) * H * 0.22, kneeY + Math.cos(a2) * H * 0.22); ctx.stroke();
  }
  // torso
  ctx.lineWidth = H * 0.085;
  ctx.beginPath(); ctx.moveTo(x, hipY); ctx.lineTo(x, neckY); ctx.stroke();
  // arms
  ctx.lineWidth = H * 0.05;
  for (const dir of [1, -1]) {
    const a = -sw * 0.4 * dir;
    const ex = x + Math.sin(a) * H * 0.2, ey = neckY + H * 0.06 + Math.cos(a) * H * 0.22;
    ctx.beginPath(); ctx.moveTo(x, neckY + H * 0.06); ctx.lineTo(ex, ey); ctx.stroke();
  }
  // head
  ctx.beginPath(); ctx.arc(x, neckY - head * 1.15, head, 0, Math.PI * 2); ctx.fill();
}
function robotFigure(ctx, x, yG, S, dist) {
  const bump = 2.6 * Math.sin(dist * 0.031) + 1.6 * Math.sin(dist * 0.083);
  const y = yG + bump;
  const w = S * 2.1, h = S * 1.35, r = S * 0.34;
  ctx.fillStyle = "rgba(239,239,236,1)";
  ctx.strokeStyle = "rgba(22,24,26,.8)"; ctx.lineWidth = 3;
  const bx = x - w / 2, by = y - h - r * 1.7;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(bx, by, w, h, 14) : ctx.rect(bx, by, w, h);
  ctx.fill(); ctx.stroke();
  // lid line + sensor
  ctx.beginPath(); ctx.moveTo(bx + 8, by + h * 0.32); ctx.lineTo(bx + w - 8, by + h * 0.32); ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = "rgba(22,24,26,.8)";
  ctx.fillRect(bx + w - 26, by + h * 0.5, 14, 8);
  // antenna
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(bx + w * 0.82, by); ctx.lineTo(bx + w * 0.82 + 6, by - S * 0.66); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx + w * 0.82 + 6, by - S * 0.66 - 5, 5.5, 0, Math.PI * 2); ctx.fill();
  // wheels with a rotating spoke
  for (const wx of [x - w * 0.3, x + w * 0.3]) {
    ctx.beginPath(); ctx.arc(wx, y - r, r, 0, Math.PI * 2);
    ctx.fillStyle = "#FCFCFB"; ctx.fill();
    ctx.strokeStyle = "rgba(22,24,26,.8)"; ctx.lineWidth = 3; ctx.stroke();
    const a = dist / r;
    ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * r * 0.62, y - r - Math.sin(a) * r * 0.62);
    ctx.lineTo(wx + Math.cos(a) * r * 0.62, y - r + Math.sin(a) * r * 0.62);
    ctx.lineWidth = 1.6; ctx.stroke();
  }
}
function drawSideScene(ctx, W, H, t, mode) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  const yG = H * 0.72;
  // far facades band
  const rnd = (i, s) => { let h = (i * 374761393 + s * 668265263) ^ 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let fx = -40;
  let bi = 0;
  while (fx < W + 40) {
    const fw = 190 + rnd(bi, 2) * 240;
    const fh = H * (0.26 + rnd(bi, 3) * 0.24);
    // facade
    ctx.fillStyle = "rgba(243,243,240,1)";
    ctx.fillRect(fx, yG - fh, fw, fh);
    ctx.strokeStyle = "rgba(22,24,26,.14)"; ctx.lineWidth = 2;
    ctx.strokeRect(fx, yG - fh, fw, fh);
    // cornice
    ctx.fillStyle = "rgba(22,24,26,.08)";
    ctx.fillRect(fx - 6, yG - fh - 10, fw + 12, 10);
    // window grid
    const cols = Math.max(2, Math.floor(fw / 74)), rows = Math.max(2, Math.floor((fh - 130) / 96));
    for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) {
      if (rnd(bi * 31 + c2, r + 9) < 0.12) continue;
      const wx = fx + 26 + c2 * ((fw - 52) / cols), wy = yG - fh + 34 + r * 96;
      ctx.fillStyle = "rgba(22,24,26,.075)";
      ctx.fillRect(wx, wy, (fw - 52) / cols - 22, 62);
      ctx.strokeStyle = "rgba(22,24,26,.1)"; ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, (fw - 52) / cols - 22, 62);
    }
    fx += fw + 14; bi++;
  }
  // the shopfront (walk mode) — occupies right-center
  if (mode === "walk") {
    const sx = W * 0.52, sw = W * 0.44, sh = H * 0.34;
    ctx.fillStyle = "#F6F6F3";
    ctx.fillRect(sx, yG - sh, sw, sh);
    ctx.strokeStyle = "rgba(22,24,26,.35)"; ctx.lineWidth = 2.5;
    ctx.strokeRect(sx, yG - sh, sw, sh);
    // awning band
    ctx.fillStyle = "rgba(22,24,26,.85)";
    ctx.fillRect(sx - 8, yG - sh + 26, sw + 16, 74);
    ctx.fillStyle = PAPER;
    ctx.font = "700 34px " + MONO; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("G R I N D   C O F F E E", sx + sw / 2, yG - sh + 63);
    ctx.textAlign = "left";
    // window + mullions
    const wx0 = sx + 26, wy0 = yG - sh + 128, ww = sw * 0.52, wh = sh - 158;
    ctx.fillStyle = "rgba(22,24,26,.05)"; ctx.fillRect(wx0, wy0, ww, wh);
    ctx.strokeStyle = "rgba(22,24,26,.3)"; ctx.lineWidth = 2; ctx.strokeRect(wx0, wy0, ww, wh);
    ctx.beginPath(); ctx.moveTo(wx0 + ww / 2, wy0); ctx.lineTo(wx0 + ww / 2, wy0 + wh); ctx.lineWidth = 1.4; ctx.stroke();
    // door
    const dx = sx + sw * 0.66, dw = sw * 0.24;
    ctx.fillStyle = "rgba(22,24,26,.07)"; ctx.fillRect(dx, wy0, dw, sh - 128);
    ctx.strokeStyle = "rgba(22,24,26,.4)"; ctx.lineWidth = 2.5; ctx.strokeRect(dx, wy0, dw, sh - 128);
    ctx.fillStyle = "rgba(22,24,26,.7)";
    ctx.beginPath(); ctx.arc(dx + dw - 16, wy0 + (sh - 128) * 0.52, 5, 0, Math.PI * 2); ctx.fill();
  }
  // ground: sidewalk surface + kerb + road
  ctx.strokeStyle = "rgba(22,24,26,.4)"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0, yG); ctx.lineTo(W, yG); ctx.stroke();
  // paving joints
  ctx.strokeStyle = "rgba(22,24,26,.12)"; ctx.lineWidth = 1.5;
  for (let jx = 30; jx < W; jx += 104) { ctx.beginPath(); ctx.moveTo(jx, yG); ctx.lineTo(jx - 14, yG + 46); ctx.stroke(); }
  ctx.strokeStyle = "rgba(22,24,26,.3)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, yG + 48); ctx.lineTo(W, yG + 48); ctx.stroke();
  ctx.fillStyle = "rgba(233,234,236,.55)";
  ctx.fillRect(0, yG + 50, W, H - yG - 50);
  // actors
  if (mode === "walk") {
    const doorX = W * 0.52 + W * 0.44 * 0.66 + W * 0.44 * 0.12;
    const k = eIO(f01(t, 0.9, 4.3));
    const x = lerp(W * 0.1, doorX - 30, k);
    const walking = k < 0.995;
    gaitFigure(ctx, x, yG, H * 0.23, x * 0.055, walking);
    // phone appears in hand as they arrive
    const pk = f01(t, 3.8, 4.3);
    if (pk > 0) {
      ctx.globalAlpha = pk;
      const px = x + H * 0.045, py = yG - H * 0.23 * 0.52;
      ctx.fillStyle = "#FFFFFF"; ctx.strokeStyle = "rgba(22,24,26,.8)"; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(px, py - 46, 30, 56, 6) : ctx.rect(px, py - 46, 30, 56);
      ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if (mode === "robot") {
    const x = lerp(W * 0.06, W * 0.9, f01(t, 0.2, 4.4));
    robotFigure(ctx, x, yG, 74, x);
  } else if (mode === "cross") {
    const k = f01(t, 0.1, 2.6);
    gaitFigure(ctx, lerp(W * 0.16, W * 0.86, k), yG, H * 0.23, lerp(W * 0.16, W * 0.86, k) * 0.055, k < 0.99);
  }
}
function SideScene({ t, mode, t0, t1, kb }) {
  const imgRef = React.useRef(null);
  const offRef = React.useRef(null);
  const local = t - t0;
  React.useLayoutEffect(() => {
    if (!imgRef.current || t < t0 || t > t1) return;
    const off = getOff(offRef, 1080, 1920);
    const ctx = off.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawSideScene(ctx, 1080, 1920, local, mode);
    window.JanusScene && window.JanusScene.blitToImg(off, imgRef.current, true, 0.9);
  }, [t, mode, t0, t1]);
  if (t < t0 || t > t1) return null;
  const scale = kb ? 1.05 + 0.09 * f01(t, t0, t1) : 1;
  return <img ref={imgRef} alt="" width={1080} height={1920} style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "58% 62%" }} />;
}

/* ---------- vibration trace ---------- */
function VibTrace({ t, t0, t1 }) {
  const imgRef = React.useRef(null);
  const offRef = React.useRef(null);
  React.useLayoutEffect(() => {
    if (!imgRef.current || t < t0 || t > t1) return;
    const off = getOff(offRef, 880, 170);
    const ctx = off.getContext("2d");
    const W = 880, H = 170;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(122,127,133,.5)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    const prog = f01(t, t0 + 0.2, t1 - 0.4);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= W * prog; x += 3) {
      const wx = x * 1.02;
      const y = H / 2 + 22 * Math.sin(wx * 0.031 * 2.9) + 13 * Math.sin(wx * 0.083 * 2.9) + 5 * Math.sin(wx * 0.24);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    window.JanusScene && window.JanusScene.blitToImg(off, imgRef.current, false);
  }, [t, t0, t1]);
  if (t < t0 || t > t1) return null;
  return <img ref={imgRef} alt="" width={880} height={170} style={{ width: 880, height: 170 }} />;
}

/* ---------- full-bleed map canvas, per-ad camera fn ---------- */
function MapShot({ t, on, camFn, optsFn, fadeIn }) {
  const imgRef = React.useRef(null);
  const bufRef = React.useRef(null);
  const memo = React.useRef("");
  React.useLayoutEffect(() => {
    if (!imgRef.current || !window.JanusScene || !on) return;
    if (!bufRef.current) { bufRef.current = document.createElement("canvas"); bufRef.current.width = 1080; bufRef.current.height = 1920; }
    const cam = camFn(t), opts = optsFn(t);
    const key = JSON.stringify([cam.x.toFixed(4), cam.y.toFixed(4), cam.z.toFixed(3), cam.rot.toFixed(3),
      opts.shadeMix != null ? opts.shadeMix.toFixed(2) : 1, opts.selectedPhase, opts.__f,
      opts.live ? t.toFixed(3) : 0]);
    if (key !== memo.current) {
      memo.current = key;
      window.JanusScene.drawCity(bufRef.current.getContext("2d"), 1080, 1920, cam, opts);
      window.JanusScene.blitToImg(bufRef.current, imgRef.current, true);
    }
  }, [t, on]);
  if (!on) return null;
  return <img ref={imgRef} width={1080} height={1920} alt="" style={{ position: "absolute", inset: 0, opacity: fadeIn != null ? fadeIn : 1 }} />;
}

/* ============================================================
   AD 01 — PLACES ("Your customers go places.")
   One continuous procedural shot: down the avenue → the turn →
   the app rises → pull up. No figures, no elevations — map or UI only.
   ============================================================ */
function PhoneShot({ t }) {
  const J = window.JanusScene;
  const imgRef = React.useRef(null);
  const cacheRef = React.useRef(null);   // data URL survives loop remounts
  React.useLayoutEffect(() => {
    if (!imgRef.current || !J || t < 6.5) return;
    if (!cacheRef.current) {
      const buf = document.createElement("canvas"); buf.width = 576; buf.height = 380;
      const [cx, cy] = J.m2w(-0.06, -2.56);
      J.drawCity(buf.getContext("2d"), 576, 380, { x: cx, y: cy, z: 17.8, rot: 0.32, pitch: 0.7 },
        { hexOpacity: 0, spot: { x: cx, y: cy, rKm: 0.038, bldg: true }, spotPhase: 0.9, live: { on: true, t: 44, alpha: 0.8 }, labels: true });
      cacheRef.current = buf.toDataURL("image/jpeg", 0.92);
    }
    if (!imgRef.current.src) imgRef.current.src = cacheRef.current;
  }, [t]);
  const up = eO(f01(t, 6.5, 7.3));
  const down = eIO(f01(t, 12.9, 13.5));
  if (t < 6.5 || down >= 1) return null;
  const ty = lerp(1560, 430, up) + down * 1560;
  const noteK = eO(f01(t, 7.5, 8.1));
  const inStore = eO(f01(t, 10.4, 11.0));
  const xf = Math.abs(inStore - 0.5) * 2;              // crossfade helper
  const ctxRow = (t0, k, v, warm) => {
    const rk = f01(t, t0, t0 + 0.4);
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "11px 0", borderTop: "1.5px solid #F2F3F4", opacity: rk, transform: `translateY(${(1 - eO(rk)) * 8}px)` }}>
        <span style={{ fontFamily: GROT, fontSize: 23, color: INK }}>{k}</span>
        <span style={{ fontFamily: MONO, fontSize: 17, color: warm ? SIG : MUT }}>{v}</span>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 210, width: 660, top: 0, transform: `translateY(${ty}px)`, opacity: 1 - down }}>
      <div style={{ background: "#FFFFFF", borderRadius: 68, border: "3px solid rgba(22,24,26,.75)", boxShadow: "0 34px 90px rgba(22,24,26,.16)", overflow: "hidden", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 38px 8px", fontFamily: MONO, fontSize: 21, color: INK }}>
          <span>9:41</span>
          <span style={{ letterSpacing: ".1em", color: MUT }}>▪ ▪ ▪</span>
        </div>
        <div style={{ padding: "8px 38px 14px", borderBottom: "1.5px solid " + LINE }}>
          <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 37, color: INK }}>Canal St Café</div>
          <div style={{ fontFamily: MONO, fontSize: 18, color: inStore > 0.5 ? INK : MUT, marginTop: 5, opacity: 0.4 + 0.6 * xf }}>
            {inStore > 0.5 ? "In store · counter pickup" : "your app · open till 7"}
          </div>
        </div>
        <img ref={imgRef} width={576} height={380} alt="" style={{ width: "100%", height: 380, display: "block", background: "#FAFAF9" }} />
        <div style={{ padding: "6px 38px 12px" }}>
          {ctxRow(8.4, "At the door", "just now", true)}
          {ctxRow(8.7, "12th visit this month", "regular")}
          {ctxRow(9.0, "Counter pickup", "2 ahead, 3 min")}
          {ctxRow(10.8, "Visit 12 logged", "reward unlocked · no scan", true)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "14px 38px 20px", borderTop: "1.5px solid " + LINE }}>
          <div style={{ opacity: 0.4 + 0.6 * xf }}>
            <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 25, color: INK }}>Oat flat white</div>
            <div style={{ fontFamily: MONO, fontSize: 17, color: inStore > 0.5 ? SIG : MUT, marginTop: 3 }}>
              {inStore > 0.5 ? "on the bar in 2 min" : "your usual · $5.25"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontFamily: GROT, fontWeight: 600, fontSize: 22, color: PAPER, background: INK, borderRadius: 14, padding: "14px 30px", opacity: 0.4 + 0.6 * xf }}>
            {inStore > 0.5 ? "Pay" : "Reorder"}
          </div>
        </div>
        <div style={{
          position: "absolute", left: 24, right: 24, top: 78,
          transform: `translateY(${lerp(-160, 0, noteK)}px)`, opacity: noteK * (1 - eO(f01(t, 9.9, 10.4))),
          background: "rgba(252,252,251,.98)", border: "1.5px solid " + LINE, borderRadius: 24,
          boxShadow: "0 14px 40px rgba(22,24,26,.13)", padding: "22px 26px", display: "flex", gap: 18, alignItems: "center"
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 15, background: INK, color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 700, fontSize: 30, flex: "none" }}>C</div>
          <div>
            <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 26, color: INK }}>Welcome in.</div>
            <div style={{ fontFamily: GROT, fontSize: 22, color: "#4A4E54", marginTop: 3 }}>Oat flat white, again? Next one's on us.</div>
          </div>
          <div style={{ marginLeft: "auto", alignSelf: "flex-start", fontFamily: MONO, fontSize: 17, color: FNT }}>now</div>
        </div>
      </div>
    </div>
  );
}
function AdPlacesRoot({ endTagline, endSub }) {
  const t = useTime();
  const J = window.JanusScene;
  const tl = React.useMemo(() => {
    if (!J) return null;
    const d = J.m2w(0, 1);
    return { rot0: Math.atan2(d[0], d[1]), cell: J.m2w(-0.06, -2.56) };
  }, [J]);
  if (!tl) return <div style={{ position: "absolute", inset: 0, background: PAPER }} />;
  const camFn = (tt) => {
    const glideU = lerp(-1.92, -2.44, f01(tt, 0, 4.5));      // street run
    const settle = eIO(f01(tt, 4.5, 6.5));                    // the turn
    const creep = 0.018 * f01(tt, 6.5, 13.4);
    const rise = eIO(f01(tt, 13.6, 15.2));                    // gentle lift — stays in the neighborhood
    const [gx, gy] = J.m2w(-0.004, glideU);
    const [sx, sy] = J.m2w(-0.052, -2.532 - creep);
    const [rx, ry] = J.m2w(-0.058, -2.505);
    return {
      x: lerp(lerp(gx, sx, settle), rx, rise),
      y: lerp(lerp(gy, sy, settle), ry, rise),
      z: lerp(lerp(17.95, 18.3, settle), 16.1, rise),
      rot: lerp(lerp(tl.rot0, 0.3, settle), 0.27, rise),
      pitch: lerp(0.86, 0.81, rise)
    };
  };
  const optsFn = (tt) => {
    const spotPhase = eO(f01(tt, 5.3, 6.1)) * (1 - f01(tt, 13.5, 14.3));
    return {
      hexOpacity: 0,
      spot: spotPhase > 0.02 ? { x: tl.cell[0], y: tl.cell[1], rKm: 0.052, bldg: true } : null,
      spotPhase,
      live: (function () {
        const la = lerp(0.5, 1, f01(tt, 13.8, 14.7)) * (1 - f01(tt, 15.0, 15.6));
        return la > 0.01 ? { on: true, t: 30 + tt, alpha: la } : null;
      })(),
      labels: true, __f: 1
    };
  };
  const closeLine = (t0, t1, text) => {
    const k = f01(t, t0, t0 + 0.5) - f01(t, t1 - 0.35, t1);
    if (k <= 0) return null;
    return (
      <div style={{ position: "absolute", left: 60, right: 60, bottom: 520, textAlign: "center", fontFamily: GROT, fontWeight: 600, fontSize: 40, letterSpacing: "-.012em", lineHeight: 1.2, color: INK, opacity: k, transform: `translateY(${(1 - eO(k)) * 12}px)` }}>{text}</div>
    );
  };
  return (
    <div data-screen-label={"ad-places t=" + Math.floor(t) + "s"} style={{ position: "absolute", inset: 0, background: PAPER, overflow: "hidden" }}>
      <MapShot t={t} on={true} camFn={camFn} optsFn={optsFn} fadeIn={f01(t, 0, 0.5)} />
      <PhoneShot t={t} />
      <CaptionTop t={t} beats={[
        { t0: 0.6, t1: 4.6, text: "Intent arrives first.", size: 62 },
        { t0: 8.2, t1: 10.1, text: "The usual in one tap.", size: 54 }
      ]} />
      {closeLine(11.8, 13.4, "Ready when they arrive.")}
      <EndCard t={t} t0={14.6} globe={true} tagline={endTagline || "Regulars aren't luck."}
        sub={endSub || "Geospatial infrastructure and intelligence."} />
    </div>
  );
}
function JanusAdPlaces(props) {
  return <Stage width={1080} height={1920} duration={22} fps={30} background="#FCFCFB" autoplay={true} loop={true}><AdPlacesRoot endTagline={props && props.endTagline} endSub={props && props.endSub} /></Stage>;
}
window.JanusAdPlaces = JanusAdPlaces;

/* ============================================================
   AD 02 — ONE ZIP ("Price the street, not the ZIP.")
   ============================================================ */
function ZipLedger({ t }) {
  const k = eO(f01(t, 2.2, 2.75)) - f01(t, 11.4, 11.9);
  if (k <= 0) return null;
  const row = (label, a, b, unit, t0) => {
    const rk = f01(t, t0, t0 + 0.5);
    if (rk <= 0) return null;
    return (
      <div style={{ display: "flex", alignItems: "baseline", padding: "17px 0", borderTop: "1.5px solid #F2F3F4", opacity: rk, transform: `translateY(${(1 - eO(rk)) * 9}px)` }}>
        <span style={{ fontFamily: GROT, fontSize: 26, color: "#4A4E54", width: 300, flex: "none" }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 27, color: INK, width: 210 }}><b>{typeof a === "function" ? a() : a}</b></span>
        <span style={{ fontFamily: MONO, fontSize: 27, color: INK, width: 210 }}><b>{typeof b === "function" ? b() : b}</b></span>
        <span style={{ fontFamily: MONO, fontSize: 18, color: MUT }}>{unit}</span>
      </div>
    );
  };
  const cnt = (t0, to, dp) => () => (to * eO(f01(t, t0, t0 + 0.8))).toFixed(dp);
  return (
    <div style={{ position: "absolute", left: 64, right: 64, bottom: 320, background: "rgba(252,252,251,.97)", border: "1.5px solid #DADBDD", borderRadius: 14, padding: "26px 34px 18px", opacity: k, boxShadow: "0 18px 60px rgba(22,24,26,.09)" }}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: ".12em", color: MUT, width: 300, flex: "none" }}>ZIP 10013</span>
        <span style={{ fontFamily: MONO, fontSize: 19, letterSpacing: ".06em", color: SIG, width: 210 }}>CELL A ⬡</span>
        <span style={{ fontFamily: MONO, fontSize: 19, letterSpacing: ".06em", color: MUT, width: 210 }}>CELL B ⬡</span>
      </div>
      <div style={{ marginTop: 14 }}>
        {row("Fatal rate", cnt(3.0, 0.34, 2), cnt(3.0, 2.06, 2), "/ 100 M veh-mi", 3.0)}
        {row("Hazard loss", () => "$" + Math.round(412 * eO(f01(t, 4.4, 5.2))) + " K", () => "$" + Math.round(38 * eO(f01(t, 4.4, 5.2))) + " K", "/ yr · FEMA NRI", 4.4)}
        {row("Traffic", () => Math.round(24300 * eO(f01(t, 5.8, 6.6))).toLocaleString("en-US"), () => Math.round(6100 * eO(f01(t, 5.8, 6.6))).toLocaleString("en-US"), "veh/day · measured", 5.8)}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 17, letterSpacing: ".05em", color: MUT, paddingTop: 16, opacity: f01(t, 7.0, 7.5) }}>same ZIP · 400 m apart · six times the rate</div>
    </div>
  );
}
function AdZipRoot() {
  const t = useTime();
  const J = window.JanusScene;
  const tl = React.useMemo(() => {
    if (!J) return null;
    const [ax, ay] = J.m2w(-0.06, -2.56);
    const [bx, by] = J.m2w(-0.24, -2.66);
    return { ax, ay, bx, by, midx: (ax + bx) / 2, midy: (ay + by) / 2 };
  }, [J]);
  if (!tl) return <div style={{ position: "absolute", inset: 0, background: PAPER }} />;
  const camFn = (tt) => {
    const out = eIO(f01(tt, 8.4, 10.2));
    return {
      x: tl.midx, y: lerp(tl.midy - 0.06, tl.midy + 0.4, out),
      z: lerp(15.15, 12.4, out),
      rot: 0.3, pitch: lerp(0.78, 0.66, out)
    };
  };
  const optsFn = (tt) => {
    const mix = f01(tt, 8.8, 9.9);
    return {
      selected: { x: tl.ax, y: tl.ay }, selectedPhase: eO(f01(tt, 0.4, 0.9)),
      selected2: { x: tl.bx, y: tl.by, ink: true }, selected2Phase: eO(f01(tt, 0.9, 1.4)),
      shade: mix > 0.02 ? "wt_visit_count" : "", shadeMix: mix, labels: true,
      __f: Math.round(f01(tt, 8.4, 10.2) * 40)
    };
  };
  return (
    <div data-screen-label={"ad-zip t=" + Math.floor(t) + "s"} style={{ position: "absolute", inset: 0, background: PAPER, overflow: "hidden" }}>
      <MapShot t={t} on={t < 15} camFn={camFn} optsFn={optsFn} />
      <CaptionTop t={t} beats={[
        { t0: 0.4, t1: 4.8, text: "Same ZIP code." },
        { t0: 5.1, t1: 8.3, text: "Not the same street." },
        { t0: 9.4, t1: 11.6, text: "Rates with named denominators, every 174 m.", size: 52 }
      ]} />
      <ZipLedger t={t} />
      <EndCard t={t} t0={12.1} tagline="Price the street, not the ZIP."
        sub="Geospatial infrastructure and intelligence." />
    </div>
  );
}
function JanusAdZip() {
  return <Stage width={1080} height={1920} duration={15} fps={30} background="#FCFCFB" autoplay={true} loop={true}><AdZipRoot /></Stage>;
}
window.JanusAdZip = JanusAdZip;

/* ============================================================
   AD 03 — MOVES ("For everything that moves.")
   ============================================================ */
function AdMovesRoot() {
  const t = useTime();
  const J = window.JanusScene;
  const tl = React.useMemo(() => {
    if (!J) return null;
    const [lx, ly] = J.m2w(-0.1, -2.0);
    const [mx, my] = J.m2w(0.2, 0.2);
    return { lx, ly, mx, my };
  }, [J]);
  const liveCam = (tt) => {
    const out = eIO(f01(tt, 10.0, 11.6));
    return { x: lerp(tl.lx, tl.mx, out), y: lerp(tl.ly, tl.my, out), z: lerp(13.25, 11.9, out), rot: 0.24, pitch: 0.72 };
  };
  const liveOpts = (tt) => {
    const mix = f01(tt, 10.2, 11.3);
    return { live: { on: true, t: 30 + tt, alpha: 1 }, labels: true, shade: mix > 0.02 ? "kontur_population" : "", shadeMix: mix, __f: 1 };
  };
  const seg2 = t >= 4.2 && t < 7.2, seg4 = t >= 9.6;
  return (
    <div data-screen-label={"ad-moves t=" + Math.floor(t) + "s"} style={{ position: "absolute", inset: 0, background: PAPER, overflow: "hidden" }}>
      {/* S1 robot */}
      <SideScene t={t} mode="robot" t0={0} t1={4.2} kb={true} />
      {t >= 0.7 && t < 4.2 && (
        <div style={{ position: "absolute", left: 100, top: 1450, opacity: f01(t, 0.7, 1.2) - f01(t, 3.7, 4.2) }}>
          <VibTrace t={t} t0={0.7} t1={4.2} />
          <Chip style={{ marginTop: 18, display: "inline-block" }}><b>2.1 m/s² RMS</b><span style={{ color: MUT }}> · walk vibration · measured, 14 traces</span></Chip>
        </div>
      )}
      {/* S2 live top-down */}
      {tl && <MapShot t={t} on={(seg2 || seg4) && t < 15} camFn={liveCam} optsFn={liveOpts} fadeIn={seg2 ? f01(t, 4.2, 4.9) : f01(t, 9.6, 10.2)} />}
      {seg2 && (
        <div style={{ position: "absolute", right: 70, top: 1500, opacity: f01(t, 4.9, 5.4) - f01(t, 6.7, 7.2) }}>
          <Chip><span style={{ color: MUT, textTransform: "uppercase", letterSpacing: ".08em", fontSize: 21 }}>res 9 · </span><span style={{ color: SIG }}><b>41 live</b></span></Chip>
        </div>
      )}
      {/* S3 person crossing */}
      {t >= 7.2 && t < 9.6 && <SideScene t={t - 7.2} mode="cross" t0={0} t1={2.4} kb={true} />}
      {t >= 7.5 && t < 9.6 && (
        <div style={{ position: "absolute", left: 100, top: 1490, opacity: f01(t, 7.5, 8.0) - f01(t, 9.1, 9.6) }}>
          <Chip><b>92% rollable kerbs</b><span style={{ color: MUT }}> · 6 / 8 marked crossings · OSM</span></Chip>
        </div>
      )}
      <CaptionTop t={t} beats={[
        { t0: 0.4, t1: 4.1, text: "Sidewalks shake." },
        { t0: 4.6, t1: 7.1, text: "Buses glide. Docks breathe." },
        { t0: 7.6, t1: 9.5, text: "People cross." },
        { t0: 10.3, t1: 12.1, text: "One grid holds it all. Measured, or flagged.", size: 54 }
      ]} />
      <EndCard t={t} t0={12.5} tagline="For everything that moves through the world."
        sub="Geospatial infrastructure and intelligence." />
    </div>
  );
}
function JanusAdMoves() {
  return <Stage width={1080} height={1920} duration={15} fps={30} background="#FCFCFB" autoplay={true} loop={true}><AdMovesRoot /></Stage>;
}
window.JanusAdMoves = JanusAdMoves;

/* ============================================================
   AD 04 — LOCAL ("Every app is a local app.")
   One ordinary shopping app; its homepage re-ranks as the user
   moves through the day and through places. The feed is the hero:
   same shell, the top card + its action change with where you are.
   ============================================================ */
const FG2 = "#4A4E54";

function FeedMorph({ t, stops }) {
  const up = eO(f01(t, 1.0, 1.8));
  if (t < 1.0) return null;
  const ty = lerp(1560, 792, up);           // rises once, never drops; sits lower so the lit city breathes above
  return (
    <div style={{ position: "absolute", left: 210, width: 660, top: 0, transform: `translateY(${ty}px)` }}>
      <div style={{ background: "#FFFFFF", borderRadius: 56, border: "3px solid rgba(22,24,26,.75)",
        boxShadow: "0 34px 90px rgba(22,24,26,.16)", overflow: "hidden", position: "relative", height: 566 }}>
        {/* status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 34px 4px", fontFamily: MONO, fontSize: 20, color: INK }}>
          <span>9:41</span><span style={{ letterSpacing: ".1em", color: MUT }}>▪ ▪ ▪</span>
        </div>
        {/* app identity — deliberately generic */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 34px 14px", borderBottom: "1.5px solid " + LINE }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: INK }} />
          <span style={{ fontFamily: GROT, fontWeight: 700, fontSize: 26, color: INK }}>Shop</span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 15, letterSpacing: ".06em", color: MUT }}>for you</span>
        </div>
        {/* stop bodies, crossfaded */}
        {stops.map((s, i) => {
          const next = stops[i + 1];
          const kin = eO(f01(t, s.t0, s.t0 + 0.55));
          const kout = next ? f01(t, next.t0 - 0.1, next.t0 + 0.45) : 0;
          const k = Math.max(0, kin - kout);
          if (k <= 0.001) return null;
          const heroY = (1 - eO(f01(t, s.t0, s.t0 + 0.7))) * 24;
          return (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 116, padding: "0 30px", opacity: k }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 5, background: SIG, display: "inline-block" }} />
                <span style={{ fontFamily: GROT, fontWeight: 600, fontSize: 24, color: INK }}>{s.place}</span>
                <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 15, color: MUT }}>{s.time}</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: ".14em", color: FNT, marginBottom: 16 }}>PLACED · {s.ribbon}</div>
              <div style={{ border: "1.5px solid " + LINE, borderRadius: 20, padding: "20px 22px", transform: `translateY(${heroY}px)`, background: "#FFF" }}>
                <div style={{ fontFamily: MONO, fontSize: 13.5, letterSpacing: ".12em", textTransform: "uppercase", color: MUT }}>{s.hero.cat}</div>
                <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 31, color: INK, lineHeight: 1.16, marginTop: 6 }}>{s.hero.title}</div>
                <div style={{ display: "flex", alignItems: "center", marginTop: 16 }}>
                  <span style={{ fontFamily: MONO, fontSize: 17, color: MUT }}>{s.hero.sub}</span>
                  <span style={{ marginLeft: "auto", fontFamily: GROT, fontWeight: 600, fontSize: 21, color: PAPER,
                    background: INK, borderRadius: 12, padding: "12px 24px" }}>{s.hero.cta}</span>
                </div>
              </div>
              {s.rows.map((r, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                  padding: "15px 4px", borderBottom: "1.5px solid " + LINE }}>
                  <span style={{ fontFamily: GROT, fontSize: 21, color: FG2 }}>{r.k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 15, color: MUT }}>{r.v}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdLocalRoot({ endTagline, endSub }) {
  const t = useTime();
  const J = window.JanusScene;
  const P = React.useMemo(() => {
    if (!J) return null;
    const d = J.m2w(0, 1);
    return { rot0: Math.atan2(d[0], d[1]),
      A: J.m2w(-0.02, -2.45), B: J.m2w(-0.095, -2.585), C: J.m2w(-0.02, -2.45) };
  }, [J]);
  if (!P) return <div style={{ position: "absolute", inset: 0, background: PAPER }} />;

  const camFn = (tt) => {
    let a = P.A, b = P.A, seg = 0;
    if (tt < 6.8) { a = P.A; b = P.A; }
    else if (tt < 8.2) { a = P.A; b = P.B; seg = f01(tt, 6.8, 8.2); }
    else if (tt < 12.6) { a = P.B; b = P.B; }
    else if (tt < 14.0) { a = P.B; b = P.C; seg = f01(tt, 12.6, 14.0); }
    else { a = P.C; b = P.C; }
    const e = eIO(seg);
    const gliding = (tt > 6.8 && tt < 8.2) || (tt > 12.6 && tt < 14.0);
    return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e), z: gliding ? 15.5 : 16.4, rot: 0.28, pitch: 0.85 };
  };
  const optsFn = (tt) => {
    let cell = null, ph = 0;
    if (tt >= 2.6 && tt < 7.0) { cell = P.A; ph = eO(f01(tt, 2.8, 3.5)) * (1 - f01(tt, 6.6, 7.0)); }
    else if (tt >= 8.2 && tt < 12.6) { cell = P.B; ph = eO(f01(tt, 8.4, 9.1)) * (1 - f01(tt, 12.2, 12.6)); }
    else if (tt >= 14.0 && tt < 16.7) { cell = P.C; ph = eO(f01(tt, 14.2, 14.9)) * (1 - f01(tt, 16.3, 16.7)); }
    return { hexOpacity: 0, spot: ph > 0.02 ? { x: cell[0], y: cell[1], rKm: 0.05, bldg: true } : null,
      spotPhase: ph, live: null, labels: true };
  };

  const stops = [
    { t0: 2.4, place: "Home", time: "8:12a", ribbon: "morning · at home",
      hero: { cat: "Reorder", title: "Blue Bottle beans, your usual", sub: "$18 · by tomorrow", cta: "Reorder" },
      rows: [{ k: "Oat milk ×2", v: "in cart" }, { k: "Rain today", v: "umbrellas →" }] },
    { t0: 8.2, place: "SoHo", time: "1:30p", ribbon: "near you · 2 blocks",
      hero: { cat: "In stock nearby", title: "The jacket you saved", sub: "$128 · pick up by 3pm", cta: "Pick up today" },
      rows: [{ k: "SoHo store", v: "0.2 mi" }, { k: "3 saved items", v: "nearby →" }] },
    { t0: 14.0, place: "Home", time: "7:40p", ribbon: "evening · at home",
      hero: { cat: "Dinner in 30", title: "Your usual grocery run", sub: "12 items · $54", cta: "Add to cart" },
      rows: [{ k: "Reorder essentials", v: "oat milk, eggs" }, { k: "Tonight only", v: "15% off produce" }] },
  ];

  return (
    <div data-screen-label={"ad-local t=" + Math.floor(t) + "s"} style={{ position: "absolute", inset: 0, background: PAPER, overflow: "hidden" }}>
      <MapShot t={t} on={true} camFn={camFn} optsFn={optsFn} fadeIn={f01(t, 0, 0.5)} />
      <FeedMorph t={t} stops={stops} />
      <CaptionTop t={t} beats={[{ t0: 0.6, t1: 4.4, text: "One app. All day.", size: 60 }]} />
      {(() => {
        const k = f01(t, 15.0, 15.5) - f01(t, 16.5, 16.9);
        if (k <= 0) return null;
        return <div style={{ position: "absolute", left: 60, right: 60, bottom: 150, textAlign: "center",
          fontFamily: GROT, fontWeight: 600, fontSize: 40, letterSpacing: "-.012em", color: INK,
          opacity: k, transform: `translateY(${(1 - eO(k)) * 12}px)` }}>Re-ranked by where you are.</div>;
      })()}
      <EndCard t={t} t0={16.9} globe={true} tagline={endTagline || "Every app is a local app."}
        sub={endSub || "Geospatial infrastructure and intelligence."} />
    </div>
  );
}
function JanusAdLocal(props) {
  return <Stage width={1080} height={1920} duration={22} fps={30} background="#FCFCFB" autoplay={true} loop={true}><AdLocalRoot endTagline={props && props.endTagline} endSub={props && props.endSub} /></Stage>;
}
window.JanusAdLocal = JanusAdLocal;

/* ============================================================
   AD 04b — CATALOG ("Every app is a local app.")
   Same thesis, catalog treatment: the map is the TOP zone (flying,
   unobstructed — the travel reads), the shop is a bottom sheet with
   a real product grid that re-ranks per place. New page, own component;
   existing JanusAdLocal is untouched.
   ============================================================ */

function PGlyph({ kind, s, c }) {
  const P = {
    coffee: "M7 9h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5z M17 10h2a2 2 0 0 1 0 4h-2",
    bottle: "M10 3h4v3l1 2v10a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V8l1-2z",
    umbrella: "M4 12a8 8 0 0 1 16 0z M12 12v6a2 2 0 0 0 3 0",
    bag: "M7 8h10l1 11H6z M9 8a3 3 0 0 1 6 0",
    jacket: "M8 4l4 3 4-3v15h-3v-7 M8 4v15h3",
    shoe: "M3 15h12l4 2v2H3z M3 15v-3",
    glasses: "M4 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0z M14 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0z M10 12h4",
    wine: "M9 3h6l-1 6a2 2 0 0 1-4 0z M12 11v6 M9 19h6",
    leaf: "M12 4c6 3 6 11 0 15-6-4-6-12 0-15z",
    box: "M4 8l8-4 8 4-8 4z M4 8v8l8 4 8-4V8 M12 12v8",
  };
  return (
    <svg width={s || 88} height={s || 88} viewBox="0 0 24 24" fill="none" stroke={c || "#9A9EA4"}
      strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d={P[kind] || P.box} /></svg>
  );
}

function ProdTile({ p, w }) {
  return (
    <div style={{ width: w }}>
      <div style={{ position: "relative", height: 300, borderRadius: 22,
        background: "linear-gradient(155deg,#F6F5F2,#ECECE8)", display: "flex",
        alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <PGlyph kind={p.g} s={94} />
        <span style={{ position: "absolute", top: 16, right: 20, fontFamily: GROT, fontSize: 26, color: "#C4C7CB" }}>♡</span>
        {p.tag && <span style={{ position: "absolute", left: 16, top: 16, fontFamily: MONO, fontSize: 14,
          letterSpacing: ".06em", color: PAPER, background: SIG, borderRadius: 7, padding: "5px 11px" }}>{p.tag}</span>}
      </div>
      <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 25, color: INK, marginTop: 12, lineHeight: 1.14 }}>{p.name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 5 }}>
        <span style={{ fontFamily: MONO, fontSize: 22, color: INK }}>{p.price}</span>
        {p.note && <span style={{ fontFamily: MONO, fontSize: 15, color: MUT }}>{p.note}</span>}
      </div>
    </div>
  );
}

function CatalogSheet({ t, stops }) {
  const up = eO(f01(t, 0.8, 1.8));
  const sheetY = lerp(1920, 706, up);
  const active = stops.reduce((a, s, i) => (t >= s.t0 ? i : a), 0);
  const cur = stops[active];
  const w = (1080 - 80 - 28) / 2;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, transform: `translateY(${sheetY}px)`,
      height: 1220, background: "#FFFFFF", borderTopLeftRadius: 44, borderTopRightRadius: 44,
      boxShadow: "0 -22px 60px rgba(22,24,26,.10)" }}>
      <div style={{ width: 54, height: 5, borderRadius: 3, background: "#E2E3E5", margin: "14px auto 2px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 40px 0" }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: INK }} />
        <span style={{ fontFamily: GROT, fontWeight: 700, fontSize: 26, color: INK }}>Shop</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 18, color: INK }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, background: SIG, display: "inline-block" }} />{cur.place}
        </span>
      </div>
      <div style={{ margin: "16px 40px 0", height: 52, borderRadius: 14, border: "1.5px solid " + LINE,
        display: "flex", alignItems: "center", padding: "0 18px", fontFamily: MONO, fontSize: 17, color: "#B9BCC1" }}>Search Shop</div>
      {stops.map((s, i) => {
        const next = stops[i + 1];
        const kin = eO(f01(t, s.t0, s.t0 + 0.5));
        const kout = next ? f01(t, next.t0 - 0.1, next.t0 + 0.4) : 0;
        const k = Math.max(0, kin - kout);
        if (k <= 0.001) return null;
        const gy = (1 - eO(f01(t, s.t0, s.t0 + 0.7))) * 20;
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 202, padding: "0 40px", opacity: k }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 22 }}>
              <span style={{ fontFamily: GROT, fontWeight: 600, fontSize: 31, color: INK, letterSpacing: "-.01em" }}>{s.title}</span>
              <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 15, color: MUT }}>{s.time}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "30px 28px", transform: `translateY(${gy}px)` }}>
              {s.items.map((p, j) => <ProdTile key={j} p={p} w={w} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdCatalogRoot({ endTagline, endSub }) {
  const t = useTime();
  const J = window.JanusScene;
  const P = React.useMemo(() => {
    if (!J) return null;
    return { A: J.m2w(0.0, -2.40), B: J.m2w(-0.12, -2.63), C: J.m2w(0.0, -2.40) };
  }, [J]);
  if (!P) return <div style={{ position: "absolute", inset: 0, background: PAPER }} />;

  const camFn = (tt) => {
    let a = P.A, b = P.A, seg = 0;
    if (tt < 6.8) { a = P.A; b = P.A; }
    else if (tt < 8.2) { a = P.A; b = P.B; seg = f01(tt, 6.8, 8.2); }
    else if (tt < 12.6) { a = P.B; b = P.B; }
    else if (tt < 14.0) { a = P.B; b = P.C; seg = f01(tt, 12.6, 14.0); }
    else { a = P.C; b = P.C; }
    const e = eIO(seg);
    const gliding = (tt > 6.8 && tt < 8.2) || (tt > 12.6 && tt < 14.0);
    return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e), z: gliding ? 14.7 : 15.9, rot: 0.28, pitch: 0.9 };
  };
  const optsFn = () => ({ hexOpacity: 0, spot: null, live: null, labels: true });

  const stops = [
    { t0: 2.4, place: "Home", time: "8:12a", title: "Your morning",
      items: [
        { g: "coffee", name: "Blue Bottle beans", price: "$18", note: "your usual", tag: "REORDER" },
        { g: "bottle", name: "Oatly oat milk ×2", price: "$9", note: "running low" },
        { g: "umbrella", name: "Compact umbrella", price: "$24", note: "rain today" },
        { g: "box", name: "Weekly basket", price: "$54", note: "refill" }] },
    { t0: 8.2, place: "SoHo", time: "1:30p", title: "Near you · SoHo",
      items: [
        { g: "jacket", name: "The jacket you saved", price: "$128", note: "0.2 mi", tag: "PICK UP TODAY" },
        { g: "shoe", name: "Runners, your size", price: "$95", note: "in stock" },
        { g: "bag", name: "Weekend tote", price: "$210", note: "new in" },
        { g: "glasses", name: "Sun, trending here", price: "$60", note: "nearby" }] },
    { t0: 14.0, place: "Home", time: "7:40p", title: "Tonight",
      items: [
        { g: "box", name: "Your usual grocery run", price: "$54", note: "12 items", tag: "DINNER IN 30" },
        { g: "wine", name: "Pairs with tonight", price: "$22", note: "delivered" },
        { g: "leaf", name: "Produce box", price: "$16", note: "15% off" },
        { g: "coffee", name: "Decaf for later", price: "$14", note: "add on" }] },
  ];

  const active = stops.reduce((a, s, i) => (t >= s.t0 ? i : a), 0);
  const cur = stops[active];
  const pin = eO(f01(t, 3.4, 4.1)) * (1 - f01(t, 16.5, 16.9));

  return (
    <div data-screen-label={"ad-catalog t=" + Math.floor(t) + "s"} style={{ position: "absolute", inset: 0, background: PAPER, overflow: "hidden" }}>
      <MapShot t={t} on={true} camFn={camFn} optsFn={optsFn} fadeIn={f01(t, 0, 0.5)} />
      {pin > 0.01 && (
        <div style={{ position: "absolute", left: 60, top: 494, display: "flex", alignItems: "center", gap: 14, opacity: pin }}>
          <span style={{ width: 16, height: 16, borderRadius: 8, background: SIG, boxShadow: "0 0 0 6px rgba(217,72,15,.15)" }} />
          <span style={{ fontFamily: GROT, fontWeight: 600, fontSize: 36, letterSpacing: "-.01em", color: INK,
            textShadow: "0 0 8px #FCFCFB, 0 1px 12px #FCFCFB" }}>{cur.place}</span>
          <span style={{ fontFamily: MONO, fontSize: 20, color: MUT, textShadow: "0 0 6px #FCFCFB" }}>{cur.time}</span>
        </div>
      )}
      <CatalogSheet t={t} stops={stops} />
      <CaptionTop t={t} beats={[{ t0: 0.6, t1: 3.8, text: "One app. Every place.", size: 58 }]} />
      <EndCard t={t} t0={16.9} globe={true} tagline={endTagline || "Every app is a local app."}
        sub={endSub || "Geospatial infrastructure and intelligence."} />
    </div>
  );
}
function JanusAdCatalog(props) {
  return <Stage width={1080} height={1920} duration={22} fps={30} background="#FCFCFB" autoplay={true} loop={true}><AdCatalogRoot endTagline={props && props.endTagline} endSub={props && props.endSub} /></Stage>;
}
window.JanusAdCatalog = JanusAdCatalog;

/* ============================================================
   AD 05 — MIRRORS ("Three apps. One layer.")
   Same person moving through the city; at each move the phone shows
   a DIFFERENT real app doing its real location behavior:
     move 1 · Store Mode      (walk in → the app becomes the store)   [live geofence]
     move 2 · Delivery        (get home → a different storefront)     [DoorDash-style]
     move 3 · Local discovery (head out → what's good right here)     [Yelp/Snap-style]
   Movement shows in the transitions: the phone shrinks and rides the
   flying map between moves, then grows so each app reads clearly.
   New page, own component; nothing existing changes.
   ============================================================ */

function MStatus() {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "20px 34px 6px", fontFamily: MONO, fontSize: 19, color: INK }}>
      <span>9:41</span><span style={{ letterSpacing: ".1em", color: MUT }}>▪ ▪ ▪</span>
    </div>
  );
}
function MBrand({ mark, name, right, live }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 34px 14px", borderBottom: "1.5px solid " + LINE }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: INK }} />
      <span style={{ fontFamily: GROT, fontWeight: 700, fontSize: 25, color: INK, letterSpacing: "-.01em" }}>{name}</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, fontFamily: MONO, fontSize: 16, color: INK }}>
        {live && <span style={{ width: 9, height: 9, borderRadius: 5, background: SIG, display: "inline-block" }} />}{right}
      </span>
    </div>
  );
}
function MThumb({ letter, w }) {
  return (
    <div style={{ width: w || 96, height: w || 96, borderRadius: 16, flex: "none",
      background: "linear-gradient(150deg,#F6F5F2,#E9E9E5)", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: GROT, fontWeight: 700, fontSize: 40, color: "#C4C7CB" }}>{letter}</div>
  );
}
function MRow({ thumb, title, sub, r1, r2, warm, st }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 0", borderBottom: "1.5px solid " + LINE, ...(st || {}) }}>
      {thumb != null && <MThumb letter={thumb} />}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 25, color: INK, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontFamily: MONO, fontSize: 15, color: MUT, marginTop: 4 }}>{sub}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 22, color: INK }}>{r1}</div>
        {r2 && <div style={{ fontFamily: MONO, fontSize: 14, color: warm ? SIG : MUT, marginTop: 3 }}>{r2}</div>}
      </div>
    </div>
  );
}

// each screen renders a GENERIC (same for everyone) and a PLACED (local) state;
// the root crossfades generic→placed at the "flip" when the footprint locks in.
function HL(title, meta, st) {
  return (
    <div style={{ ...st, padding: "11px 0", borderBottom: "1.5px solid " + LINE }}>
      <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 23, color: INK, lineHeight: 1.18 }}>{title}</div>
      <div style={{ fontFamily: MONO, fontSize: 13, color: MUT, marginTop: 4 }}>{meta}</div>
    </div>
  );
}
function imbox(w, h, r) { return { width: w, height: h, borderRadius: r || 14, flex: "none", background: "linear-gradient(135deg,#EDEDEA,#D8D8D3 55%,#E7E7E2)" }; }
function GTile({ g, name, price, st }) {
  return (
    <div style={{ ...st, width: "47%" }}>
      <div style={{ ...imbox("100%", 128, 14), display: "flex", alignItems: "center", justifyContent: "center" }}><PGlyph kind={g} s={56} /></div>
      <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 20, color: INK, marginTop: 9, lineHeight: 1.1 }}>{name}</div>
      <div style={{ fontFamily: MONO, fontSize: 15, color: MUT, marginTop: 3 }}>{price}</div>
    </div>
  );
}

function ScreenShopping({ placed, tt }) {
  const R = (d) => { const k = eO(f01(tt, d * 0.55, d * 0.55 + 0.32)); return { opacity: k, transform: `translateY(${(1 - k) * 16}px)` }; };
  if (!placed) return (
    <div>
      <MStatus />
      <MBrand name="Aisle" right="Shop" />
      <div style={{ padding: "16px 34px 0" }}>
        <div style={{ height: 50, borderRadius: 13, border: "1.5px solid " + LINE, display: "flex", alignItems: "center", padding: "0 16px", fontFamily: MONO, fontSize: 16, color: "#B9BCC1", marginBottom: 16 }}>Search Aisle</div>
        <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: ".12em", textTransform: "uppercase", color: MUT, marginBottom: 14 }}>Popular right now</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "22px 28px" }}>
          <GTile g="box" name="Wireless buds" price="$99" /><GTile g="shoe" name="Everyday runner" price="$95" />
          <GTile g="bag" name="Canvas tote" price="$60" /><GTile g="bottle" name="Steel bottle" price="$24" />
        </div>
      </div>
    </div>
  );
  const PTile = (name, meta, st) => (
    <div style={{ ...st, width: "47%" }}>
      <div style={imbox("100%", 150, 14)} />
      <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 21, color: INK, marginTop: 9, lineHeight: 1.1 }}>{name}</div>
      <div style={{ fontFamily: MONO, fontSize: 14, color: MUT, marginTop: 3 }}>{meta}</div>
    </div>
  );
  return (
    <div>
      <MStatus />
      <MBrand name="Aisle" right="In store" live />
      <div style={{ padding: "16px 34px 0" }}>
        <div style={{ ...R(0.0), fontFamily: MONO, fontSize: 14, letterSpacing: ".14em", color: FNT, marginBottom: 12 }}>STORE MODE · SOHO</div>
        <div style={{ ...R(0.08), display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          background: INK, color: PAPER, borderRadius: 16, padding: "18px 0", marginBottom: 18 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={PAPER} strokeWidth="1.6"><path d="M4 5v14M8 5v14M11 5v14M14 5v14M18 5v14M21 5v14" /></svg>
          <span style={{ fontFamily: GROT, fontWeight: 600, fontSize: 23 }}>Scan a barcode</span>
        </div>
        <div style={{ ...R(0.18), fontFamily: MONO, fontSize: 14, letterSpacing: ".12em", textTransform: "uppercase", color: MUT, marginBottom: 14 }}>Picked for you here</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px" }}>
          {PTile("Everyday runner", "Aisle 7 · your size", R(0.26))}
          {PTile("Trail jacket", "20% off · today", R(0.34))}
        </div>
        <div style={{ ...R(0.46), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 0" }}>
          <span style={{ fontFamily: GROT, fontWeight: 600, fontSize: 22, color: INK }}>Your rewards</span>
          <span style={{ fontFamily: MONO, fontSize: 18, color: INK }}>2,140 pts</span>
        </div>
      </div>
    </div>
  );
}
function ScreenDelivery({ placed, tt }) {
  const R = (d) => { const k = eO(f01(tt, d * 0.55, d * 0.55 + 0.32)); return { opacity: k, transform: `translateY(${(1 - k) * 16}px)` }; };
  const DRow = (name, sub, r1, r2, warm, st) => (
    <div style={{ ...st, display: "flex", alignItems: "center", gap: 15, padding: "12px 0", borderBottom: "1.5px solid " + LINE }}>
      <div style={imbox(94, 94, 16)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 23, color: INK }}>{name}</div>
        <div style={{ fontFamily: MONO, fontSize: 14, color: MUT, marginTop: 4 }}>{sub}</div>
      </div>
      <div style={{ textAlign: "right", flex: "none" }}>
        <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 21, color: INK }}>{r1}</div>
        {r2 && <div style={{ fontFamily: MONO, fontSize: 14, color: warm ? SIG : MUT, marginTop: 3 }}>{r2}</div>}
      </div>
    </div>
  );
  if (!placed) return (
    <div>
      <MStatus />
      <MBrand name="Munch" right="Set address" />
      <div style={{ padding: "14px 34px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F6F5F2", borderRadius: 14, padding: "16px 18px", marginBottom: 14 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth="1.6"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>
          <span style={{ fontFamily: GROT, fontWeight: 600, fontSize: 20, color: FG2 }}>Where should we deliver?</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: ".12em", textTransform: "uppercase", color: MUT, marginBottom: 6 }}>Popular chains</div>
        {DRow("Chipotle", "Mexican · national", "—", null)}
        {DRow("Sweetgreen", "Salads · national", "—", null)}
        {DRow("Shake Shack", "Burgers · national", "—", null)}
      </div>
    </div>
  );
  return (
    <div>
      <MStatus />
      <MBrand name="Munch" right="Home" live />
      <div style={{ padding: "14px 34px 0" }}>
        <div style={{ ...R(0.0), fontFamily: GROT, fontWeight: 600, fontSize: 26, color: INK, marginBottom: 4 }}>Delivering to you now</div>
        <div style={{ ...R(0.04), fontFamily: MONO, fontSize: 14, color: MUT, marginBottom: 12 }}>fastest to Home · West Village</div>
        <div style={{ ...R(0.1), display: "flex", gap: 8, marginBottom: 8 }}>
          {["Indian", "Sushi", "Italian", "Thai"].map((c, i) => (
            <span key={i} style={{ fontFamily: MONO, fontSize: 14, color: i === 0 ? PAPER : MUT, background: i === 0 ? INK : "transparent", border: "1.5px solid " + (i === 0 ? INK : LINE), borderRadius: 99, padding: "6px 13px" }}>{c}</span>
          ))}
        </div>
        {DRow("Rowdy Rooster", "Indian · ★ 4.8", "11 min", "$0 fee", true, R(0.2))}
        {DRow("Sena Sushi", "Japanese · ★ 4.7", "14 min", "$1.99", false, R(0.32))}
        {DRow("Nonna's", "Italian · ★ 4.6", "18 min", "$0 fee", true, R(0.44))}
      </div>
    </div>
  );
}
function ScreenNews({ placed, tt }) {
  const R = (d) => { const k = eO(f01(tt, d * 0.55, d * 0.55 + 0.32)); return { opacity: k, transform: `translateY(${(1 - k) * 16}px)` }; };
  const IMG = (w, h) => ({ width: w, height: h, borderRadius: 12, flex: "none", background: "linear-gradient(135deg,#EBEBE7,#D8D8D3 55%,#E6E6E1)" });
  const NRow = (title, meta, st) => (
    <div style={{ ...st, display: "flex", gap: 16, alignItems: "center", padding: "13px 0", borderBottom: "1.5px solid " + LINE }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 21, color: INK, lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontFamily: MONO, fontSize: 13, color: MUT, marginTop: 5 }}>{meta}</div>
      </div>
      <div style={IMG(116, 84)} />
    </div>
  );
  if (!placed) return (
    <div>
      <MStatus />
      <div style={{ padding: "2px 34px 12px", borderBottom: "2px solid " + INK }}>
        <div style={{ fontFamily: GROT, fontWeight: 700, fontSize: 33, letterSpacing: "-.02em", color: INK }}>The Dispatch</div>
        <div style={{ fontFamily: MONO, fontSize: 13, color: MUT, marginTop: 2 }}>Tuesday · Top stories</div>
      </div>
      <div style={{ padding: "12px 34px 0" }}>
        <div style={IMG("100%", 176)} />
        <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 26, color: INK, lineHeight: 1.18, margin: "12px 0 3px" }}>Fed holds rates steady as markets rally</div>
        <div style={{ fontFamily: MONO, fontSize: 13, color: MUT, marginBottom: 4 }}>Business · 2h ago</div>
        {NRow("Congress nears budget deadline", "Politics · 3h ago")}
        {NRow("Global summit opens in Geneva", "World · 5h ago")}
      </div>
    </div>
  );
  return (
    <div>
      <MStatus />
      <div style={{ padding: "2px 34px 12px", borderBottom: "2px solid " + INK }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontFamily: GROT, fontWeight: 700, fontSize: 33, letterSpacing: "-.02em", color: INK }}>The Dispatch</div>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, fontFamily: MONO, fontSize: 15, color: INK }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: SIG, display: "inline-block" }} />SoHo</span>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 13, color: MUT, marginTop: 2 }}>Tuesday · Your neighborhood</div>
      </div>
      <div style={{ padding: "12px 34px 0" }}>
        <div style={{ ...R(0.0), display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".14em", color: SIG }}>LOCAL · SOHO, NYC</span>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 14, color: MUT }}>◐ 54° · clear</span>
        </div>
        <div style={{ ...R(0.14), ...IMG("100%", 172) }} />
        <div style={{ ...R(0.24), fontFamily: GROT, fontWeight: 600, fontSize: 26, color: INK, lineHeight: 1.18, margin: "12px 0 3px" }}>Broome St repaving starts Monday</div>
        <div style={{ ...R(0.3), fontFamily: MONO, fontSize: 13, color: MUT, marginBottom: 4 }}>Your block · 20 min ago</div>
        {NRow("New café opens on Prince Street", "2 blocks away · 1h ago", R(0.42))}
        {NRow("PS 130 board vote tonight", "Local · schools", R(0.54))}
      </div>
    </div>
  );
}

function AdMirrorsRoot({ endTagline, endSub }) {
  const t = useTime();
  const J = window.JanusScene;
  const P = React.useMemo(() => {
    if (!J) return null;
    // real neighborhood world-coords (from JanusScene.LABELS) — a true trip across town
    // A ~ Canal/SoHo · B ~ Flatiron/Gramercy (north) · C ~ Lower East Side (east)
    return { A: [-1.12, -2.12], B: [0.5, 0.34], C: [-0.44, -1.9] };
  }, [J]);
  if (!P) return <div style={{ position: "absolute", inset: 0, background: PAPER }} />;

  const moves = [
    { t0: 1.8, cell: P.A, screen: "shop" },
    { t0: 8.4, cell: P.B, screen: "deliv" },
    { t0: 15.0, cell: P.C, screen: "news" },
  ];
  const END = 20.4;
  const FLIP0 = 2.0, FLIP1 = 2.5, RECEDE = 4.6, GONE = 5.4;   // offsets from t0

  // deep dolly-in on each building (the highlight); between neighborhoods a
  // graceful lift → glide → drop (rise to a mid travel altitude to cross the
  // real distance, then settle back deep) — never a jarring full pull-out
  const ZD = 17.3, ZT = 13.0;   // deep arrival zoom · mid travel altitude (neighborhoods are far apart)
  const camFn = (tt) => {
    const rot = 0.28, pitch = 0.9;
    const A = P.A, B = P.B, C = P.C, m0 = moves[0].t0, m1 = moves[1].t0, m2 = moves[2].t0;
    if (tt < m0) { const p = eIO(f01(tt, 0, m0)); return { x: A[0], y: lerp(A[1] - 0.03, A[1], p), z: lerp(ZT, ZD, p), rot, pitch }; }
    const rec0 = m0 + RECEDE, rec1 = m1 + RECEDE;
    const trip = (a, b, t0, t1) => { const p = f01(tt, t0, t1); const e = eIO(p); return { x: lerp(a[0], b[0], e), y: lerp(a[1], b[1], e), z: ZD + (ZT - ZD) * Math.sin(p * Math.PI), rot, pitch }; };
    if (tt < rec0) return { x: A[0], y: A[1], z: ZD, rot, pitch };
    if (tt < m1) return trip(A, B, rec0, m1);
    if (tt < rec1) return { x: B[0], y: B[1], z: ZD, rot, pitch };
    if (tt < m2) return trip(B, C, rec1, m2);
    return { x: C[0], y: C[1], z: ZD, rot, pitch };
  };
  const optsFn = (tt) => {
    let cell = null, ph = 0;
    for (const m of moves) {
      const rs = m.t0 + RECEDE, re = m.t0 + RECEDE + 0.7;
      if (tt >= m.t0 - 0.3 && tt < re) {
        cell = m.cell;
        const lock = 1 + 0.5 * (f01(tt, m.t0 + FLIP0, m.t0 + FLIP0 + 0.2) - f01(tt, m.t0 + FLIP0 + 0.2, m.t0 + FLIP0 + 0.7));  // pulse at flip
        ph = eO(f01(tt, m.t0, m.t0 + 0.6)) * (1 - f01(tt, rs, re)) * lock;
        break;
      }
    }
    return { hexOpacity: 0, spot: (cell && ph > 0.02) ? { x: cell[0], y: cell[1], rKm: 0.05, bldg: true } : null, spotPhase: Math.min(1, ph), live: null, labels: true };
  };

  let phoneTop = 1920, phoneK = 0, screen = null, gK = 0, pK = 0, gTime = 0, pTime = 0;
  for (const m of moves) {
    const rise0 = m.t0 + 0.6, rise1 = m.t0 + 1.3, flip0 = m.t0 + FLIP0, flip1 = m.t0 + FLIP1, rs = m.t0 + RECEDE, re = m.t0 + GONE;
    if (t >= rise0 - 0.01 && t < re) {
      const riseP = eO(f01(t, rise0, rise1)), recP = eIO(f01(t, rs, re));
      phoneTop = 636 + (1 - riseP) * 1300 + recP * 1300;
      phoneK = eO(f01(t, rise0, rise0 + 0.4)) * (1 - f01(t, re - 0.35, re));
      screen = m.screen;
      gK = 1 - eO(f01(t, flip0, flip1));
      pK = eO(f01(t, flip0, flip1));
      gTime = t - rise1; pTime = t - flip1;
      break;
    }
  }
  const PB = { w: 640, h: 806, left: 220 };
  const S = { shop: ScreenShopping, deliv: ScreenDelivery, news: ScreenNews }[screen];

  return (
    <div data-screen-label={"ad-mirrors t=" + Math.floor(t) + "s"} style={{ position: "absolute", inset: 0, background: PAPER, overflow: "hidden" }}>
      <MapShot t={t} on={true} camFn={camFn} optsFn={optsFn} fadeIn={f01(t, 0, 0.5)} />

      {S && phoneK > 0.01 && (
        <div style={{ position: "absolute", left: PB.left, top: phoneTop, width: PB.w, height: PB.h, opacity: phoneK }}>
          <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", borderRadius: 56,
            border: "3px solid rgba(22,24,26,.8)", boxShadow: "0 34px 100px rgba(22,24,26,.20)", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: gK }}><S placed={false} tt={gTime} /></div>
            <div style={{ position: "absolute", inset: 0, opacity: pK }}><S placed={true} tt={pTime} /></div>
          </div>
        </div>
      )}

      <CaptionTop t={t} y={468} beats={[
        { t0: 2.5, t1: 6.9, text: "A store that knows the aisle you're in.", size: 42 },
        { t0: 9.1, t1: 13.5, text: "Dinner that knows your doorstep.", size: 42 },
        { t0: 15.7, t1: 20.2, text: "News that knows your block.", size: 42 },
      ]} />

      <EndCard t={t} t0={END} globe={true} tagline=""
        sub={endSub || "Geospatial infrastructure and intelligence."} />
    </div>
  );
}
function JanusAdMirrors(props) {
  return <Stage width={1080} height={1920} duration={26} fps={30} background="#FCFCFB" autoplay={true} loop={true}><AdMirrorsRoot endTagline={props && props.endTagline} endSub={props && props.endSub} /></Stage>;
}
window.JanusAdMirrors = JanusAdMirrors;
