/* ============================================================
   atlas-scene.js — Janus Atlas scene engine (canvas, deterministic)
   Faithful to shan-kmr/geo-landing:
     basemap-style.json  → water #EBEDEF, land #FAFAF9, park #F0F2EE,
                           blocks #F4F4F3/#E9EAEC casings, rail #E7E8EA,
                           labels #7A7F85 / #4A4E54 halo #FFF
     atlas/index.html    → RAMP [233,234,236]→[158,162,168]→[42,45,49],
                           LINE [122,127,133], ladder res5..9,
                           BUILDING_ZOOM 13.4, signal #D9480F,
                           buses [22,24,26,205] 18s tweens, bikes breathe
   Every frame is a pure function of (camera, options, time) → scrub-safe.
   ============================================================ */
(function () {
  "use strict";


  /* ---------- deterministic PRNG + value noise ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y, seed) {
    let h = seed | 0;
    h = Math.imul(h ^ Math.imul(x | 0, 374761393), 668265263);
    h = Math.imul(h ^ Math.imul(y | 0, 1274126177), 2246822519);
    h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const sstep = (t) => t * t * (3 - 2 * t);
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed),
      c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    const u = sstep(xf), v = sstep(yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed) {
    return 0.62 * vnoise(x, y, seed) + 0.26 * vnoise(x * 2.13, y * 2.13, seed + 7) +
      0.12 * vnoise(x * 4.41, y * 4.41, seed + 19);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sig = (x) => 1 / (1 + Math.exp(-x));

  /* ---------- constants lifted from the live Atlas ---------- */
  const RAMP = [[0, [233, 234, 236]], [0.5, [158, 162, 168]], [1, [42, 45, 49]]];
  const LADDER = [[5, 0], [6, 5.8], [7, 7.3], [8, 8.8], [9, 10.3]];
  const BUILDING_ZOOM = 13.4;
  const PX_DENOM = 30377;                    // km across 360° mercator at lat 40.7

  function ramp(t) {
    t = clamp(t, 0, 1);
    for (let i = 0; i < RAMP.length - 1; i++) {
      const [a, ca] = RAMP[i], [b, cb] = RAMP[i + 1];
      if (t >= a && t <= b) {
        const f = (t - a) / (b - a + 1e-9);
        return [0, 1, 2].map((k) => Math.round(ca[k] + f * (cb[k] - ca[k])));
      }
    }
    return RAMP[2][1];
  }
  const pxPerKm = (z) => (256 * Math.pow(2, z)) / PX_DENOM;
  function activeRes(z) { let r = 5; for (const [res, mz] of LADDER) if (z >= mz) r = res; return r; }
  const RES_EDGE_KM = {}; for (let r = 5; r <= 9; r++) RES_EDGE_KM[r] = 0.174 * Math.pow(Math.sqrt(7), 9 - r);

  /* ============================================================
     GEOGRAPHY — world km, +x east +y north, origin ≈ Union Sq.
     ============================================================ */
  const ROT_M = (-28.9 * Math.PI) / 180;     // avenue bearing
  function w2m(x, y) { const c = Math.cos(-ROT_M), s = Math.sin(-ROT_M); return [x * c - y * s, x * s + y * c]; }
  function m2w(v, u) { const c = Math.cos(ROT_M), s = Math.sin(ROT_M); return [v * c - u * s, v * s + u * c]; }

  const AVE_SP = 0.281, ST_SP = 0.089;
  const ISLAND_U = [-5.6, 7.4];
  function islandHalfW(u) {
    const t0 = clamp((u - ISLAND_U[0]) / 1.8, 0, 1), t1 = clamp((ISLAND_U[1] - u) / 2.6, 0, 1);
    const bulge = 1 - 0.18 * Math.exp(-Math.pow((u - 1.1) / 2.4, 2));
    return 1.12 * sstep(t0) * sstep(t1) * bulge + 0.03;
  }
  function hudW(u) { return 1.05 + 2.8 * sig(-(u - (ISLAND_U[0] + 0.2)) / 0.7) + 0.25 * sig((u - 6.4) / 0.8); }
  function eastW(u) { return 0.62 + 2.6 * sig(-(u - (ISLAND_U[0] + 0.5)) / 0.7) + 0.1 * Math.sin(u * 1.7); }
  function region(x, y) {
    const [v, u] = w2m(x, y);
    const hw = islandHalfW(u);
    const onIsland = u > ISLAND_U[0] && u < ISLAND_U[1] && Math.abs(v) <= hw;
    if (onIsland) return "mnh";
    if (v < -(hw + hudW(u))) return "nj";
    if (v > hw + eastW(u)) return u > 2.2 ? "qn" : "bk";
    return "water";
  }
  // region outline polygons (world coords), cached
  const POLYS = {};
  function regionPoly(reg) {
    if (POLYS[reg]) return POLYS[reg];
    const pts = [];
    const U0 = -16, U1 = 18, FAR = 20;
    if (reg === "mnh") {
      for (let u = ISLAND_U[0]; u <= ISLAND_U[1]; u += 0.12) pts.push(m2w(islandHalfW(u), u));
      for (let u = ISLAND_U[1]; u >= ISLAND_U[0]; u -= 0.12) pts.push(m2w(-islandHalfW(u), u));
    } else if (reg === "nj") {
      for (let u = U0; u <= U1; u += 0.2) pts.push(m2w(-(islandHalfW(u) + hudW(u)), u));
      pts.push(m2w(-FAR, U1)); pts.push(m2w(-FAR, U0));
    } else if (reg === "bkq") {
      for (let u = U1; u >= U0; u -= 0.2) pts.push(m2w(islandHalfW(u) + eastW(u), u));
      pts.push(m2w(FAR, U0)); pts.push(m2w(FAR, U1));
    }
    POLYS[reg] = pts;
    return pts;
  }
  const PARK = { u0: 3.55, u1: 6.61, v0: -0.42, v1: 0.42 };
  function inPark(x, y) {
    const [v, u] = w2m(x, y);
    return u >= PARK.u0 && u <= PARK.u1 && v >= PARK.v0 && v <= PARK.v1;
  }
  const BKPARK = [[0.7, -1.7], [1.75, -1.45], [1.5, -0.4], [0.55, -0.75]]; // offsets from BKD
  const ROT_B = (12 * Math.PI) / 180, ROT_Q = (-4 * Math.PI) / 180;

  /* ---------- value fields ---------- */
  function gauss(x, y, cx, cy, s) { const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); return Math.exp(-d2 / (2 * s * s)); }
  const MID = m2w(0, 2.2), DTN = m2w(-0.1, -4.4), BKD = m2w(2.4, -3.2);
  // fine per-cell jitter — the halftone grain. Multiplies every land value.
  function grain(x, y, seed) { const n = fbm(x * 3.1, y * 3.1, seed + 101); return 0.12 + 1.55 * n * n; }
  const FIELDS = {
    kontur_population(x, y) {
      if (region(x, y) === "water" || inPark(x, y)) return 0;
      const n = fbm(x * 0.85, y * 0.85, 11);
      const base = 0.42 * gauss(x, y, MID[0], MID[1], 3.4) + 0.4 * gauss(x, y, DTN[0], DTN[1], 1.7) +
        0.36 * gauss(x, y, BKD[0], BKD[1], 3) + 0.85 * n * n;
      return Math.pow(base, 2.4) * 4200 * grain(x, y, 11);
    },
    wt_visit_count(x, y) {
      if (region(x, y) === "water") return 0;
      const n = fbm(x * 1.1, y * 1.1, 23);
      const b = 0.8 * gauss(x, y, MID[0], MID[1], 1.7) + 0.68 * gauss(x, y, DTN[0], DTN[1], 1) +
        0.3 * gauss(x, y, BKD[0], BKD[1], 1.5) + 0.55 * n * n;
      return Math.pow(b, 3) * 9800 * grain(x, y, 23);
    },
    poi_count(x, y) {
      if (region(x, y) === "water" || inPark(x, y)) return 0;
      const n = fbm(x * 1.3, y * 1.3, 37);
      return Math.pow(0.62 * gauss(x, y, MID[0], MID[1], 2.2) + 0.56 * gauss(x, y, DTN[0], DTN[1], 1.3) +
        0.34 * gauss(x, y, BKD[0], BKD[1], 2) + 0.66 * n * n, 2.6) * 620 * grain(x, y, 37);
    },
    building_count(x, y) {
      const r = region(x, y);
      if (r === "water" || inPark(x, y)) return 0;
      const n = fbm(x * 1.05, y * 1.05, 41);
      return (r === "mnh" ? 1 : 0.72) * Math.pow(0.25 + 0.85 * n * n, 2) * 310 *
        (0.35 + 0.65 * gauss(x, y, 0.6, -0.6, 5.2)) * grain(x, y, 41);
    },
    road_count(x, y) {
      if (region(x, y) === "water") return 0;
      const n = fbm(x * 1.4, y * 1.4, 53);
      return (18 + 68 * n * n) * grain(x, y, 53);
    },
    nightlight_2021(x, y) {
      if (region(x, y) === "water") return 1.4;
      const n = fbm(x * 0.9, y * 0.9, 61);
      return Math.pow(0.6 * gauss(x, y, MID[0], MID[1], 2.6) + 0.46 * gauss(x, y, DTN[0], DTN[1], 1.6) +
        0.38 * gauss(x, y, BKD[0], BKD[1], 3) + 0.5 * n * n, 2.1) * 63 * (0.55 + 0.45 * grain(x, y, 61));
    }
  };
  const VMAX = {};
  function vmaxFor(shade, res) {
    const key = shade + ":" + res;
    if (VMAX[key]) return VMAX[key];
    const f = FIELDS[shade];
    let m = Math.max(f(MID[0], MID[1]), f(DTN[0], DTN[1]), f(BKD[0], BKD[1]), 1);
    for (let i = 0; i < 320; i++) {
      const x = -8 + 17 * hash2(i, 1, 5), y = -9 + 18 * hash2(i, 2, 9);
      m = Math.max(m, f(x, y));
    }
    VMAX[key] = m; return m;
  }

  /* ---------- H3-look hex lattice ---------- */
  const RES_ROT = {}; for (let r = 5; r <= 9; r++) RES_ROT[r] = ((r - 5) * 19.1066 + 8) * Math.PI / 180;
  function hexCorners(cx, cy, e, rot) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = rot + Math.PI / 6 + (i * Math.PI) / 3;
      pts.push([cx + e * Math.cos(a), cy + e * Math.sin(a)]);
    }
    return pts;
  }
  function cellsFor(res, x0, y0, x1, y1, cap) {
    const e = RES_EDGE_KM[res], rot = RES_ROT[res];
    const c = Math.cos(-rot), s = Math.sin(-rot);
    const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
    const hx0 = Math.min(...pts.map((p) => p[0])) - 2 * e, hx1 = Math.max(...pts.map((p) => p[0])) + 2 * e;
    const hy0 = Math.min(...pts.map((p) => p[1])) - 2 * e, hy1 = Math.max(...pts.map((p) => p[1])) + 2 * e;
    const w = Math.sqrt(3) * e, h = 1.5 * e;
    const out = [];
    const r0 = Math.floor(hy0 / h), r1 = Math.ceil(hy1 / h);
    for (let r = r0; r <= r1; r++) {
      const yy = r * h;
      const q0 = Math.floor((hx0 - (r & 1 ? w / 2 : 0)) / w), q1 = Math.ceil((hx1 - (r & 1 ? w / 2 : 0)) / w);
      for (let q = q0; q <= q1; q++) {
        const xx = q * w + (r & 1 ? w / 2 : 0);
        const wc = Math.cos(rot), ws = Math.sin(rot);
        out.push({ q, r, x: xx * wc - yy * ws, y: xx * ws + yy * wc });
        if (out.length > (cap || 5200)) return out;
      }
    }
    return out;
  }
  function cellAt(res, x, y) {
    const e = RES_EDGE_KM[res], rot = RES_ROT[res];
    const c = Math.cos(-rot), s = Math.sin(-rot);
    const hx = x * c - y * s, hy = x * s + y * c;
    const w = Math.sqrt(3) * e, h = 1.5 * e;
    let best = null, bd = 1e9;
    const r0 = Math.round(hy / h);
    for (let r = r0 - 1; r <= r0 + 1; r++) {
      for (let q = Math.floor(hx / w) - 1; q <= Math.floor(hx / w) + 2; q++) {
        const xx = q * w + (r & 1 ? w / 2 : 0), yy = r * h;
        const d = (xx - hx) * (xx - hx) + (yy - hy) * (yy - hy);
        if (d < bd) { bd = d; const wc = Math.cos(rot), ws = Math.sin(rot); best = { q, r, x: xx * wc - yy * ws, y: xx * ws + yy * wc }; }
      }
    }
    return best;
  }
  function cellId(res, q, r) {
    const h = Math.floor(hash2(q, r, res * 131) * 0xffffff).toString(16).padStart(6, "0");
    const h2b = Math.floor(hash2(r, q, res * 733) * 0xfff).toString(16).padStart(3, "0");
    return "892a10" + h.slice(0, 2) + h2b + h.slice(2) + "f".repeat(Math.max(0, 9 - res));
  }

  /* ---------- buildings, routes, docks ---------- */
  const bldgCache = new Map();
  function blockBuildings(bi, bj) {
    const key = bi + ":" + bj;
    if (bldgCache.has(key)) return bldgCache.get(key);
    const rnd = mulberry32((bi * 7349 + bj * 131) | 0);
    const list = [];
    const n = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const fv = 0.05 + rnd() * 0.5, fu = 0.1 + rnd() * 0.55;
      const wv = Math.min(0.92 - fv, 0.2 + rnd() * 0.45), wu = Math.min(0.86 - fu, 0.22 + rnd() * 0.5);
      list.push({ fv, fu, wv, wu, hr: rnd() });
    }
    bldgCache.set(key, list);
    return list;
  }
  function buildingHeightKm(x, y, hr) {
    const mid = gauss(x, y, MID[0], MID[1], 1.15), dtn = gauss(x, y, DTN[0], DTN[1], 0.72);
    const bkd = gauss(x, y, BKD[0], BKD[1], 0.6);
    const tall = Math.max(mid, dtn * 0.95, bkd * 0.5);
    const base = 0.014 + hr * 0.03;
    const tower = Math.pow(hr, 6) * 0.34 * Math.pow(tall, 1.6);
    return base + Math.pow(tall, 2.2) * 0.075 * hr + tower;
  }
  function aveLine(v) { return [m2w(v, ISLAND_U[0] + 0.3), m2w(v, ISLAND_U[1] - 0.6)]; }
  function stLine(u) { const hw = islandHalfW(u) - 0.05; return [m2w(-hw, u), m2w(hw, u)]; }
  const ROUTES = [
    [aveLine(-0.56)[0], aveLine(-0.56)[1]],
    [aveLine(0.31)[1], aveLine(0.31)[0]],
    [aveLine(0.87)[0], aveLine(0.87)[1]],
    [stLine(1.55)[0], stLine(1.55)[1]],
    [stLine(-1.6)[1], stLine(-1.6)[0]],
    [stLine(4.6)[0], stLine(4.6)[1]],
    [m2w(-0.15, -5.2), m2w(-0.35, -1.4), m2w(0.12, 1.2), m2w(-0.42, 3.4), m2w(-0.7, 6.2)],
    [[BKD[0] - 2.4, BKD[1] - 1.8], [BKD[0], BKD[1]], [BKD[0] + 1.9, BKD[1] + 1.4]],
    [[BKD[0] + 0.4, BKD[1] - 2.6], [BKD[0] + 1.2, BKD[1] + 0.6], [BKD[0] + 2.2, BKD[1] + 3.4]],
    [[BKD[0] + 3.8, BKD[1] + 1.2], [BKD[0] + 1.4, BKD[1] + 1.8], [BKD[0] - 1.2, BKD[1] + 2.6]]
  ];
  function routePoint(route, s) {
    let L = 0; const segs = [];
    for (let i = 0; i < route.length - 1; i++) {
      const d = Math.hypot(route[i + 1][0] - route[i][0], route[i + 1][1] - route[i][1]);
      segs.push([L, d, i]); L += d;
    }
    let m = ((s % (2 * L)) + 2 * L) % (2 * L);
    if (m > L) m = 2 * L - m;
    for (const [start, d, i] of segs) {
      if (m <= start + d + 1e-9) {
        const f = (m - start) / (d + 1e-9);
        return [lerp(route[i][0], route[i + 1][0], f), lerp(route[i][1], route[i + 1][1], f)];
      }
    }
    return route[0];
  }
  const BUSES = [];
  { const rnd = mulberry32(777); for (let i = 0; i < 44; i++) { const r = i % ROUTES.length; BUSES.push({ r, off: rnd() * 26, sp: 0.14 + rnd() * 0.1 }); } }
  const DOCKS = [];
  {
    const rnd = mulberry32(4242);
    for (let i = 0; i < 150; i++) {
      const u = ISLAND_U[0] + 0.5 + rnd() * (ISLAND_U[1] - 3 - ISLAND_U[0]);
      const hw = islandHalfW(u) - 0.08; const v = -hw + rnd() * 2 * hw;
      const [x, y] = m2w(v, u);
      if (region(x, y) !== "mnh" || inPark(x, y)) continue;
      DOCKS.push({ x, y, f: rnd(), ph: rnd() * Math.PI * 2 });
    }
    for (let i = 0; i < 60; i++) {
      const x = BKD[0] - 2.8 + rnd() * 4.8, y = BKD[1] - 2.6 + rnd() * 4.2;
      if (region(x, y) !== "bk" && region(x, y) !== "qn") continue;
      DOCKS.push({ x, y, f: rnd(), ph: rnd() * Math.PI * 2 });
    }
  }

  /* ---------- labels ---------- */
  const STREET_AVES = [
    { v: -0.562, n: "West Broadway" }, { v: -0.281, n: "Church St" }, { v: 0, n: "Lafayette St" },
    { v: 0.281, n: "Bowery" }, { v: 0.562, n: "Chrystie St" }, { v: 0.843, n: "Essex St" }, { v: -0.843, n: "Greenwich St" }
  ];
  const STREET_STS = [
    { u: -2.55, n: "Canal St" }, { u: -2.759, n: "Walker St" }, { u: -2.937, n: "White St" },
    { u: -2.314, n: "Grand St" }, { u: -2.136, n: "Broome St" }, { u: -1.958, n: "Spring St" },
    { u: -1.78, n: "Prince St" }, { u: -1.602, n: "W Houston St" }, { u: -3.115, n: "Leonard St" },
    { u: -1.335, n: "Bleecker St" }, { u: -1.157, n: "W 4th St" }, { u: -3.293, n: "Worth St" }
  ];
  const LABELS = [
    { x: m2w(0, 0.8)[0], y: m2w(0, 0.8)[1], t: "Manhattan", kind: "boro", z0: 9.2, z1: 13.2 },
    { x: BKD[0] + 0.8, y: BKD[1] - 2.2, t: "Brooklyn", kind: "boro", z0: 9.2, z1: 13.6 },
    { x: BKD[0] + 4.4, y: BKD[1] + 5.8, t: "Queens", kind: "boro", z0: 9.2, z1: 13 },
    { x: m2w(-2.6, -3.4)[0], y: m2w(-2.6, -3.4)[1], t: "Jersey City", kind: "boro", z0: 9.6, z1: 13 },
    { x: m2w(-0.2, -4.6)[0], y: m2w(-0.2, -4.6)[1], t: "Financial District", kind: "hood", z0: 12.6, z1: 16.4 },
    { x: m2w(-0.3, -3.05)[0], y: m2w(-0.3, -3.05)[1], t: "Tribeca", kind: "hood", z0: 13, z1: 16.6 },
    { x: m2w(0.12, -2.6)[0], y: m2w(0.12, -2.6)[1], t: "Chinatown", kind: "hood", z0: 13.2, z1: 16.8 },
    { x: m2w(-0.15, -2.2)[0], y: m2w(-0.15, -2.2)[1], t: "SoHo", kind: "hood", z0: 13, z1: 16.8 },
    { x: m2w(0.55, -1.9)[0], y: m2w(0.55, -1.9)[1], t: "Lower East Side", kind: "hood", z0: 13.1, z1: 16.6 },
    { x: m2w(-0.5, -0.9)[0], y: m2w(-0.5, -0.9)[1], t: "West Village", kind: "hood", z0: 13, z1: 16.6 },
    { x: m2w(0.3, 0.6)[0], y: m2w(0.3, 0.6)[1], t: "Gramercy", kind: "hood", z0: 13.2, z1: 16.4 },
    { x: m2w(0, 2.4)[0], y: m2w(0, 2.4)[1], t: "Midtown", kind: "hood", z0: 12.4, z1: 16 },
    { x: BKD[0] - 0.6, y: BKD[1] + 1.3, t: "Williamsburg", kind: "hood", z0: 12.8, z1: 16.2 },
    { x: BKD[0] - 0.3, y: BKD[1] - 0.9, t: "Dumbo", kind: "hood", z0: 13.2, z1: 16.6 },
    { x: m2w(0, -6.9)[0], y: m2w(0, -6.9)[1], t: "Upper Bay", kind: "water", z0: 10, z1: 13.4 },
    { x: m2w(-(1.12 + 0.6), 1.4)[0], y: m2w(-(1.12 + 0.6), 1.4)[1], t: "Hudson River", kind: "water", z0: 11, z1: 14.4 },
    { x: m2w(1.12 + 0.4, 0.2)[0], y: m2w(1.12 + 0.4, 0.2)[1], t: "East River", kind: "water", z0: 11.4, z1: 14.6 }
  ];

  /* ============================================================
     TRANSFORM
     ============================================================ */
  function makeXform(W, H, cam) {
    const s = pxPerKm(cam.z), rot = cam.rot || 0;
    const c = Math.cos(rot), si = Math.sin(rot);
    return {
      s, c, si, cam, W, H,
      px(x, y) { const dx = x - cam.x, dy = y - cam.y; return [W / 2 + (dx * c - dy * si) * s, H / 2 - (dx * si + dy * c) * s]; },
      world(px, py) { const dx = (px - W / 2) / s, dy = -(py - H / 2) / s; return [cam.x + dx * c + dy * si, cam.y - dx * si + dy * c]; }
    };
  }
  function viewRect(X, W, H, pad) {
    const cs = [X.world(-pad, -pad), X.world(W + pad, -pad), X.world(-pad, H + pad), X.world(W + pad, H + pad)];
    return [Math.min(...cs.map((c) => c[0])), Math.min(...cs.map((c) => c[1])),
    Math.max(...cs.map((c) => c[0])), Math.max(...cs.map((c) => c[1]))];
  }
  function pathFrom(ctx, X, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => { const [px, py] = X.px(p[0], p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath();
  }

  /* ============================================================
     DRAW LAYERS
     ============================================================ */
  function drawGround(ctx, W, H, X) {
    ctx.fillStyle = "#EBEDEF"; ctx.fillRect(0, 0, W, H);   // water underneath everything
    for (const reg of ["nj", "bkq", "mnh"]) {
      pathFrom(ctx, X, regionPoly(reg));
      ctx.fillStyle = "#FAFAF9"; ctx.fill();
    }
    // parks
    const pk = [m2w(PARK.v0, PARK.u0), m2w(PARK.v1, PARK.u0), m2w(PARK.v1, PARK.u1), m2w(PARK.v0, PARK.u1)];
    pathFrom(ctx, X, pk); ctx.fillStyle = "#F0F2EE"; ctx.fill();
    pathFrom(ctx, X, BKPARK.map(([a, b]) => [BKD[0] + a, BKD[1] + b])); ctx.fillStyle = "#F0F2EE"; ctx.fill();
  }

  // blocks + streets per region, clipped to region poly
  function drawFabric(ctx, X, W, H, z) {
    const regs = [
      { reg: "mnh", rot: ROT_M, ave: AVE_SP, st: ST_SP, poly: regionPoly("mnh") },
      { reg: "bkq", rot: ROT_B, ave: 0.31, st: 0.14, poly: regionPoly("bkq") },
      { reg: "nj", rot: (18 * Math.PI) / 180, ave: 0.3, st: 0.15, poly: regionPoly("nj") }
    ];
    const [x0, y0, x1, y1] = viewRect(X, W, H, 6);
    for (const R of regs) {
      ctx.save();
      pathFrom(ctx, X, R.poly); ctx.clip();
      // exclude park visually by re-filling later; blocks skipped there via test
      const c = Math.cos(-R.rot), s = Math.sin(-R.rot);
      const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
      const gv0 = Math.min(...pts.map((p) => p[0])) - 1, gv1 = Math.max(...pts.map((p) => p[0])) + 1;
      const gu0 = Math.min(...pts.map((p) => p[1])) - 1, gu1 = Math.max(...pts.map((p) => p[1])) + 1;
      const wc = Math.cos(R.rot), ws = Math.sin(R.rot);
      const g2w = (v, u) => [v * wc - u * ws, v * ws + u * wc];
      const stPx = R.st * X.s;
      const hiKerb = X.s > 150;
      // BLOCKS — inset rects; merge streets when tiny
      const mergeK = stPx < 3.2 ? 3 : stPx < 7 ? 2 : 1;
      const stEff = R.st * mergeK;
      const gapA = clamp(0.035 * X.s / 28, 0.018, 0.05), gapS = clamp(0.022 * X.s / 28, 0.012, 0.03);
      ctx.fillStyle = "#F1F1EF";
      for (let vi = Math.floor(gv0 / R.ave); vi * R.ave <= gv1; vi++) {
        for (let uj = Math.floor(gu0 / stEff); uj * stEff <= gu1; uj++) {
          const v = vi * R.ave, u = uj * stEff;
          const [mx, my] = g2w(v + R.ave / 2, u + stEff / 2);
          if (R.reg === "mnh" && inPark(mx, my)) continue;
          if (R.reg !== "mnh") {           // sparser fabric off-island
            if (hash2(vi, uj, 517) < 0.05) continue;
          }
          const p1 = g2w(v + gapA, u + gapS), p2 = g2w(v + R.ave - gapA, u + gapS),
            p3 = g2w(v + R.ave - gapA, u + stEff - gapS), p4 = g2w(v + gapA, u + stEff - gapS);
          ctx.beginPath();
          [p1, p2, p3, p4].forEach((p, i) => { const [px, py] = X.px(p[0], p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
          ctx.closePath(); ctx.fill();
          if (hiKerb) {           // kerb hairline — reads as sidewalk edge
            ctx.strokeStyle = "rgba(122,127,133,.14)"; ctx.lineWidth = 0.55; ctx.stroke();
            ctx.fillStyle = "#F1F1EF";
          }
        }
      }
      // MAJOR AVENUES — white inner + hairline casing
      for (let vi = Math.floor(gv0 / R.ave); vi * R.ave <= gv1; vi++) {
        if (vi % 2 !== 0 && X.s < 90) continue;
        const v = vi * R.ave;
        const a = g2w(v, gu0), b = g2w(v, gu1);
        const [ax, ay] = X.px(a[0], a[1]), [bx, by] = X.px(b[0], b[1]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = "#E9EAEC"; ctx.lineWidth = clamp(0.05 * X.s, 1.5, 9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = clamp(0.05 * X.s, 1.5, 9) - 1; ctx.stroke();
      }
      // STREET TREES — dot rows along the avenues, high zoom only
      if (R.reg === "mnh" && X.s > 160) {
        ctx.fillStyle = "rgba(168,180,166,.5)";
        const tr = clamp(0.0032 * X.s, 0.9, 3.4);
        for (let vi = Math.floor(gv0 / R.ave); vi * R.ave <= gv1; vi++) {
          const v = vi * R.ave;
          for (let u = Math.floor(gu0 / 0.036) * 0.036; u <= gu1; u += 0.036) {
            if (hash2(vi * 7 + Math.round(u * 1000), 3, 771) < 0.5) continue;
            const side = hash2(vi, Math.round(u * 1000), 73) > 0.5 ? 1 : -1;
            const [tx, ty] = g2w(v + side * 0.032, u);
            if (region(tx, ty) !== "mnh" || inPark(tx, ty)) continue;
            const [px, py] = X.px(tx, ty);
            if (px < -4 || px > W + 4 || py < -4 || py > H + 4) continue;
            ctx.beginPath(); ctx.arc(px, py, tr, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      ctx.restore();
    }
    // broadway
    ctx.save();
    pathFrom(ctx, X, regionPoly("mnh")); ctx.clip();
    const bw = ROUTES[6];
    ctx.beginPath();
    bw.forEach((p, i) => { const [px, py] = X.px(p[0], p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.strokeStyle = "#E9EAEC"; ctx.lineWidth = clamp(0.055 * X.s, 1.6, 10); ctx.stroke();
    ctx.beginPath();
    bw.forEach((p, i) => { const [px, py] = X.px(p[0], p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = clamp(0.055 * X.s, 1.6, 10) - 1; ctx.stroke();
    ctx.restore();
    // shoreline hairline
    for (const reg of ["mnh", "nj", "bkq"]) {
      pathFrom(ctx, X, regionPoly(reg));
      ctx.strokeStyle = "rgba(122,127,133,0.16)"; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }

  function drawHexes(ctx, X, W, H, cam, opts) {
    const shade = opts.shade || "";
    const rf = opts.resFloat != null ? opts.resFloat : activeRes(cam.z);
    let topRes = clamp(Math.floor(rf), 5, 9);
    // if the ladder res would render sub-pixel on this canvas, promote a coarser res to top
    while (topRes > 5 && RES_EDGE_KM[topRes] * X.s < 3.2) topRes--;
    const frac = topRes === clamp(Math.floor(rf), 5, 9) ? clamp(rf - topRes, 0, 1) : 0;
    const [x0, y0, x1, y1] = viewRect(X, W, H, 20);
    const hexA = opts.hexOpacity != null ? opts.hexOpacity : 1;
    const shadeMix = opts.shadeMix != null ? clamp(opts.shadeMix, 0, 1) : 1;
    const field = shade && FIELDS[shade];

    function layer(res, isTop, alphaMul) {
      const e = RES_EDGE_KM[res], rot = RES_ROT[res];
      const epx = e * X.s;
      if (epx < 3 || epx > Math.max(W, H) * 1.6) return;
      const cells = cellsFor(res, x0, y0, x1, y1);
      const vm = field ? vmaxFor(shade, res) : 1;
      const strokeA = ((isTop ? 34 : 11) / 255) * alphaMul * hexA;
      ctx.lineWidth = isTop ? 0.7 : 0.4;
      ctx.strokeStyle = "rgba(122,127,133," + strokeA.toFixed(3) + ")";
      for (const cell of cells) {
        const cs = hexCorners(cell.x, cell.y, e * 0.985, rot).map(([x, y]) => X.px(x, y));
        if (cs.every(([px]) => px < -epx * 2) || cs.every(([px]) => px > W + epx * 2)) continue;
        ctx.beginPath(); cs.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        if (field) {
          const v = field(cell.x, cell.y);
          const t = Math.log1p(Math.max(0, v)) / Math.log1p(vm);
          const [r, g, b] = ramp(t);
          const shadeFa = (t < 0.04 ? 4 : 8 + t * 70) / 255;
          const structFa = (isTop ? 4 : 2) / 255;
          const fa = structFa + (shadeFa - structFa) * shadeMix;
          ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (fa * alphaMul * hexA).toFixed(3) + ")";
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(122,127,133," + (((isTop ? 4 : 2) / 255) * alphaMul * hexA).toFixed(3) + ")";
          ctx.fill();
        }
        ctx.stroke();
      }
    }
    if (topRes > 5) layer(topRes - 1, false, 0.45);        // one parent for depth
    layer(topRes, true, 1 - 0.55 * frac);
    if (frac > 0.02 && topRes < 9) layer(topRes + 1, true, frac);   // children fade in — the split
  }

  function drawLive(ctx, X, opts, W, H) {
    const t = opts.live.t || 0;
    const la = opts.live.alpha != null ? opts.live.alpha : 1;
    if (la <= 0.005) return;
    for (const d of DOCKS) {
      const [px, py] = X.px(d.x, d.y);
      if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue;
      const f = clamp(d.f + 0.18 * Math.sin(t * 0.5 + d.ph), 0, 1);
      const r = clamp(((6 + f * 15) / 1000) * X.s, 1.2, 4);
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(122,127,133," + (((70 + f * 100) / 255) * la).toFixed(3) + ")";
      ctx.fill();
    }
    for (const b of BUSES) {
      const p = routePoint(ROUTES[b.r], b.off + t * b.sp);
      const [px, py] = X.px(p[0], p[1]);
      if (px < -10 || px > W + 10 || py < -10 || py > H + 10) continue;
      const r = clamp(0.016 * X.s, 2.2, 5);
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(22,24,26," + (0.804 * la).toFixed(3) + ")";
      ctx.fill();
    }
  }

  function drawBuildings(ctx, X, W, H, pitch, fade) {
    const [x0, y0, x1, y1] = viewRect(X, W, H, 30);
    const list = [];
    const c = Math.cos(-ROT_M), s = Math.sin(-ROT_M);
    const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
    const gv0 = Math.min(...pts.map((p) => p[0])), gv1 = Math.max(...pts.map((p) => p[0]));
    const gu0 = Math.min(...pts.map((p) => p[1])), gu1 = Math.max(...pts.map((p) => p[1]));
    for (let bi = Math.floor(gv0 / AVE_SP); bi * AVE_SP <= gv1; bi++) {
      for (let bj = Math.floor(gu0 / ST_SP); bj * ST_SP <= gu1; bj++) {
        const vC = (bi + 0.5) * AVE_SP, uC = (bj + 0.5) * ST_SP;
        const [wx, wy] = m2w(vC, uC);
        if (region(wx, wy) !== "mnh" || inPark(wx, wy)) continue;
        for (const b of blockBuildings(bi, bj)) {
          const v0 = bi * AVE_SP + b.fv * AVE_SP, u0 = bj * ST_SP + b.fu * ST_SP;
          const corners = [
            m2w(v0 + 0.012, u0 + 0.006), m2w(v0 + b.wv * AVE_SP, u0 + 0.006),
            m2w(v0 + b.wv * AVE_SP, u0 + b.wu * ST_SP), m2w(v0 + 0.012, u0 + b.wu * ST_SP)
          ];
          list.push({ corners, h: buildingHeightKm(wx, wy, b.hr), seed: (bi * 131 + bj * 7 + Math.round(b.fv * 97)) | 0 });
        }
      }
    }
    const stepB = 0.16;
    for (let y = Math.floor(y0 / stepB) * stepB; y <= y1; y += stepB)
      for (let x = Math.floor(x0 / stepB) * stepB; x <= x1; x += stepB) {
        const r = region(x, y);
        if (r !== "bk" && r !== "qn" && r !== "nj") continue;
        const hsh = hash2(Math.round(x / stepB), Math.round(y / stepB), 313);
        if (hsh < 0.42) continue;
        const w = 0.05 + hsh * 0.06;
        list.push({
          corners: [[x, y], [x + w, y], [x + w, y + w * 0.8], [x, y + w * 0.8]],
          h: 0.012 + hash2(Math.round(x * 91), Math.round(y * 91), 17) * 0.03 * (1 + 2 * gauss(x, y, BKD[0], BKD[1], 0.8)),
          seed: Math.round(x * 53 + y * 97) | 0
        });
      }
    const K = 0.62 * pitch;
    const hiZoom = X.s > 150;                       // ~z 14.5+
    const proj = [];
    for (const b of list) {
      const pc = b.corners.map(([x, y]) => X.px(x, y));
      if (!pc.some(([px, py]) => px > -80 && px < W + 80 && py > -260 && py < H + 80)) continue;
      proj.push({ pc, h: b.h, dh: b.h * X.s * K, yBase: Math.max(...pc.map((p) => p[1])), seed: b.seed });
    }
    // spot.bldg mode: remember the building at (or nearest) the spot point
    if (X.__litPt) {
      const [qx, qy] = X.__litPt;
      let best = null, bestD = (X.__litR || 110) * (X.__litR || 110);
      for (const b of proj) {
        const cx = b.pc.reduce((t, p) => t + p[0], 0) / 4, cy = b.pc.reduce((t, p) => t + p[1], 0) / 4;
        let inside = false;
        for (let i = 0, j = 3; i < 4; j = i++) {
          const [xi, yi] = b.pc[i], [xj, yj] = b.pc[j];
          if ((yi > qy) !== (yj > qy) && qx < ((xj - xi) * (qy - yi)) / (yj - yi) + xi) inside = !inside;
        }
        const d = (cx - qx) * (cx - qx) + (cy - qy) * (cy - qy);
        if (inside) { best = b; break; }
        if (d < bestD) { bestD = d; best = b; }
      }
      X.__lit = best;
    }
    proj.sort((a, b2) => a.yBase - b2.yBase);
    if (hiZoom) {
      ctx.fillStyle = "rgba(22,24,26," + (0.045 * fade).toFixed(3) + ")";
      for (const b of proj) {
        if (b.dh < 0.7) continue;
        ctx.beginPath();
        b.pc.forEach((p, i) => (i ? ctx.lineTo(p[0] + 6, p[1] + 8) : ctx.moveTo(p[0] + 6, p[1] + 8)));
        ctx.closePath(); ctx.fill();
      }
    }
    let winBudget = 7000;
    for (const b of proj) {
      const A = 0.8 * fade * (0.88 + 0.12 * Math.min(1, b.h / 0.15));
      if (b.dh < 0.7) {
        ctx.beginPath(); b.pc.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
        ctx.fillStyle = "rgba(243,242,239," + A.toFixed(3) + ")"; ctx.fill();
        continue;
      }
      if (hiZoom && b.h > 0.12) {                    // tiered tower: base + inset upper
        const dh1 = b.dh * 0.46;
        const cx = b.pc.reduce((t, p) => t + p[0], 0) / 4, cy = b.pc.reduce((t, p) => t + p[1], 0) / 4;
        const inner = b.pc.map(([px, py]) => [px + (cx - px) * 0.2, py + (cy - py) * 0.2]);
        winBudget = prism(ctx, b.pc, 0, dh1, A, fade, hiZoom, b.seed, winBudget);
        roof(ctx, b.pc, dh1, A, fade, false, b.seed, X.s);
        winBudget = prism(ctx, inner, dh1, b.dh, A, fade, hiZoom, b.seed + 7, winBudget);
        roof(ctx, inner, b.dh, A, fade, hiZoom, b.seed + 7, X.s);
      } else {
        winBudget = prism(ctx, b.pc, 0, b.dh, A, fade, hiZoom, b.seed, winBudget);
        roof(ctx, b.pc, b.dh, A, fade, hiZoom, b.seed, X.s);
      }
    }
  }
  // one vertical prism band: side faces from base offset fromDh up to toDh
  function prism(ctx, pc, fromDh, toDh, A, fade, hiZoom, seed, winBudget) {
    for (let i = 0; i < 4; i++) {
      const a2 = pc[i], b2 = pc[(i + 1) % 4];
      ctx.beginPath();
      ctx.moveTo(a2[0], a2[1] - fromDh); ctx.lineTo(b2[0], b2[1] - fromDh);
      ctx.lineTo(b2[0], b2[1] - toDh); ctx.lineTo(a2[0], a2[1] - toDh); ctx.closePath();
      ctx.fillStyle = "#FCFCFB"; ctx.fill();
      const front = (b2[0] - a2[0]) > 0;
      ctx.fillStyle = (front ? "rgba(235,235,231," : "rgba(222,222,217,") + A.toFixed(3) + ")";
      ctx.fill();
      // window dots — the hero rig's signature, only on big front faces
      if (hiZoom && front && winBudget > 0) {
        const eL = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]);
        const band = toDh - fromDh;
        if (eL > 14 && band > 22) {
          const cols = Math.min(14, Math.floor(eL / 4.6)), rows = Math.min(26, Math.floor((band - 8) / 5));
          for (let r = 0; r < rows && winBudget > 0; r++) {
            const wy = -fromDh - 6 - r * ((band - 10) / rows);
            for (let ccol = 0; ccol < cols && winBudget > 0; ccol++) {
              if (hash2(seed + i * 31 + ccol, r, 977) < 0.42) continue;
              const f = (ccol + 0.5) / cols;
              const wx = a2[0] + (b2[0] - a2[0]) * f, wyy = a2[1] + (b2[1] - a2[1]) * f + wy;
              ctx.fillStyle = "rgba(22,24,26," + (0.11 * fade).toFixed(3) + ")";
              ctx.fillRect(wx - 0.7, wyy, 1.4, 2.1);
              winBudget--;
            }
          }
        }
      }
    }
    // base contact hairline
    ctx.beginPath();
    pc.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - fromDh) : ctx.moveTo(p[0], p[1] - fromDh)));
    ctx.closePath();
    ctx.strokeStyle = "rgba(22,24,26," + (0.06 * fade).toFixed(3) + ")"; ctx.lineWidth = 0.5; ctx.stroke();
    return winBudget;
  }
  function roof(ctx, pc, dh, A, fade, details, seed, scale) {
    const top = pc.map(([px, py]) => [px, py - dh]);
    ctx.beginPath(); top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    ctx.fillStyle = "#FCFCFB"; ctx.fill();
    ctx.fillStyle = "rgba(244,243,240," + A.toFixed(3) + ")"; ctx.fill();
    ctx.strokeStyle = "rgba(22,24,26," + (0.1 * fade).toFixed(3) + ")"; ctx.lineWidth = 0.55; ctx.stroke();
    if (!details) return;
    // shoelace area
    let ar = 0;
    for (let i = 0; i < 4; i++) { const [xa, ya] = top[i], [xb, yb] = top[(i + 1) % 4]; ar += xa * yb - xb * ya; }
    ar = Math.abs(ar / 2);
    if (ar < 750) return;
    const cx = top.reduce((t, p) => t + p[0], 0) / 4, cy = top.reduce((t, p) => t + p[1], 0) / 4;
    const j1 = hash2(seed, 1, 55) - 0.5, j2 = hash2(seed, 2, 55) - 0.5;
    // water tower — the NYC signature
    if (hash2(seed, 3, 55) > 0.45) {
      const r = Math.min(4.5, 0.012 * scale);
      ctx.beginPath(); ctx.arc(cx + j1 * 10, cy + j2 * 8 - r * 0.8, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(222,222,217," + A.toFixed(3) + ")"; ctx.fill();
      ctx.strokeStyle = "rgba(22,24,26," + (0.22 * fade).toFixed(3) + ")"; ctx.lineWidth = 0.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + j1 * 10, cy + j2 * 8 - r * 0.8, r * 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(22,24,26," + (0.12 * fade).toFixed(3) + ")"; ctx.stroke();
    }
    // ac units
    ctx.fillStyle = "rgba(230,230,226," + A.toFixed(3) + ")";
    ctx.strokeStyle = "rgba(22,24,26," + (0.1 * fade).toFixed(3) + ")"; ctx.lineWidth = 0.4;
    for (let k = 0; k < 2; k++) {
      const ax = cx + (hash2(seed, 6 + k, 55) - 0.5) * 16, ay = cy + (hash2(seed, 9 + k, 55) - 0.5) * 12;
      ctx.fillRect(ax, ay, 3.4, 2.4); ctx.strokeRect(ax, ay, 3.4, 2.4);
    }
  }

  function drawLabels(ctx, X, W, H, z) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // street names — set along their line, high zoom only
    if (z >= 13.95 && z <= 18.2) {
      const fadeS = clamp((z - 13.95) / 0.4, 0, 1) * clamp((18.2 - z) / 0.4, 0, 1);
      ctx.font = "400 " + (X.s > 1500 ? 15 : 10.5) + "px -apple-system, 'Helvetica Neue', Arial, sans-serif";
      const put = (wx, wy, dx, dy, name) => {
        const [px, py] = X.px(wx, wy);
        if (px < 30 || px > W - 30 || py < 24 || py > H - 24) return false;
        const [qx, qy] = X.px(wx + dx * 0.1, wy + dy * 0.1);
        let ang = Math.atan2(qy - py, qx - px);
        if (ang > Math.PI / 2) ang -= Math.PI;
        if (ang < -Math.PI / 2) ang += Math.PI;
        ctx.save(); ctx.translate(px, py); ctx.rotate(ang);
        ctx.lineWidth = 2.6; ctx.strokeStyle = "rgba(255,255,255," + (0.9 * fadeS).toFixed(3) + ")";
        ctx.strokeText(name, 0, 0);
        ctx.fillStyle = "rgba(122,127,133," + (0.95 * fadeS).toFixed(3) + ")";
        ctx.fillText(name, 0, 0);
        ctx.restore();
        return true;
      };
      const aveDir = m2w(0, 1), stDir = m2w(1, 0);
      for (const A2 of STREET_AVES) {
        let drawn = 0;
        for (let u = -3.4; u <= -0.9 && drawn < 2; u += 0.62) {
          const [wx, wy] = m2w(A2.v + 0.012, u + 0.21);
          if (region(wx, wy) !== "mnh") continue;
          if (put(wx, wy, aveDir[0], aveDir[1], A2.n)) drawn++;
        }
      }
      for (const S2 of STREET_STS) {
        let drawn = 0;
        for (let v = -0.75; v <= 0.95 && drawn < 2; v += 0.44) {
          const [wx, wy] = m2w(v + 0.19, S2.u + 0.013);
          if (region(wx, wy) !== "mnh") continue;
          if (put(wx, wy, stDir[0], stDir[1], S2.n)) drawn++;
        }
      }
    }
    for (const L of LABELS) {
      if (z < L.z0 || z > L.z1) continue;
      const [px, py] = X.px(L.x, L.y);
      if (px < -60 || px > W + 60 || py < -20 || py > H + 20) continue;
      const fade = clamp((z - L.z0) / 0.35, 0, 1) * clamp((L.z1 - z) / 0.35, 0, 1);
      const boro = L.kind === "boro";
      ctx.font = (boro ? "600 " : "400 ") + (boro ? 12 : 10.5) + "px -apple-system, 'Helvetica Neue', Arial, sans-serif";
      if (L.kind === "water") ctx.font = "italic 400 10.5px Georgia, serif";
      ctx.lineWidth = 2.6; ctx.strokeStyle = "rgba(255,255,255," + (0.85 * fade).toFixed(3) + ")";
      const label = boro ? L.t : L.t;
      ctx.strokeText(label, px, py);
      ctx.fillStyle = L.kind === "water"
        ? "rgba(122,132,146," + (0.75 * fade).toFixed(3) + ")"
        : boro ? "rgba(74,78,84," + (0.9 * fade).toFixed(3) + ")" : "rgba(122,127,133," + (0.9 * fade).toFixed(3) + ")";
      ctx.fillText(label, px, py);
    }
  }

  function drawSelected(ctx, X, sel, phase) {
    const res = sel.res || 9;
    const cell = cellAt(res, sel.x, sel.y);
    const e = RES_EDGE_KM[res];
    const cs = hexCorners(cell.x, cell.y, e * 0.985, RES_ROT[res]).map(([x, y]) => X.px(x, y));
    ctx.beginPath(); cs.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    const a = phase == null ? 1 : phase;
    if (sel.ink) {           // secondary highlight — ink, never signal
      ctx.fillStyle = "rgba(22,24,26," + ((8 / 255) * a).toFixed(3) + ")"; ctx.fill();
      ctx.strokeStyle = "rgba(22,24,26," + (0.55 * a).toFixed(3) + ")"; ctx.lineWidth = 1.3;
      ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.fillStyle = "rgba(217,72,15," + ((16 / 255) * a).toFixed(3) + ")"; ctx.fill();
      ctx.strokeStyle = "rgba(217,72,15," + ((215 / 255) * a).toFixed(3) + ")"; ctx.lineWidth = 2; ctx.stroke();
    }
    return cell;
  }

  // spot.bldg variant: the veil stays, but the signal mark is the actual
  // building footprint (roof wash + edges) instead of a radius circle —
  // the place, not a geofence radius.
  function drawSpotBldg(ctx, X, W, H, spot, phase, lit, blink) {
    const [px, py] = X.px(spot.x, spot.y);
    const r = Math.max(26, (spot.rKm || 0.05) * X.s);
    const pc = lit.pc, dh = lit.dh || 0;
    const path = (off) => {
      ctx.beginPath();
      pc.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - off) : ctx.moveTo(p[0], p[1] - off)));
      ctx.closePath();
    };
    // live "this place" highlight — deep red, glowing, pulsing (opt-in via `blink`,
    // so the Atlas POI highlight keeps its original signal-orange static look)
    if (blink != null) {
      const RED = "170,26,20", cy = py - dh * 0.5;   // darker red, steady — no halo, no glow
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(px, cy, r * 2.3, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(250,250,249," + (0.09 * phase).toFixed(3) + ")"; ctx.fill("evenodd");
      ctx.restore();
      ctx.strokeStyle = "rgba(" + RED + "," + (0.42 * phase).toFixed(3) + ")"; ctx.lineWidth = 1.3;
      for (const p of pc) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - dh); ctx.stroke(); }
      path(dh);
      ctx.fillStyle = "rgba(" + RED + "," + (0.34 * phase).toFixed(3) + ")"; ctx.fill();
      ctx.strokeStyle = "rgba(" + RED + "," + (0.95 * phase).toFixed(3) + ")"; ctx.lineWidth = 2.6; ctx.stroke();
      path(0);
      ctx.strokeStyle = "rgba(" + RED + "," + (0.6 * phase).toFixed(3) + ")"; ctx.lineWidth = 1.3; ctx.stroke();
      return;
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(px, py, r * 2.1, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(252,252,251," + (0.20 * phase).toFixed(3) + ")"; ctx.fill("evenodd");
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(px, py, r * 1.45, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(252,252,251," + (0.16 * phase).toFixed(3) + ")"; ctx.fill("evenodd");
    ctx.restore();
    path(dh);
    ctx.fillStyle = "rgba(217,72,15," + (0.13 * phase).toFixed(3) + ")"; ctx.fill();
    ctx.strokeStyle = "rgba(217,72,15," + (0.92 * phase).toFixed(3) + ")"; ctx.lineWidth = 2.2; ctx.stroke();
    path(0);
    ctx.strokeStyle = "rgba(217,72,15," + (0.45 * phase).toFixed(3) + ")"; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = "rgba(217,72,15," + (0.55 * phase).toFixed(3) + ")"; ctx.lineWidth = 1.3;
    for (const p of pc) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - dh); ctx.stroke(); }
  }

  // premium focus: paper veil outside a soft circle + a signal ring.
  // With `blink` (ads) it becomes a deep-red glowing/pulsing "this place is live" marker.
  function drawSpot(ctx, X, W, H, spot, phase, blink) {
    const [px, py] = X.px(spot.x, spot.y);
    const r = Math.max(blink != null ? 112 : 26, (spot.rKm || 0.05) * X.s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(px, py, r * 2.1, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(252,252,251," + (0.20 * phase).toFixed(3) + ")";
    ctx.fill("evenodd");
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(px, py, r * 1.45, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(252,252,251," + (0.16 * phase).toFixed(3) + ")";
    ctx.fill("evenodd");
    ctx.restore();
    if (blink != null) {
      const b = blink, RED = "208,36,24";
      ctx.save();
      const g = ctx.createRadialGradient(px, py, r * 0.1, px, py, r * 2.0);
      g.addColorStop(0, "rgba(" + RED + "," + ((0.28 + 0.30 * b) * phase).toFixed(3) + ")");
      g.addColorStop(0.5, "rgba(" + RED + "," + ((0.11 + 0.14 * b) * phase).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + RED + ",0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r * 2.0, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = "rgba(" + RED + "," + (0.9 * phase).toFixed(3) + ")";
      ctx.shadowBlur = 14 + 26 * b;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(" + RED + "," + ((0.66 + 0.34 * b) * phase).toFixed(3) + ")";
      ctx.lineWidth = 3.2 + 2.6 * b; ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(px, py, Math.max(6, r * 0.12), 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + RED + "," + ((0.82 + 0.18 * b) * phase).toFixed(3) + ")"; ctx.fill();
      return;
    }
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(217,72,15," + (0.92 * phase).toFixed(3) + ")";
    ctx.lineWidth = 2.2; ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, r * 1.24, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(22,24,26," + (0.12 * phase).toFixed(3) + ")";
    ctx.lineWidth = 1; ctx.stroke();
  }

  function drawCity(ctx, W, H, cam, opts) {
    opts = opts || {};
    ctx.save();
    const X = makeXform(W, H, cam);
    X.__lit = null;
    X.__litPt = (opts.spot && opts.spot.bldg) ? X.px(opts.spot.x, opts.spot.y) : null;
    X.__litR = (opts.spot && opts.spot.litR) || 110;   // fallback search radius (ads snap to nearest building)
    drawGround(ctx, W, H, X);
    drawFabric(ctx, X, W, H, cam.z);
    drawHexes(ctx, X, W, H, cam, opts);
    if (opts.live && opts.live.on) drawLive(ctx, X, opts, W, H);
    const z = cam.z;
    const bOn = opts.buildings != null ? opts.buildings : z >= BUILDING_ZOOM;
    if (bOn) {
      const fade = opts.fadeBuildings != null ? opts.fadeBuildings : clamp((z - BUILDING_ZOOM) / 0.5, 0, 1);
      if (fade > 0.01) drawBuildings(ctx, X, W, H, cam.pitch != null ? cam.pitch : 0.75, fade);
    }
    let selCell = null;
    if (opts.selected) selCell = drawSelected(ctx, X, opts.selected, opts.selectedPhase);
    if (opts.selected2) drawSelected(ctx, X, opts.selected2, opts.selected2Phase);
    if (opts.spot) {
      const sp = opts.spotPhase == null ? 1 : opts.spotPhase;
      if (sp > 0.01) {
        if (opts.spot.bldg && X.__lit) drawSpotBldg(ctx, X, W, H, opts.spot, sp, X.__lit, opts.spotBlink);
        else drawSpot(ctx, X, W, H, opts.spot, sp, opts.spotBlink);
      }
    }
    if (opts.labels !== false) drawLabels(ctx, X, W, H, z);
    ctx.restore();
    return { X, selCell };
  }

  /* ============================================================
     GLOBE — dot-matrix earth, graphite on paper
     ============================================================ */
  const CONT = [
    [[-168, 66], [-140, 70], [-124, 60], [-95, 72], [-80, 73], [-61, 60], [-52, 47], [-65, 44], [-70, 41], [-75, 35], [-81, 31], [-80, 25], [-90, 29], [-97, 25], [-97, 16], [-92, 15], [-83, 8], [-77, 7], [-80, 9], [-95, 17], [-105, 20], [-110, 23], [-117, 33], [-125, 40], [-125, 49], [-132, 57], [-155, 58], [-168, 66]],
    [[-77, 7], [-60, 10], [-50, 5], [-35, -7], [-39, -15], [-48, -25], [-57, -34], [-65, -40], [-71, -45], [-75, -50], [-71, -54], [-68, -55], [-72, -45], [-71, -30], [-70, -18], [-77, -5], [-80, 0], [-77, 7]],
    [[-17, 15], [-10, 30], [-6, 35], [10, 37], [20, 33], [32, 31], [34, 28], [43, 11], [51, 12], [40, -5], [35, -20], [20, -35], [18, -33], [12, -18], [9, -1], [-8, 4], [-17, 15]],
    [[-10, 36], [-9, 43], [-2, 48], [-5, 58], [5, 62], [10, 71], [25, 71], [40, 68], [60, 69], [90, 73], [110, 74], [140, 72], [160, 70], [179, 66], [178, 62], [160, 60], [155, 50], [140, 46], [130, 42], [122, 39], [117, 30], [108, 20], [105, 10], [98, 8], [92, 15], [88, 22], [80, 15], [77, 8], [72, 20], [65, 25], [57, 27], [50, 30], [44, 38], [36, 36], [27, 36], [22, 40], [18, 40], [15, 44], [5, 43], [-2, 36], [-10, 36]],
    [[114, -22], [122, -14], [132, -11], [142, -11], [146, -15], [153, -25], [150, -37], [140, -38], [131, -32], [122, -34], [114, -30], [114, -22]],
    [[-43, 60], [-53, 66], [-56, 72], [-50, 79], [-35, 82], [-22, 75], [-30, 68], [-40, 62], [-43, 60]],
    [[-5, 50], [-6, 56], [-3, 59], [0, 53], [-2, 50], [-5, 50]],
    [[130, 31], [135, 34], [140, 36], [142, 42], [145, 44], [141, 39], [136, 34], [131, 31], [130, 31]],
    [[95, 5], [105, 0], [115, -3], [120, -6], [110, -8], [100, -2], [95, 5]],
    [[44, -12], [50, -16], [47, -25], [43, -22], [44, -12]]
  ];
  const MASK_W = 288, MASK_H = 144;
  const MASK = new Uint8Array(MASK_W * MASK_H);
  (function rasterize() {
    function inPoly(px, py, poly) {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi)) c = !c;
      }
      return c;
    }
    for (let iy = 0; iy < MASK_H; iy++) {
      const lat = 90 - (iy + 0.5) * (180 / MASK_H);
      for (let ix = 0; ix < MASK_W; ix++) {
        const lon = -180 + (ix + 0.5) * (360 / MASK_W);
        let land = lat < -68;
        if (!land) for (const p of CONT) { if (inPoly(lon, lat, p)) { land = true; break; } }
        MASK[iy * MASK_W + ix] = land ? 1 : 0;
      }
    }
  })();
  function isLand(lat, lon) {
    let L = ((lon + 180) % 360 + 360) % 360;
    const ix = clamp(Math.floor((L / 360) * MASK_W), 0, MASK_W - 1);
    const iy = clamp(Math.floor(((90 - lat) / 180) * MASK_H), 0, MASK_H - 1);
    return MASK[iy * MASK_W + ix] === 1;
  }
  const GDOTS = [];
  (function () {
    const N = 3200, ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const yy = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - yy * yy), th = ga * i;
      const x = Math.cos(th) * r, zz = Math.sin(th) * r;
      const lat = Math.asin(yy) * 180 / Math.PI, lon = Math.atan2(zz, x) * 180 / Math.PI;
      GDOTS.push({ x, y: yy, z: zz, land: isLand(lat, lon), lat, lon, j: hash2(i, 7, 3) });
    }
  })();
  function drawGlobe(ctx, W, H, o) {
    o = o || {};
    const cx = o.cx != null ? o.cx : W / 2, cy = o.cy != null ? o.cy : H / 2;
    const R = o.R || Math.min(W, H) * 0.36;
    const rot = o.rot || 0, tilt = o.tilt != null ? o.tilt : 0.35;   // +tilt = north toward viewer
    const A = o.alpha != null ? o.alpha : 1, dm = o.dotMul || 1;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    ctx.strokeStyle = "rgba(22,24,26," + (0.10 * A).toFixed(3) + ")";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    for (const d of GDOTS) {
      const cr = Math.cos(rot), sr = Math.sin(rot);
      let x = d.x * cr + d.z * sr, z = -d.x * sr + d.z * cr, y = d.y;
      let y2 = y * ct - z * st, z2 = y * st + z * ct;
      if (z2 < -0.06) continue;
      const edge = clamp((z2 + 0.06) / 0.3, 0, 1);
      const px = cx + x * R, py = cy - y2 * R;
      let al, r;
      if (d.land) { al = (0.5 + 0.14 * d.j) * edge * A; r = (R / 210) * (1.35 + 0.5 * d.j) * dm; }
      else { al = 0.11 * edge * A; r = (R / 210) * 0.8 * dm; }
      if (o.pulse && o.pulse.amt > 0) {
        const dd = Math.hypot(d.lat - o.pulse.lat, (d.lon - o.pulse.lon) * 0.7);
        if (dd < 16) {
          const k = Math.exp(-dd * dd / 34) * o.pulse.amt;
          al = clamp(al + k * 0.75 * edge, 0, 1); r *= 1 + k * 0.7;
        }
      }
      if (al < 0.01) continue;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(22,24,26," + al.toFixed(3) + ")";
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(22,24,26," + (0.05 * A).toFixed(3) + ")";
    for (let k = -2; k <= 2; k++) {
      const yy = (k / 3);
      const rr = Math.sqrt(Math.max(0, 1 - yy * yy));
      ctx.beginPath();
      ctx.ellipse(cx, cy - yy * R * ct, R * rr, Math.max(0.5, R * rr * Math.abs(st)), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* ---------- camera easing ---------- */
  function easeCam(a, b, t, ease) {
    const e = ease ? ease(t) : t;
    return {
      x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e),
      z: lerp(a.z, b.z, e),
      rot: lerp(a.rot || 0, b.rot || 0, e),
      pitch: lerp(a.pitch != null ? a.pitch : 0.75, b.pitch != null ? b.pitch : 0.75, e)
    };
  }

  /* ---------- export-safe blit ----------
     The Stage serializes its <svg> for video export; <canvas> bitmaps do not
     survive XMLSerializer. So scene layers render into an OFFSCREEN canvas
     and blit into a visible <img> (data URL) — pixels that survive every
     capture path: export serialization, cloneNode, screenshots. */
  /* Export-safe blit: scene layers render offscreen and commit into a visible
     <img> as a data: URL — the only pixel form that survives the exporter's
     SVG serialization. Single in-flight load per img with a latest-frame
     queue; data-URL decodes are synchronous in practice, so the queue drains
     immediately and no load is ever aborted mid-flight. */
  // Host-driven seeks (video export) must always capture the exact frame:
  // record the last seek instant so the rate gate below never staleness-skips
  // during an export capture window.
  if (typeof document !== "undefined" && !window.__omSeekWatch) {
    window.__omSeekWatch = true;
    document.addEventListener("data-om-seek-to-time-frame", function () {
      window.__omSeekAt = (typeof performance !== "undefined" ? performance.now() : Date.now());
    }, true);
  }
  function blitToImg(canvas, img, opaque, q) {
    if (!canvas || !img) return;
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
    const forced = window.__omSeekAt && (now - window.__omSeekAt < 250);
    if (img.__omBusy || (!forced && img.__omT && now - img.__omT < 45)) {
      // keep only the latest frame; drain on a short timer (live) or on done()
      img.__omPending = { canvas, opaque, q };
      if (!img.__omTimer) {
        img.__omTimer = setTimeout(function () {
          img.__omTimer = null;
          const p = img.__omPending;
          img.__omPending = null;
          if (p && img.isConnected && !img.__omBusy) blitToImg(p.canvas, img, p.opaque, p.q);
        }, 50);
      }
      return;
    }
    img.__omT = now;
    let url;
    try {
      url = canvas.toDataURL(opaque ? "image/jpeg" : "image/png", q || 0.88);
    } catch (e) { return; }
    img.__omBusy = true;
    const done = function () {
      img.onload = null; img.onerror = null;
      img.__omBusy = false;
      const p = img.__omPending;
      img.__omPending = null;
      if (p && img.isConnected) blitToImg(p.canvas, img, p.opaque, p.q);
    };
    img.onload = done;
    img.onerror = done;
    img.src = url;
    if (img.complete) done();          // sync decode path (data URLs)
  }

  window.JanusScene = {
    drawCity, drawGlobe, easeCam, ramp, pxPerKm, activeRes, cellAt, cellId, m2w, w2m, blitToImg,
    region, LADDER, BUILDING_ZOOM, RES_EDGE_KM, MID, DTN, BKD, FIELDS, routePoint, ROUTES, LABELS,
    drawLiveLayer(ctx, W, H, cam, live) { const X = makeXform(W, H, cam); drawLive(ctx, X, { live }, W, H); },
    drawSelectedLayer(ctx, W, H, cam, sel, phase) { const X = makeXform(W, H, cam); return drawSelected(ctx, X, sel, phase); }
  };
  if (typeof module !== "undefined") module.exports = window.JanusScene;
})();
