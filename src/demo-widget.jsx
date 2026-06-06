import React from "react";

// Live GeoContext API demo — input lat/lng, watch the resolver place a crosshair
// on a faded street-grid map while structured JSON streams in beside it.

const SAMPLES = [
  { label: "Times Square — NYC",      q: "1500 Broadway, New York, NY",     key: "nyc" },
  { label: "Bandra West — Mumbai",    q: "Linking Rd, Bandra West, Mumbai",   key: "mum" },
  { label: "Mission District — SF",   q: "600 Guerrero St, San Francisco",    key: "sf"  },
  { label: "Connaught Place — Delhi", q: "Connaught Place, New Delhi",         key: "del" },
];

// Realistic Manhattan response — building bucket + POI candidates + context + embeddings.
const RESPONSES = {
  nyc: {
    place: { neighborhood: "Times Square / Theater District", borough: "Manhattan", country: "US" },
    lines: [
      "{",
      '  "query": { "lat": 40.7580, "lon": -73.9855, "ts": "2026-05-22T14:31:18Z" },',
      '  "resolved": {',
      '    "building_id":  "osm/way/24698432",',
      '    "h3_r12":       "8c2a100894655ff",',
      '    "geometry":     "polygon(7th_ave × w47th)",',
      '    "confidence":   0.94',
      "  },",
      '  "poi_candidates": [',
      '    { "name": "TKTS Booth — Times Square",     "category": "civic.kiosk",     "p": 0.41 },',
      '    { "name": "Olive Garden Times Square",     "category": "food.italian",    "p": 0.19 },',
      '    { "name": "Sephora — 1500 Broadway",       "category": "retail.beauty",   "p": 0.14 },',
      '    { "name": "Hard Rock Cafe NY",             "category": "food.american",   "p": 0.11 }',
      "  ],",
      '  "context": {',
      '    "foot_traffic_rank":   9.7,    // 0–10, vs. global',
      '    "visit_density_p95":   "very_high",',
      '    "dwell_typical_min":   14,',
      '    "primary_mode":        "pedestrian",',
      '    "tourism_index":       0.93,',
      '    "local_resident_idx":  0.07,',
      '    "time_bucket":         "weekday_pm_rush"',
      "  },",
      '  "place_embedding":  [0.0421, -0.1187, 0.3309, 0.0044, ...]   // 256d',
      '  "region_embedding": [-0.221,  0.418,  0.012, -0.087, ...]    // 64d',
      "}",
    ],
  },
  mum: {
    place: { neighborhood: "Bandra West", borough: "Mumbai", country: "IN" },
    lines: [
      "{",
      '  "query": { "lat": 19.0596, "lon": 72.8295, "ts": "2026-05-22T20:01:54+05:30" },',
      '  "resolved": {',
      '    "building_id":  "overture/bldg/IN.MH.MUM.31882",',
      '    "h3_r12":       "8c64a1b7c2293ff",',
      '    "confidence":   0.88',
      "  },",
      '  "poi_candidates": [',
      '    { "name": "Blenders Pride — Linking Rd",  "category": "nightlife.bar",   "p": 0.36 },',
      '    { "name": "Bandra Linking Road Market",   "category": "retail.market",   "p": 0.28 },',
      '    { "name": "Bastian — Bandra",             "category": "food.seafood",    "p": 0.16 }',
      "  ],",
      '  "context": {',
      '    "foot_traffic_rank":   8.4,',
      '    "qcom_eligible":       true,',
      '    "qcom_eta_p50_min":    11,',
      '    "dark_store_count_2km": 14,',
      '    "primary_mode":        "two_wheeler",',
      '    "languages_spoken":    ["mr", "hi", "en"]',
      "  },",
      '  "place_embedding":  [-0.0331,  0.2207, -0.0918, ...]  // 256d',
      '  "region_embedding": [ 0.114,  -0.302,  0.481,  ...]   // 64d',
      "}",
    ],
  },
  sf: {
    place: { neighborhood: "Mission District", borough: "San Francisco", country: "US" },
    lines: [
      "{",
      '  "query": { "lat": 37.7599, "lon": -122.4148, "ts": "2026-05-22T11:42:08-07:00" },',
      '  "resolved": {',
      '    "building_id":  "osm/way/418332901",',
      '    "h3_r12":       "8c283082e9aa3ff",',
      '    "confidence":   0.91',
      "  },",
      '  "poi_candidates": [',
      '    { "name": "Tartine Bakery",          "category": "food.bakery",  "p": 0.44 },',
      '    { "name": "Dolores Park",            "category": "park.urban",   "p": 0.22 },',
      '    { "name": "Bi-Rite Creamery",        "category": "food.dessert", "p": 0.18 }',
      "  ],",
      '  "context": {',
      '    "foot_traffic_rank":   7.6,',
      '    "dwell_typical_min":   38,',
      '    "primary_mode":        "pedestrian",',
      '    "local_resident_idx":  0.71,',
      '    "tourism_index":       0.29',
      "  },",
      '  "place_embedding":  [ 0.102, -0.041,  0.218, ...]  // 256d',
      '  "region_embedding": [-0.018,  0.337, -0.122, ...]  // 64d',
      "}",
    ],
  },
  del: {
    place: { neighborhood: "Connaught Place", borough: "New Delhi", country: "IN" },
    lines: [
      "{",
      '  "query": { "lat": 28.6315, "lon": 77.2167, "ts": "2026-05-22T17:11:02+05:30" },',
      '  "resolved": {',
      '    "building_id":  "overture/bldg/IN.DL.NDL.04412",',
      '    "h3_r12":       "8c5e240b1a847ff",',
      '    "confidence":   0.90',
      "  },",
      '  "poi_candidates": [',
      '    { "name": "Wenger\'s Deli",           "category": "food.bakery",    "p": 0.39 },',
      '    { "name": "Central Park (CP Inner)",  "category": "park.urban",     "p": 0.24 },',
      '    { "name": "Janpath Market",           "category": "retail.market",  "p": 0.17 }',
      "  ],",
      '  "context": {',
      '    "foot_traffic_rank":   9.1,',
      '    "qcom_eligible":       true,',
      '    "qcom_eta_p50_min":    9,',
      '    "primary_mode":        "mixed",',
      '    "tourism_index":       0.62',
      "  },",
      '  "place_embedding":  [-0.211,  0.044,  0.301, ...]  // 256d',
      '  "region_embedding": [ 0.082, -0.193,  0.225, ...]  // 64d',
      "}",
    ],
  },
};

function keyFor(q) {
  const found = SAMPLES.find((s) => s.q === q);
  return found ? found.key : "nyc";
}

// Syntax-color one line of JSON-ish text
function colorize(line) {
  const out = [];
  let key = 0;
  const re = /("([^"\\]|\\.)*"\s*:|"([^"\\]|\\.)*"|-?\d+(\.\d+)?|true|false|null|\/\/.*)/g;
  let m, last = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) out.push(<span key={key++} className="p">{line.slice(last, m.index)}</span>);
    const tok = m[0];
    if (/^\/\//.test(tok)) out.push(<span key={key++} className="c">{tok}</span>);
    else if (/:$/.test(tok)) out.push(<span key={key++} className="k">{tok}</span>);
    else if (/^"/.test(tok)) out.push(<span key={key++} className="s">{tok}</span>);
    else if (/^(true|false|null)$/.test(tok)) out.push(<span key={key++} className="n">{tok}</span>);
    else out.push(<span key={key++} className="n">{tok}</span>);
    last = m.index + tok.length;
  }
  if (last < line.length) out.push(<span key={key++} className="p">{line.slice(last)}</span>);
  return out;
}

// Stylized street-grid map. Not georeferenced — a schematic the eye recognizes as "city".
// Crosshair sits at a fixed map coord; we vary the labels per city.
function MapBackdrop({ cityKey, resolved }) {
  const labels = {
    nyc: { major: "BROADWAY", minor: "W 47TH ST", area: "TIMES SQUARE", small: "7TH AVE" },
    mum: { major: "LINKING RD", minor: "TURNER RD", area: "BANDRA W", small: "S.V. RD" },
    sf:  { major: "VALENCIA",  minor: "18TH ST",   area: "MISSION",       small: "GUERRERO" },
    del: { major: "RAJIV CHK", minor: "BARAKHAMBA", area: "CONNAUGHT PL", small: "JANPATH" },
  }[cityKey] || labels?.nyc;

  return (
    <svg className="map" viewBox="0 0 600 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--map-line)" strokeWidth="0.6" />
        </pattern>
      </defs>

      {/* base */}
      <rect x="0" y="0" width="600" height="480" fill="var(--map-bg)" />

      {/* river / water along the right edge (just a slim sliver, optional flavor) */}
      <path d="M 540 0 L 600 0 L 600 480 L 560 480 Q 530 360 555 240 Q 580 120 540 0 Z" fill="var(--map-water)" />

      {/* block fills — irregular grid of building footprints */}
      <g fill="var(--map-block)" stroke="var(--map-line)" strokeWidth="0.5">
        {/* row 1 */}
        <rect x="40"  y="30"  width="90" height="60"/>
        <rect x="140" y="30"  width="70" height="60"/>
        <rect x="220" y="30"  width="120" height="60"/>
        <rect x="350" y="30"  width="80" height="60"/>
        <rect x="440" y="30"  width="80" height="60"/>
        {/* row 2 */}
        <rect x="40"  y="100" width="70" height="80"/>
        <rect x="120" y="100" width="90" height="80"/>
        <rect x="220" y="100" width="120" height="80"/>
        <rect x="350" y="100" width="70" height="80"/>
        <rect x="430" y="100" width="90" height="80"/>
        {/* row 3 — interrupted by avenue diagonal */}
        <rect x="40"  y="190" width="100" height="70"/>
        <rect x="150" y="190" width="60" height="70"/>
        <path d="M 220 190 L 340 190 L 340 260 L 245 260 Z" />
        <rect x="350" y="190" width="80" height="70"/>
        <rect x="440" y="190" width="80" height="70"/>
        {/* row 4 */}
        <rect x="40"  y="270" width="80" height="70"/>
        <rect x="130" y="270" width="80" height="70"/>
        <rect x="220" y="270" width="50" height="70"/>
        <rect x="280" y="270" width="60" height="70"/>
        <rect x="350" y="270" width="80" height="70"/>
        <rect x="440" y="270" width="80" height="70"/>
        {/* row 5 */}
        <rect x="40"  y="350" width="110" height="100"/>
        <rect x="160" y="350" width="70" height="100"/>
        <rect x="240" y="350" width="100" height="100"/>
        <rect x="350" y="350" width="80" height="100"/>
        <rect x="440" y="350" width="80" height="100"/>
      </g>

      {/* street grid — verticals (avenues) */}
      <g stroke="var(--map-line)" strokeWidth="1" fill="none">
        <line x1="130" y1="0" x2="130" y2="480"/>
        <line x1="215" y1="0" x2="215" y2="480"/>
        <line x1="345" y1="0" x2="345" y2="480"/>
        <line x1="435" y1="0" x2="435" y2="480"/>
        <line x1="525" y1="0" x2="525" y2="480"/>
      </g>
      {/* horizontals (streets) */}
      <g stroke="var(--map-line)" strokeWidth="1" fill="none">
        <line x1="0" y1="95"  x2="600" y2="95"/>
        <line x1="0" y1="185" x2="600" y2="185"/>
        <line x1="0" y1="265" x2="600" y2="265"/>
        <line x1="0" y1="345" x2="600" y2="345"/>
      </g>

      {/* one diagonal "Broadway-style" cut */}
      <line x1="100" y1="0" x2="600" y2="380" stroke="var(--map-line-major)" strokeWidth="1.5" fill="none"/>

      {/* major avenue thicker (the one passing through the pin) */}
      <line x1="345" y1="0" x2="345" y2="480" stroke="var(--map-line-major)" strokeWidth="2.5"/>
      <line x1="0" y1="265" x2="600" y2="265" stroke="var(--map-line-major)" strokeWidth="2"/>

      {/* street labels */}
      <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--map-label)" letterSpacing="0.1em">
        <text x="350" y="20" >{labels.major}</text>
        <text x="10"  y="261">{labels.minor}</text>
        <text x="10"  y="91" >{labels.small}</text>
      </g>

      {/* area label, big-and-faded */}
      <text x="350" y="430"
        fontFamily="var(--font-sans)"
        fontSize="34" fontWeight="600"
        fill="var(--map-line-major)"
        letterSpacing="0.04em"
        opacity="0.6"
      >{labels.area}</text>

      {/* resolved building polygon (around the pin) */}
      <g>
        <rect
          x="305" y="230" width="80" height="50"
          fill="var(--accent-soft)"
          stroke="var(--accent)"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          className={resolved ? "bldg show" : "bldg"}
        />
      </g>

      {/* crosshair pin */}
      <g transform="translate(345 265)" className="pin">
        <circle r="34" fill="none" stroke="var(--accent)" strokeWidth="0.6" opacity="0.35" className="ring r1"/>
        <circle r="20" fill="none" stroke="var(--accent)" strokeWidth="0.8" opacity="0.6"  className="ring r2"/>
        <line x1="-14" y1="0" x2="-4" y2="0" stroke="var(--accent)" strokeWidth="1.5"/>
        <line x1="4"   y1="0" x2="14" y2="0" stroke="var(--accent)" strokeWidth="1.5"/>
        <line x1="0" y1="-14" x2="0" y2="-4" stroke="var(--accent)" strokeWidth="1.5"/>
        <line x1="0" y1="4"   x2="0" y2="14" stroke="var(--accent)" strokeWidth="1.5"/>
        <circle r="3" fill="var(--accent)"/>
      </g>
    </svg>
  );
}

function DemoWidget() {
  const [query, setQuery] = React.useState(SAMPLES[0].q);
  const [activeKey, setActiveKey] = React.useState("nyc");
  const [running, setRunning] = React.useState(false);
  const [lines, setLines] = React.useState([]);
  const [latencyMs, setLatencyMs] = React.useState(null);
  const [autostarted, setAutostarted] = React.useState(false);
  const timersRef = React.useRef([]);
  const scrollRef = React.useRef(null);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const run = React.useCallback((q) => {
    clearTimers();
    const k = keyFor(q);
    setActiveKey(k);
    setRunning(true);
    setLines([]);
    setLatencyMs(null);
    const data = RESPONSES[k].lines;
    const t0 = performance.now();
    let cum = 240; // simulated resolve latency before first byte
    data.forEach((line, idx) => {
      const delay = 55 + Math.min(70, line.length * 1.2);
      cum += delay;
      const id = setTimeout(() => {
        setLines((prev) => [...prev, line]);
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        if (idx === data.length - 1) {
          setRunning(false);
          setLatencyMs(Math.round(performance.now() - t0));
        }
      }, cum);
      timersRef.current.push(id);
    });
  }, []);

  React.useEffect(() => {
    if (autostarted) return;
    const id = setTimeout(() => { setAutostarted(true); run(query); }, 500);
    return () => clearTimeout(id);
  }, [autostarted, query, run]);

  React.useEffect(() => () => clearTimers(), []);

  const onSubmit = (e) => { e.preventDefault(); run(query); };

  const headerStatus = running
    ? <span className="pill"><span className="dot" />RESOLVING</span>
    : latencyMs != null
      ? <span className="pill"><span className="dot" style={{ background: "var(--ok)" }} />200 OK · {latencyMs}ms</span>
      : <span className="pill" style={{ opacity: 0.7 }}><span className="dot" style={{ background: "var(--fg-muted)", boxShadow: "none", animation: "none" }} />IDLE</span>;

  return (
    <div className="demo">
      {/* header — input + route + status */}
      <form className="demo-head" onSubmit={onSubmit}>
        <div className="demo-route mono">
          <span className="method">POST</span>
          <span className="path">/v1/context.resolve</span>
        </div>
        <div className="demo-input-wrap">
          <input
            className="mono"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
            placeholder="1500 Broadway, New York   or   40.7580, -73.9855"
            aria-label="Address or lat / lon"
          />
          <button className="btn primary" type="submit" disabled={running}>
            {running ? "resolving" : "resolve"}<span className="arrow">→</span>
          </button>
        </div>
        <div className="demo-status">{headerStatus}</div>
      </form>

      {/* main — map left, json right */}
      <div className="demo-body">
        <div className="demo-map">
          <MapBackdrop cityKey={activeKey} resolved={!running && lines.length > 0} />
          <div className="map-readout mono">
            <div><span className="label">resolved</span></div>
            <div className="ro-row">{RESPONSES[activeKey].place.neighborhood}</div>
            <div className="ro-row dim">{RESPONSES[activeKey].place.borough} · {RESPONSES[activeKey].place.country}</div>
          </div>
        </div>

        <div className="demo-out">
          <div className="demo-out-head">
            <span className="label">response · application/json</span>
            <span className="label tnum" style={{ color: "var(--fg-muted)" }}>
              {lines.length} ln
            </span>
          </div>
          <pre className="demo-stream" ref={scrollRef}>
            {lines.map((l, i) => (
              <div key={i} className="ln fade-up">
                <span className="lno tnum">{String(i + 1).padStart(2, " ")}</span>
                <span className="lc">{colorize(l)}</span>
              </div>
            ))}
            {running && (
              <div className="ln">
                <span className="lno tnum">{String(lines.length + 1).padStart(2, " ")}</span>
                <span className="lc"><span className="caret" /></span>
              </div>
            )}
          </pre>
        </div>
      </div>

      {/* sample picks */}
      <div className="demo-samples">
        <span className="label">try</span>
        {SAMPLES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={"sample" + (s.key === activeKey ? " on" : "")}
            onClick={() => { setQuery(s.q); run(s.q); }}
          >{s.label}</button>
        ))}
      </div>
    </div>
  );
}

export { DemoWidget };
