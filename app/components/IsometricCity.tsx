"use client";

import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CSSProperties } from "react";
import { BELT_DUR_S, BELT_RING, BELT_SLOTS, PLATE_D, PLATE_W, TILE_W, U, V, pts, px } from "./city/iso";
import { Plate } from "./city/street";
import { TileGround, TileProps } from "./city/tiles";

/* ── Isometric city treadmill ────────────────────────────────────────────
   The slab stays fixed while the city rides a closed conveyor loop: a ring
   of BELT_RING seeded blocks (tiles.tsx) slides in -gx across the plate.
   A block that slips off the far corner travels "around the back" under
   the slab and re-emerges over the near rim two steps later — the same
   city looping forever, nothing regenerates or resets. Flat ground is
   clipped to the plate top so streets shear crisply at the rim; buildings
   fade at the edges instead (a 2D clip would leave tall tower tops
   floating after their base left the plate).

   Motion is a rAF loop writing two CSS vars — when the offset wraps a tile
   width, the ring rotation commits via flushSync in the same tick, so the
   snap and the re-slot paint together and no seam is ever visible. */

const SPEED = TILE_W / BELT_DUR_S; // grid units per second

const BELT_STYLE: CSSProperties = {
  transform: "translate(var(--belt-x, 0px), var(--belt-y, 0px))",
  willChange: "transform",
};

const slotTransform = (slot: number) => `translate(${slot * TILE_W * U} ${slot * TILE_W * V})`;

/* slot 0 slides off the far edge; the last slot slides in over the near
   rim. TileProps splits each into staggered west/east fade windows. */
const fadeFor = (slot: number): "in" | "out" | undefined =>
  slot === 0 ? "out" : slot === BELT_SLOTS - 1 ? "in" : undefined;

export default function IsometricCity({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const clipId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const offsetRef = useRef(0);
  /* head = which ring tile currently occupies slot 0. The visible window is
     the ring-consecutive run head..head+SLOTS-1, so each rotation drops the
     head tile and appends the next — surviving tiles keep their DOM (and
     their running pedestrian/signal animations) untouched. */
  const [head, setHead] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 250);
      last = now;
      offsetRef.current += (SPEED * dt) / 1000;
      if (offsetRef.current >= TILE_W) {
        offsetRef.current -= TILE_W;
        flushSync(() => setHead((h) => (h + 1) % BELT_RING));
      }
      const el = svgRef.current;
      if (el) {
        el.style.setProperty("--belt-x", `${(-offsetRef.current * U).toFixed(2)}px`);
        el.style.setProperty("--belt-y", `${(-offsetRef.current * V).toFixed(2)}px`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const belt = Array.from({ length: BELT_SLOTS }, (_, slot) => ({
    slot,
    index: (head + slot) % BELT_RING,
  }));

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1200 880"
      className={className}
      style={{ ...style, "--belt-dur": `${BELT_DUR_S}s` } as CSSProperties}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <polygon points={pts(px(0, 0), px(PLATE_W, 0), px(PLATE_W, PLATE_D), px(0, PLATE_D))} />
        </clipPath>
      </defs>
      <g transform="translate(600 250)">
        <Plate />
        {/* ground belt — clipped so streets shear at the plate rim */}
        <g clipPath={`url(#${clipId})`}>
          <g style={BELT_STYLE}>
            {belt.map((t) => (
              <g key={t.index} transform={slotTransform(t.slot)}>
                <TileGround index={t.index} />
              </g>
            ))}
          </g>
        </g>
        {/* prop belt — buildings, greenery, pedestrians; fades at the rims */}
        <g style={BELT_STYLE}>
          {belt.map((t) => (
            <g key={t.index} transform={slotTransform(t.slot)}>
              <TileProps index={t.index} fade={fadeFor(t.slot)} />
            </g>
          ))}
        </g>
      </g>
    </svg>
  );
}
