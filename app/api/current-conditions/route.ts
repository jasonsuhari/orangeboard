import { NextRequest, NextResponse } from "next/server";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

type OpenMeteoCurrent = {
  time?: string;
  temperature_2m?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  rain?: number;
  showers?: number;
  snowfall?: number;
  weather_code?: number;
  cloud_cover?: number;
  wind_speed_10m?: number;
  is_day?: number;
};

type OpenMeteoResponse = {
  timezone?: string;
  utc_offset_seconds?: number;
  current?: OpenMeteoCurrent;
};

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "Current weather";
}

function weatherKind(code: number): WeatherKind {
  if (code === 45 || code === 48) return "fog";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 1 && code <= 3) return "cloudy";
  return "clear";
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "lat/lng out of range" }, { status: 400 });
  }

  const params = new URLSearchParams({
    latitude: lat.toFixed(5),
    longitude: lng.toFixed(5),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "is_day",
    ].join(","),
    timezone: "auto",
  });

  let data: OpenMeteoResponse;
  try {
    const res = await fetch(`${FORECAST_URL}?${params.toString()}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Weather request failed: ${res.status}` },
        { status: 502 }
      );
    }

    data = (await res.json()) as OpenMeteoResponse;
  } catch {
    return NextResponse.json({ error: "Weather request failed" }, { status: 502 });
  }

  const current = data.current;
  if (!current) {
    return NextResponse.json(
      { error: "Weather response missing current conditions" },
      { status: 502 }
    );
  }

  const code = finiteOrNull(current?.weather_code) ?? 0;
  const kind = weatherKind(code);

  return NextResponse.json(
    {
      ok: true,
      source: "open-meteo",
      fetchedAt: new Date().toISOString(),
      timezone: data.timezone ?? "UTC",
      utcOffsetSeconds: finiteOrNull(data.utc_offset_seconds) ?? 0,
      localTime: current?.time ?? null,
      isDay: current?.is_day === 1,
      temperatureC: finiteOrNull(current?.temperature_2m),
      humidityPercent: finiteOrNull(current?.relative_humidity_2m),
      precipitationMm: finiteOrNull(current?.precipitation) ?? 0,
      rainMm: finiteOrNull(current?.rain) ?? 0,
      showersMm: finiteOrNull(current?.showers) ?? 0,
      snowfallCm: finiteOrNull(current?.snowfall) ?? 0,
      weatherCode: code,
      weatherKind: kind,
      weatherLabel: weatherLabel(code),
      cloudCoverPercent: finiteOrNull(current?.cloud_cover) ?? (kind === "clear" ? 0 : 80),
      windSpeedKmh: finiteOrNull(current?.wind_speed_10m),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
      },
    }
  );
}
