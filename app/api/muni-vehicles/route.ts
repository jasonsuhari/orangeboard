import { NextResponse } from "next/server";
import type { MuniVehicle } from "@/app/lib/trafficSim";

export const revalidate = 30; // ISR cache: hit 511.org/NextBus at most once per 30s

const SF = { minLat: 37.70, maxLat: 37.82, minLng: -122.52, maxLng: -122.35 };

// NextBus/Umo public feed — no API key required.
// Returns all SF Muni vehicles updated in the last 15 minutes (t=0).
const NEXTBUS_URL =
  "https://retro.umoiq.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t=0";

// 511.org SIRI JSON — richer data, requires free API key.
// Used when MUNI_511_API_KEY env var is set.
const SIRI_URL = (key: string) =>
  `https://api.511.org/transit/VehicleMonitoring?agency=SF&api_key=${key}&Format=JSON`;

function inSF(lat: number, lng: number): boolean {
  return lat >= SF.minLat && lat <= SF.maxLat && lng >= SF.minLng && lng <= SF.maxLng;
}

// ── NextBus XML parser (no external deps) ────────────────────────────────────

function parseNextBusXML(xml: string): MuniVehicle[] {
  const vehicles: MuniVehicle[] = [];
  // Match all <vehicle .../> elements
  const vehicleRe = /<vehicle\s+([^>]+?)\/>/g;
  const attrRe = /(\w+)="([^"]*)"/g;

  let vm: RegExpExecArray | null;
  while ((vm = vehicleRe.exec(xml)) !== null) {
    const attrs: Record<string, string> = {};
    let am: RegExpExecArray | null;
    const attrStr = vm[1];
    const re = new RegExp(attrRe.source, "g");
    while ((am = re.exec(attrStr)) !== null) {
      attrs[am[1]] = am[2];
    }

    const lat = parseFloat(attrs.lat ?? "");
    const lon = parseFloat(attrs.lon ?? "");
    const heading = parseFloat(attrs.heading ?? "0");

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (!inSF(lat, lon)) continue;

    vehicles.push({
      id: attrs.id ?? attrs.vehicle_id ?? String(Math.random()),
      lng: lon,
      lat,
      route: attrs.routeTag ?? attrs.dirTag?.split("_")[0] ?? "?",
      bearing: (heading * Math.PI) / 180, // degrees CW from N → radians
    });
  }
  return vehicles;
}

// ── 511.org SIRI JSON parser ──────────────────────────────────────────────────

function parseSIRI(data: Record<string, unknown>): MuniVehicle[] {
  try {
    const activities = (
      (data as any)?.Siri?.ServiceDelivery
        ?.VehicleMonitoringDelivery?.[0]
        ?.VehicleActivity ?? []
    ) as any[];

    return activities.flatMap((a: any) => {
      const j = a?.MonitoredVehicleJourney;
      if (!j) return [];
      const lat = parseFloat(j.VehicleLocation?.Latitude ?? "");
      const lng = parseFloat(j.VehicleLocation?.Longitude ?? "");
      const bearing = parseFloat(j.Bearing ?? "0");
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      if (!inSF(lat, lng)) return [];
      return [{
        id: String(j.VehicleRef ?? Math.random()),
        lng,
        lat,
        route: String(j.LineRef ?? "?"),
        bearing: (bearing * Math.PI) / 180,
      }] satisfies MuniVehicle[];
    });
  } catch {
    return [];
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const apiKey = process.env.MUNI_511_API_KEY;

  try {
    if (apiKey) {
      // Prefer 511.org when key is available
      const res = await fetch(SIRI_URL(apiKey), {
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const data = await res.json();
        const vehicles = parseSIRI(data as Record<string, unknown>);
        if (vehicles.length > 0) return NextResponse.json(vehicles);
      }
    }

    // Fall back to (or primary-use) NextBus XML
    const res = await fetch(NEXTBUS_URL, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return NextResponse.json([]);
    const xml = await res.text();
    return NextResponse.json(parseNextBusXML(xml));
  } catch {
    // Always return 200 with empty array — client falls back to synthetic buses
    return NextResponse.json([]);
  }
}
