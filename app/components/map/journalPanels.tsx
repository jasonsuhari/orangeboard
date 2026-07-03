"use client";

import { useState, type CSSProperties } from "react";
import type { AttentionSimResult, CompanyBrief, VlmPerception } from "../../lib/types";
import type { CampaignPedestrianContext, PedestrianProfile } from "../../lib/pedestrianIcp";
import type { PedestrianBillboardCapture } from "../../simulation/pedestrianVision";
import type { Billboard } from "../../lib/billboardModel";
import { journalIconButtonStyle } from "./constants";
import type {
  JournalAgentStatus,
  JournalPage,
  JournalPageStatus,
  PedestrianAgentLog,
} from "./journalTypes";

export function PedestrianCaptureToast({
  capture,
  onClose,
}: {
  capture: PedestrianBillboardCapture;
  onClose: () => void;
}) {
  const name = capture.billboard.label ?? "Billboard";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        top: 16,
        right: 16,
        width: 324,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 45,
        overflow: "hidden",
        borderRadius: 8,
        background: "rgba(15,23,42,0.9)",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.24)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: "#f97316",
            boxShadow: "0 0 14px rgba(249,115,22,0.72)",
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: "#f8fafc",
              fontSize: 13,
              fontWeight: 750,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={name}
          >
            Pedestrian saw {name}
          </div>
          <div
            style={{
              marginTop: 3,
              color: "#94a3b8",
              fontSize: 11,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {Math.round(capture.distanceM)}m away | {capture.angleOffCenterDeg.toFixed(0)} deg off-center
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss pedestrian sightline notification"
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.08)",
            color: "#cbd5e1",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          x
        </button>
      </div>
    </div>
  );
}

export function PedestrianVisionJournal({
  pages,
  activeId,
  onActiveChange,
  onClose,
  onClear,
}: {
  pages: JournalPage[];
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  onClose: () => void;
  onClear: () => void;
}) {
  const active = pages.find((page) => page.id === activeId) ?? pages[0] ?? null;
  const activeIndex = active ? pages.findIndex((page) => page.id === active.id) : -1;
  const pageNumber = activeIndex >= 0 ? pages.length - activeIndex : 0;
  const [journalOverlay, setJournalOverlay] = useState<"clean" | "heatmap" | "eyescan">("heatmap");
  const [streetViewMode, setStreetViewMode] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);

  const move = (delta: number) => {
    if (!active || pages.length < 2) return;
    const nextIndex = Math.max(0, Math.min(pages.length - 1, activeIndex + delta));
    onActiveChange(pages[nextIndex]?.id ?? null);
  };

  const currentImageUrl = active
    ? journalOverlay === "heatmap"
      ? (active.heatmapImageUrl ?? active.imageUrl)
      : journalOverlay === "eyescan"
      ? (active.eyeScanImageUrl ?? active.cleanImageUrl ?? active.imageUrl)
      : (active.cleanImageUrl ?? active.imageUrl)
    : undefined;

  const dialogStyle: CSSProperties = {
    width: "clamp(320px, 70vw, 1120px)",
    height: "clamp(440px, 70vh, 780px)",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 32px)",
    overflow: "hidden",
    borderRadius: 8,
    background: "rgba(255,255,255,0.97)",
    color: "#0f172a",
    boxShadow: "0 24px 70px rgba(0,0,0,0.34)",
    border: "1px solid rgba(226,232,240,0.95)",
    backdropFilter: "blur(14px)",
  };

  const backdropStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    zIndex: 34,
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "rgba(15,23,42,0.18)",
    pointerEvents: "auto",
  };

  // Street-view full-screen mode
  if (streetViewMode && active) {
    return (
      <div style={backdropStyle}>
        <div role="dialog" aria-label="Street view" style={{ ...dialogStyle, position: "relative" }}>
          {currentImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImageUrl}
              alt="Street view"
              style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
              draggable={false}
            />
          ) : (
            <div style={{ display: "grid", height: "100%", placeItems: "center", background: "#0f172a", color: "#cbd5e1", fontSize: 13 }}>
              Building street view...
            </div>
          )}
          <button
            onClick={() => setStreetViewMode(false)}
            aria-label="Exit street view"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: 7,
              border: "none",
              background: "rgba(15,23,42,0.8)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={backdropStyle}>
      <div
        role="dialog"
        aria-label="Vision journal"
        style={{ ...dialogStyle, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "14px 16px",
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 850, color: "#111827" }}>Vision journal</div>
            <div style={{ marginTop: 2, fontSize: 12, fontWeight: 650, color: "#64748b" }}>
              {pages.length ? `Page ${pageNumber} of ${pages.length}` : "Waiting for sightings"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => move(1)} disabled={!active || activeIndex >= pages.length - 1} aria-label="Previous journal page" style={journalIconButtonStyle}>&lt;</button>
            <button onClick={() => move(-1)} disabled={!active || activeIndex <= 0} aria-label="Next journal page" style={journalIconButtonStyle}>&gt;</button>
            <button onClick={onClear} disabled={!pages.length} aria-label="Clear journal" style={{ ...journalIconButtonStyle, width: 52, fontSize: 11 }}>Clear</button>
            <button onClick={onClose} aria-label="Close journal" style={journalIconButtonStyle}>×</button>
          </div>
        </div>

        {/* Body */}
        {!active ? (
          <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24, fontSize: 14, color: "#64748b", lineHeight: 1.45, textAlign: "center" }}>
            Sightline captures will appear here as compact vision pages.
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, padding: 16, overflow: "hidden" }}>
            {/* Left: image pane */}
            <div
              style={{ position: "relative", minHeight: 0, overflow: "hidden", borderRadius: 8, background: "#0f172a", cursor: currentImageUrl ? "zoom-in" : "default" }}
              onMouseEnter={() => setImageHovered(true)}
              onMouseLeave={() => setImageHovered(false)}
              onClick={() => { if (currentImageUrl) setStreetViewMode(true); }}
            >
              {currentImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImageUrl}
                  alt="Projected billboard scene"
                  style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                  draggable={false}
                />
              ) : (
                <div style={{ display: "grid", height: "100%", placeItems: "center", color: "#cbd5e1", fontSize: 13 }}>
                  Building street view...
                </div>
              )}

              {/* Hover overlay — darkens + shows zoom icon */}
              {imageHovered && currentImageUrl && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.42)", borderRadius: 8, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: "#fff", opacity: 0.92 }}>
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M16.5 16.5L21 21M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {/* Status badge */}
              <span style={{ position: "absolute", left: 12, top: 12, borderRadius: 999, background: active.status === "done" ? "rgba(22,163,74,0.88)" : active.status === "error" ? "rgba(220,38,38,0.9)" : "rgba(249,115,22,0.9)", color: "#fff", padding: "5px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0, pointerEvents: "none" }}>
                {journalStatusLabel(active.status)}
              </span>

              {/* Heatmap / Eye scan / Clean buttons */}
              {active.status === "done" && (
                <div
                  style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(["heatmap", "eyescan", "clean"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setJournalOverlay(mode)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "none",
                        background: journalOverlay === mode ? "rgba(249,115,22,0.92)" : "rgba(15,23,42,0.72)",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        backdropFilter: "blur(4px)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {mode === "heatmap" ? "Heatmap" : mode === "eyescan" ? "Eye scan" : "Clean"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: details pane — non-scrollable */}
            <div style={{ minHeight: 0, overflow: "hidden", padding: "2px 4px 2px 0", display: "flex", flexDirection: "column" }}>
              <div style={{ color: "#111827", fontSize: 18, fontWeight: 850, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }} title={active.capture.billboard.label ?? "Billboard"}>
                {active.capture.billboard.label ?? "Billboard"}
              </div>
              <div style={{ marginTop: 4, color: "#64748b", fontSize: 13, fontWeight: 650, flexShrink: 0 }}>
                {Math.round(active.capture.distanceM)}m away | {active.capture.angleOffCenterDeg.toFixed(0)} deg off-center
              </div>
              <JournalProfileCard
                profile={active.profile}
                profileId={active.profileId}
                agent={active.agent}
                agentStatus={active.agentStatus}
                agentError={active.agentError}
              />

              {active.result && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 12, flexShrink: 0 }}>
                    <JournalMetric label="Seen" value={`${active.result.street?.noticedBy ?? 0}/${active.result.street?.total ?? 0}`} />
                    <JournalMetric
                      label="Notice"
                      value={active.result.street?.timeToNoticeMs !== null && active.result.street?.timeToNoticeMs !== undefined
                        ? `${(active.result.street.timeToNoticeMs / 1000).toFixed(1)}s`
                        : "miss"}
                    />
                    <JournalMetric label="Recall" value={String(active.result.scores.recall)} />
                  </div>
                  <p style={{ margin: "10px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.5, overflow: "hidden" }}>
                    {active.result.verdict}
                  </p>
                </>
              )}
              {active.error && (
                <p style={{ margin: "12px 0 0", color: "#b91c1c", fontSize: 13, lineHeight: 1.5 }}>
                  {active.error}
                </p>
              )}
              {!active.result && !active.error && (
                <p style={{ margin: "12px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                  {active.status === "analyzing" ? "Running street-scene vision..." : "Projecting the creative into Street View..."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JournalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "10px 12px" }}>
      <div style={{ color: "#64748b", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0 }}>
        {label}
      </div>
      <div style={{ marginTop: 3, color: "#0f172a", fontSize: 20, fontWeight: 850, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

export function BillboardBuyingFacts({ billboard }: { billboard: Billboard }) {
  // At-a-glance highlights — the numbers a buyer scans for first.
  const highlights = [
    { label: "Est. CPM", value: billboard.estimatedCpm },
    { label: "Availability", value: billboard.availability },
    { label: "Format", value: billboard.format },
  ].filter((h) => h.value);

  const facts = [
    ["Owner / seller", billboard.seller],
    ["Dimensions", billboard.dimensions],
    ["Facing", billboard.facing],
    ["Rate card", billboard.rateCard],
    ["Media", `${billboard.mediaType}; ${billboard.lighting}`],
    ["Restrictions", billboard.restrictions],
    ["Booking contact", billboard.bookingContact],
  ].filter(([, value]) => value);

  return (
    <div style={{ marginTop: 14 }}>
      {highlights.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${highlights.length}, 1fr)`,
            gap: 8,
            marginBottom: 12,
          }}
        >
          {highlights.map((h) => (
            <div
              key={h.label}
              style={{
                borderRadius: 12,
                border: "1px solid #fee5d3",
                background: "linear-gradient(180deg, #fffaf5, #fff7ed)",
                padding: "10px 11px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  color: "#9a6b4d",
                  fontSize: 9.5,
                  fontWeight: 850,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {h.label}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: "#0f172a",
                  fontSize: 13,
                  fontWeight: 800,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={h.value}
              >
                {h.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff", overflow: "hidden" }}>
        <div style={{ padding: "11px 13px", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden style={{ color: "#ea580c" }}>
              <rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div style={{ color: "#111827", fontSize: 13, fontWeight: 800 }}>Buying data</div>
          </div>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 11, lineHeight: 1.35 }}>
            Estimated from permit metadata; confirm before purchase.
          </div>
        </div>
        <dl style={{ margin: 0, padding: "4px 13px 8px" }}>
          {facts.map(([label, value], i) => (
            <div
              key={label}
              style={{
                display: "grid",
                gridTemplateColumns: "104px 1fr",
                gap: 12,
                fontSize: 11.5,
                lineHeight: 1.4,
                padding: "8px 0",
                borderTop: i === 0 ? "none" : "1px solid #f4f4f5",
              }}
            >
              <dt style={{ color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.2 }}>{label}</dt>
              <dd style={{ margin: 0, color: "#334155", fontWeight: 550 }}>{value}</dd>
            </div>
          ))}
        </dl>
        {billboard.purchaseUrl && (
          <a
            href={billboard.purchaseUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              margin: "0 13px 13px",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid #fed7aa",
              background: "#fff7ed",
              color: "#c2410c",
              fontSize: 12,
              fontWeight: 750,
              textDecoration: "none",
            }}
          >
            Open permit record
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

function getInitials(label: string): string {
  const words = label.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function profileAvatarColor(profileId: string): string {
  const palette = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b", "#06b6d4"];
  let h = 0;
  for (let i = 0; i < profileId.length; i++) h = (h * 31 + profileId.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function JournalProfileCard({
  profile,
  profileId,
  agent,
  agentStatus,
  agentError,
}: {
  profile: PedestrianProfile;
  profileId: string;
  agent?: PedestrianAgentLog;
  agentStatus?: JournalAgentStatus;
  agentError?: string;
}) {
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const avatarColor = profileAvatarColor(profileId);
  const initials = getInitials(profile.label);

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 8,
        background: profile.isIcp ? "#fff7ed" : "#f8fafc",
        border: profile.isIcp ? "1px solid #fed7aa" : "1px solid #e2e8f0",
        padding: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Avatar */}
        <div style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: avatarColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 13,
          fontWeight: 800,
          boxShadow: `0 2px 8px ${avatarColor}55`,
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: profile.isIcp ? "#c2410c" : "#64748b", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: 0 }}>
            Pedestrian profile
          </div>
          <div style={{ marginTop: 3, color: "#111827", fontSize: 14, fontWeight: 850, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.label}
          </div>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 11, fontWeight: 650 }}>
            fit {profile.fitScore}/100
          </div>
        </div>

        {/* Chat button */}
        <button
          onClick={() => setShowChat((v) => !v)}
          style={{
            flexShrink: 0,
            padding: "4px 10px",
            borderRadius: 6,
            border: showChat ? "1px solid #f97316" : "1px solid #e2e8f0",
            background: showChat ? "#fff7ed" : "#fff",
            color: showChat ? "#f97316" : "#64748b",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Chat
        </button>
      </div>

      {profile.reason && (
        <div style={{ marginTop: 8, color: "#334155", fontSize: 12, lineHeight: 1.4 }}>
          {profile.reason}
        </div>
      )}

      {/* Inline chat panel */}
      {showChat && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${profile.isIcp ? "#fed7aa" : "#e2e8f0"}`, paddingTop: 10 }}>
          {agentStatus === "thinking" ? (
            <div style={{ color: "#94a3b8", fontSize: 12, fontStyle: "italic", padding: "4px 0" }}>
              {agent?.displayName ?? profile.label} is thinking...
            </div>
          ) : agent?.chatMessage ? (
            <div style={{ background: "rgba(15,23,42,0.05)", borderRadius: 6, padding: "8px 10px", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>
                {agent.displayName ?? profile.label}
              </div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
                {agent.chatMessage}
              </div>
            </div>
          ) : agentError ? (
            <div style={{ color: "#b91c1c", fontSize: 12, padding: "4px 0" }}>{agentError}</div>
          ) : null}

          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Reply..."
              style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, color: "#0f172a", outline: "none" }}
            />
            <button
              style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "#f97316", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function journalStatusLabel(status: JournalPageStatus): string {
  if (status === "rendering") return "Projecting";
  if (status === "analyzing") return "Vision";
  if (status === "error") return "Failed";
  return "Logged";
}

export function pedestrianProfileAgentId(pedestrianId: string, profile: PedestrianProfile): string {
  const raw = [
    pedestrianId,
    profile.source,
    profile.role,
    profile.businessName,
    profile.company,
    profile.fitScore,
  ].filter(Boolean).join("|");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `ped-${(hash >>> 0).toString(36)}`;
}

export async function requestPedestrianAgentLog({
  agentId,
  profile,
  capture,
  perception,
  result,
  campaignContext,
}: {
  agentId: string;
  profile: PedestrianProfile;
  capture: PedestrianBillboardCapture;
  perception: VlmPerception;
  result: AttentionSimResult;
  campaignContext: CampaignPedestrianContext | null;
}): Promise<PedestrianAgentLog> {
  const response = await fetch("/api/pedestrian-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId,
      profile,
      capture,
      perception,
      result,
      campaignContext,
    }),
  });
  const payload = (await response.json()) as { agent?: PedestrianAgentLog; error?: string };
  if (!response.ok || !payload.agent) {
    throw new Error(payload.error ?? "Pedestrian agent request failed.");
  }
  return payload.agent;
}

export function MapBriefPanel({
  brief,
  briefUrl,
  briefStatus,
  briefError,
  onUrlChange,
  onGenerate,
  onReset,
}: {
  brief: CompanyBrief | null;
  briefUrl: string;
  briefStatus: "idle" | "reading" | "generating" | "done" | "error";
  briefError: string | null;
  onUrlChange: (v: string) => void;
  onGenerate: (url: string) => void;
  onReset: () => void;
}) {
  const busy = briefStatus === "reading" || briefStatus === "generating";

  if (brief) {
    const primary =
      brief.visualSystem.primaryColor && /^#[0-9a-fA-F]{6}$/i.test(brief.visualSystem.primaryColor)
        ? brief.visualSystem.primaryColor
        : "#F97316";
    return (
      <div style={{ marginBottom: 14, borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ padding: "10px 13px", background: primary }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)", marginBottom: 3 }}>
            Creative brief
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
            {brief.identity.companyName}
          </div>
          {brief.identity.tagline && (
            <div style={{ marginTop: 3, fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
              &ldquo;{brief.identity.tagline}&rdquo;
            </div>
          )}
          <div style={{ marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
            {brief.identity.industry}
          </div>
        </div>
        <div style={{ padding: "10px 13px", background: "#fff" }}>
          {brief.campaign.coreMessage && (
            <div style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: "#94a3b8", marginBottom: 2 }}>Core message</div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.4 }}>{brief.campaign.coreMessage}</div>
            </div>
          )}
          {brief.campaign.callToAction && (
            <div style={{ marginBottom: 7 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: "#94a3b8", marginBottom: 2 }}>Call to action</div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.4 }}>{brief.campaign.callToAction}</div>
            </div>
          )}
          {brief.audience.description && (
            <div style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: "#94a3b8", marginBottom: 2 }}>Audience</div>
              <div style={{ fontSize: 12, color: "#334155", lineHeight: 1.4 }}>{brief.audience.description}</div>
            </div>
          )}
          {(brief.identity.brandAdjectives?.length ?? 0) > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {brief.identity.brandAdjectives.slice(0, 4).map((a) => (
                <span key={a} style={{ borderRadius: 999, padding: "3px 8px", fontSize: 10.5, fontWeight: 600, background: `${primary}1a`, color: primary }}>
                  {a}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={onReset}
            style={{ marginTop: 10, fontSize: 10, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
          >
            Change brand
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14, borderRadius: 12, border: "1px solid #e5e7eb", padding: "12px 13px", background: "#fafafa" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#f97316", marginBottom: 6 }}>
        Generate creative
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.4 }}>
        Enter your company URL to generate a billboard creative for this sign.
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onGenerate(briefUrl); }}
        style={{ display: "flex", gap: 6 }}
      >
        <input
          value={briefUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="yourcompany.com"
          disabled={busy}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 12,
            outline: "none",
            background: "#fff",
            color: "#0f172a",
          }}
        />
        <button
          type="submit"
          disabled={busy || !briefUrl.trim()}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "none",
            background: "#f97316",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            cursor: busy || !briefUrl.trim() ? "not-allowed" : "pointer",
            opacity: busy || !briefUrl.trim() ? 0.5 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {briefStatus === "reading" ? "Reading…" : briefStatus === "generating" ? "Generating…" : "Go"}
        </button>
      </form>
      {briefError && (
        <div style={{ marginTop: 8, fontSize: 11, color: "#b91c1c", lineHeight: 1.4 }}>
          {briefError}
        </div>
      )}
    </div>
  );
}
