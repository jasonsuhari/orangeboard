// One-off visual QA: screenshot the landing page at desktop + mobile sizes.
// Usage: node scripts/shot-landing.mjs [baseUrl]
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = [
  { name: "landing-desktop", width: 1440, height: 900 },
  { name: "landing-mobile", width: 390, height: 844 },
];

const browser = await chromium.launch();
for (const { name, width, height } of shots) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500); // let entrance animations settle
  await page.screenshot({ path: `.codex-logs/${name}.png` });
  await page.close();
  console.log(`saved .codex-logs/${name}.png`);
}
await browser.close();
