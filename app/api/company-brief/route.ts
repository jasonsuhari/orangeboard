import { NextRequest, NextResponse } from "next/server";
import { buildCompanyBrief, normalizeUrl } from "../../lib/companyBrief";
import { readCachedBrief } from "../../lib/briefCache";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let url: string;
  try {
    const body = (await req.json()) as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: 'Missing or invalid "url" field' }, { status: 400 });
    }
    url = normalizeUrl(body.url);
  } catch {
    return NextResponse.json({ error: "Invalid request body or URL" }, { status: 400 });
  }

  try {
    // Precomputed sites (brief + high-quality creative) return instantly.
    const cached = await readCachedBrief(url);
    if (cached) return NextResponse.json({ brief: cached, cached: true });

    const brief = await buildCompanyBrief(url);
    return NextResponse.json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
