// Dev-only: find elements causing horizontal overflow at a given viewport.
//   node scripts/overflow.mjs <url> <width> <height>
// Defaults to iPhone 16 Pro (402x874). Prints the page scrollWidth vs viewport
// and the elements extending past the right edge, worst first.
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const url = process.argv[2] || "http://localhost:5173/";
const width = Number(process.argv[3] || 402);
const height = Number(process.argv[4] || 874);
const shot = process.env.SHOT || "";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-color-profile=srgb"],
  defaultViewport: { width, height, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});
const page = await browser.newPage();
await page.setUserAgent(
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
);
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const report = await page.evaluate((vw) => {
  const cssPath = (el) => {
    const parts = [];
    let e = el;
    while (e && e.nodeType === 1 && parts.length < 4) {
      let s = e.tagName.toLowerCase();
      if (e.id) { s += "#" + e.id; parts.unshift(s); break; }
      if (e.className && typeof e.className === "string") {
        const c = e.className.trim().split(/\s+/).slice(0, 2).join(".");
        if (c) s += "." + c;
      }
      parts.unshift(s);
      e = e.parentElement;
    }
    return parts.join(" > ");
  };
  const docW = document.documentElement.scrollWidth;
  const offenders = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const over = Math.round(r.right - vw);
    const leftOff = Math.round(r.left);
    if (over > 1 || leftOff < -1) {
      offenders.push({
        sel: cssPath(el),
        right: Math.round(r.right),
        left: leftOff,
        w: Math.round(r.width),
        over,
      });
    }
  }
  // Keep the worst (furthest-right) and de-noise: sort by right desc
  offenders.sort((a, b) => b.right - a.right);
  return { docW, vw, count: offenders.length, top: offenders.slice(0, 30) };
}, width);

console.log(`viewport=${width}px  document.scrollWidth=${report.docW}px  overflow=${report.docW - width}px`);
console.log(`elements past right edge: ${report.count}`);
console.log("worst offenders (right / left / width / overflowPx / selector):");
for (const o of report.top) {
  console.log(`  right=${String(o.right).padStart(5)}  left=${String(o.left).padStart(5)}  w=${String(o.w).padStart(5)}  +${String(o.over).padStart(4)}px  ${o.sel}`);
}
if (shot) { await page.screenshot({ path: shot, fullPage: false }); console.log("screenshot:", shot); }
await browser.close();
