import { GlobeLattice } from "./globe-hero.jsx";
// Geo — landing page. Hero variants, nav variants, accent palette via Tweaks.
import React from "react";
import * as ReactDOM from "react-dom/client";
import "./tokens.css";
import "./page.css";
import { DemoWidget } from "./demo-widget.jsx";
import {
  useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor,
} from "./tweaks-panel.jsx";

const { useState, useEffect } = React;

/* =========================================================
   Content
   ========================================================= */

const HERO_VARIANTS = {
  manifesto: {
    h1:
    <>
        The signal under<br />
        <em>every product.</em>
      </>,

    sub: <>Janus reads the world around your product to provide missing context.<br /><span className="serif-italic">Welcome to the substrate of consumer software.</span></>,
    primary: "Talk to us",
    secondary: "How it works"
  },
  plainspoken: {
    h1:
    <>
        Place context, <em>as a feature.</em>
      </>,

    sub: "Coordinate or trajectory in. Structured persona, place, and activity signal out.",
    primary: "Try the API",
    secondary: "Read the spec"
  },
  provocation: {
    h1:
    <>
        Cookies,<br />
        <em>derived from where you go.</em>
      </>,

    sub: "Browsing gave the web personalization. Trajectory gives the same — at the fidelity your prompts and rankers can actually use.",
    primary: "Talk to us",
    secondary: "Try the API"
  }
};

const NAV_VARIANTS = {
  // 1. Sparse — Aaru-style, two items max
  sparse: [
  { label: "Research", href: "#research" },
  { label: "API", href: "#api", cta: true }],

  // 2. Standard — Goodfire-style, named sections
  standard: [
  { label: "Product", href: "#product" },
  { label: "Research", href: "#research" },
  { label: "Customers", href: "#why" },
  { label: "About", href: "#why" },
  { label: "Try the API", href: "#api", cta: true }],

  // 3. Mono-label — Nominal-style, tracked uppercase
  mono: [
  { label: "PRODUCT", href: "#product", mono: true },
  { label: "RESEARCH", href: "#research", mono: true },
  { label: "DOCS", href: "#api", mono: true },
  { label: "→ TRY API", href: "#api", cta: true, mono: true }]

};

// Real portfolio — 4 entries shown in body, header counts six.
const PATENTS = [
{
  date: "2026 · US Patent P03309",
  title: "Inferring institutions from movement patterns."
},
{
  date: "2026 · US Patent P03346",
  title: "Choosing what to play, show, or sell at a place."
},
{
  date: "2026 · US Patent P03310",
  title: "Extracting trends from places, at scale."
},
{
  date: "2025 · ACL",
  title: "Simulating populations from sparse signal."
}];


function Brand() {
  return (
    <a href="#" className="brand-fixed">
      <svg className="brand-mark" viewBox="0 0 20 20" aria-hidden="true">
        <polygon points="10,2 17.5,6 17.5,14 10,18 2.5,14 2.5,6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="10" r="1.8" fill="currentColor" />
      </svg>
      <span className="brand-name">JANUS</span>
    </a>);

}

/* =========================================================
   Brand mark — a tiny crosshair-in-square. Geometric. Recognizable as a "pin".
   ========================================================= */
function BrandMark() {
  return (
    <svg className="mark" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1" y="1" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="3.5" x2="10" y2="7.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="10" y1="12.5" x2="10" y2="16.5" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3.5" y1="10" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12.5" y1="10" x2="16.5" y2="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1.6" fill="var(--accent)" />
    </svg>);

}

/* =========================================================
   Nav
   ========================================================= */
function Nav({ variant }) {
  const items = NAV_VARIANTS[variant];
  return (
    <nav className="nav" data-variant={variant}>
      <div className="nav-inner">
        <a href="#" className="brand">
          <BrandMark />
          geo<span className="v">/v0.4</span>
        </a>
        <div className="nav-links">
          {items.map((it, i) =>
          <a
            key={i}
            href={it.href}
            className={[
            it.mono ? "nav-mono" : "",
            it.cta ? "nav-cta" : ""].
            join(" ").trim()}>
            {it.label}</a>
          )}
        </div>
      </div>
    </nav>);

}

/* =========================================================
   Manhattan Basemap — Times Square / Midtown. Landscape, full-width.
   Heatmap of foot-traffic on H3 res-11 cells, with animated user
   dots and inferred persona nodes overlaid. Floats; left side
   dims under the hero text via a CSS gradient overlay.
   ========================================================= */

// Procedural building footprints — one block at a time. Skips Bryant Park.
function generateBuildings() {
  const out = [];
  const PARK = { x: 760, y: 440, w: 120, h: 100 };
  const overlapsPark = (b) =>
  !(b.x + b.w < PARK.x || b.x > PARK.x + PARK.w || b.y + b.h < PARK.y || b.y > PARK.y + PARK.h);
  // Streets (horizontal, y) — top to bottom: W 50, W 49, …, W 36
  const ys = [40, 110, 180, 250, 320, 390, 460, 530];
  // Avenues (vertical, x) — 8th, 7th, 6th-ish, 5th, Madison, Park
  const xs = [80, 280, 480, 680, 880, 1080];
  const sw = 18;
  for (let yi = 0; yi < ys.length - 1; yi++) {
    for (let xi = 0; xi < xs.length - 1; xi++) {
      const yTop = ys[yi] + sw / 2 + 2;
      const yBot = ys[yi + 1] - sw / 2 - 2;
      const xLeft = xs[xi] + sw / 2 + 2;
      const xRight = xs[xi + 1] - sw / 2 - 2;
      const blockW = xRight - xLeft;
      const n = 3 + (xi * 7 + yi * 3) % 3;
      let cursor = xLeft;
      for (let b = 0; b < n; b++) {
        const w = blockW / n + (((b + xi) * 11 + yi * 5) % 5 - 2) * 2;
        const padT = 2 + (b + yi * 7) % 5;
        const padB = 1 + (b + xi * 5) % 4;
        const padL = b === 0 ? 0 : 1;
        const bldg = {
          x: cursor + padL,
          y: yTop + padT,
          w: Math.max(10, w - padL - 1),
          h: yBot - yTop - padT - padB
        };
        if (!overlapsPark(bldg)) out.push(bldg);
        cursor += w;
      }
    }
  }
  return out;
}

// Polyline interpolation helpers
function pathLength(path) {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  }
  return len;
}
function pathAt(path, frac) {
  const total = pathLength(path);
  let target = frac * total;
  for (let i = 1; i < path.length; i++) {
    const segLen = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (target <= segLen || i === path.length - 1) {
      const t = Math.min(1, target / segLen);
      return {
        x: path[i - 1][0] + t * (path[i][0] - path[i - 1][0]),
        y: path[i - 1][1] + t * (path[i][1] - path[i - 1][1])
      };
    }
    target -= segLen;
  }
  return { x: path[path.length - 1][0], y: path[path.length - 1][1] };
}
function hexPath(cx, cy, R) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i;
    pts.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

// Mock foot-traffic field — Times Sq peak, Bryant Park secondary,
// Penn Station tertiary, plus light spatial noise. Returns 0–1.
function mockTraffic(cx, cy) {
  const peaks = [
  { x: 540, y: 250, w: 1.0, r: 200 }, // Times Square
  { x: 820, y: 460, w: 0.55, r: 140 }, // Bryant Park / Library
  { x: 360, y: 410, w: 0.7, r: 170 }, // Port Authority / Penn-ward
  { x: 980, y: 200, w: 0.45, r: 130 } // Rockefeller area
  ];
  let total = 0;
  for (const p of peaks) {
    const d = Math.hypot(cx - p.x, cy - p.y);
    if (d < p.r) total += p.w * (1 - d / p.r);
  }
  const noise = (Math.sin(cx * 0.13) + Math.cos(cy * 0.17) + Math.sin((cx + cy) * 0.09)) * 0.05;
  return Math.max(0, Math.min(1, total + noise));
}

// Deterministic FM-style features per cell — only things that genuinely
// vary block-to-block at H3 res-11 in dense urban grid. Drops weather,
// language, time-bucket, etc. (those are area-wide, not cell-level).
function cellFeatures(cx, cy, traffic) {
  const seed = Math.abs(Math.floor(cx * 31 + cy * 17));
  const n = (k) => Math.abs(Math.floor(seed * (k + 11) * 13 % 10000)) / 10000;

  return {
    BUILDING: ["OFFICE", "RETAIL", "THEATER", "MIXED", "CIVIC", "TRANSIT"][seed % 6],
    BLDG_HEIGHT: `${20 + Math.floor(n(1) * 180)}m`,
    SQM_BUILT: `${15 + Math.floor(n(2) * 75)}k`,
    POI_DENSITY: `${2 + Math.floor(n(3) * 22)}/cell`,
    CATEGORY_MIX: ["food.42", "retail.28", "civic.31", "mixed.19", "food.31"][seed % 5],

    TRAFFIC_RANK: (traffic * 9.9).toFixed(1),
    P95_VISITS: `${120 + Math.floor(n(5) * 380)}/h`,
    VISIT_DENS: ["LOW", "MED", "HIGH", "VERY HI"][Math.min(3, Math.floor(traffic * 4))],

    DWELL: `${3 + Math.floor(n(7) * 40)}m`,
    NIGHTLIFE: (0.05 + n(8) * 0.8).toFixed(2),
    TOURISM_IDX: (0.05 + n(9) * 0.9).toFixed(2)
  };
}

// Per-user feature pool — each panel shows 2 of these at a time, rotating.
const USER_POOLS = {
  U1: ["BUILDING", "BLDG_HEIGHT", "SQM_BUILT", "POI_DENSITY"],
  U2: ["TRAFFIC_RANK", "P95_VISITS", "VISIT_DENS", "CATEGORY_MIX"],
  U3: ["DWELL", "NIGHTLIFE", "CATEGORY_MIX", "VISIT_DENS"],
  U4: ["TOURISM_IDX", "P95_VISITS", "BUILDING", "NIGHTLIFE"]
};

// Anchor POIs — sparse, no clutter.
const ANCHOR_POIS = [
{ x: 540, y: 260, label: "TIMES SQ" },
{ x: 820, y: 478, label: "BRYANT PARK" },
{ x: 200, y: 320, label: "THEATER DIST" },
{ x: 980, y: 220, label: "ROCKEFELLER" }];


function ManhattanLattice() {
  const buildings = React.useMemo(() => generateBuildings(), []);

  // H3 res-11 hex lattice — covers the full viewBox.
  const r = 16;
  const hSpacing = r * 1.5;
  const vSpacing = r * Math.sqrt(3);
  const hexes = React.useMemo(() => {
    const out = [];
    for (let col = 0; col < 52; col++) {
      for (let row = 0; row < 22; row++) {
        const cx = 30 + col * hSpacing;
        const cy = 20 + row * vSpacing + (col % 2 === 0 ? 0 : vSpacing / 2);
        if (cx > 1200 || cy > 560) continue;
        const traffic = mockTraffic(cx, cy);
        out.push({ key: `${col}-${row}`, cx, cy, traffic, features: cellFeatures(cx, cy, traffic) });
      }
    }
    return out;
  }, []);
  const byKey = React.useMemo(() => Object.fromEntries(hexes.map((h) => [h.key, h])), [hexes]);

  // Personas — only on the right side (visible past the text overlay).
  // Each anchored to a specific cell key.
  const personas = React.useMemo(() => [
  { key: "20-6", label: "PARENT" },
  { key: "24-3", label: "TOURIST" },
  { key: "28-8", label: "WORKER" },
  { key: "32-12", label: "RUNNER" },
  { key: "36-4", label: "DINER" },
  { key: "40-10", label: "COMMUTER" },
  { key: "44-6", label: "REGULAR" },
  { key: "48-13", label: "VISITOR" },
  { key: "26-15", label: "STUDENT" },
  { key: "38-16", label: "WORKER" }],
  []);
  const personaSet = React.useMemo(
    () => Object.fromEntries(personas.map((p) => [p.key, p])),
    [personas]
  );

  // RAF time loop
  const [t, setT] = React.useState(0);
  const startRef = React.useRef(null);
  React.useEffect(() => {
    let raf;
    const tick = (now) => {
      if (startRef.current == null) startRef.current = now;
      setT(now - startRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Mouse-follow cell highlight
  const [hoverPt, setHoverPt] = React.useState(null);
  const svgRef = React.useRef(null);
  const onMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 1200;
    const y = (e.clientY - rect.top) / rect.height * 560;
    setHoverPt({ x, y });
  };
  const onLeave = () => setHoverPt(null);

  // Users — 4 movers in different zones so their panels rarely collide.
  // Each has its own FM-feature pool (see USER_POOLS); slow cycles so panels
  // stay readable.
  const users = React.useMemo(() => [
  // U1 — upper-middle, drifts south-west (theater district)
  { id: "U1", path: [[640, 80], [560, 180], [470, 280], [400, 380], [360, 480]], cycle: 32000 },
  // U2 — right edge, vertical loop
  { id: "U2", path: [[1090, 80], [1080, 200], [1100, 320], [1080, 440], [1050, 510]], cycle: 36000 },
  // U3 — mid horizontal sweep east
  { id: "U3", path: [[560, 260], [700, 270], [820, 280], [940, 270], [1030, 280]], cycle: 28000 },
  // U4 — lower band, sweep west
  { id: "U4", path: [[1020, 490], [880, 500], [740, 510], [600, 500], [470, 490]], cycle: 34000 }],
  []);

  const userStates = users.map((u, i) => {
    const offset = i * 3300;
    const cycle = u.cycle;
    const phase = ((t + offset) % cycle + cycle) % cycle / cycle;
    const pos = pathAt(u.path, phase);
    return { ...u, ...pos };
  });

  const findHex = (x, y) => {
    let best = null,bestD = Infinity;
    for (const h of hexes) {
      const d = (h.cx - x) ** 2 + (h.cy - y) ** 2;
      if (d < bestD) {bestD = d;best = h;}
    }
    return bestD < (r * 1.1) ** 2 ? best : null;
  };

  const cellToUser = {};
  userStates.forEach((u) => {
    const h = findHex(u.x, u.y);
    if (h) cellToUser[h.key] = u;
  });
  const activeKeys = new Set(Object.keys(cellToUser));
  const hoverHex = hoverPt ? findHex(hoverPt.x, hoverPt.y) : null;

  // Cell fill: warm-grey heatmap by traffic (sophisticated, grayscale-leaning).
  // Accent (cobalt) is reserved for LIVE inference — user dots, personas, hover.
  const cellFill = (h) => {
    const isActive = activeKeys.has(h.key);
    const isHover = hoverHex && hoverHex.key === h.key;
    if (isActive) return "rgba(30,58,138,0.30)";
    if (isHover) return "rgba(30,58,138,0.18)";
    if (personaSet[h.key]) return "rgba(30,58,138,0.12)";
    // Heatmap: warm ink at extremely low opacity — visible only en masse.
    return `rgba(26,24,21,${(0.015 + h.traffic * 0.08).toFixed(3)})`;
  };
  const cellStroke = (h) => {
    const isActive = activeKeys.has(h.key);
    const isHover = hoverHex && hoverHex.key === h.key;
    if (isActive) return "var(--accent)";
    if (isHover) return "var(--accent)";
    if (personaSet[h.key]) return "rgba(30,58,138,0.35)";
    // Lattice outline blends into paper — marginally darker for higher traffic.
    return `rgba(26,24,21,${(0.04 + h.traffic * 0.05).toFixed(3)})`;
  };
  const cellStrokeW = (h) => {
    if (activeKeys.has(h.key)) return 0.9;
    if (hoverHex && hoverHex.key === h.key) return 0.7;
    if (personaSet[h.key]) return 0.5;
    return 0.35;
  };

  return (
    <div className="basemap-float" onMouseLeave={onLeave}>
      <svg
        ref={svgRef}
        viewBox="0 0 1200 560"
        preserveAspectRatio="xMidYMid slice"
        className="basemap"
        onMouseMove={onMove}
        aria-hidden="true">
        
        {/* paper background */}
        <rect width="1200" height="560" fill="#ECE5D5" />

        {/* Bryant Park */}
        <g>
          <polygon points="760,440 880,440 880,540 760,540" fill="#C6D2B4" stroke="#A6B594" strokeWidth="0.6" />
          {[[778, 460], [802, 470], [828, 458], [856, 470], [770, 490], [810, 502], [848, 498], [820, 522], [786, 528], [864, 518]].
          map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#7F9C70" opacity="0.85" />)}
        </g>

        {/* building footprints — Overture layer */}
        <g>
          {buildings.map((b, i) =>
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill="#DCD3BF" stroke="#BFB6A0" strokeWidth="0.4" />
          )}
        </g>

        {/* avenues — casing + fill */}
        <g fill="none" strokeLinecap="square">
          {[80, 280, 480, 680, 880, 1080].map((x) =>
          <line key={"avc" + x} x1={x} y1="0" x2={x} y2="560" stroke="#C1B9A4" strokeWidth="18" />
          )}
          {[80, 280, 480, 680, 880, 1080].map((x) =>
          <line key={"avi" + x} x1={x} y1="0" x2={x} y2="560" stroke="#F5EFE0" strokeWidth="14" />
          )}
        </g>

        {/* streets — casing + fill */}
        <g fill="none" strokeLinecap="square">
          {[40, 110, 180, 250, 320, 390, 460, 530].map((y) =>
          <line key={"stc" + y} x1="0" y1={y} x2="1200" y2={y} stroke="#C1B9A4" strokeWidth="14" />
          )}
          {[40, 110, 180, 250, 320, 390, 460, 530].map((y) =>
          <line key={"sti" + y} x1="0" y1={y} x2="1200" y2={y} stroke="#F5EFE0" strokeWidth="10" />
          )}
        </g>

        {/* Broadway diagonal */}
        <g fill="none" strokeLinecap="square">
          <line x1="700" y1="0" x2="280" y2="560" stroke="#B7AE96" strokeWidth="20" />
          <line x1="700" y1="0" x2="280" y2="560" stroke="#F5EFE0" strokeWidth="15" />
        </g>

        {/* Times Square plaza wedge */}
        <polygon
          points="500,210 560,210 540,290 460,290 470,245 488,225"
          fill="rgba(30,58,138,0.16)"
          stroke="var(--accent)" strokeWidth="0.7" />
        

        {/* H3 res-11 hex grid — heatmap + light separation */}
        <g>
          {hexes.map((h) =>
          <polygon
            key={h.key}
            points={hexPath(h.cx, h.cy, r)}
            fill={cellFill(h)}
            stroke={cellStroke(h)}
            strokeWidth={cellStrokeW(h)} />

          )}
        </g>

        {/* anchor POI labels — small, restrained */}
        <g>
          {ANCHOR_POIS.map((p, i) =>
          <text
            key={i}
            x={p.x} y={p.y}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize="7.5"
            fill="#7A7670"
            letterSpacing="0.18em"
            fontWeight="600">
            {p.label}</text>
          )}
        </g>

        {/* persona nodes — dot + small label only */}
        <g>
          {personas.map((p, i) => {
            const h = byKey[p.key];
            if (!h) return null;
            const live = activeKeys.has(p.key);
            const above = i % 2 === 0;
            return (
              <g key={p.key} transform={`translate(${h.cx} ${h.cy})`}>
                <circle r="6" fill="none" stroke="var(--accent)" strokeWidth="0.7" opacity="0.5">
                  <animate attributeName="r" values="6;15;6" dur={live ? "1.6s" : "3.2s"} begin={`${(i * 0.27).toFixed(2)}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0;0.55" dur={live ? "1.6s" : "3.2s"} begin={`${(i * 0.27).toFixed(2)}s`} repeatCount="indefinite" />
                </circle>
                <circle r="5.5" fill="#FBFAF7" stroke="var(--accent)" strokeWidth="1.2" />
                <circle r="2" fill="var(--accent)" />
                <text
                  y={above ? -10 : 16}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)" fontSize="7.5"
                  fill="var(--accent)" letterSpacing="0.18em" fontWeight="600">
                  {p.label}</text>
              </g>);

          })}
        </g>

        {/* user dots + multi-row feature panel per mover (rotates over time) */}
        <g>
          {userStates.map((u, ui) => {
            const h = findHex(u.x, u.y);
            // Rotation index for this user — shifts every ~5s, distinct offset per mover
            const rotBase = Math.floor(t / 5200);
            const pool = USER_POOLS[u.id] || [];
            const idx = (rotBase + ui) % pool.length;
            const visibleKeys = Array.from({ length: 2 }, (_, k) => pool[(idx + k) % pool.length]);

            // Panel geometry — compact, 2 rows
            const panelW = 150;
            const panelH = 42;
            // Per-user quadrant so panels naturally fan out around their dots.
            const QUAD = {
              U1: { dx: 14, dy: -panelH - 14 }, // upper-right
              U2: { dx: -panelW - 14, dy: -panelH - 14 }, // upper-left
              U3: { dx: 14, dy: 14 }, // lower-right
              U4: { dx: -panelW - 14, dy: 14 } // lower-left
            };
            let dx = QUAD[u.id]?.dx ?? 14;
            let dy = QUAD[u.id]?.dy ?? 14;

            // Clamp to viewBox so panels never bleed past edges.
            const px = u.x + dx;
            if (px < 8) dx = 8 - u.x;else
            if (px + panelW > 1192) dx = 1192 - u.x - panelW;
            const py = u.y + dy;
            if (py < 8) dy = 8 - u.y;else
            if (py + panelH > 552) dy = 552 - u.y - panelH;

            // Leader line geometry — from panel's nearest corner to dot (which is at 0,0 in this group).
            const lx = dx > 0 ? dx : dx + panelW;
            const ly = dy > 0 ? dy : dy + panelH;

            return (
              <g key={u.id} transform={`translate(${u.x.toFixed(2)} ${u.y.toFixed(2)})`}>
                <circle r="7" fill="none" stroke="var(--accent)" strokeWidth="0.6" opacity="0.5">
                  <animate attributeName="r" values="5;12;5" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.55;0;0.55" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle r="3.6" fill="var(--accent)" stroke="#FBFAF7" strokeWidth="1.2" />

                {h &&
                <>
                    <line x1="0" y1="0" x2={lx} y2={ly} stroke="var(--accent)" strokeWidth="0.5" opacity="0.45" />
                    <g transform={`translate(${dx} ${dy})`} opacity="0.97">
                      <rect
                      width={panelW} height={panelH} rx="2.5"
                      fill="var(--bg-elevated)" stroke="var(--accent)" strokeWidth="0.6" />
                    
                      {visibleKeys.map((key, ki) => {
                      const yRow = 14 + ki * 13;
                      const val = key && h.features[key];
                      return (
                        <g key={`${u.id}-${key}-${ki}`}>
                            <text x="9" y={yRow} fontFamily="var(--font-mono)" fontSize="7" fill="var(--fg-muted)" letterSpacing="0.14em">{key}</text>
                            <text x={panelW - 9} y={yRow} textAnchor="end" fontFamily="var(--font-mono)" fontSize="7.5" fill="var(--fg)" letterSpacing="0.02em" fontWeight="600">{val}</text>
                          </g>);

                    })}
                    </g>
                  </>
                }
              </g>);

          })}
        </g>
      </svg>
    </div>);

}


/* =========================================================
   Talk-to-us — voice note widget. Record → captures name + email.
   ========================================================= */
function TalkToUs() {
  const [stage, setStage] = useState("idle"); // idle | recording | reviewing | details | sent
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState(() => new Array(48).fill(0.2));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const timerRef = React.useRef(null);
  const animRef = React.useRef(null);

  React.useEffect(() => {
    if (stage === "recording") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 0.1), 100);
      animRef.current = setInterval(() => {
        setBars((prev) => prev.map((_, i) => {
          const t = Date.now() / 220 + i * 0.4;
          return 0.2 + 0.75 * Math.abs(Math.sin(t) * Math.sin(t * 1.7 + i));
        }));
      }, 70);
    }
    return () => {
      clearInterval(timerRef.current);
      clearInterval(animRef.current);
    };
  }, [stage]);

  // Frozen waveform for review
  const reviewBars = React.useMemo(() => {
    return new Array(48).fill(0).map((_, i) => {
      const t = i * 0.7;
      return 0.18 + 0.7 * Math.abs(Math.sin(t) * Math.sin(t * 1.7 + i * 0.3));
    });
  }, []);

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const r = (s - m * 60).toFixed(1);
    return `${String(m).padStart(2, "0")}:${r.padStart(4, "0")}`;
  };

  const startRecord = () => {setElapsed(0);setStage("recording");};
  const stopRecord = () => {setStage("reviewing");};
  const rerecord = () => {setElapsed(0);setBars(new Array(48).fill(0.2));setStage("recording");};
  const continueToDetails = () => setStage("details");
  const send = (e) => {e.preventDefault();setStage("sent");};

  return (
    <div className="talk">
      <div className="talk-frame">
        <div className="talk-head">
          <span className="label">· leave a voice note</span>
          <span className="label" style={{ color: "var(--fg-muted)" }}>
            {stage === "idle" && "press to record"}
            {stage === "recording" && "recording…"}
            {stage === "reviewing" && "review"}
            {stage === "details" && "who are you?"}
            {stage === "sent" && "received"}
          </span>
        </div>

        {stage === "idle" &&
        <div className="talk-body">
            <button type="button" className="talk-record" onClick={startRecord} aria-label="Start recording">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <rect x="9" y="3.5" width="6" height="12" rx="3" fill="currentColor" />
                <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" stroke="currentColor" strokeWidth="1.6" fill="none" />
                <line x1="12" y1="18.5" x2="12" y2="21" stroke="currentColor" strokeWidth="1.6" />
              </svg>
              <span>Record a message</span>
            </button>
            <p className="talk-prompt">
              Tell us what you’re building. We’ll listen and write back —
              with sound on.
            </p>
          </div>
        }

        {stage === "recording" &&
        <div className="talk-body">
            <div className="talk-wave">
              {bars.map((h, i) =>
            <span key={i} style={{ height: `${Math.max(6, h * 56)}px` }} />
            )}
            </div>
            <div className="talk-row">
              <span className="talk-time mono">{fmtTime(elapsed)}</span>
              <button type="button" className="btn primary" onClick={stopRecord}>
                <span className="talk-dot" /> Stop
              </button>
            </div>
          </div>
        }

        {stage === "reviewing" &&
        <div className="talk-body">
            <div className="talk-wave talk-wave-static">
              {reviewBars.map((h, i) =>
            <span key={i} style={{ height: `${Math.max(6, h * 56)}px` }} />
            )}
            </div>
            <div className="talk-row">
              <span className="talk-time mono">{fmtTime(elapsed)} · recorded</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn" onClick={rerecord}>Re-record</button>
                <button type="button" className="btn primary" onClick={continueToDetails}>
                  Continue <span className="arrow">→</span>
                </button>
              </div>
            </div>
          </div>
        }

        {stage === "details" &&
        <form className="talk-body talk-form" onSubmit={send}>
            <div className="talk-fields">
              <label>
                <span className="label">name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Riya Patel" />
              </label>
              <label>
                <span className="label">email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="riya@…" />
              </label>
              <label className="talk-note">
                <span className="label">one line of context (optional)</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. mobility app · ranking team · ~4M MAU" />
              </label>
            </div>
            <div className="talk-row">
              <span className="talk-time mono">{fmtTime(elapsed)} attached</span>
              <button type="submit" className="btn primary">
                Send <span className="arrow">→</span>
              </button>
            </div>
          </form>
        }

        {stage === "sent" &&
        <div className="talk-body talk-sent">
            <div className="talk-checkmark" aria-hidden="true">
              <svg viewBox="0 0 28 28" width="28" height="28">
                <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 14.5 L12.5 19 L20 10.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="talk-sent-h">Thanks{name ? `, ${name.split(" ")[0]}` : ""}.</div>
              <div className="talk-sent-sub">We’ll write back to <span className="mono">{email || "you"}</span> within 48h.</div>
            </div>
          </div>
        }
      </div>
    </div>);

}

/* =========================================================
   Hero
   ========================================================= */
function Hero({ variant }) {
  const v = HERO_VARIANTS[variant];
  return (
    <section className="hero hero-overlay">
      <div className="hero-bg">
        <GlobeLattice />
      </div>
      <div className="container hero-content">
        <div className="hero-text">
          <h1>{v.h1}</h1>
          <p className="hero-sub" style={{ width: "700px" }}>{v.sub}</p>
          <p className="hero-go"><a href="https://skay97-curbai.hf.space" target="_blank" rel="noopener">See it live — the Atlas <span className="hg-arrow">→</span></a></p>
        </div>
      </div>
    </section>);

}

/* =========================================================
   Downstream — trajectory → derived persona → downstream uses
   The "every visit becomes a feature" story made concrete.
   ========================================================= */
function TrajectoryMap() {
  const stops = [
  { x: 28, y: 132, label: "HOME", t: "07:10" },
  { x: 78, y: 96, label: "SCHOOL", t: "08:14" },
  { x: 124, y: 70, label: "COFFEE", t: "08:35" },
  { x: 184, y: 50, label: "WORK", t: "09:30" },
  { x: 232, y: 86, label: "GYM", t: "12:15" },
  { x: 274, y: 132, label: "HOME", t: "19:40" }];

  const pts = stops.map((s) => `${s.x},${s.y}`).join(" ");
  return (
    <svg viewBox="0 0 312 168" className="traj-map" aria-hidden="true">
      <rect width="312" height="168" fill="var(--map-bg)" />
      {/* faint grid */}
      <g stroke="var(--map-line)" strokeWidth="0.5" fill="none">
        {[40, 80, 120, 160, 200, 240, 280].map((x) => <line key={"v" + x} x1={x} y1="0" x2={x} y2="168" />)}
        {[35, 70, 105, 140].map((y) => <line key={"h" + y} x1="0" y1={y} x2="312" y2={y} />)}
      </g>
      {/* a couple of subtle "block" polygons */}
      <g fill="var(--map-block)" stroke="var(--map-line)" strokeWidth="0.5">
        <rect x="48" y="18" width="24" height="14" />
        <rect x="140" y="32" width="40" height="14" />
        <rect x="200" y="108" width="32" height="20" />
      </g>
      {/* trajectory path */}
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
      {/* pins */}
      {stops.map((p, i) =>
      <g key={i}>
          <circle cx={p.x} cy={p.y} r="7" fill="var(--bg-elevated)" stroke="var(--accent)" strokeWidth="1.5" />
          <text x={p.x} y={p.y + 2.5} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="8" fill="var(--accent)" fontWeight="600">{i + 1}</text>
          <text x={p.x} y={p.y - 12} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="7.5" fill="var(--fg-muted)" letterSpacing="0.12em">{p.label}</text>
        </g>
      )}
      <text x="6" y="162" fontFamily="var(--font-mono)" fontSize="8" fill="var(--fg-muted)" letterSpacing="0.1em">14 DAYS · ANONYMIZED · 6 RECURRING STOPS</text>
    </svg>);

}

function Downstream() {
  return (
    <div className="downstream">
      <div className="ds-head">
        <span className="label">trajectory → persona → personalization</span>
        <span className="label" style={{ color: "var(--fg-muted)" }}>example · anonymized brooklyn user</span>
      </div>
      <div className="ds-grid ds-grid-3">
        {/* 01 — Trajectory input */}
        <div className="ds-card">
          <div className="ds-tag mono">01 · TRAJECTORY</div>
          <div className="ds-sub">14 days of location signal your app already collects, aggregated.</div>
          <TrajectoryMap />
          <ul className="traj-list mono">
            <li><span>HOME</span><span>Park Slope</span><span className="tm">nightly</span></li>
            <li><span>SCHOOL</span><span>PS 321</span><span className="tm">wk · 08:14</span></li>
            <li><span>COFFEE</span><span>Stumptown · Court St</span><span className="tm">4×/wk</span></li>
            <li><span>WORK</span><span>WeWork · DUMBO</span><span className="tm">wk · 09:30</span></li>
            <li><span>GYM</span><span>CrossFit · Cobble Hill</span><span className="tm">3×/wk · AM</span></li>
          </ul>
        </div>

        {/* 02 — Derived persona */}
        <div className="ds-card">
          <div className="ds-tag mono">02 · DERIVED PERSONA</div>
          <div className="ds-sub">What Geo infers from the trajectory. Calibrated. Versioned.</div>
          <div className="derived">
            <div className="dv"><span className="dv-k">lives</span><span className="dv-v">Park Slope, Brooklyn</span><span className="dv-p mono">0.97</span></div>
            <div className="dv"><span className="dv-k">household</span><span className="dv-v">parent · school-age</span><span className="dv-p mono">0.92</span></div>
            <div className="dv"><span className="dv-k">routine</span><span className="dv-v">dropoff → work → gym</span><span className="dv-p mono">0.88</span></div>
            <div className="dv"><span className="dv-k">fitness</span><span className="dv-v">3× / wk · morning</span><span className="dv-p mono">0.91</span></div>
          </div>
          <div className="persona-vec">
            <div className="pv-head"><span className="label">persona embedding · 256d</span><span className="label" style={{ color: "var(--fg-muted)" }}>uint8 stored</span></div>
            <div className="pv-bars">
              {[0.78, 0.34, 0.61, 0.92, 0.18, 0.55, 0.71, 0.29, 0.83, 0.41, 0.58, 0.66, 0.22, 0.47, 0.74, 0.36, 0.81, 0.52, 0.45, 0.69, 0.31, 0.88, 0.27, 0.59].
              map((v, i) => <span key={i} style={{ height: `${10 + v * 22}px` }} />)}
            </div>
          </div>
        </div>

        {/* 03 — Downstream uses */}
        <div className="ds-card">
          <div className="ds-tag mono">03 · DOWNSTREAM</div>
          <div className="ds-sub">Same persona, fanned out across the surfaces in your app that need to know the user.</div>
          <div className="uses">
            <div className="use">
              <div className="u-tag">IN-APP AI</div>
              <div className="u-body">
                "Standing 9am call — Stumptown has a 4-min walk-up window, you'll make it.
                Want me to push your 7:30 to 8?"
              </div>
            </div>
            <div className="use">
              <div className="u-tag">RANKER</div>
              <div className="u-body">
                Family-aware dinner spots on Smith St · grocery delivery in 11m ·
                pre-school enrichment within 0.4mi
              </div>
            </div>
            <div className="use">
              <div className="u-tag">AD SELECTION</div>
              <div className="u-body">
                Premium AM slots · family-aware brands · CrossFit-adjacent inventory
                <div className="u-meta mono">
                  <span>eCPM</span><span className="tnum">$4.20</span>
                  <span>fill</span><span className="tnum">62%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="ds-foot">
        <span className="label">one trajectory · one persona · every surface in your app that needs to know the user</span>
      </div>
    </div>);

}

/* =========================================================
   Try it — live demo, full width, Aaru-style hover-reveal
   ========================================================= */
function TryIt() {
  return (
    <section className="tryit" id="try">
      <div className="container">
        <DemoWidget />
      </div>
    </section>);

}

/* =========================================================
   Manifesto
   ========================================================= */
function Manifesto() {
  return (
    <section className="manifesto">
      <div className="container">
        <div className="mn-eyebrow"><span className="label">§01 · the bet</span></div>
        <h2>
          The personalization tech that runs the web<br />
          <em>doesn’t exist for the real world. So we built it.</em>
        </h2>
      </div>
    </section>);

}

/* =========================================================
   Product modules
   ========================================================= */

// API code snippet — coloring done inline using span children
const API_SNIPPET = `import { geo } from "@geo/sdk";

const ctx = await geo.context.resolve({
  lat: 40.7580,
  lon: -73.9855,
  include: ["poi_candidates", "context", "embeddings"],
});

// ctx.resolved.building_id          → "osm/way/24698432"
// ctx.poi_candidates[0].name        → "TKTS Booth — Times Square"
// ctx.context.foot_traffic_rank     → 9.7
// ctx.place_embedding.slice(0, 4)   → [0.0421, -0.1187, 0.3309, 0.0044]`;

function colorCode(src) {
  const out = [];
  let key = 0;
  src.split("\n").forEach((line, li) => {
    if (li > 0) out.push(<br key={"br" + li} />);
    const re = /(\/\/.*$|"[^"]*"|\b(?:import|from|const|await|true|false|null|return)\b|\b\d+\.\d+|\b\d+\b)/g;
    let m,last = 0;
    while ((m = re.exec(line)) !== null) {
      if (m.index > last) out.push(<span key={key++} className="p">{line.slice(last, m.index)}</span>);
      const tok = m[0];
      if (tok.startsWith("//")) out.push(<span key={key++} className="c">{tok}</span>);else
      if (tok.startsWith('"')) out.push(<span key={key++} className="s">{tok}</span>);else
      if (/^\d/.test(tok)) out.push(<span key={key++} className="n">{tok}</span>);else
      out.push(<span key={key++} className="k">{tok}</span>);
      last = m.index + tok.length;
    }
    if (last < line.length) out.push(<span key={key++} className="p">{line.slice(last)}</span>);
  });
  return out;
}

function IVDiagram() {
  // Inferred visitation: raw noisy GPS pings → building polygons → resolved POI
  return (
    <svg viewBox="0 0 540 320" className="iv">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--fg-muted)" />
        </marker>
      </defs>

      {/* col headers */}
      <g fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--fg-muted)" letterSpacing="0.12em">
        <text x="10" y="20">01 · RAW GPS</text>
        <text x="200" y="20">02 · BUILDING BUCKET</text>
        <text x="400" y="20">03 · RESOLVED POI</text>
      </g>

      {/* col 1: scattered noisy pings */}
      <g>
        <rect x="10" y="35" width="170" height="240" fill="var(--surface-alt)" stroke="var(--border)" />
        {[
        [40, 80], [55, 72], [70, 95], [42, 110], [63, 118], [88, 90],
        [55, 150], [78, 165], [100, 178], [120, 200], [88, 210], [140, 225],
        [70, 55], [110, 130], [150, 160], [130, 90], [160, 210], [95, 250],
        [122, 255], [45, 200]].
        map(([x, y], i) =>
        <circle key={i} cx={x + 10} cy={y} r="2.5" fill="var(--accent)" opacity="0.55" />
        )}
        <text x="14" y="270" fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-muted)">σ ≈ 18m · n=2,447</text>
      </g>

      <line x1="183" y1="155" x2="200" y2="155" stroke="var(--fg-muted)" strokeWidth="1" markerEnd="url(#arr)" />

      {/* col 2: building polygons */}
      <g transform="translate(205 35)">
        <rect width="170" height="240" fill="var(--surface-alt)" stroke="var(--border)" />
        <rect x="20" y="20" width="60" height="40" fill="var(--surface)" stroke="var(--border-strong)" />
        <rect x="20" y="70" width="40" height="55" fill="var(--surface)" stroke="var(--border-strong)" />
        <rect x="70" y="70" width="50" height="55" fill="var(--accent-soft)" stroke="var(--accent)" strokeDasharray="3 3" />
        <rect x="130" y="20" width="30" height="80" fill="var(--surface)" stroke="var(--border-strong)" />
        <rect x="20" y="135" width="70" height="40" fill="var(--surface)" stroke="var(--border-strong)" />
        <rect x="100" y="135" width="60" height="55" fill="var(--surface)" stroke="var(--border-strong)" />
        <rect x="20" y="185" width="60" height="40" fill="var(--surface)" stroke="var(--border-strong)" />
        <rect x="90" y="200" width="70" height="25" fill="var(--surface)" stroke="var(--border-strong)" />

        {/* pings clustered inside the highlighted polygon */}
        <circle cx="85" cy="90" r="2" fill="var(--accent)" />
        <circle cx="92" cy="100" r="2" fill="var(--accent)" />
        <circle cx="103" cy="92" r="2" fill="var(--accent)" />
        <circle cx="98" cy="108" r="2" fill="var(--accent)" />
        <text x="6" y="270" fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-muted)">p(bldg) = 0.94</text>
      </g>

      <line x1="378" y1="155" x2="395" y2="155" stroke="var(--fg-muted)" strokeWidth="1" markerEnd="url(#arr)" />

      {/* col 3: ranked POI candidates */}
      <g transform="translate(400 35)" fontFamily="var(--font-mono)" fontSize="11" fill="var(--fg)">
        <rect width="130" height="240" fill="var(--surface-alt)" stroke="var(--border)" />
        {[
        ["TKTS Booth", "0.41"],
        ["Olive Garden", "0.19"],
        ["Sephora", "0.14"],
        ["Hard Rock", "0.11"],
        ["Bubba Gump", "0.08"],
        ["—", "0.07"]].
        map(([nm, p], i) =>
        <g key={i} transform={`translate(0 ${22 + i * 36})`}>
            <rect x="6" y="0" width={`${parseFloat(p) * 230}`} height="20" fill={i === 0 ? "var(--accent)" : "var(--border)"} opacity={i === 0 ? 1 : 0.5} />
            <text x="10" y="14" fill={i === 0 ? "#FBFAF7" : "var(--fg)"} fontWeight={i === 0 ? 600 : 400}>{nm}</text>
            <text x="120" y="14" textAnchor="end" fill={i === 0 ? "#FBFAF7" : "var(--fg-secondary)"} className="tnum">{p}</text>
          </g>
        )}
      </g>
    </svg>);

}

function EmbViz() {
  // Stylized 2D projection of place embeddings — cluster of dots colored by domain
  // (cafe, transit, retail, etc.), with the queried point's neighborhood highlighted.
  const pts = React.useMemo(() => {
    const seed = 7;
    let s = seed;
    const rng = () => {s = (s * 9301 + 49297) % 233280;return s / 233280;};
    const clusters = [
    { cx: 140, cy: 110, r: 50, n: 28, color: "var(--accent)", label: "transit / hubs" },
    { cx: 320, cy: 90, r: 45, n: 26, color: "#8A5BB8", label: "retail core" },
    { cx: 420, cy: 200, r: 55, n: 30, color: "#1A7D4A", label: "food / nightlife" },
    { cx: 200, cy: 240, r: 48, n: 24, color: "#B85431", label: "civic / parks" },
    { cx: 80, cy: 240, r: 35, n: 14, color: "var(--fg-muted)", label: "" }];

    const out = [];
    clusters.forEach((c) => {
      for (let i = 0; i < c.n; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.pow(rng(), 0.6) * c.r;
        out.push({ x: c.cx + Math.cos(a) * r, y: c.cy + Math.sin(a) * r, color: c.color });
      }
    });
    return { points: out, clusters };
  }, []);

  return (
    <svg viewBox="0 0 540 330" className="emb">
      {/* axes */}
      <g stroke="var(--border)" strokeWidth="1">
        <line x1="20" y1="290" x2="520" y2="290" />
        <line x1="20" y1="20" x2="20" y2="290" />
      </g>
      <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-muted)" letterSpacing="0.1em">
        <text x="20" y="14">DIM 1</text>
        <text x="495" y="305">DIM 2</text>
        <text x="490" y="14" textAnchor="end">UMAP / 256d → 2d</text>
      </g>

      {/* cluster dots */}
      {pts.points.map((p, i) =>
      <circle key={i} cx={p.x} cy={p.y} r="3.2" fill={p.color} opacity="0.75" />
      )}

      {/* cluster labels */}
      {pts.clusters.filter((c) => c.label).map((c, i) =>
      <g key={i}>
          <text x={c.cx} y={c.cy - c.r - 6} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="9.5" fill={c.color} letterSpacing="0.08em">{c.label.toUpperCase()}</text>
        </g>
      )}

      {/* query point — a ringed marker on the transit cluster */}
      <g>
        <circle cx="155" cy="115" r="14" fill="none" stroke="var(--fg)" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="155" cy="115" r="4.5" fill="var(--fg)" stroke="var(--bg)" strokeWidth="1.5" />
        <text x="173" y="118" fontFamily="var(--font-mono)" fontSize="10" fill="var(--fg)">query · Times Sq</text>
      </g>

      {/* nearest neighbors — bottom of chart, clear of cluster labels */}
      <g fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--fg-muted)">
        <text x="20" y="312">nearest:  Shibuya Crossing  ·  Piccadilly  ·  Plaça Catalunya</text>
      </g>
    </svg>);

}

/* =========================================================
   What we ship — Foundation Model + primitives + use cases
   ========================================================= */

// A sophisticated FM schematic — modality streams flow into a multi-layer
// hex stack on the right, outputs emit as embedding bar traces. Animated.
function FMDiagram() {
  const modalities = [
  { name: "Overture · 6 themes", short: "BLD", weight: 0.92 },
  { name: "Foursquare Open Places", short: "POI", weight: 0.88 },
  { name: "OpenStreetMap", short: "OSM", weight: 0.84 },
  { name: "WorldMove mobility", short: "MOV", weight: 0.96 },
  { name: "SatCLIP imagery", short: "SAT", weight: 0.74 },
  { name: "Demographics", short: "DEM", weight: 0.68 },
  { name: "Nightlight", short: "NLT", weight: 0.55 },
  { name: "Population", short: "POP", weight: 0.71 }];


  // Deterministic embedding bar profiles for the outputs.
  const cellBars = [0.62, 0.31, 0.78, 0.55, 0.18, 0.92, 0.41, 0.66, 0.27, 0.71, 0.49, 0.84, 0.22, 0.57, 0.74, 0.38];
  const placeBars = [0.48, 0.71, 0.34, 0.82, 0.59, 0.27, 0.65, 0.51, 0.93, 0.42, 0.36, 0.68, 0.55, 0.81, 0.29, 0.74];
  const personaBars = [0.55, 0.91, 0.42, 0.67, 0.31, 0.77, 0.58, 0.84, 0.39, 0.62, 0.71, 0.45, 0.88, 0.36, 0.69, 0.52];

  // Hex stack — 4 layers offset slightly for depth.
  const hexCenter = { x: 420, y: 200 };
  const hexR = 64;
  const stack = [3, 2, 1, 0]; // back to front

  const hexPts = (cx, cy, R) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 6;
      pts.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  return (
    <svg viewBox="0 0 760 400" className="fm-svg" aria-hidden="true">
      <defs>
        {/* dashed-flow keyframes */}
        <style>{`
          .fm-stream { stroke-dasharray: 3 4; animation: fmflow 1.8s linear infinite; }
          @keyframes fmflow { to { stroke-dashoffset: -28; } }
          .fm-pulse { animation: fmpulse 2.4s ease-in-out infinite; }
          @keyframes fmpulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        `}</style>
      </defs>

      {/* modality rows — left column */}
      <g fontFamily="var(--font-mono)">
        {modalities.map((m, i) => {
          const y = 32 + i * 42;
          return (
            <g key={m.name}>
              {/* row label + small horizontal weight bar */}
              <text x="14" y={y + 4} fontSize="11" fill="var(--fg)" fontWeight="500">{m.name}</text>
              <text x="14" y={y + 16} fontSize="9" fill="var(--fg-muted)" letterSpacing="0.14em">{m.short}</text>
              {/* weight indicator */}
              <g transform={`translate(180 ${y - 2})`}>
                <rect x="0" y="0" width="60" height="3" fill="var(--border)" rx="1.5" />
                <rect x="0" y="0" width={60 * m.weight} height="3" fill="var(--accent)" rx="1.5" />
              </g>
              <text x="246" y={y + 4} fontSize="9" fill="var(--fg-muted)" fontFamily="var(--font-mono)" letterSpacing="0.04em" textAnchor="end" style={{ transform: "translateX(34px)" }}>
                {(m.weight * 100).toFixed(0)}
              </text>
              {/* dotted flow line into hex stack */}
              <line
                x1="290" y1={y + 2}
                x2={hexCenter.x - hexR * 0.85} y2={hexCenter.y + (i - 3.5) * 8}
                stroke="var(--accent)" strokeWidth="0.7"
                className="fm-stream"
                opacity={0.35 + m.weight * 0.35} />
              
              {/* small dot at the input end */}
              <circle cx="290" cy={y + 2} r="2.4" fill="var(--accent)" className="fm-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
            </g>);

        })}
      </g>

      {/* central hex stack — 4 layers for depth */}
      <g>
        {stack.map((s, idx) => {
          const off = s * 5;
          const isFront = s === 0;
          return (
            <polygon
              key={s}
              points={hexPts(hexCenter.x + off, hexCenter.y - off, hexR)}
              fill={isFront ? "var(--bg-elevated)" : "var(--surface)"}
              stroke="var(--accent)"
              strokeWidth={isFront ? 1.4 : 0.7}
              opacity={isFront ? 1 : 0.4 - idx * 0.08} />);


        })}
        {/* core label */}
        <g transform={`translate(${hexCenter.x} ${hexCenter.y})`} fontFamily="var(--font-mono)" textAnchor="middle">
          <text y="-18" fontSize="9.5" fill="var(--fg-muted)" letterSpacing="0.2em">FOUNDATION MODEL</text>
          <text y="0" fontSize="22" fill="var(--accent)" fontWeight="600" letterSpacing="0.04em">H3 · res 9</text>
          <text y="16" fontSize="10" fill="var(--fg-muted)">~174M cells · global</text>
          {/* tiny internal lattice mark */}
          <g transform="translate(0 30)" opacity="0.6">
            <line x1="-20" y1="0" x2="-12" y2="0" stroke="var(--accent)" strokeWidth="0.6" />
            <line x1="-8" y1="0" x2="0" y2="0" stroke="var(--accent)" strokeWidth="0.6" />
            <line x1="4" y1="0" x2="12" y2="0" stroke="var(--accent)" strokeWidth="0.6" />
            <line x1="16" y1="0" x2="20" y2="0" stroke="var(--accent)" strokeWidth="0.6" />
          </g>
        </g>
      </g>

      {/* output: 3 embedding traces on the right */}
      <g>
        {[
        { y: 60, k: "PER-CELL EMBEDDING", sub: "256d · h3_index", bars: cellBars },
        { y: 168, k: "PER-PLACE EMBEDDING", sub: "256d · place_id", bars: placeBars },
        { y: 276, k: "PER-PERSONA EMBEDDING", sub: "256d · device_hash", bars: personaBars }].
        map((o, oi) => {
          const x0 = 540,w = 200,h = 78;
          return (
            <g key={o.k}>
              {/* connector from hex */}
              <line
                x1={hexCenter.x + hexR * 0.85} y1={hexCenter.y + (oi - 1) * 38}
                x2={x0 - 6} y2={o.y + h / 2}
                stroke="var(--accent)" strokeWidth="0.8"
                className="fm-stream"
                opacity="0.6" />
              
              {/* output frame */}
              <rect x={x0} y={o.y} width={w} height={h}
              fill="var(--bg-elevated)"
              stroke="var(--border-strong)"
              strokeWidth="0.7"
              rx="3" />
              
              <text x={x0 + 10} y={o.y + 14} fontFamily="var(--font-mono)" fontSize="9" fill="var(--accent)" letterSpacing="0.14em" fontWeight="600">{o.k}</text>
              <text x={x0 + 10} y={o.y + 26} fontFamily="var(--font-mono)" fontSize="9" fill="var(--fg-muted)" letterSpacing="0.02em">{o.sub}</text>
              {/* embedding bar trace */}
              <g transform={`translate(${x0 + 10} ${o.y + 38})`}>
                {o.bars.map((v, bi) =>
                <rect
                  key={bi}
                  x={bi * 11.4}
                  y={28 - v * 26}
                  width="9"
                  height={v * 26}
                  fill="var(--accent)"
                  opacity={0.55 + bi % 3 * 0.15} />

                )}
              </g>
            </g>);

        })}
      </g>

      {/* corner labels */}
      <text x="14" y="14" fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--fg-muted)" letterSpacing="0.18em">INPUTS</text>
      <text x="746" y="14" textAnchor="end" fontFamily="var(--font-mono)" fontSize="9.5" fill="var(--fg-muted)" letterSpacing="0.18em">OUTPUTS</text>
    </svg>);

}

/* =========================================================
   What gets unlocked — sophisticated cards with mini-viz
   ========================================================= */
function UnlockSparkline({ values, peak }) {
  // Tiny SVG sparkline. `values` is an array of 0..1 floats. `peak` highlights an index.
  const w = 180,h = 36;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - v * (h - 4) - 2).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="uc-spark" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round" />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="var(--accent-soft)" stroke="none" opacity="0.7" />
      {peak != null &&
      <g transform={`translate(${(peak * step).toFixed(1)} ${(h - values[peak] * (h - 4) - 2).toFixed(1)})`}>
          <circle r="2.6" fill="var(--accent)" />
          <circle r="5" fill="none" stroke="var(--accent)" strokeWidth="0.7" opacity="0.5" />
        </g>
      }
    </svg>);

}

function UnlockRanked() {
  const items = [
  { rank: "01", name: "Tartine — 4-min walk", d: "+0.41" },
  { rank: "02", name: "Bi-Rite Creamery", d: "+0.27" },
  { rank: "03", name: "Dolores Park bench", d: "+0.18" },
  { rank: "—", name: "Generic NYC content", d: "−0.22", dim: true }];

  return (
    <ol className="uc-ranked">
      {items.map((it, i) =>
      <li key={i} className={it.dim ? "dim" : ""}>
          <span className="uc-rk mono">{it.rank}</span>
          <span className="uc-rn">{it.name}</span>
          <span className="uc-rd mono">{it.d}</span>
        </li>
      )}
    </ol>);

}

function UnlockTargeting() {
  const params = [
  ["household", "parent · school_age"],
  ["dwell_typical", "14m"],
  ["primary_mode", "pedestrian"],
  ["time_bucket", "weekday_pm_rush"]];

  return (
    <div className="uc-targeting mono">
      {params.map(([k, v], i) =>
      <React.Fragment key={i}>
          <span className="uc-tk">{k}</span>
          <span className="uc-tv">{v}</span>
        </React.Fragment>
      )}
    </div>);

}

function UnlockAIQuote() {
  return (
    <div className="uc-quote">
      <div className="uc-q-user mono">
        <span className="uc-q-tag">you</span>
        where should I eat near me?
      </div>
      <div className="uc-q-body">
        You're on 7th &amp; W47. <strong>Joe Allen</strong> has a 12-min table.
        You'll still make the 8pm.
      </div>
    </div>);

}

function UnlockFeed() {
  // Muted grayscale shopping/discovery feed mock. 4 items stacked.
  const items = [
  { tag: "near you · 0.4mi", title: "Saint Frank — Mission", meta: "Coffee · open · 3-min walk", on: true },
  { tag: "recommended", title: "Tartine — table for 2", meta: "Bakery · 12-min wait" },
  { tag: "what others did", title: "Bi-Rite Creamery", meta: "Dessert · open late" },
  { tag: "evening", title: "Dolores Park", meta: "Outdoor · golden hour" }];

  return (
    <div className="uc-feed">
      {items.map((it, i) =>
      <div key={i} className={"uc-feed-item" + (it.on ? " on" : "")}>
          <div className="uc-feed-thumb" aria-hidden="true">
            <svg viewBox="0 0 80 60" preserveAspectRatio="xMidYMid slice">
              {Array.from({ length: 32 }).map((_, k) => {
              const x = (k * 13 + i * 7) % 78 + 1;
              const y = (k * 19 + i * 11) % 58 + 1;
              return <circle key={k} cx={x} cy={y} r={0.6 + k % 3 * 0.3} fill="var(--fg)" opacity={it.on ? 0.55 : 0.32} />;
            })}
            </svg>
          </div>
          <div className="uc-feed-meta">
            <div className="uc-feed-tag mono">{it.tag}</div>
            <div className="uc-feed-title">{it.title}</div>
            <div className="uc-feed-sub">{it.meta}</div>
          </div>
        </div>
      )}
    </div>);
}

function UnlockAd() {
  return (
    <div className="uc-ad">
      <div className="uc-ad-creative">
        <div className="uc-ad-stippled" aria-hidden="true">
          <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 80 }).map((_, k) => {
              const x = k * 13 % 196 + 2;
              const y = k * 19 % 116 + 2;
              return <circle key={k} cx={x} cy={y} r={0.5 + k % 4 * 0.25} fill="var(--fg)" opacity={0.32} />;
            })}
          </svg>
        </div>
        <div className="uc-ad-overlay">
          <div className="uc-ad-brand mono">sponsored · stumptown</div>
          <div className="uc-ad-headline">Pour-over before your 9am.</div>
          <div className="uc-ad-cta mono">3-min walk →</div>
        </div>
      </div>
      <div className="uc-ad-target mono">
        <div className="uc-ad-target-h">why this user · why now</div>
        <ul>
          <li><span>routine</span><span>dropoff → coworking</span></li>
          <li><span>moment</span><span>weekday · pre-work</span></li>
          <li><span>dwell</span><span>4-min walk-up window</span></li>
          <li><span>price band</span><span>premium coffee · regular</span></li>
        </ul>
      </div>
    </div>);
}

function UnlockCommerce() {
  // Quick-commerce dispatch + per-zone demand. Surge highlighted.
  const zones = [
  { name: "ZONE A · MISSION", demand: 0.78, store: "DS-04" },
  { name: "ZONE B · NOE", demand: 0.56, store: "DS-04" },
  { name: "ZONE C · CASTRO", demand: 0.93, store: "DS-07", surge: true },
  { name: "ZONE D · POTRERO", demand: 0.28, store: "DS-07" }];

  return (
    <div className="uc-commerce">
      <div className="uc-commerce-h mono">live demand · per cell · 14:30 SF</div>
      <ul className="uc-commerce-zones">
        {zones.map((z) =>
        <li key={z.name} className={z.surge ? "surge" : ""}>
            <span className="uz-name mono">{z.name}</span>
            <span className="uz-bar"><span style={{ width: `${z.demand * 100}%` }} /></span>
            <span className="uz-pct mono tnum">{Math.round(z.demand * 100)}</span>
            <span className="uz-store mono">{z.store}</span>
            {z.surge && <span className="uz-surge mono">surge × 1.4</span>}
          </li>
        )}
      </ul>
    </div>);
}

function UnlockRisk() {
  return (
    <div className="uc-risk">
      <div className="ur-head mono">underwriting · driver #4291</div>
      <div className="ur-body">
        <div className="ur-score">
          <div className="ur-score-num tnum serif">0.34</div>
          <div className="ur-score-meta">
            <div className="ur-score-band mono">low–mid · 5y trajectory</div>
            <div className="ur-score-baseline mono">zip-only baseline 0.51</div>
          </div>
        </div>
        <div className="ur-signals mono">
          <div className="ur-h">contributing signals</div>
          <ul>
            <li><span>parks off-street · 78%</span><span className="ur-d">−0.18</span></li>
            <li><span>commutes 7–9am</span><span className="ur-d">−0.06</span></li>
            <li><span>dwells late · downtown</span><span className="ur-d add">+0.04</span></li>
            <li><span>weekend long-haul</span><span className="ur-d add">+0.12</span></li>
          </ul>
        </div>
      </div>
    </div>);
}

const UNLOCK_CARDS = [
{
  k: "01",
  name: "Assistants that know the user's world",
  desc: <>The in-app assistant stops hallucinating restaurants. It knows the place, the moment, <span className="serif-italic">and what comes next.</span></>,
  viz: <UnlockAIQuote />
},
{
  k: "02",
  name: "Feeds that knew before you did",
  desc: <>Stop wasting taps on <span className="serif-italic">places people aren't going.</span> The home feed reorders for this user, this block, this hour.</>,
  viz: <UnlockFeed />
},
{
  k: "03",
  name: "Ads that mean something",
  desc: <>Targeting moves from the coordinate to the moment. <span className="serif-italic">Dwell, intent, and time bucket.</span> The impression finally knows who it's reaching, and why.</>,
  viz: <UnlockAd />
},
{
  k: "04",
  name: "Catchments drawn by reality",
  desc: <>Dispatch from the dark store that actually serves this cell. <span className="serif-italic">Surge when the street says so.</span> Catchment polygons that match where users go, not where the geocoder thinks they live.</>,
  viz: <UnlockCommerce />
},
{
  k: "05",
  name: "Underwriting at the cell level",
  desc: <>Stop pricing risk by zip code. <span className="serif-italic">Start pricing by how a vehicle is actually used.</span> Per-cell exposure, real driving behavior, real dwell.</>,
  viz: <UnlockRisk />
}];


function Unlock() {
  return (
    <div className="unlock">
      <div className="uc-grid">
        {UNLOCK_CARDS.map((c) =>
        <div key={c.k} className="uc-card">
            <div className="uc-card-top">
              <span className="uc-k mono">{c.k}</span>
              <span className="uc-n">{c.name}</span>
            </div>
            <p className="uc-d">{c.desc}</p>
            <div className="uc-viz">{c.viz}</div>
          </div>
        )}
      </div>
    </div>);

}

/* =========================================================
   PinScrollFold — reusable pin-and-scroll container.
   Outer wrap is tall (N+1 viewports); inner sticky panel is 100vh.
   Children receive { active, progress, total } via render-prop.
   ========================================================= */
function PinScrollFold({ slides, vhPerSlide = 50, className, children }) {
  const rootRef = React.useRef(null);
  const [active, setActive] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onScroll = () => {
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const totalScroll = root.offsetHeight - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), totalScroll);
      const frac = totalScroll > 0 ? scrolled / totalScroll : 0;
      const exact = frac * slides;
      const idx = Math.min(slides - 1, Math.floor(exact));
      const inBlock = Math.min(1, Math.max(0, exact - idx));
      setActive(idx);
      setProgress(inBlock);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [slides]);

  return (
    <div
      ref={rootRef}
      className={"pin-scroll " + (className || "")}
      style={{ minHeight: `${slides * vhPerSlide}vh` }}>
      
      <div className="pin-sticky">
        {typeof children === "function" ?
        children({ active, progress, total: slides }) :
        children}
      </div>
    </div>);

}

/* =========================================================
   Waveform progress — an audio-style scrubber. Vertical bars of
   pseudo-random heights; bars to the left of (active+progress)
   fill with accent. Replaces the segment progress rails.
   ========================================================= */
function WaveformProgress({ active, progress, total, bars = 96, height = 40, className, variant = "default" }) {
  // Heights: each slide section gets its own peak (sinusoidal envelope)
  // plus organic noise. Reflects entity count in the section.
  const heights = React.useMemo(() => {
    return Array.from({ length: bars }, (_, i) => {
      const t = i / bars;
      const sectionIdx = Math.floor(t * total);
      const sectionT = t * total - sectionIdx;
      const sectionPeak = Math.sin(sectionT * Math.PI);
      const noise = Math.sin(t * 47 + 1.1) * 0.12 + Math.sin(t * 23 + 2.3) * 0.08;
      return Math.min(1, Math.max(0.18, sectionPeak * 0.7 + 0.2 + noise));
    });
  }, [bars, total]);

  const fillProgress = (active + progress) / total;
  const filledBars = Math.floor(fillProgress * bars);
  const partial = fillProgress * bars - filledBars;

  // Ambient = grayscale, used as background behind content.
  const filledColor = variant === "ambient" ? "var(--fg-muted)" : "var(--accent)";
  const emptyColor = variant === "ambient" ? "var(--border)" : "var(--border)";

  return (
    <svg
      viewBox={`0 0 ${bars * 4} ${height}`}
      preserveAspectRatio="none"
      className={"waveform " + (className || "")}
      aria-hidden="true">
      
      {heights.map((h, i) => {
        const x = i * 4;
        const barH = Math.max(1.5, h * (height - 4));
        const y = (height - barH) / 2;
        let fill;
        if (i < filledBars) fill = filledColor;else
        if (i === filledBars) fill = `color-mix(in oklab, ${filledColor} ${(partial * 100).toFixed(0)}%, ${emptyColor})`;else
        fill = emptyColor;
        return <rect key={i} x={x} y={y} width="2" height={barH} fill={fill} rx="0.5" />;
      })}
    </svg>);

}

/* =========================================================
   GPSHalftone — stippled GPS-themed graphics. Three variants:
     0 · city grid (offline world, invisible to the web)
     1 · trajectory curves (where you go)
     2 · radial pulse (the signal, calibrated)
   ========================================================= */
function GPSHalftone({ variant = 1 }) {
  const dots = React.useMemo(() => {
    // Shared seeded RNG
    const makeRng = (seed) => {
      let s = seed;
      return () => {s = (s * 9301 + 49297) % 233280;return s / 233280;};
    };

    if (variant === 0) {
      // CITY with streets and blocks — proper Manhattan-style grid.
      // Streets are drawn as dotted lines running between block rows/cols,
      // intersections marked, plus a GPS ping marker on one block.
      const out = [];
      const rng = makeRng(11);
      const cols = 5,rows = 4;
      const left = 36,top = 56,blockW = 88,blockH = 76,gap = 18;
      const totalW = cols * blockW + (cols - 1) * gap;
      const totalH = rows * blockH + (rows - 1) * gap;

      // BLOCKS — solid stippled rectangles (denser perimeter, sparse interior)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const bx = left + c * (blockW + gap);
          const by = top + r * (blockH + gap);
          if ((r + c) % 7 === 3) continue; // skip a couple for plaza rhythm
          // Perimeter
          for (let i = 0; i < 110; i++) {
            const t = i / 110;
            let x, y;
            if (t < 0.25) {x = bx + t / 0.25 * blockW;y = by;} else
            if (t < 0.5) {x = bx + blockW;y = by + (t - 0.25) / 0.25 * blockH;} else
            if (t < 0.75) {x = bx + blockW - (t - 0.5) / 0.25 * blockW;y = by + blockH;} else
            {x = bx;y = by + blockH - (t - 0.75) / 0.25 * blockH;}
            out.push({ x: x + (rng() - 0.5) * 3, y: y + (rng() - 0.5) * 3, r: 0.5 + rng() * 0.5, alpha: 0.65 + rng() * 0.3 });
          }
          // Interior — sparse fill
          for (let i = 0; i < 14; i++) {
            out.push({
              x: bx + 6 + rng() * (blockW - 12),
              y: by + 6 + rng() * (blockH - 12),
              r: 0.32 + rng() * 0.45,
              alpha: 0.32 + rng() * 0.32
            });
          }
        }
      }

      // STREETS — dotted lines running through every gap (avenues + cross streets)
      // Horizontal streets (across, between row r and r+1)
      const dotsPerSegment = 4; // 4 dots per pixel-segment block (low density for roads)
      // Vertical avenues — between col c and c+1
      for (let c = 0; c < cols - 1; c++) {
        const xCenter = left + (c + 1) * blockW + c * gap + gap / 2;
        // Dotted vertical line covering the full grid height
        for (let y = top - 6; y < top + totalH + 6; y += 6) {
          out.push({ x: xCenter, y: y + (rng() - 0.5) * 1, r: 0.5, alpha: 0.5 });
        }
        // road edges (kerbs) — two faint parallel lines
        for (let y = top - 6; y < top + totalH + 6; y += 4) {
          out.push({ x: xCenter - 6, y: y + (rng() - 0.5) * 1, r: 0.35, alpha: 0.25 });
          out.push({ x: xCenter + 6, y: y + (rng() - 0.5) * 1, r: 0.35, alpha: 0.25 });
        }
      }
      // Horizontal cross-streets — between row r and r+1
      for (let r = 0; r < rows - 1; r++) {
        const yCenter = top + (r + 1) * blockH + r * gap + gap / 2;
        for (let x = left - 6; x < left + totalW + 6; x += 6) {
          out.push({ x: x + (rng() - 0.5) * 1, y: yCenter, r: 0.5, alpha: 0.5 });
        }
        for (let x = left - 6; x < left + totalW + 6; x += 4) {
          out.push({ x: x + (rng() - 0.5) * 1, y: yCenter - 6, r: 0.35, alpha: 0.25 });
          out.push({ x: x + (rng() - 0.5) * 1, y: yCenter + 6, r: 0.35, alpha: 0.25 });
        }
      }

      // INTERSECTIONS — small denser cluster at each crossing
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const ix = left + (c + 1) * blockW + c * gap + gap / 2;
          const iy = top + (r + 1) * blockH + r * gap + gap / 2;
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2 + rng() * 0.3;
            out.push({ x: ix + Math.cos(a) * 2.5, y: iy + Math.sin(a) * 2.5, r: 0.5, alpha: 0.6 });
          }
        }
      }

      // A couple of tiny vehicle markers on selected streets — denser dots
      const vehicles = [
      { x: left + 1 * blockW + 0.5 * gap, y: top + 1.5 * blockH + 1.5 * gap },
      { x: left + 3.5 * blockW + 3 * gap, y: top + 2 * blockH + 1.5 * gap + gap / 2 }];

      vehicles.forEach((v) => {
        for (let i = 0; i < 8; i++) {
          out.push({ x: v.x + (rng() - 0.5) * 3, y: v.y + (rng() - 0.5) * 2, r: 0.6, alpha: 0.85 });
        }
      });

      // GPS PING — concentric rings of dots radiating from one block center.
      const pingBlockR = 2,pingBlockC = 3;
      const pingX = left + pingBlockC * (blockW + gap) + blockW / 2;
      const pingY = top + pingBlockR * (blockH + gap) + blockH / 2;
      const ringRadii = [12, 26, 44, 64];
      ringRadii.forEach((rad, ri) => {
        const count = Math.floor(rad * 2.6);
        const ringAlpha = 0.92 - ri * 0.16;
        for (let i = 0; i < count; i++) {
          const a = i / count * Math.PI * 2;
          const jit = (rng() - 0.5) * 2;
          out.push({
            x: pingX + Math.cos(a) * (rad + jit),
            y: pingY + Math.sin(a) * (rad + jit),
            r: 0.7 + rng() * 0.5,
            alpha: ringAlpha
          });
        }
      });
      // Bullseye marker
      for (let i = 0; i < 22; i++) {
        out.push({ x: pingX + (rng() - 0.5) * 5, y: pingY + (rng() - 0.5) * 5, r: 1.4 + rng() * 0.8, alpha: 0.96 });
      }
      return out;
    }

    if (variant === 2) {
      // RADIAL PULSE — concentric rings of dots radiating from center.
      const out = [];
      const rng = makeRng(23);
      const cx = 270,cy = 210;
      const maxR = 180;
      const rings = 24;
      for (let k = 0; k < rings; k++) {
        const radius = k / rings * maxR;
        const circumference = 2 * Math.PI * radius;
        const count = Math.max(8, Math.floor(circumference / 5));
        const baseAlpha = 0.95 * Math.pow(1 - k / rings, 1.0) + 0.18;
        for (let i = 0; i < count; i++) {
          const a = i / count * Math.PI * 2 + rng() * 0.05;
          const rJ = (rng() - 0.5) * 3;
          const x = cx + Math.cos(a) * (radius + rJ);
          const y = cy + Math.sin(a) * (radius + rJ);
          const r = 0.55 + rng() * 0.75;
          out.push({ x, y, r, alpha: Math.min(0.95, baseAlpha + rng() * 0.18) });
        }
      }
      // Center bullseye
      for (let i = 0; i < 16; i++) {
        out.push({ x: cx + (rng() - 0.5) * 4, y: cy + (rng() - 0.5) * 4, r: 1.4 + rng() * 0.7, alpha: 0.96 });
      }
      return out;
    }

    // variant 1 — TRAJECTORY CURVES (default)
    const out = [];
    const curves = [
    [[40, 200], [120, 140], [200, 90], [300, 70], [380, 110], [440, 180], [470, 260], [430, 320], [350, 340], [260, 320], [180, 270], [120, 220]],
    [[60, 90], [140, 150], [220, 180], [310, 190], [400, 170], [460, 130], [490, 90]],
    [[80, 360], [180, 380], [280, 370], [370, 350], [430, 330], [470, 290], [490, 240]]];

    const sampleCurve = (pts, samples) => {
      const r = [];
      for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1);
        const f = t * (pts.length - 1);
        const idx = Math.floor(f);
        const fr = f - idx;
        const a = pts[idx];
        const b = pts[Math.min(pts.length - 1, idx + 1)];
        r.push([a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr]);
      }
      return r;
    };
    const rng = makeRng(7);
    curves.forEach((pts) => {
      const samples = sampleCurve(pts, 220);
      samples.forEach(([cx, cy]) => {
        const count = 8;
        for (let i = 0; i < count; i++) {
          const dr = (rng() + rng() + rng() - 1.5) * 2 * 10;
          const da = rng() * Math.PI * 2;
          out.push({
            x: cx + Math.cos(da) * dr,
            y: cy + Math.sin(da) * dr,
            r: 0.4 + rng() * 0.9,
            alpha: 0.32 + rng() * 0.42
          });
        }
      });
    });
    return out;
  }, [variant]);

  return (
    <svg viewBox="0 0 540 420" className="gps-halftone" aria-hidden="true">
      {dots.map((d, i) =>
      <circle
        key={i}
        cx={d.x.toFixed(1)}
        cy={d.y.toFixed(1)}
        r={d.r.toFixed(2)}
        fill="var(--fg)"
        opacity={d.alpha.toFixed(2)} />

      )}
    </svg>);

}

/* =========================================================
   Explainer — Aaru-style mini-fold sitting between Hero and Manifesto.
   Two statements: a primary line ending in a "welcome to" claim,
   and a secondary line describing what we build.
   ========================================================= */
function Explainer() {
  return (
    <section className="explainer">
      <div className="container">
        <p className="ex-primary serif">
          Geo turns where people go into the personalization signal
          your prompts, rankers, and ads have been missing.
          <span className="serif-italic"> Welcome to the substrate of consumer software.</span>
        </p>
        <p className="ex-secondary">
          We're building the layer that turns human or robot mobility
          into structured context, for any product that already collects location.
        </p>
      </div>
    </section>);

}

/* =========================================================
   Manifesto — 3-slide pin-and-scroll. Big serif editorial.
   ========================================================= */
const MANIFESTO_SLIDES = [
{
  eyebrow: "clicks built the web",
  body:
  <>
        Cookies turned every click into a personalization signal.
        Everything offline stayed invisible: <span className="serif-italic">the commute, the café, the late-night drive.</span>
      </>

},
{
  eyebrow: "the world is the richer input",
  body:
  <>
        Where users go is more honest than what they click.
        <span className="serif-italic"> Higher resolution. No filter.</span>
      </>

},
{
  eyebrow: "the missing layer",
  body:
  <>
        Every conversation, every feed, every recommendation,
        <span className="serif-italic"> calibrated to the world your product is being used in.</span>
      </>

}];


function ManifestoFold() {
  return (
    <PinScrollFold slides={MANIFESTO_SLIDES.length} className="manifesto-fold">
      {({ active, progress, total }) =>
      <div className="mf-stage">
          {/* halftones — one per slide, fade between them */}
          <div className="mf-halftone">
            {MANIFESTO_SLIDES.map((_, i) =>
          <div
            key={i}
            className={"mf-halftone-slide" + (i === active ? " on" : "")}
            aria-hidden={i !== active}>
            
                <GPSHalftone variant={i} />
              </div>
          )}
          </div>

          {/* slide stack — eyebrow + big serif body */}
          <div className="mf-slides">
            {MANIFESTO_SLIDES.map((s, i) =>
          <div
            key={i}
            className={"mf-slide" + (i === active ? " on" : "")}
            aria-hidden={i !== active}>
            
                <div className="mf-eyebrow label">{s.eyebrow}</div>
                <div className="mf-body serif">{s.body}</div>
              </div>
          )}
          </div>

          {/* ambient waveform — thin strip at the very top of the cell */}
          <div className="pin-wave-top" aria-hidden="true">
            <WaveformProgress active={active} progress={progress} total={total} variant="ambient" />
          </div>
        </div>
      }
    </PinScrollFold>);

}

/* =========================================================
   WhatWeKnow — 5-slide pin-and-scroll. Aaru-style bold headlines.
   Where / When / Who / How / Why, each with a real stat citation.
   ========================================================= */
const KNOW_SLIDES = [
{
  dim: "where",
  headline:
  <>
        Where users went yesterday<br />
        <span className="serif-italic">predicts 93% of tomorrow.</span>
      </>,

  cite: "Song, Qu, Blumm, Barabási · Science · 2010",
  body: "Across millions of anonymized mobile-phone trajectories, individual location entropy gives a 93% upper bound on predictability. Independent of how far someone travels."
},
{
  dim: "when",
  headline:
  <>
        People don't wander.<br />
        <span className="serif-italic">They return.</span>
      </>,

  cite: "Pappalardo et al. · Nature Communications · 2015",
  body: "A small set of repeatedly-visited cells captures the vast majority of an individual's time."
},
{
  dim: "who",
  headline:
  <>
        Shared places, shared lives.<br />
        <span className="serif-italic">The graph the world already draws.</span>
      </>,

  cite: "Eagle, Pentland, Lazer · PNAS · 2009",
  body: "Users who share offices, cafes, and gyms share lives. The social graph draws itself, at a fidelity that beats every contact list and friend recommendation."
},
{
  dim: "how",
  headline:
  <>
        Trajectory reveals<br />
        <span className="serif-italic">the mode and the mood.</span>
      </>,

  cite: "Zheng et al. · WWW · 2008 et seq.",
  body: "Walking, transit, car, two-wheeler. Rushing, strolling, stuck. All derivable from the speed profile and stop pattern, without a separate sensor."
},
{
  dim: "why",
  headline:
  <>
        Same coordinate, different hour.<br />
        <span className="serif-italic">Different feed, prompt, and ad.</span>
      </>,

  cite: "Yuan et al. · KDD · 2012 et seq.",
  body: "A coffee shop at 7am and at 9pm are different places to serve. Time of place is the strongest read on intent, and what turns a generic answer into a useful one."
}];


function WhatWeKnow() {
  return (
    <PinScrollFold slides={KNOW_SLIDES.length} className="know-fold">
      {({ active, progress, total }) =>
      <div className="wk-stage">
          {/* vertical rail with dimension labels — progress per row */}
          <div className="wk-rail" aria-hidden="true">
            {KNOW_SLIDES.map((s, i) => {
            const fill = i < active ? 1 : i === active ? progress : 0;
            const isActive = i === active;
            return (
              <div key={s.dim} className={"wk-rail-row" + (isActive ? " on" : "")}>
                  <div className="wk-rail-bar">
                    <div className="wk-rail-fill" style={{ width: `${fill * 100}%` }} />
                  </div>
                  <span className="wk-rail-label mono">{s.dim}</span>
                </div>);

          })}
          </div>

          {/* slide stack — no stat chip; headline → body → cite */}
          <div className="wk-slides">
            {KNOW_SLIDES.map((s, i) =>
          <div
            key={i}
            className={"wk-slide" + (i === active ? " on" : "")}
            aria-hidden={i !== active}>
            
                <h2 className="wk-headline serif">{s.headline}</h2>
                <p className="wk-body">{s.body}</p>
                <div className="wk-cite mono">{s.cite}</div>
              </div>
          )}
          </div>
        </div>
      }
    </PinScrollFold>);

}

/* =========================================================
   FoldUnlock — convert to pin-and-scroll, reframe to consequence stories.
   ========================================================= */
const DURATION_MS = 7000;

/* =========================================================
   FoldUnlock — pin-and-scroll. Reframed as consequence stories.
   ========================================================= */
function FoldUnlock() {
  return (
    <PinScrollFold slides={UNLOCK_CARDS.length} className="fold-unlock">
      {({ active, progress, total }) =>
      <div className="fu-stage">
          {/* ambient waveform — thin strip at the very top of the cell */}
          <div className="pin-wave-top" aria-hidden="true">
            <WaveformProgress active={active} progress={progress} total={total} variant="ambient" />
          </div>

          <div className="fu-body">
            {/* LEFT — viz, more breathing room */}
            <div className="fu-left">
              {UNLOCK_CARDS.map((c, i) =>
            <div
              key={c.k}
              className={"fu-viz" + (i === active ? " on" : "")}
              aria-hidden={i !== active}>
              
                  {c.viz}
                </div>
            )}
            </div>

            {/* RIGHT — per-slide title (mono) + big serif body */}
            <div className="fu-middle">
              <div className="fu-titles">
                {UNLOCK_CARDS.map((c, i) =>
              <div
                key={c.k}
                className={"fu-title" + (i === active ? " on" : "")}
                aria-hidden={i !== active}>
                
                    <span className="fu-title-n mono">{c.name}</span>
                  </div>
              )}
              </div>
              <div className="fu-text-stack">
                {UNLOCK_CARDS.map((c, i) =>
              <p
                key={c.k}
                className={"fu-text serif" + (i === active ? " on" : "")}
                aria-hidden={i !== active}>
                
                    {c.desc}
                  </p>
              )}
              </div>
            </div>
          </div>
        </div>
      }
    </PinScrollFold>);

}

function ProductModules() {
  return (
    <section className="prod" id="product">
      <div className="container">
        {/* Pin-scroll unlock fold is the entire section now */}
        <FoldUnlock />
      </div>
    </section>);

}

/* =========================================================
   Research
   ========================================================= */
function Research() {
  return (
    <section className="research" id="research">
      <div className="container">
        <div className="research-head">
          <h2 className="serif research-title">The story underneath the model.</h2>
        </div>
        <div className="papers papers-story">
          {PATENTS.map((p, i) =>
          <div key={i} className="paper-story">
              <div className="ps-date mono">{p.date}</div>
              <div className="ps-title serif">{p.title}</div>
            </div>
          )}
        </div>
      </div>
    </section>);

}

/* =========================================================
   Closing line
   ========================================================= */
function Closing() {
  return (
    <section className="closing">
      <div className="container">
        <div className="cl-line serif">
          We're a small team working at the frontier of
          <span className="serif-italic"> geospatial foundation models, visitation analysis, and place embeddings.</span>
        </div>
        <a className="cl-cta serif" href="https://skay97-curbai.hf.space" target="_blank" rel="noopener">
          Open the Atlas <span className="cl-cta-arrow">→</span>
        </a>
        <div className="cl-sub"><a href="#">Join us →</a></div>
      </div>
    </section>);

}

/* =========================================================
   Tweaks
   ========================================================= */
const ACCENT_HEX = {
  cobalt: "#1E3A8A",
  clay: "#B85431",
  ink: "#1A1815",
  forest: "#1A5D3A",
  amber: "#A56A00"
};
const HEX_TO_ACCENT = Object.fromEntries(
  Object.entries(ACCENT_HEX).map(([k, v]) => [v.toLowerCase(), k])
);

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "hero": "manifesto",
  "nav": "standard",
  "accent": "#1E3A8A"
} /*EDITMODE-END*/;

function GeoTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  return (
    <TweaksPanel title="Tweaks · Janus">
      <TweakSection label="Hero copy">
        <TweakRadio
          label="Voice"
          value={t.hero}
          onChange={(v) => setTweak("hero", v)}
          options={[
          { value: "manifesto", label: "Manifesto" },
          { value: "plainspoken", label: "Plain" },
          { value: "provocation", label: "Provoke" }]
          } />
        
      </TweakSection>
      <TweakSection label="Navigation">
        <TweakRadio
          label="Style"
          value={t.nav}
          onChange={(v) => setTweak("nav", v)}
          options={[
          { value: "sparse", label: "Sparse" },
          { value: "standard", label: "Standard" },
          { value: "mono", label: "Mono-label" }]
          } />
        
      </TweakSection>
      <TweakSection label="Accent">
        <TweakColor
          label="One color, used sparingly"
          value={t.accent}
          onChange={(v) => setTweak("accent", v)}
          options={Object.values(ACCENT_HEX)} />
        
      </TweakSection>
    </TweaksPanel>);

}

/* =========================================================
   App
   ========================================================= */
function App() {
  const [t, _setTweak] = useTweaks(TWEAK_DEFAULTS);

  // apply accent to <html data-accent>
  useEffect(() => {
    const key = HEX_TO_ACCENT[String(t.accent).toLowerCase()] || "cobalt";
    if (key === "cobalt") document.documentElement.removeAttribute("data-accent");else
    document.documentElement.setAttribute("data-accent", key);
  }, [t.accent]);

  return (
    <>
      <main>
        <Brand />
        <Hero variant={t.hero} />
        <ManifestoFold />
        <WhatWeKnow />
        <ProductModules />
        <Research />
        <Closing />
      </main>
      <GeoTweaks />
    </>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);