/* film-scene.jsx — Janus Demo Film 01 · "The map is the argument."
   82 s · 1920×1080 · built on animations.jsx (Stage/Sprite) + atlas-scene.js.
   Every frame is a pure function of the playhead — scrub-safe, export-safe. */

const { Stage, Sprite, useTime, Easing, interpolate, clamp } = window;

/* ---------- shared helpers ---------- */
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";
const GROT = "'Space Grotesk', 'Helvetica Neue', Arial, sans-serif";
const INK = "#16181A", MUT = "#7A7F85", FNT = "#B9BCC1", LINE = "#E9EAEC", SIG = "#D9480F", PAPER = "#FCFCFB";
const f01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const easeIO = Easing.easeInOutCubic || ((x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeO = Easing.easeOutCubic || ((x) => 1 - Math.pow(1 - x, 3));

/* camera + state timelines (world coords via JanusScene.m2w done inline) */
function makeTimelines() {
  const J = window.JanusScene;
  const cell = J.m2w(-0.06, -2.56);              // Canal & Lafayette res-9 cell
  const settle = [cell[0] + 0.014, cell[1] + 0.01];
  const off = [cell[0] + 1.03, cell[1] - 0.319]; // panel-open composition shift
  const endC = J.m2w(0.35, 0.4);                 // the whole print
  return {
    cell,
    x: interpolate([18, 24, 30, 33.5, 38.4, 39.4, 56.5, 57.8, 74, 77.5], [-0.35, -1.0, -1.2, settle[0], settle[0], off[0], off[0], off[0] - 0.1, off[0] - 0.1, endC[0]], easeIO),
    y: interpolate([18, 24, 30, 33.5, 38.4, 39.4, 56.5, 57.8, 74, 77.5], [-5.7, -3.7, -2.6, settle[1], settle[1], off[1], off[1], off[1] + 0.16, off[1] + 0.16, endC[1]], easeIO),
    z: interpolate([18, 24, 30, 33.5, 36, 38.4, 39.4, 56.5, 57.8, 74, 77.5], [9.3, 11.2, 12.9, 14.0, 14.55, 14.55, 14.72, 14.72, 13.2, 13.2, 11.7], easeIO),
    rot: interpolate([18, 30, 36, 74, 77.5], [0.06, 0.24, 0.3, 0.3, 0.21], easeIO),
    pitch: interpolate([18, 30, 36, 57.8, 77.5], [0.5, 0.7, 0.8, 0.72, 0.75], easeIO),
    res: interpolate([18, 19.8, 22.4, 25.2, 28.2, 30.2], [5.3, 6, 7, 8, 9, 9], (x) => x),
    ring: (t) => f01(t, 35, 35.45) - f01(t, 56.2, 56.7),
    liveA: (t) => f01(t, 56.5, 58),
    shadeMix: (t) => f01(t, 66, 66.6) - f01(t, 74, 75.2),
    drift: (t) => t // reserved
  };
}

/* ---------- the map (city) layer ---------- */
function MapLayer() {
  const t = useTime();
  const imgRef = React.useRef(null);
  const bufRef = React.useRef(null);
  const memo = React.useRef({ key: "", tl: null });
  if (!memo.current.tl && window.JanusScene) memo.current.tl = makeTimelines();
  const tl = memo.current.tl;

  React.useLayoutEffect(() => {
    if (!imgRef.current || !tl || !window.JanusScene || t < 17.2) return;
    if (!bufRef.current) { bufRef.current = document.createElement("canvas"); bufRef.current.width = 1920; bufRef.current.height = 1080; }
    const live = t >= 56.2;
    const cam = { x: tl.x(t), y: tl.y(t), z: tl.z(t), rot: tl.rot(t), pitch: tl.pitch(t) };
    const ring = tl.ring(t), mix = tl.shadeMix(t), la = tl.liveA(t);
    // redraw only when something visible changes (live ⇒ every frame)
    const key = live
      ? "L" + t.toFixed(3)
      : [cam.x.toFixed(4), cam.y.toFixed(4), cam.z.toFixed(3), cam.rot.toFixed(3), cam.pitch.toFixed(3),
        tl.res(t).toFixed(3), ring.toFixed(2), mix.toFixed(2)].join("|");
    if (key !== memo.current.key) {
      memo.current.key = key;
      const ctx = bufRef.current.getContext("2d");
      const opts = {
        resFloat: tl.res(t),
        labels: cam.z < 13.6,
        shade: mix > 0.01 ? "kontur_population" : "",
        shadeMix: mix,
        live: live ? { on: true, t: 40 + t, alpha: la } : null,
        selected: ring > 0.01 ? { x: tl.cell[0], y: tl.cell[1] } : null,
        selectedPhase: ring
      };
      window.JanusScene.drawCity(ctx, 1920, 1080, cam, opts);
      window.JanusScene.blitToImg(bufRef.current, imgRef.current, true);
    }
  }, [t, tl]);

  // slow breathing so held frames are never static (cheap: CSS transform, no redraw)
  const breathe = 1 + 0.004 * Math.sin(t * 0.55);
  const vis = f01(t, 17.6, 19.2);
  return (
    <img ref={imgRef} width={1920} height={1080} alt=""
      style={{ position: "absolute", inset: 0, width: 1920, height: 1080, opacity: vis, transform: `scale(${breathe})`, transformOrigin: "50% 46%" }} />
  );
}

/* ---------- the globe layer ---------- */
function GlobeLayer() {
  const t = useTime();
  const imgRef = React.useRef(null);
  const bufRef = React.useRef(null);
  React.useLayoutEffect(() => {
    if (!imgRef.current || !window.JanusScene || t < 6.6 || t > 18.8) return;
    if (!bufRef.current) { bufRef.current = document.createElement("canvas"); bufRef.current.width = 1920; bufRef.current.height = 1080; }
    const ctx = bufRef.current.getContext("2d");
    ctx.clearRect(0, 0, 1920, 1080);
    const R = 380 + 2300 * Easing.easeInCubic(f01(t, 14, 18.5));
    const rot = interpolate([7, 14, 18.5], [-3.18, -2.96, -2.8623], (x) => x)(t);
    window.JanusScene.drawGlobe(ctx, 1920, 1080, {
      R, rot, tilt: 0.55,
      cx: 960, cy: 540 + 0.163 * R,
      alpha: f01(t, 7, 8.6),
      pulse: { lat: 40.7, lon: -74, amt: f01(t, 10, 13) }
    });
    window.JanusScene.blitToImg(bufRef.current, imgRef.current, false);
  }, [t]);
  if (t < 6.6 || t > 18.8) return null;
  return <img ref={imgRef} width={1920} height={1080} alt="" style={{ position: "absolute", inset: 0 }} />;
}

/* ---------- typography helpers ---------- */
function Lines({ t, t0, lines, x, y, size, gap, exitAt, align }) {
  const exit = exitAt ? 1 - f01(t, exitAt, exitAt + 0.7) : 1;
  if (exit <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, textAlign: align || "left", opacity: exit }}>
      {lines.map((L, i) => {
        const k = f01(t, t0 + i * 0.5, t0 + i * 0.5 + 0.65);
        return (
          <div key={i} style={{
            fontFamily: L.mono ? MONO : GROT, fontWeight: L.w || 600,
            fontSize: L.size || size, letterSpacing: L.mono ? ".14em" : "-.014em",
            lineHeight: 1.18, color: L.color || INK,
            opacity: k, transform: `translateY(${(1 - easeO(k)) * 14}px)`,
            marginBottom: gap != null ? gap : 6, whiteSpace: "pre"
          }}>{L.el || L.text}</div>
        );
      })}
    </div>
  );
}

function Chip({ children, style }) {
  return (
    <div style={Object.assign({
      fontFamily: MONO, fontSize: 21, letterSpacing: ".06em", color: INK,
      background: "rgba(252,252,251,.92)", border: "1px solid " + LINE,
      borderRadius: 6, padding: "13px 20px", whiteSpace: "nowrap"
    }, style)}>{children}</div>
  );
}

/* ---------- S3 caption ticker ---------- */
const SPLITS = [
  { t0: 18.0, t1: 20.3, label: "≈ 8.5 km", res: "res 5" },
  { t0: 20.3, t1: 22.9, label: "3.2 km", res: "res 6" },
  { t0: 22.9, t1: 25.7, label: "1.2 km", res: "res 7" },
  { t0: 25.7, t1: 28.7, label: "460 m", res: "res 8" },
  { t0: 28.7, t1: 33.2, label: "174 m", res: "res 9", strong: true }
];
function SplitTicker({ t }) {
  if (t < 18 || t > 33.4) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, display: "flex", justifyContent: "center" }}>
      {SPLITS.map((s, i) => {
        const k = f01(t, s.t0, s.t0 + 0.35) - f01(t, s.t1 - 0.25, s.t1);
        if (k <= 0) return null;
        return (
          <Chip key={i} style={{ position: "absolute", bottom: 0, opacity: k, transform: `translateY(${(1 - k) * 8}px)` }}>
            <b style={{ fontWeight: s.strong ? 700 : 600 }}>{s.label}</b>
            <span style={{ color: MUT }}>  ·  the cell {i ? "splits" : "grid"} · {s.res}</span>
          </Chip>
        );
      })}
    </div>
  );
}

/* ---------- S5 the card panel ---------- */
function count(t, t0, dur, to, dp) {
  const k = easeO(f01(t, t0, t0 + dur));
  const v = to * k;
  return dp != null ? v.toFixed(dp) : Math.round(v).toLocaleString("en-US");
}
function Row({ t, t0, k, v, sub, warm }) {
  const a = f01(t, t0, t0 + 0.45);
  if (a <= 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 0", borderTop: "1px solid #F2F3F4", opacity: a, transform: `translateY(${(1 - easeO(a)) * 9}px)` }}>
      <span style={{ fontSize: 21, color: "#4A4E54" }}>{k}</span>
      <span style={{ fontFamily: MONO, fontSize: 18.5, textAlign: "right", color: warm ? SIG : INK }}>
        <b style={{ fontWeight: 650 }}>{v}</b><span style={{ color: MUT, fontWeight: 400 }}> {sub}</span>
      </span>
    </div>
  );
}
const HIST = [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 3, 2, 1, 0, 0, 1, 0];
function CardPanel({ t }) {
  const inK = easeO(f01(t, 38.2, 38.62));
  const outK = easeO(f01(t, 56, 56.42));
  const tx = 103 - 103 * inK + 103 * outK;
  if (t < 38.2 || tx >= 103) return null;
  return (
    <div style={{
      position: "absolute", top: 0, right: 0, bottom: 0, width: 430 * 1.42,
      background: PAPER, borderLeft: "1px solid " + LINE, boxShadow: "-18px 0 44px rgba(22,24,26,.07)",
      transform: `translateX(${tx}%)`, display: "flex", flexDirection: "column"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 23px", borderBottom: "1px solid #F2F3F4" }}>
        <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: ".14em", color: MUT }}>R9 · A1072CB3FFFF</span>
        <span style={{ marginLeft: "auto", border: "1px solid " + LINE, background: "#FFF", borderRadius: 6, fontFamily: MONO, fontSize: 15.5, padding: "7px 14px", color: "#4A4E54" }}>esc</span>
      </div>
      <div style={{ padding: "20px 23px" }}>
        <div style={{ border: "1px solid " + LINE, borderRadius: 11, background: "#FFF", padding: "25px 28px" }}>
          <div style={{ fontFamily: MONO, fontSize: 14, letterSpacing: ".1em", color: MUT }}>CELL 892A1072CB3FFFF · ~174 M ACROSS</div>
          <div style={{ opacity: f01(t, 40, 40.5), marginTop: 12 }}>
            <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1 }}>3</span>
            <span style={{ fontFamily: MONO, fontSize: 19, color: MUT, marginLeft: 12 }}>fatal crashes · 2001–2023 · NHTSA FARS</span>
          </div>
          <div style={{ opacity: f01(t, 41, 41.4) }}>
            <div style={{ fontFamily: MONO, fontSize: 13, letterSpacing: ".12em", color: MUT, margin: "20px 0 8px" }}>BY HOUR OF DAY</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64 }}>
              {HIST.map((v, i) => {
                const g = f01(t, 41.2 + i * 0.055, 41.55 + i * 0.055);
                return <div key={i} style={{ flex: 1, background: INK, borderRadius: "1px 1px 0 0", opacity: 0.78, height: Math.max(2, (v / 3) * 100 * easeO(g)) + "%" }} />;
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12.5, color: FNT, marginTop: 5 }}>
              <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Row t={t} t0={43.5} k="Traffic, AADT" v={count(t, 43.5, 0.9, 24300)} sub="veh/day · measured" />
            <Row t={t} t0={45.8} k="Fatal rate" v={count(t, 45.8, 0.7, 0.34, 2)} sub="/ 100 M veh-mi" />
            <Row t={t} t0={48} k="Hazard, expected loss" v={"$" + count(t, 48, 0.9, 412) + " K"} sub="/ yr · FEMA NRI" />
            <Row t={t} t0={50.4} k="Walk vibration" v={count(t, 50.4, 0.7, 2.1, 1)} sub="m/s² · measured · 14 traces" />
            <Row t={t} t0={53} k="Work zones" v="1 active" sub="· NYC DOT · live" warm={true} />
          </div>
        </div>
        <div style={{ opacity: f01(t, 54.2, 54.8), fontFamily: MONO, fontSize: 13.5, letterSpacing: ".06em", color: MUT, padding: "14px 4px" }}>
          15 sections · every number names its source and vintage
        </div>
      </div>
    </div>
  );
}

/* ---------- overlays for S6/S7/S8 ---------- */
function Hud({ t }) {
  const a = f01(t, 57.4, 58) - f01(t, 76.4, 77.2);
  if (a <= 0) return null;
  const n = 39 + Math.round(easeO(f01(t, 58, 59.5)) * 2);
  return (
    <div style={{ position: "absolute", top: 26, right: 30, opacity: a }}>
      <Chip style={{ fontSize: 16.5, letterSpacing: ".08em", textTransform: "uppercase", color: MUT, padding: "11px 15px" }}>
        res 9 · <span style={{ color: SIG }}>{n} live</span>
      </Chip>
    </div>
  );
}
function ShadeCaption({ t }) {
  const a = f01(t, 66.4, 66.9) - f01(t, 73.4, 74);
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", top: 26, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: a }}>
      <Chip style={{ fontSize: 17 }}>
        <b>Population</b><span style={{ color: MUT }}> · residents / cell · kontur 400 m · 2023</span>
        <span style={{ color: FNT }}>  |  ×</span>
      </Chip>
    </div>
  );
}
function Tooltip({ t }) {
  const a = f01(t, 67.3, 67.8) - f01(t, 69.2, 69.7);
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 905, top: 490, opacity: a }}>
      <svg width="22" height="22" viewBox="0 0 15 15"><path d="M1 1 L1 12 L4.4 8.9 L6.6 13.6 L8.9 12.6 L6.7 8 L11.4 8z" fill={INK} stroke={PAPER} strokeWidth="1.2" /></svg>
      <div style={{ position: "absolute", left: 24, top: 24, fontFamily: MONO, fontSize: 17.5, lineHeight: 1.5, color: INK, background: PAPER, border: "1px solid " + LINE, borderRadius: 6, padding: "10px 15px", boxShadow: "0 2px 8px rgba(22,24,26,.07)", whiteSpace: "nowrap" }}>
        <b>1,284</b> residents · kontur 400 m<br />click to open
      </div>
    </div>
  );
}
function Mute({ t }) {
  const a = 0.82 * (f01(t, 69.3, 69.95) - f01(t, 74, 74.8));
  if (a <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, background: PAPER, opacity: a }} />;
}
function Cloud({ t }) {
  const a = f01(t, 16.8, 18) - f01(t, 18.2, 19.8);
  if (a <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, background: PAPER, opacity: a }} />;
}

/* ---------- the film ---------- */
function FilmRoot() {
  const t = useTime();
  const rootRef = React.useRef(null);
  React.useEffect(() => {
    if (rootRef.current) rootRef.current.setAttribute("data-screen-label", "film t=" + Math.floor(t) + "s");
  }, [Math.floor(t)]);

  return (
    <div ref={rootRef} data-screen-label="film" style={{ position: "absolute", inset: 0, background: PAPER, overflow: "hidden" }}>
      <MapLayer />
      <Cloud t={t} />
      <GlobeLayer />

      {/* S1 — the claim */}
      {t < 7.4 && (
        <Lines t={t} t0={0.7} x={190} y={430} size={72} gap={14} exitAt={5.9} lines={[
          { el: <span>Machine intelligence knows <i>what</i>.</span> },
          { el: <span>It rarely knows <b style={{ fontWeight: 700, borderBottom: "3px solid " + INK, paddingBottom: 2 }}>where</b>.</span> }
        ]} />
      )}

      {/* S2 — the globe titles */}
      {t >= 7.4 && t < 17.6 && (
        <Lines t={t} t0={8.2} x={190} y={452} size={58} gap={16} exitAt={16.2} lines={[
          { text: "JANUS", mono: true, size: 24, w: 700, color: INK },
          { text: "Grounding machine intelligence." },
          { text: "The context layer for the physical world.", size: 27, w: 500, color: "#4A4E54" }
        ]} />
      )}

      {/* S3 — split ticker */}
      <SplitTicker t={t} />

      {/* S4 — the address chip */}
      {t >= 31.6 && t < 56.4 && (
        <div style={{ position: "absolute", left: 34, bottom: 34, opacity: f01(t, 31.6, 32.2) - f01(t, 55.8, 56.4) }}>
          <Chip style={{ fontSize: 20 }}>
            <b>Canal St &amp; Lafayette</b>
            <span style={{ color: MUT }}> · cell 892a1072cb3ffff · ~174 m across</span>
          </Chip>
        </div>
      )}

      {/* S5 — the card */}
      <CardPanel t={t} />

      {/* S6 — alive */}
      <Hud t={t} />
      {t >= 58.6 && t < 65.4 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 34, display: "flex", justifyContent: "center", opacity: f01(t, 58.6, 59.2) - f01(t, 64.6, 65.2) }}>
          <Chip style={{ fontSize: 17, color: MUT }}>
            buses tween 18 s between GPS fixes · docks breathe by fill · <span style={{ color: SIG }}>the only color is what's alive</span>
          </Chip>
        </div>
      )}

      {/* S7 — the rule */}
      <ShadeCaption t={t} />
      <Tooltip t={t} />
      <Mute t={t} />
      {t >= 69.9 && t < 74.6 && (
        <Lines t={t} t0={70.1} x={190} y={400} size={62} gap={12} exitAt={73.7} lines={[
          { text: "No scores. No blends." },
          { text: "Counts, rates, named denominators." },
          { el: <span style={{ fontWeight: 700 }}>The map is the argument.</span> }
        ]} />
      )}

      {/* S8 — the invitation */}
      {t >= 77.6 && (
        <div style={{ position: "absolute", left: 190, bottom: 120 }}>
          <div style={{ fontFamily: GROT, fontWeight: 600, fontSize: 58, letterSpacing: "-.014em", color: INK, opacity: f01(t, 77.8, 78.5), transform: `translateY(${(1 - easeO(f01(t, 77.8, 78.5))) * 14}px)` }}>The Atlas is live.</div>
          <div style={{ fontFamily: MONO, fontSize: 27, color: INK, marginTop: 18, opacity: f01(t, 78.7, 79.3) }}>
            <span style={{ borderBottom: "2px solid " + INK, paddingBottom: 3 }}>janus.earth/atlas →</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 18, color: MUT, marginTop: 16, opacity: f01(t, 79.5, 80.1) }}>
            every cell is a URL — ?h=892a1072cb3ffff
          </div>
        </div>
      )}
    </div>
  );
}

function JanusFilm() {
  return (
    <Stage width={1920} height={1080} duration={82} fps={30} background="#FCFCFB" autoplay={true} loop={false}>
      <FilmRoot />
    </Stage>
  );
}
window.JanusFilm = JanusFilm;
