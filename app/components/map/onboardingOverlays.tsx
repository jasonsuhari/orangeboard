"use client";

import { useEffect, useState } from "react";
import type mapboxgl from "mapbox-gl";
import { djb2, offsetPoint, type OpportunityWithPolygon } from "../../lib/opportunityBlobs";

export type OnboardingBusinessPin = {
  id: string;
  zoneId: string;
  zoneTitle: string;
  name: string;
  type: string;
  reason: string;
  lng: number;
  lat: number;
};

export type OnboardingCamera = {
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

function finiteLngLat(value: { lng?: number; lat?: number }): value is { lng: number; lat: number } {
  return Number.isFinite(value.lng) && Number.isFinite(value.lat);
}

export function buildOnboardingBusinessPins(blobs: OpportunityWithPolygon[] | null): OnboardingBusinessPin[] {
  if (!blobs?.length) return [];

  const seenAtCoordinate = new globalThis.Map<string, number>();
  const pins: OnboardingBusinessPin[] = [];

  for (const zone of blobs) {
    zone.matchedBusinesses.forEach((business, index) => {
      const seededFallback = offsetPoint(
        zone.centroid,
        Math.min(190, Math.max(55, zone.radiusM * 0.34)),
        djb2(`${zone.id}:${business.name}:${index}`) * Math.PI * 2,
      );
      const base = finiteLngLat(business)
        ? { lng: business.lng, lat: business.lat }
        : { lng: seededFallback[0], lat: seededFallback[1] };
      const coordinateKey = `${base.lng.toFixed(5)},${base.lat.toFixed(5)}`;
      const duplicateIndex = seenAtCoordinate.get(coordinateKey) ?? 0;
      seenAtCoordinate.set(coordinateKey, duplicateIndex + 1);
      const coordinate = duplicateIndex === 0
        ? [base.lng, base.lat]
        : offsetPoint(
            base,
            14 + (duplicateIndex % 5) * 7,
            (duplicateIndex * 2.399963229728653) % (Math.PI * 2),
          );

      pins.push({
        id: `${zone.id}:${business.name}:${index}`,
        zoneId: zone.id,
        zoneTitle: zone.title,
        name: business.name,
        type: business.type,
        reason: business.reason,
        lng: coordinate[0],
        lat: coordinate[1],
      });
    });
  }

  return pins;
}

// Onboarding zone labels — DOM chips projected onto the blob centroids (the
// interleaved deck overlay doesn't render TextLayer reliably, and DOM chips can
// double as tap targets). Same map.project()-on-move pattern as the other
// DOM overlays.
export function OnboardingBlobLabels({
  map,
  blobs,
  selectedId,
  onSelect,
}: {
  map: mapboxgl.Map | null;
  blobs: OpportunityWithPolygon[] | null;
  selectedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const [points, setPoints] = useState<
    { id: string; title: string; score: number; x: number; y: number }[]
  >([]);

  useEffect(() => {
    if (!map || !blobs || blobs.length === 0) {
      setPoints([]);
      return;
    }

    let frameId: number | null = null;

    const update = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const canvas = map.getCanvas();
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        setPoints(
          blobs
            .map((o) => {
              const point = map.project([o.centroid.lng, o.centroid.lat]);
              return { id: o.id, title: o.title, score: o.score, x: point.x, y: point.y };
            })
            .filter(
              (p) =>
                Number.isFinite(p.x) && Number.isFinite(p.y) &&
                p.x > -90 && p.x < width + 90 && p.y > -40 && p.y < height + 40,
            ),
        );
      });
    };

    update();
    map.on("move", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("resize", update);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [map, blobs]);

  return (
    <>
      {points.map((p) => {
        const isSelected = p.id === selectedId;
        const showLabel = Boolean(selectedId && isSelected);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect?.(p.id)}
            aria-label={p.title}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transform: showLabel
                ? `translate(${p.x}px, ${p.y}px) translate(-50%, -140%)`
                : `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`,
              zIndex: 40,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "center",
              width: showLabel ? "auto" : 24,
              height: showLabel ? "auto" : 24,
              padding: showLabel ? "6px 12px" : 0,
              borderRadius: 999,
              border: "2.5px solid #431407",
              background: isSelected ? "#F97316" : "#FFF9EE",
              color: isSelected ? "#FFFFFF" : "#431407",
              font: "800 12.5px 'Nunito', 'Quicksand', ui-rounded, system-ui, sans-serif",
              whiteSpace: "nowrap",
              cursor: "pointer",
              boxShadow: "0 3px 0 #431407, 0 8px 18px rgba(20,9,2,0.35)",
            }}
          >
            {showLabel ? (
              <>
                <span style={{ maxWidth: 210, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title}
                </span>
                <b style={{ fontWeight: 900, color: "#FFEDD5" }}>{p.score}</b>
              </>
            ) : (
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: "#F97316" }} />
            )}
          </button>
        );
      })}
    </>
  );
}

export function OnboardingBusinessLabels({
  map,
  pins,
  selectedZoneId,
  onSelectZone,
}: {
  map: mapboxgl.Map | null;
  pins: OnboardingBusinessPin[];
  selectedZoneId: string | null;
  onSelectZone?: (id: string) => void;
}) {
  const [points, setPoints] = useState<
    { id: string; zoneId: string; name: string; type: string; x: number; y: number }[]
  >([]);

  useEffect(() => {
    if (!map || pins.length === 0 || !selectedZoneId) {
      setPoints([]);
      return;
    }

    let frameId: number | null = null;

    const update = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        const canvas = map.getCanvas();
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        setPoints(
          pins
            .filter((pin) => pin.zoneId === selectedZoneId)
            .map((pin) => {
              const point = map.project([pin.lng, pin.lat]);
              return { id: pin.id, zoneId: pin.zoneId, name: pin.name, type: pin.type, x: point.x, y: point.y };
            })
            .filter(
              (p) =>
                Number.isFinite(p.x) && Number.isFinite(p.y) &&
                p.x > -150 && p.x < width + 150 && p.y > -50 && p.y < height + 50,
            ),
        );
      });
    };

    update();
    map.on("move", update);
    map.on("resize", update);
    return () => {
      map.off("move", update);
      map.off("resize", update);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [map, pins, selectedZoneId]);

  return (
    <>
      {points.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelectZone?.(p.zoneId)}
          title={`${p.name} - ${p.type}`}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate(${p.x}px, ${p.y}px) translate(12px, -50%)`,
            zIndex: 38,
            maxWidth: 190,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            padding: "4px 8px",
            borderRadius: 999,
            border: "2px solid #1E3A8A",
            background: "rgba(239,246,255,0.96)",
            color: "#172554",
            font: "800 10.5px 'Nunito', 'Quicksand', ui-rounded, system-ui, sans-serif",
            cursor: "pointer",
            boxShadow: "0 2px 0 #1E3A8A, 0 8px 16px rgba(15,23,42,0.28)",
          }}
        >
          {p.name}
        </button>
      ))}
    </>
  );
}
