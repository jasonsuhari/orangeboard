import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// Reproduce the user's condition exactly.
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/f_full.png" });

const clip = { x: 620, y: 420, width: 620, height: 420 };
await page.screenshot({ path: "/tmp/f_a.png", clip });
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/f_b.png", clip });

const a = readFileSync("/tmp/f_a.png"), b = readFileSync("/tmp/f_b.png");
let same = a.length === b.length;
if (same) for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; }
console.log("under REDUCED-MOTION -> frames identical (frozen) =", same, "(want false)");
await browser.close();
