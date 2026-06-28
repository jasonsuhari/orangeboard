import type { CSSProperties } from "react";

export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";
export type TimeBand = "morning" | "day" | "evening" | "night";

export type CurrentConditions = {
  ok: true;
  source: "open-meteo";
  fetchedAt: string;
  timezone: string;
  utcOffsetSeconds: number;
  localTime: string | null;
  isDay: boolean;
  temperatureC: number | null;
  humidityPercent: number | null;
  precipitationMm: number;
  rainMm: number;
  showersMm: number;
  snowfallCm: number;
  weatherCode: number;
  weatherKind: WeatherKind;
  weatherLabel: string;
  cloudCoverPercent: number;
  windSpeedKmh: number | null;
};

export type ConditionsMeta =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ok"; data: CurrentConditions };

export type EnvironmentLook = {
  streetFilter: string;
  creativeFilter: string;
  creativeOpacity: number;
  billboardShadow: string;
  band: TimeBand;
  wet: boolean;
  foggy: boolean;
  backdropStyle?: CSSProperties;
  frontStyle?: CSSProperties;
  rainStyle?: CSSProperties;
};

export const BASE_BILLBOARD_SHADOW =
  "0 0 0 2px rgba(0,0,0,0.35), 0 8px 30px rgba(0,0,0,0.45)";

function localHourMinute(localTime: string | null): { hour: number; minute: number } | null {
  const match = localTime?.match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return Number.isFinite(hour) && Number.isFinite(minute) ? { hour, minute } : null;
}

export function timeBand(conditions: CurrentConditions): TimeBand {
  if (!conditions.isDay) return "night";
  const hm = localHourMinute(conditions.localTime);
  if (!hm) return "day";
  if (hm.hour < 9) return "morning";
  if (hm.hour >= 17) return "evening";
  return "day";
}

function localTimeLabel(conditions: CurrentConditions): string | null {
  const hm = localHourMinute(conditions.localTime);
  if (!hm) return null;
  const suffix = hm.hour >= 12 ? "PM" : "AM";
  const hour = hm.hour % 12 || 12;
  return `${hour}:${String(hm.minute).padStart(2, "0")} ${suffix}`;
}

export function conditionsLabel(conditions: CurrentConditions): string {
  const time = localTimeLabel(conditions);
  const temp = conditions.temperatureC === null
    ? null
    : `${Math.round((conditions.temperatureC * 9) / 5 + 32)}F`;
  return [conditions.weatherLabel, temp, time].filter(Boolean).join(" | ");
}

export async function fetchCurrentConditions(lat: number, lng: number): Promise<CurrentConditions> {
  const res = await fetch(`/api/current-conditions?lat=${lat}&lng=${lng}`);
  const json = await res.json();
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error ?? "Current conditions unavailable");
  }
  return json as CurrentConditions;
}

export function environmentLook(conditions: CurrentConditions | null): EnvironmentLook {
  if (!conditions) {
    return {
      streetFilter: "",
      creativeFilter: "",
      creativeOpacity: 1,
      billboardShadow: BASE_BILLBOARD_SHADOW,
      band: "day",
      wet: false,
      foggy: false,
    };
  }

  const band = timeBand(conditions);
  const kind = conditions.weatherKind;
  const wet =
    kind === "rain" ||
    kind === "storm" ||
    kind === "snow" ||
    conditions.precipitationMm > 0 ||
    conditions.rainMm > 0 ||
    conditions.showersMm > 0;
  const foggy = kind === "fog" || (conditions.humidityPercent ?? 0) >= 88;
  const overcast = kind === "cloudy" || conditions.cloudCoverPercent >= 70;

  let streetFilter = "";
  let creativeFilter = "";
  let creativeOpacity = 1;
  let billboardShadow = BASE_BILLBOARD_SHADOW;
  let backdropStyle: CSSProperties | undefined;

  if (band === "night") {
    streetFilter = "brightness(0.46) contrast(1.12) saturate(0.76)";
    creativeFilter = "brightness(1.16) contrast(1.08) saturate(1.08)";
    billboardShadow =
      "0 0 0 2px rgba(0,0,0,0.42), 0 8px 28px rgba(0,0,0,0.52), 0 0 34px rgba(255,190,92,0.34)";
    backdropStyle = {
      background:
        "linear-gradient(180deg, rgba(6,12,28,0.46), rgba(7,13,26,0.24) 48%, rgba(3,7,18,0.5))",
      mixBlendMode: "multiply",
    };
  } else if (band === "morning") {
    streetFilter = "brightness(1.04) contrast(1.02) saturate(1.02) sepia(0.05)";
    creativeFilter = "brightness(1.02) saturate(1.02)";
    backdropStyle = {
      background: "linear-gradient(135deg, rgba(255,204,143,0.18), rgba(255,255,255,0) 58%)",
    };
  } else if (band === "evening") {
    streetFilter = "brightness(0.92) contrast(1.04) saturate(0.95) sepia(0.08)";
    creativeFilter = "brightness(0.96) contrast(1.02) saturate(0.96)";
    backdropStyle = {
      background: "linear-gradient(135deg, rgba(255,155,92,0.2), rgba(29,40,65,0.16) 68%)",
    };
  }

  if (overcast && !wet && !foggy && band !== "night") {
    streetFilter = "brightness(0.88) contrast(0.98) saturate(0.82)";
    creativeFilter = "brightness(0.94) contrast(0.98) saturate(0.88)";
    creativeOpacity = 0.98;
    backdropStyle = {
      background: "linear-gradient(180deg, rgba(117,130,148,0.18), rgba(255,255,255,0.04))",
    };
  }

  if (wet) {
    streetFilter = band === "night"
      ? "brightness(0.38) contrast(1.08) saturate(0.68)"
      : "brightness(0.76) contrast(0.92) saturate(0.68)";
    creativeFilter = band === "night"
      ? "brightness(1.04) contrast(1.06) saturate(0.92)"
      : "brightness(0.88) contrast(0.98) saturate(0.82)";
    creativeOpacity = band === "night" ? 0.96 : 0.92;
    billboardShadow =
      "0 0 0 2px rgba(0,0,0,0.38), 0 8px 26px rgba(0,0,0,0.5), 0 0 22px rgba(255,255,255,0.12)";
  } else if (foggy) {
    streetFilter = "brightness(0.82) contrast(0.78) saturate(0.56)";
    creativeFilter = "brightness(0.9) contrast(0.88) saturate(0.76)";
    creativeOpacity = 0.86;
  }

  const frontGradients: string[] = [];
  if (foggy) {
    frontGradients.push(
      "linear-gradient(180deg, rgba(238,242,245,0.32), rgba(238,242,245,0.12) 54%, rgba(238,242,245,0.24))"
    );
  }
  if (wet) {
    frontGradients.push(
      "linear-gradient(0deg, rgba(214,232,255,0.18), rgba(214,232,255,0.02) 32%, rgba(255,255,255,0) 62%)"
    );
  }

  return {
    streetFilter,
    creativeFilter,
    creativeOpacity,
    billboardShadow,
    band,
    wet,
    foggy,
    backdropStyle,
    frontStyle: frontGradients.length
      ? {
          background: frontGradients.join(","),
          backdropFilter: foggy ? "blur(1.4px)" : undefined,
        }
      : undefined,
    rainStyle: wet
      ? {
          opacity: kind === "storm" ? 0.36 : 0.22,
          backgroundImage:
            "repeating-linear-gradient(108deg, rgba(255,255,255,0) 0 9px, rgba(255,255,255,0.34) 10px, rgba(255,255,255,0) 13px)",
          transform: "skewX(-10deg)",
        }
      : undefined,
  };
}
