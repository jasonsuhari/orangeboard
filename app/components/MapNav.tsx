"use client";
import { useState } from "react";

const NAV_ITEMS = [
  { id: "discover", label: "Discover", icon: "◈" },
  { id: "audience", label: "Audience", icon: "⊙" },
  { id: "creative", label: "Creative", icon: "◇" },
  { id: "simulate", label: "Simulate", icon: "△" },
  { id: "outreach", label: "Outreach", icon: "→" },
] as const;

type NavId = (typeof NAV_ITEMS)[number]["id"];

const TRAP_H = 68;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const DUR = "0.26s";

interface MapNavProps {
  placeMode?: "billboard" | "pedestrian" | null;
  showTraffic?: boolean;
  visionEnabled?: boolean;
  onToggleTraffic?: () => void;
  onToggleVision?: () => void;
  onSpawnBillboard?: () => void;
  onSpawnPedestrian?: () => void;
}

export default function MapNav({
  placeMode = null,
  showTraffic = false,
  visionEnabled = false,
  onToggleTraffic,
  onToggleVision,
  onSpawnBillboard,
  onSpawnPedestrian,
}: MapNavProps) {
  const [active, setActive] = useState<NavId>("discover");
  const [collapsed, setCollapsed] = useState(false);

  const toolBtn = (
    label: string,
    icon: string,
    armed: boolean,
    title: string,
    onClick?: () => void
  ) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        background: armed ? "rgba(249,115,22,0.16)" : "none",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        padding: "4px 8px",
        color: armed ? "#f97316" : "#525252",
        transition: "color 0.15s ease, background 0.15s ease",
      }}
    >
      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
      <span
        style={{
          fontSize: 8.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </button>
  );

  return (
    <>
      {/* Pull-tab handle — toggles the nav; rides the top edge of the trapezoid
          when open and drops to the screen bottom when collapsed. Animated with
          transform only so it composites on the GPU. */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Show navigation" : "Hide navigation"}
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${collapsed ? 0 : -(TRAP_H - 2)}px)`,
          willChange: "transform",
          width: 44,
          height: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.96)",
          border: "1px solid rgba(0, 0, 0, 0.07)",
          borderBottom: "none",
          borderRadius: "8px 8px 0 0",
          cursor: "pointer",
          zIndex: 21,
          boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
          transition: `transform ${DUR} ${EASE}`,
        }}
      >
        <span
          style={{
            fontSize: 10,
            lineHeight: 1,
            color: "#737373",
            transform: collapsed ? "rotate(180deg)" : "none",
            transition: `transform ${DUR} ${EASE}`,
          }}
        >
          ⌄
        </span>
      </button>

      {/* Trapezoidal nav panel — base flush with the very bottom of the screen;
          slides straight down off-screen when collapsed (transform + opacity only). */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: `translateX(-50%) translateY(${collapsed ? TRAP_H + 8 : 0}px)`,
          willChange: "transform, opacity",
          width: 560,
          height: TRAP_H,
          zIndex: 20,
          filter: "drop-shadow(0 -2px 16px rgba(0,0,0,0.09))",
          pointerEvents: "none",
          opacity: collapsed ? 0 : 1,
          transition: `transform ${DUR} ${EASE}, opacity ${DUR} ${EASE}`,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
            background: "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* top rule — clipped to the trapezoid edge */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(0, 0, 0, 0.08)",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              width: "100%",
              paddingLeft: 26,
              paddingRight: 26,
            }}
          >
            {toolBtn(
              "Billboard", "＋▭", placeMode === "billboard",
              "Place a billboard — then click the map (Esc to cancel)",
              onSpawnBillboard
            )}
            {toolBtn(
              "Walker", "＋웃", placeMode === "pedestrian",
              "Place a walker — then click the map (Esc to cancel)",
              onSpawnPedestrian
            )}
            {toolBtn(
              "Traffic", "〰", showTraffic,
              "Toggle the SF foot-traffic flow lines on/off",
              onToggleTraffic
            )}
            {toolBtn(
              "Sight", "FOV", visionEnabled,
              "Toggle pedestrian billboard sightline captures on/off",
              onToggleVision
            )}
            <span style={{ width: 1, height: 30, background: "rgba(0,0,0,0.08)", flexShrink: 0 }} />
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  style={{
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 10px",
                    color: isActive ? "#f97316" : "#737373",
                    transition: "color 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
                  <span
                    style={{
                      fontSize: 8.5,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontFamily: "ui-monospace, 'SF Mono', Consolas, monospace",
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: -4,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "#f97316",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
