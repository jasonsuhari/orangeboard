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

const BEZEL_H = 26;
const TRAP_H = 68;

export default function MapNav() {
  const [active, setActive] = useState<NavId>("discover");

  return (
    <>
      {/* Bezel — full-width white strip anchored to the very bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: BEZEL_H,
          background: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(0, 0, 0, 0.07)",
          zIndex: 20,
          pointerEvents: "none",
        }}
      />

      {/* Trapezoidal nav panel — sits directly on top of the bezel */}
      <div
        style={{
          position: "absolute",
          bottom: BEZEL_H,
          left: "50%",
          transform: "translateX(-50%)",
          width: 560,
          height: TRAP_H,
          zIndex: 20,
          filter: "drop-shadow(0 -2px 16px rgba(0,0,0,0.09))",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
            background: "rgba(255, 255, 255, 0.94)",
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
              width: "100%",
              paddingLeft: 52,
              paddingRight: 52,
            }}
          >
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
