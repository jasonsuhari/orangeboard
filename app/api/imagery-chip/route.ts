import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const WEB_MERCATOR_RADIUS_M = 6378137;
const WEB_MERCATOR_INITIAL_RESOLUTION = 156543.03392804097;
const NAIP_PLUS_EXPORT_URL =
  "https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage";
const MAPBOX_STATIC_STYLE_URL = "https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function lonLatToWebMercator(lon: number, lat: number) {
  const clampedLat = clamp(lat, -85.05112878, 85.05112878);
  const lonRad = (lon * Math.PI) / 180;
  const latRad = (clampedLat * Math.PI) / 180;

  return {
    x: WEB_MERCATOR_RADIUS_M * lonRad,
    y: WEB_MERCATOR_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + latRad / 2)),
    latRad,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const provider = params.get("provider") === "mapbox" ? "mapbox" : "naip";
  const lon = clamp(toFiniteNumber(params.get("lon"), -122.4194), -180, 180);
  const lat = clamp(toFiniteNumber(params.get("lat"), 37.7749), -85, 85);
  const meters = clamp(toFiniteNumber(params.get("meters"), 120), 25, 1000);
  const size = Math.round(clamp(toFiniteNumber(params.get("size"), 1024), 256, 2048));

  if (provider === "mapbox") {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_MAPBOX_TOKEN." },
        { status: 400 },
      );
    }

    const latRad = (lat * Math.PI) / 180;
    const requestedSize = Math.min(size, 1280);
    const targetMetersPerCssPixel = (meters * 2) / requestedSize;
    const zoom = clamp(
      Math.log2((WEB_MERCATOR_INITIAL_RESOLUTION * Math.cos(latRad)) / targetMetersPerCssPixel),
      15,
      21,
    );

    const upstream = new URL(
      `${MAPBOX_STATIC_STYLE_URL}/${lon.toFixed(7)},${lat.toFixed(7)},${zoom.toFixed(2)},0,0/${requestedSize}x${requestedSize}@2x`,
    );
    upstream.searchParams.set("access_token", token);

    const response = await fetch(upstream, {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*" },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Mapbox imagery request failed.", status: response.status },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const bytes = await response.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "x-imagery-provider": "Mapbox Satellite",
        "x-imagery-zoom": zoom.toFixed(2),
      },
    });
  }

  const center = lonLatToWebMercator(lon, lat);
  const mercatorRadius = meters / Math.max(0.18, Math.cos(center.latRad));
  const bbox = [
    center.x - mercatorRadius,
    center.y - mercatorRadius,
    center.x + mercatorRadius,
    center.y + mercatorRadius,
  ].map((value) => value.toFixed(3)).join(",");

  const upstream = new URL(NAIP_PLUS_EXPORT_URL);
  upstream.searchParams.set("bbox", bbox);
  upstream.searchParams.set("bboxSR", "3857");
  upstream.searchParams.set("imageSR", "3857");
  upstream.searchParams.set("size", `${size},${size}`);
  upstream.searchParams.set("format", "jpgpng");
  upstream.searchParams.set("transparent", "false");
  upstream.searchParams.set("f", "image");

  const response = await fetch(upstream, {
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,*/*" },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Imagery request failed.", status: response.status },
      { status: 502 },
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  const bytes = await response.arrayBuffer();

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      "x-imagery-provider": "USGS NAIP Plus",
      "x-imagery-bbox-epsg-3857": bbox,
    },
  });
}
