import { NextRequest, NextResponse } from "next/server";

/* Street View metadata for a billboard location.
 *
 * Given a sign's lat/lng, we ask Google where the nearest panorama actually
 * sits (it's on the road, not on the sign), then compute the camera heading
 * that looks *from that panorama toward the sign*. The browser then loads the
 * still through /api/streetview/image with this pano id + heading, so the photo
 * is framed on the real billboard rather than pointing off into space.
 *
 * The key is read server-side only and never reaches the client. */

const META_URL = "https://maps.googleapis.com/maps/api/streetview/metadata";

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Initial bearing from point 1 → point 2, in degrees clockwise from north. */
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Missing GOOGLE_MAPS_API_KEY. Add it to .env.local (Street View Static API enabled) and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const url =
    `${META_URL}?location=${lat},${lng}` +
    `&source=outdoor&key=${encodeURIComponent(key)}`;

  let meta: {
    status?: string;
    location?: { lat: number; lng: number };
    pano_id?: string;
    date?: string;
    copyright?: string;
  };
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    meta = await res.json();
  } catch {
    return NextResponse.json({ error: "Street View metadata request failed" }, { status: 502 });
  }

  if (meta.status !== "OK" || !meta.location || !meta.pano_id) {
    // ZERO_RESULTS / NOT_FOUND etc. — no panorama near this sign.
    return NextResponse.json(
      { ok: false, status: meta.status ?? "UNKNOWN" },
      { status: 200 }
    );
  }

  const heading = bearing(meta.location.lat, meta.location.lng, lat, lng);
  // Rough distance pano → sign, used to nudge the default pitch upward for
  // nearby signs (they sit higher in frame) vs. far ones.
  const dLat = lat - meta.location.lat;
  const dLng = lng - meta.location.lng;
  const meters = Math.hypot(dLat, dLng * Math.cos(toRad(lat))) * 111_320;

  return NextResponse.json({
    ok: true,
    panoId: meta.pano_id,
    panoLocation: meta.location,
    heading,
    distanceMeters: Math.round(meters),
    date: meta.date ?? null,
    copyright: meta.copyright ?? "© Google",
  });
}
