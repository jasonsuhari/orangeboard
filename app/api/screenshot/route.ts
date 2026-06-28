import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const dynamic = "force-dynamic";

function validUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  const url = validUrl(raw);
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const fullPage = req.nextUrl.searchParams.get("full") !== "0";

  let browser;
  try {
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "load", timeout: 15000 });
    // Let JS settle briefly
    await page.waitForTimeout(800);
    const buf = await page.screenshot({ type: "jpeg", quality: 82, fullPage });
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[screenshot]", err);
    return NextResponse.json({ error: "screenshot failed" }, { status: 500 });
  } finally {
    await browser?.close();
  }
}
