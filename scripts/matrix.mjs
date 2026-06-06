// Dev-only: scan a matrix of device widths for horizontal overflow / cut-off
// content. Reports, per width: real page scroll overflow (must be 0) and the
// worst content element past the right edge (excluding the intentionally
// bleeding hero map). Run before & after responsive fixes.
//   node scripts/matrix.mjs <url>
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = process.argv[2] || "http://localhost:5173/";

// width, label — a spread of real devices + in-between sizes
const DEVICES = [
  [280, "Galaxy Fold cover"],
  [320, "iPhone SE / small"],
  [360, "Android (Galaxy S)"],
  [375, "iPhone mini / X"],
  [390, "iPhone 14/15"],
  [402, "iPhone 16 Pro"],
  [414, "iPhone Plus"],
  [430, "iPhone Pro Max"],
  [480, "large phone / landscape"],
  [600, "small tablet"],
  [768, "iPad portrait"],
  [820, "iPad Air"],
  [912, "tablet / foldable"],
  [1024, "iPad landscape"],
  [1180, "iPad Pro"],
  [1280, "laptop"],
  [1440, "desktop"],
  [1920, "wide desktop"],
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb"],
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

const fmt = (n, w) => String(n).padStart(w);
let problems = 0;
console.log("width  device                 scrollW  hOverflow  worst-content-offender");
for (const [w, label] of DEVICES) {
  await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1, isMobile: w < 820, hasTouch: w < 820 });
  await new Promise((r) => setTimeout(r, 600));
  const res = await page.evaluate((vw) => {
    const docW = document.documentElement.scrollWidth;
    const cssPath = (el) => {
      const parts = [];
      let e = el;
      while (e && e.nodeType === 1 && parts.length < 3) {
        let s = e.tagName.toLowerCase();
        if (e.className && typeof e.className === "string") {
          const c = e.className.trim().split(/\s+/).slice(0, 2).join(".");
          if (c) s += "." + c;
        }
        parts.unshift(s);
        e = e.parentElement;
      }
      return parts.join(">");
    };
    let worst = null;
    for (const el of document.querySelectorAll("body *")) {
      // ignore the intentionally-bleeding hero map (decorative, clipped)
      if (el.closest(".hero-bg")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const over = r.right - vw;
      if (over > 1 && (!worst || over > worst.over)) {
        worst = { over: Math.round(over), sel: cssPath(el), w: Math.round(r.width) };
      }
    }
    return { docW, worst };
  }, w);
  const hOver = res.docW - w;
  const bad = hOver > 1 || res.worst;
  if (bad) problems++;
  const worstStr = res.worst ? `+${res.worst.over}px ${res.worst.sel} (w=${res.worst.w})` : "—";
  console.log(`${fmt(w, 5)}  ${label.padEnd(22)} ${fmt(res.docW, 6)}  ${fmt(hOver, 8)}px  ${worstStr}`);
}
console.log(`\nwidths with issues: ${problems}/${DEVICES.length}`);
await browser.close();
