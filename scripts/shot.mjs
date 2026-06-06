// Dev-only screenshot helper. Drives the system Chrome via puppeteer-core
// (no bundled Chromium download). Not part of the deployed build.
//
//   node scripts/shot.mjs <url> <outfile>
//   env: W, H (viewport), WAIT (ms after load), FULL=0 (viewport-only),
//        CLIP="y,h" (capture a horizontal band at scroll y, height h)
import puppeteer from "puppeteer-core";

const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const url = process.argv[2] || "http://localhost:4173/";
const out = process.argv[3] || "/tmp/shot.png";
const width = Number(process.env.W || 1440);
const height = Number(process.env.H || 900);
const wait = Number(process.env.WAIT || 3500);
const fullPage = process.env.FULL !== "0";
const clip = process.env.CLIP || "";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb"],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
await new Promise((r) => setTimeout(r, wait));
const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);

if (clip) {
  const [y, h] = clip.split(",").map(Number);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: out, clip: { x: 0, y, width, height: h } });
} else {
  await page.screenshot({ path: out, fullPage });
}
await browser.close();
console.log(`shot ${url} -> ${out}  (page height ${docHeight}px)`);
