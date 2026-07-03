"use client";

import "./onboarding/onboarding.css";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CompanyBrief } from "../lib/types";
import type { Opportunity as ApiOpportunity } from "../api/opportunities/route";
import {
  STATIC_OPPORTUNITIES,
  withPolygons,
  type OpportunityWithPolygon,
} from "../lib/opportunityBlobs";
import {
  buildCampaignPedestrianContext,
  PEDESTRIAN_CONTEXT_STORAGE_KEY,
} from "../lib/pedestrianIcp";
import {
  CAMPAIGN_BLOB_KEY,
  CAMPAIGN_LAUNCH_KEY,
  MASCOTS,
  SCAN_LINES,
  type CreativeResult,
  type Phase,
} from "./onboarding/constants";
import { buildFallbackBrief, extractDomain, persistCreative } from "./onboarding/briefHelpers";
import ReviewStep from "./onboarding/steps/ReviewStep";
import ZoneDetailStep from "./onboarding/steps/ZoneDetailStep";

/* Game-tutorial onboarding: the Peel mascot stands bottom-left with a speech
   bubble over the live map, walking the user through three steps:
   1. your site -> 2. your kit (brief + creative) -> 3. your zone (tap a blob).
   Step 3 hands the map itself over to the user: the blobs render inside Map.tsx
   (see onboardingBlobs) and taps flow back in through selectedZoneId. */

export default function OnboardingDialog({
  onComplete,
  onZonesChange,
  selectedZoneId,
  onSelectZone,
}: {
  onComplete: () => void;
  /** Reports the fetched opportunity blobs up so the map can render them. */
  onZonesChange: (zones: OpportunityWithPolygon[] | null) => void;
  selectedZoneId: string | null;
  onSelectZone: (id: string | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>("ask");
  const [website, setWebsite] = useState("");
  const [brief, setBrief] = useState<CompanyBrief | null>(null);
  const [creative, setCreative] = useState<CreativeResult | null>(null);
  const [creativePending, setCreativePending] = useState(false);
  const [zones, setZones] = useState<OpportunityWithPolygon[] | null>(null);
  // Bumped on every scout/rescan so stale async results from a previous run
  // can't overwrite the current one.
  const runIdRef = useRef(0);
  // Set when the user edits the brief in review, so the zones fetch re-runs
  // against the edited version.
  const briefDirtyRef = useRef(false);

  const selectedZone =
    phase === "zones" && zones && selectedZoneId
      ? zones.find((zone) => zone.id === selectedZoneId) ?? null
      : null;
  const selectedZoneIndex =
    selectedZone && zones ? zones.findIndex((zone) => zone.id === selectedZone.id) : -1;
  const selectedZonePosition =
    selectedZoneIndex >= 0 && zones ? `${selectedZoneIndex + 1} of ${zones.length}` : "";
  const selectedZoneBusinesses = selectedZone?.matchedBusinesses ?? [];

  useEffect(() => {
    if (phase === "zones") onZonesChange(zones);
  }, [phase, zones, onZonesChange]);

  function startCreative(nextBrief: CompanyBrief, runId: number) {
    if (nextBrief.media?.imageUrl) {
      setCreative({ imageUrl: nextBrief.media.imageUrl, source: nextBrief.media.source });
      persistCreative(nextBrief, nextBrief.media.imageUrl, nextBrief.media.source);
      return;
    }
    setCreativePending(true);
    fetch("/api/generate-creative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: nextBrief }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { imageUrl?: string; source?: string } | null) => {
        if (runIdRef.current !== runId || !payload?.imageUrl) return;
        const source = payload.source ?? "openai";
        setCreative({ imageUrl: payload.imageUrl, source });
        persistCreative(nextBrief, payload.imageUrl, source);
      })
      .catch(() => {})
      .finally(() => {
        if (runIdRef.current === runId) setCreativePending(false);
      });
  }

  function startZones(nextBrief: CompanyBrief, runId: number) {
    fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextBrief),
      signal: AbortSignal.timeout(20_000),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { opportunities?: ApiOpportunity[] } | null) => {
        if (runIdRef.current !== runId) return;
        const list = payload?.opportunities;
        setZones(list?.length ? withPolygons(list) : STATIC_OPPORTUNITIES);
      })
      .catch(() => {
        if (runIdRef.current === runId) setZones(STATIC_OPPORTUNITIES);
      });
  }

  async function handleScout(event: FormEvent) {
    event.preventDefault();
    if (!website.trim() || phase === "scanning") return;

    const runId = ++runIdRef.current;
    setPhase("scanning");
    const start = Date.now();
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 16000);

    let nextBrief: CompanyBrief;
    try {
      const response = await fetch("/api/company-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
        signal: controller.signal,
      });
      const payload = (await response.json()) as { brief?: CompanyBrief; error?: string };
      if (!response.ok || !payload.brief) throw new Error(payload.error || "Could not analyze");
      nextBrief = payload.brief;
    } catch {
      nextBrief = buildFallbackBrief(website);
    } finally {
      window.clearTimeout(timeoutId);
    }

    if (runIdRef.current !== runId) return;
    setBrief(nextBrief);
    startCreative(nextBrief, runId);
    startZones(nextBrief, runId);

    // Hold the scan screen long enough for the checklist beat to land.
    const remaining = Math.max(0, 3400 - (Date.now() - start));
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
    if (runIdRef.current === runId) setPhase("review");
  }

  function handleRescan() {
    runIdRef.current++;
    briefDirtyRef.current = false;
    setBrief(null);
    setCreative(null);
    setCreativePending(false);
    setZones(null);
    onZonesChange(null);
    onSelectZone(null);
    setPhase("ask");
  }

  function patchBrief(patch: (current: CompanyBrief) => CompanyBrief) {
    briefDirtyRef.current = true;
    setBrief((current) => (current ? patch(current) : current));
  }

  function handleRepaint() {
    if (!brief || creativePending) return;
    setCreative(null);
    // Drop any cached media so the API regenerates from the edited brief.
    startCreative({ ...brief, media: undefined }, runIdRef.current);
  }

  function handleShowZones() {
    if (!brief) return;
    try {
      localStorage.setItem("orangeboard:brief", JSON.stringify(brief));
    } catch { /* ignore storage failures */ }
    if (briefDirtyRef.current) {
      briefDirtyRef.current = false;
      setZones(null);
      startZones(brief, runIdRef.current);
    }
    setPhase("zones");
  }

  function handleLaunch() {
    if (!brief || !selectedZone) return;
    try {
      localStorage.setItem("orangeboard:brief", JSON.stringify(brief));
      localStorage.setItem("vs:brief", JSON.stringify(brief));
      if (creative) persistCreative(brief, creative.imageUrl, creative.source);
      localStorage.setItem(CAMPAIGN_BLOB_KEY, JSON.stringify(selectedZone.polygon));
      localStorage.setItem(
        PEDESTRIAN_CONTEXT_STORAGE_KEY,
        JSON.stringify(
          buildCampaignPedestrianContext({
            companyName: brief.identity.companyName,
            icp: brief.audience.description,
            opportunity: selectedZone,
          }),
        ),
      );
      // A stale landing-page launch would hijack the camera toward its old board.
      localStorage.removeItem(CAMPAIGN_LAUNCH_KEY);
    } catch { /* ignore storage failures */ }
    setPhase("launching");
    window.location.assign("/map?campaign=1");
  }

  function selectAdjacentZone(direction: -1 | 1) {
    if (!zones?.length) return;
    const baseIndex = selectedZoneIndex >= 0 ? selectedZoneIndex : direction === 1 ? -1 : 0;
    const nextZone = zones[(baseIndex + direction + zones.length) % zones.length];
    if (nextZone) onSelectZone(nextZone.id);
  }

  const blocking = phase === "ask" || phase === "scanning" || phase === "review";
  const step = phase === "ask" ? 1 : phase === "scanning" || phase === "review" ? 2 : 3;
  const stepName = step === 1 ? "Your site" : step === 2 ? "Your kit" : "Your zone";

  const mascot =
    phase === "ask" ? MASCOTS.wave
    : phase === "scanning" ? MASCOTS.search
    : phase === "review" ? MASCOTS.celebrate
    : phase === "launching" ? MASCOTS.run
    : selectedZone ? MASCOTS.map
    : zones ? MASCOTS.point
    : MASCOTS.search;

  return (
    <div className={`pob ${blocking ? "pob-blocking" : "pob-hud"} pob-phase-${phase}`}>
      <div className="pob-dim" aria-hidden />

      <div className="pob-stage">
        {/* Every pose stays mounted so swaps are instant. A lazy remount left
            the scout step characterless while its PNG streamed in. */}
        <div className="pob-mascot" aria-hidden>
          {Object.values(MASCOTS).map((src) => (
            <div key={src} className={`pob-mascot-pose ${src === mascot ? "pob-mascot-on" : ""}`}>
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 150px, 300px"
                style={{ objectFit: "contain", objectPosition: "bottom" }}
                priority
              />
            </div>
          ))}
        </div>

        <section
          role="dialog"
          aria-modal={blocking}
          aria-labelledby="pob-title"
          className="pob-bubble"
        >
          <header className="pob-header">
            <span className="pob-eyebrow">
              Step {step} of 3 / {stepName}
            </span>
            <span className="pob-dots" aria-hidden>
              {[1, 2, 3].map((n) => (
                <span key={n} className={`pob-dot ${n <= step ? "pob-dot-on" : ""}`} />
              ))}
            </span>
            {phase !== "launching" && (
              <button type="button" className="pob-skip" onClick={onComplete}>
                Skip
              </button>
            )}
          </header>

          <div aria-live="polite">
            {phase === "ask" && (
              <>
                <h2 id="pob-title" className="pob-title">Hey boss! What are we advertising?</h2>
                <p className="pob-body">
                  Drop your company&apos;s website. I&apos;ll read it and build your campaign kit.
                </p>
                <form onSubmit={handleScout} className="pob-form">
                  <input
                    value={website}
                    onChange={(event) => setWebsite(event.target.value)}
                    placeholder="https://ramp.com"
                    inputMode="url"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    aria-label="Company website"
                    className="pob-input"
                  />
                  <button type="submit" disabled={!website.trim()} className="pob-btn pob-btn-primary">
                    Build my kit
                  </button>
                </form>
              </>
            )}

            {phase === "scanning" && (
              <>
                <h2 id="pob-title" className="pob-title">Scouting {extractDomain(website)}...</h2>
                <div className="pob-scan">
                  {SCAN_LINES.map((line, index) => (
                    <div key={line} className="pob-scan-row" style={{ animationDelay: `${index * 0.55}s` }}>
                      <span className="pob-pulse" />
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {phase === "review" && brief && (
              <ReviewStep
                brief={brief}
                creative={creative}
                creativePending={creativePending}
                onRepaint={handleRepaint}
                onShowZones={handleShowZones}
                onRescan={handleRescan}
                patchBrief={patchBrief}
              />
            )}

            {phase === "zones" && !zones && (
              <>
                <h2 id="pob-title" className="pob-title">Scouting the city...</h2>
                <p className="pob-body">Marking the zones where your buyers cluster.</p>
              </>
            )}

            {phase === "zones" && zones && !selectedZone && (
              <>
                <h2 id="pob-title" className="pob-title">Pick your zone</h2>
                <p className="pob-body">
                  Each glowing blob is a cluster of your buyers. Pick one to inspect the matching businesses.
                </p>
                <div className="pob-zone-list">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      className="pob-zone-chip"
                      onClick={() => onSelectZone(zone.id)}
                    >
                      <span className="pob-zone-name">{zone.title}</span>
                      <b>{zone.score}</b>
                    </button>
                  ))}
                </div>
              </>
            )}

            {phase === "zones" && selectedZone && (
              <ZoneDetailStep
                zone={selectedZone}
                position={selectedZonePosition}
                businesses={selectedZoneBusinesses}
                onSelectAdjacent={selectAdjacentZone}
                onSelectZone={onSelectZone}
                onLaunch={handleLaunch}
              />
            )}

            {phase === "launching" && (
              <>
                <h2 id="pob-title" className="pob-title">Rolling out!</h2>
                <p className="pob-body">
                  Packing the creative and heading to {selectedZone?.area ?? "your zone"}...
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
