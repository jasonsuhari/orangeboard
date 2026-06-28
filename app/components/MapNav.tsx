"use client";
import { useState } from "react";

const TRAP_H = 68;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const DUR = "0.26s";

interface MapNavProps {
  showTraffic?: boolean;
  showJournal?: boolean;
  campaignBusy?: boolean;
  onToggleTraffic?: () => void;
  onToggleJournal?: () => void;
  onOpenCampaign?: () => void;
}

export default function MapNav({
  showTraffic = false,
  showJournal = false,
  campaignBusy = false,
  onToggleTraffic,
  onToggleJournal,
  onOpenCampaign,
}: MapNavProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toolStyle = (armed: boolean) => ({
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 5,
    background: armed ? "rgba(249,115,22,0.16)" : "none",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    padding: "4px 8px",
    color: armed ? "#f97316" : "#525252",
    transition: "color 0.15s ease, background 0.15s ease",
  });

  const toolContent = (label: string, icon: string) => (
    <>
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
    </>
  );

  const toolBtn = (
    label: string,
    icon: string,
    armed: boolean,
    title: string,
    onClick?: () => void,
    disabled = false
  ) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        ...toolStyle(armed),
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.62 : 1,
      }}
    >
      {toolContent(label, icon)}
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
              justifyContent: "center",
              alignItems: "center",
              gap: 36,
              width: "100%",
              paddingLeft: 26,
              paddingRight: 26,
            }}
          >
            {toolBtn(
              "Traffic", "〰", showTraffic,
              "Toggle the SF foot-traffic flow lines on/off",
              onToggleTraffic
            )}
            {toolBtn(
              "Journal", "❏", showJournal,
              "Toggle the pedestrian vision journal on/off",
              onToggleJournal
            )}
            {toolBtn(
              "Campaign", "◎", false,
              "Export campaign PDF",
              onOpenCampaign,
              campaignBusy
            )}
          </div>
        </div>
      </div>
    </>
  );
}
