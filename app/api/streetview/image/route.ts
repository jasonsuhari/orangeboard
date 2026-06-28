import { NextRequest, NextResponse } from "next/server";

/* Proxies a Street View Static still so the API key stays server-side.
 *
 * Accepts either a precise pano id (preferred — from /api/streetview metadata)
 * or a raw lat/lng, plus heading / pitch / fov framing. Returns the JPEG bytes
 * directly so it can be used as an <img src>. */

const IMAGE_URL = "https://maps.googleapis.com/maps/api/streetview";

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Missing GOOGLE_MAPS_API_KEY" },
      { status: 503 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const pano = sp.get("pano");
  const lat = sp.get("lat");
  const lng = sp.get("lng");
  if (!pano && !(lat && lng)) {
    return NextResponse.json({ error: "pano or lat/lng required" }, { status: 400 });
  }

  const params = new URLSearchParams({
    size: sp.get("size") ?? "640x640",
    heading: sp.get("heading") ?? "0",
    pitch: sp.get("pitch") ?? "8",
    fov: sp.get("fov") ?? "70",
    source: "outdoor",
    key,
  });
  if (pano) params.set("pano", pano);
  else params.set("location", `${lat},${lng}`);

  let upstream: Response;
  try {
    upstream = await fetch(`${IMAGE_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json({ error: "Street View image request failed" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Street View image failed: ${upstream.status}` },
      { status: 502 }
    );
  }

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
