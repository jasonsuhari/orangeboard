import { NextRequest, NextResponse } from "next/server";
import { fetchCampaignBuildings } from "@/app/lib/buildings";

type CampaignBuildingsRequest = {
  center?: { lng?: number; lat?: number };
  radiusKm?: number;
  polygon?: [number, number][];
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CampaignBuildingsRequest;
    const lng = body.center?.lng;
    const lat = body.center?.lat;
    const radiusKm = body.radiusKm;

    if (
      typeof lng !== "number" ||
      typeof lat !== "number" ||
      typeof radiusKm !== "number" ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      !Number.isFinite(radiusKm)
    ) {
      return NextResponse.json({ error: "center.lng, center.lat, and radiusKm are required" }, { status: 400 });
    }

    const clampedRadiusKm = Math.max(0.2, Math.min(1.75, radiusKm));
    const polygon = Array.isArray(body.polygon) && body.polygon.length >= 3 ? body.polygon : undefined;
    const buildings = await fetchCampaignBuildings({ lng, lat }, clampedRadiusKm, polygon);

    return NextResponse.json({ buildings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load campaign buildings";
    console.error("/api/campaign-buildings error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
