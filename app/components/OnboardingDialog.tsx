"use client";

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

/* Game-tutorial onboarding: the Peel mascot stands bottom-left with a speech
   bubble over the live map, walking the user through three steps:
   1. your site -> 2. your kit (brief + creative) -> 3. your zone (tap a blob).
   Step 3 hands the map itself over to the user: the blobs render inside Map.tsx
   (see onboardingBlobs) and taps flow back in through selectedZoneId. */

type Phase = "ask" | "scanning" | "review" | "zones" | "launching";

const MASCOTS = {
  wave: "/characters/orange-character-01-wave.png",
  run: "/characters/orange-character-02-run.png",
  map: "/characters/orange-character-03-map.png",
  point: "/characters/orange-character-04-point.png",
  search: "/characters/orange-character-06-search.png",
  celebrate: "/characters/orange-character-08-celebrate.png",
} as const;

const SCAN_LINES = [
  "Reading your homepage",
  "Profiling your buyers",
  "Writing your billboard message",
  "Painting your creative",
  "Scouting the city",
];

const CAMPAIGN_BLOB_KEY = "orangeboard:campaign-blob";
const CAMPAIGN_LAUNCH_KEY = "orangeboard:campaign-launch";

type CreativeResult = { imageUrl: string; source: string };

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
              <>
                <h2 id="pob-title" className="pob-title">Your campaign kit is ready!</h2>
                <p className="pob-body pob-review-body">Fix anything that reads wrong. This brief drives everything.</p>
                <div className="pob-kit pob-book">
                  <div className="pob-book-spine" aria-hidden />
                  <section className="pob-book-page pob-book-page-left" aria-label="Creative brief">
                    <div className="pob-page-head">
                      <span className="pob-page-kicker">Creative brief</span>
                      <button
                        type="button"
                        onClick={handleRepaint}
                        disabled={creativePending}
                        className="pob-btn pob-btn-mini"
                      >
                        {creativePending ? "Painting..." : "Repaint"}
                      </button>
                    </div>
                    <div className="pob-creative">
                      {creative ? (
                        // Data-URL creatives can't go through next/image.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={creative.imageUrl} alt="Generated billboard creative" />
                      ) : (
                        <span className="pob-creative-wait">
                          {creativePending ? "Painting your billboard..." : "Billboard creative unavailable"}
                        </span>
                      )}
                    </div>
                    <div className="pob-kit-grid">
                      <div className="pob-field">
                        <label htmlFor="pob-company">Company</label>
                        <input
                          id="pob-company"
                          className="pob-edit pob-edit-name"
                          value={brief.identity.companyName}
                          onChange={(e) =>
                            patchBrief((b) => ({
                              ...b,
                              identity: { ...b.identity, companyName: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="pob-field">
                        <label htmlFor="pob-cta">Call to action</label>
                        <input
                          id="pob-cta"
                          className="pob-edit"
                          value={brief.campaign.callToAction ?? ""}
                          placeholder="Book a demo"
                          onChange={(e) =>
                            patchBrief((b) => ({
                              ...b,
                              campaign: { ...b.campaign, callToAction: e.target.value },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="pob-field">
                      <label htmlFor="pob-message">Billboard message</label>
                      <textarea
                        id="pob-message"
                        className="pob-edit pob-edit-message"
                        rows={2}
                        value={brief.campaign.coreMessage}
                        onChange={(e) =>
                          patchBrief((b) => ({
                            ...b,
                            campaign: { ...b.campaign, coreMessage: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="pob-field">
                      <label htmlFor="pob-mandatories">Creative direction</label>
                      <textarea
                        id="pob-mandatories"
                        className="pob-edit pob-edit-list"
                        rows={3}
                        value={listToTextarea(brief.strategy?.creativeMandatories)}
                        onChange={(e) =>
                          patchBrief((b) => ({
                            ...b,
                            strategy: {
                              ...(b.strategy ?? {}),
                              creativeMandatories: textareaToList(e.target.value),
                            },
                          }))
                        }
                      />
                    </div>
                  </section>
                  <section className="pob-book-page pob-book-page-right" aria-label="ICP">
                    <div className="pob-page-head">
                      <span className="pob-page-kicker">ICP</span>
                    </div>
                    <div className="pob-field">
                      <label htmlFor="pob-audience">Audience</label>
                      <textarea
                        id="pob-audience"
                        className="pob-edit pob-edit-audience"
                        rows={3}
                        value={brief.audience.description}
                        onChange={(e) =>
                          patchBrief((b) => ({
                            ...b,
                            audience: { ...b.audience, description: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="pob-field">
                      <label htmlFor="pob-positioning">Positioning</label>
                      <textarea
                        id="pob-positioning"
                        className="pob-edit pob-edit-compact"
                        rows={2}
                        value={brief.strategy?.positioning ?? ""}
                        onChange={(e) =>
                          patchBrief((b) => ({
                            ...b,
                            strategy: { ...(b.strategy ?? {}), positioning: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="pob-field">
                      <label htmlFor="pob-promise">Promise</label>
                      <textarea
                        id="pob-promise"
                        className="pob-edit pob-edit-compact"
                        rows={2}
                        value={brief.strategy?.customerPromise ?? ""}
                        onChange={(e) =>
                          patchBrief((b) => ({
                            ...b,
                            strategy: { ...(b.strategy ?? {}), customerPromise: e.target.value },
                          }))
                        }
                      />
                    </div>
                    {(brief.identity.brandAdjectives?.length ?? 0) > 0 && (
                      <div className="pob-chips">
                        {brief.identity.brandAdjectives.slice(0, 4).map((adjective) => (
                          <span key={adjective} className="pob-chip">{adjective}</span>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
                <div className="pob-actions pob-review-actions">
                  <button type="button" onClick={handleShowZones} className="pob-btn pob-btn-primary">
                    Show my zones
                  </button>
                  <button type="button" onClick={handleRescan} className="pob-btn pob-btn-ghost">
                    Rescan
                  </button>
                </div>
              </>
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
              <>
                <div className="pob-zone-detail-head">
                  <button
                    type="button"
                    className="pob-zone-nav"
                    onClick={() => selectAdjacentZone(-1)}
                    aria-label="Previous zone"
                  >
                    &lt;
                  </button>
                  <div className="pob-zone-title-wrap">
                    <span className="pob-zone-counter">{selectedZonePosition}</span>
                    <h2 id="pob-title" className="pob-title">{selectedZone.title}</h2>
                    <p className="pob-meta">{selectedZone.area} / {selectedZone.timing}</p>
                  </div>
                  <button
                    type="button"
                    className="pob-zone-nav"
                    onClick={() => selectAdjacentZone(1)}
                    aria-label="Next zone"
                  >
                    &gt;
                  </button>
                </div>
                <p className="pob-body">{selectedZone.summary}</p>
                <div className="pob-stats">
                  <div className="pob-stat">
                    <b>{selectedZone.accounts}</b>
                    <span>Accounts</span>
                  </div>
                  <div className="pob-stat">
                    <b>{selectedZone.placements}</b>
                    <span>Placements</span>
                  </div>
                  <div className="pob-stat">
                    <b>{selectedZone.score}</b>
                    <span>Fit score</span>
                  </div>
                </div>
                {selectedZoneBusinesses.length > 0 && (
                  <div className="pob-business-panel">
                    <div className="pob-business-heading">
                      <span>Business locations</span>
                      <b>{selectedZoneBusinesses.length}</b>
                    </div>
                    <div className="pob-business-list">
                      {selectedZoneBusinesses.map((business, index) => (
                        <button
                          key={`${selectedZone.id}:${business.name}:${index}`}
                          type="button"
                          className="pob-business-row"
                          onClick={() => onSelectZone(selectedZone.id)}
                        >
                          <span className="pob-business-pin" aria-hidden />
                          <span className="pob-business-main">
                            <span className="pob-business-name">{business.name}</span>
                            <span className="pob-business-meta">
                              {(business.type || "Business")} - {business.reason}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pob-actions">
                  <button type="button" onClick={handleLaunch} className="pob-btn pob-btn-primary">
                    Launch campaign here
                  </button>
                </div>
              </>
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

      <style>{`
        .pob {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          pointer-events: none;
          color: #431407;
          font-family: "Nunito", "Quicksand", "Outfit", "Fredoka", ui-rounded, system-ui, sans-serif;
        }

        .pob-dim {
          position: absolute;
          inset: 0;
          transition: background 400ms ease;
        }

        .pob-blocking .pob-dim {
          pointer-events: auto;
          background: radial-gradient(120% 120% at 50% 32%, rgba(20,9,2,0.22) 0%, rgba(20,9,2,0.60) 100%);
        }

        .pob-hud .pob-dim {
          pointer-events: none;
          background: linear-gradient(180deg, rgba(20,9,2,0) 58%, rgba(20,9,2,0.52) 100%);
        }

        .pob-stage {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: flex-end;
          padding: 0 20px 14px 6px;
          pointer-events: none;
        }

        .pob-mascot {
          position: relative;
          flex-shrink: 0;
          width: clamp(150px, 24vw, 290px);
          height: clamp(170px, 27vw, 320px);
          filter: drop-shadow(0 14px 18px rgba(20,9,2,0.45));
          animation: pob-float 4.6s ease-in-out infinite;
        }

        .pob-mascot-pose {
          position: absolute;
          inset: 0;
          opacity: 0;
          pointer-events: none;
        }

        .pob-mascot-on {
          opacity: 1;
          animation: pob-pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.35) both;
        }

        .pob-bubble {
          position: relative;
          pointer-events: auto;
          width: min(540px, 100%);
          max-height: calc(100dvh - 96px);
          overflow-y: auto;
          margin-left: -4px;
          margin-bottom: clamp(48px, 8vw, 104px);
          background: #FFF9EE;
          border: 3px solid #431407;
          border-radius: 22px;
          padding: 16px 20px 20px;
          box-shadow: 0 8px 0 rgba(67,20,7,0.30), 0 26px 48px rgba(20,9,2,0.42);
          animation: pob-pop 0.42s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
        }

        .pob-bubble::after {
          content: "";
          position: absolute;
          left: -13px;
          bottom: 34px;
          width: 22px;
          height: 22px;
          background: #FFF9EE;
          border-left: 3px solid #431407;
          border-bottom: 3px solid #431407;
          transform: rotate(45deg);
        }

        .pob-hud .pob-bubble {
          width: min(430px, 100%);
          padding: 14px 18px 16px;
        }

        .pob-phase-review .pob-stage {
          top: 0;
          align-items: center;
          justify-content: center;
          padding: 14px;
        }

        .pob-phase-review .pob-mascot {
          position: absolute;
          left: 26px;
          top: 22px;
          z-index: 3;
          width: clamp(72px, 11vw, 92px);
          height: clamp(80px, 12vw, 104px);
          opacity: 0.98;
          animation: pob-float 4.6s ease-in-out infinite;
        }

        .pob-phase-review .pob-bubble {
          z-index: 2;
          width: min(720px, calc(100vw - 28px));
          max-height: calc(100dvh - 12px);
          overflow-y: auto;
          margin: 0;
          padding: 13px 16px 14px;
        }

        .pob-phase-review .pob-bubble::after {
          content: none;
        }

        .pob-phase-review .pob-header,
        .pob-phase-review .pob-title,
        .pob-phase-review .pob-review-body {
          padding-left: 84px;
        }

        .pob-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pob-eyebrow {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #C2410C;
        }

        .pob-dots {
          display: inline-flex;
          gap: 4px;
        }

        .pob-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          border: 2px solid #431407;
          background: transparent;
        }

        .pob-dot-on {
          background: #F97316;
        }

        .pob-skip {
          margin-left: auto;
          border: 0;
          background: none;
          padding: 2px 4px;
          color: rgba(122,45,18,0.62);
          font: inherit;
          font-size: 12.5px;
          font-weight: 800;
          text-decoration: underline;
          cursor: pointer;
        }

        .pob-skip:hover {
          color: #7C2D12;
        }

        .pob-title {
          margin: 8px 0 0;
          font-size: clamp(19px, 2.4vw, 25px);
          font-weight: 900;
          line-height: 1.18;
          letter-spacing: -0.01em;
        }

        .pob-body {
          margin: 7px 0 0;
          font-size: 14.5px;
          font-weight: 650;
          line-height: 1.45;
          color: #7C2D12;
        }

        .pob-review-body {
          margin-top: 5px;
          font-size: 13.5px;
          line-height: 1.32;
        }

        .pob-meta {
          margin: 4px 0 0;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #C2410C;
        }

        .pob-form {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }

        .pob-input {
          width: 100%;
          min-height: 52px;
          border: 3px solid #431407;
          border-radius: 14px;
          background: #FFFFFF;
          padding: 0 16px;
          font: inherit;
          font-size: 16px;
          font-weight: 750;
          color: #431407;
          box-shadow: inset 0 3px 0 rgba(67,20,7,0.10);
          outline: none;
        }

        .pob-input::placeholder {
          color: rgba(180,83,9,0.55);
        }

        .pob-input:focus-visible {
          outline: 3px solid rgba(249,115,22,0.55);
          outline-offset: 2px;
        }

        .pob-btn {
          font: inherit;
          font-weight: 900;
          border-radius: 14px;
          cursor: pointer;
          transition: transform 90ms ease, box-shadow 90ms ease, filter 90ms ease;
        }

        .pob-btn-primary {
          min-height: 52px;
          padding: 0 22px;
          font-size: 15.5px;
          color: #fff;
          text-shadow: 0 1px 0 rgba(120,38,3,0.45);
          background: linear-gradient(180deg, #FB923C 0%, #F97316 55%, #EA580C 100%);
          border: 3px solid #431407;
          box-shadow: 0 5px 0 #431407, 0 12px 22px rgba(20,9,2,0.30);
        }

        .pob-btn-primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .pob-btn-primary:active:not(:disabled) {
          transform: translateY(4px);
          box-shadow: 0 1px 0 #431407, 0 6px 12px rgba(20,9,2,0.25);
        }

        .pob-btn-primary:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .pob-btn-ghost {
          min-height: 44px;
          padding: 0 16px;
          font-size: 13px;
          color: #7C2D12;
          background: #FFEDD5;
          border: 3px solid #431407;
          box-shadow: 0 4px 0 #431407;
        }

        .pob-btn-ghost:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #431407;
        }

        .pob-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
        }

        .pob-review-actions {
          justify-content: space-between;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 2px solid rgba(67,20,7,0.12);
        }

        .pob-review-actions .pob-btn-primary {
          min-height: 42px;
          padding: 0 18px;
        }

        .pob-review-actions .pob-btn-ghost {
          min-height: 38px;
        }

        .pob-scan {
          display: grid;
          gap: 11px;
          margin-top: 14px;
          padding: 14px 16px;
          background: #FFFFFF;
          border: 3px solid #431407;
          border-radius: 14px;
          box-shadow: inset 0 3px 0 rgba(67,20,7,0.08);
        }

        .pob-scan-row {
          display: flex;
          align-items: center;
          gap: 11px;
          font-size: 14.5px;
          font-weight: 750;
          opacity: 0;
          animation: pob-fade-up 0.35s ease forwards;
        }

        .pob-pulse {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #F97316;
          box-shadow: 0 0 0 0 rgba(249,115,22,0.45);
          animation: pob-pulse-dot 1.4s ease-in-out infinite;
        }

        .pob-kit {
          margin-top: 12px;
          padding: 14px;
          background: #FFFFFF;
          border: 3px solid #431407;
          border-radius: 16px;
          box-shadow: inset 0 3px 0 rgba(67,20,7,0.08);
        }

        .pob-phase-review .pob-kit {
          margin-top: 10px;
          padding: 0;
          background: transparent;
          box-shadow: none;
        }

        .pob-book {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          overflow: hidden;
          border-radius: 15px;
          background: #E7B66E;
          box-shadow: inset 0 2px 0 rgba(255,255,255,0.45), 0 4px 0 rgba(67,20,7,0.22);
          isolation: isolate;
        }

        .pob-book::before,
        .pob-book::after {
          content: "";
          position: absolute;
          top: 8px;
          bottom: 8px;
          width: 46%;
          pointer-events: none;
          z-index: 3;
        }

        .pob-book::before {
          left: 8px;
          border-radius: 11px 4px 4px 11px;
          box-shadow: inset -16px 0 18px rgba(67,20,7,0.08);
        }

        .pob-book::after {
          right: 8px;
          border-radius: 4px 11px 11px 4px;
          box-shadow: inset 16px 0 18px rgba(67,20,7,0.08);
        }

        .pob-book-spine {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          z-index: 4;
          width: 20px;
          transform: translateX(-50%);
          background:
            linear-gradient(90deg, rgba(67,20,7,0.16), rgba(255,249,238,0.44) 45%, rgba(67,20,7,0.22));
          box-shadow: 0 0 0 2px rgba(67,20,7,0.10), 0 0 26px rgba(67,20,7,0.18);
          pointer-events: none;
        }

        .pob-book-page {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 10px 14px 11px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0) 44%),
            #FFF8EA;
        }

        .pob-book-page-left {
          border-right: 1px solid rgba(67,20,7,0.14);
          padding-right: 18px;
        }

        .pob-book-page-right {
          border-left: 1px solid rgba(255,255,255,0.55);
          padding-left: 18px;
        }

        .pob-page-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 26px;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #C2410C;
        }

        .pob-page-kicker {
          display: inline-flex;
        }

        .pob-page-head .pob-btn-mini {
          min-height: 25px;
          padding: 0 8px;
          border-width: 2px;
          border-radius: 9px;
          font-size: 10.5px;
          box-shadow: 0 2px 0 #431407;
        }

        .pob-creative {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border: 3px solid #431407;
          border-radius: 12px;
          background: linear-gradient(110deg, #FFEDD5 30%, #FFE1BC 45%, #FFEDD5 60%);
          background-size: 220% 100%;
          animation: pob-shimmer 1.6s linear infinite;
          display: grid;
          place-items: center;
        }

        .pob-book .pob-creative {
          aspect-ratio: auto;
          height: clamp(60px, 14dvh, 78px);
          min-height: 0;
          margin-bottom: 6px;
          border-width: 2.5px;
          border-radius: 11px;
        }

        .pob-creative img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pob-creative-wait {
          font-size: 13px;
          font-weight: 800;
          color: #C2410C;
        }

        .pob-kit-cols {
          display: grid;
          grid-template-columns: minmax(214px, 0.84fr) minmax(0, 1.16fr);
          gap: 12px;
          align-items: stretch;
        }

        .pob-kit-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .pob-strategy-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .pob-field {
          margin-bottom: 6px;
        }

        .pob-field label {
          display: block;
          margin-bottom: 3px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #C2410C;
        }

        .pob-edit {
          width: 100%;
          border: 2px solid rgba(67,20,7,0.30);
          border-radius: 10px;
          background: #FFFDF7;
          min-height: 34px;
          padding: 5px 8px;
          font: inherit;
          font-size: 12.5px;
          font-weight: 700;
          line-height: 1.28;
          color: #431407;
          outline: none;
          transition: border-color 120ms ease;
        }

        .pob-edit:hover {
          border-color: rgba(67,20,7,0.55);
        }

        .pob-edit:focus-visible {
          border-color: #F97316;
          outline: 2px solid rgba(249,115,22,0.40);
          outline-offset: 1px;
        }

        textarea.pob-edit {
          resize: none;
          overflow: hidden;
          field-sizing: content;
        }

        .pob-book textarea.pob-edit {
          field-sizing: fixed;
        }

        .pob-edit-name {
          font-size: 15px;
          font-weight: 900;
        }

        .pob-edit-message {
          min-height: 44px;
        }

        .pob-edit-audience {
          min-height: 62px;
        }

        .pob-edit-compact {
          min-height: 47px;
        }

        .pob-edit-list {
          min-height: 54px;
        }

        .pob-book .pob-edit-message {
          height: 42px;
          min-height: 42px;
        }

        .pob-book .pob-edit-audience {
          height: 58px;
          min-height: 58px;
        }

        .pob-book .pob-edit-compact {
          height: 45px;
          min-height: 45px;
        }

        .pob-book .pob-edit-list {
          height: 50px;
          min-height: 50px;
        }

        .pob-repaint-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-height: 31px;
          margin-top: 5px;
          margin-bottom: 5px;
        }

        .pob-hint {
          font-size: 10.5px;
          font-weight: 750;
          color: rgba(124,45,18,0.65);
        }

        .pob-btn-mini {
          min-height: 32px;
          padding: 0 11px;
          font-size: 11.5px;
          color: #7C2D12;
          background: #FFEDD5;
          border: 2.5px solid #431407;
          border-radius: 10px;
          box-shadow: 0 3px 0 #431407;
        }

        .pob-btn-mini:active:not(:disabled) {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #431407;
        }

        .pob-btn-mini:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .pob-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: auto;
          padding-top: 4px;
        }

        .pob-chip {
          padding: 4px 10px;
          border: 2.5px solid #431407;
          border-radius: 999px;
          background: #FFEDD5;
          font-size: 11.5px;
          font-weight: 800;
        }

        .pob-zone-list {
          display: grid;
          gap: 7px;
          margin-top: 10px;
        }

        .pob-zone-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          min-height: 40px;
          padding: 7px 12px;
          border: 2.5px solid #431407;
          border-radius: 12px;
          background: #FFEDD5;
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          text-align: left;
          color: #431407;
          cursor: pointer;
          box-shadow: 0 3px 0 #431407;
          transition: transform 90ms ease, box-shadow 90ms ease;
        }

        .pob-zone-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pob-zone-chip:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #431407;
        }

        .pob-zone-chip b {
          color: #EA580C;
          font-weight: 900;
        }

        .pob-zone-detail-head {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) 42px;
          align-items: center;
          gap: 10px;
          margin-top: 4px;
        }

        .pob-zone-title-wrap {
          min-width: 0;
          text-align: center;
        }

        .pob-zone-detail-head .pob-title {
          margin-top: 2px;
        }

        .pob-zone-counter {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 22px;
          padding: 2px 10px;
          border: 2px solid #431407;
          border-radius: 999px;
          background: #FFEDD5;
          color: #C2410C;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .pob-zone-nav {
          width: 42px;
          height: 42px;
          border: 2.5px solid #431407;
          border-radius: 12px;
          background: #FFFFFF;
          color: #431407;
          font: inherit;
          font-size: 24px;
          font-weight: 900;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 3px 0 #431407;
          transition: transform 90ms ease, box-shadow 90ms ease, background 120ms ease;
        }

        .pob-zone-nav:hover {
          background: #FFEDD5;
        }

        .pob-zone-nav:focus-visible {
          outline: 3px solid rgba(249,115,22,0.55);
          outline-offset: 2px;
        }

        .pob-zone-nav:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #431407;
        }

        .pob-business-panel {
          margin-top: 12px;
          padding: 10px;
          border: 2.5px solid #431407;
          border-radius: 14px;
          background: #FFFFFF;
          box-shadow: inset 0 3px 0 rgba(67,20,7,0.08);
        }

        .pob-business-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #C2410C;
        }

        .pob-business-heading b {
          display: inline-grid;
          min-width: 28px;
          height: 22px;
          place-items: center;
          border-radius: 999px;
          background: #DBEAFE;
          color: #1D4ED8;
          letter-spacing: 0;
        }

        .pob-business-list {
          display: grid;
          gap: 7px;
          max-height: min(28dvh, 220px);
          overflow-y: auto;
          margin-top: 8px;
          padding-right: 2px;
        }

        .pob-business-row {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-width: 0;
          border: 0;
          border-radius: 10px;
          background: #EFF6FF;
          padding: 7px 8px;
          color: #172554;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .pob-business-row:hover {
          background: #DBEAFE;
        }

        .pob-business-pin {
          flex: 0 0 auto;
          width: 11px;
          height: 11px;
          border: 2px solid #1E3A8A;
          border-radius: 999px;
          background: #2563EB;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.16);
        }

        .pob-business-main {
          display: grid;
          min-width: 0;
          gap: 1px;
        }

        .pob-business-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12.5px;
          font-weight: 900;
        }

        .pob-business-meta {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10.5px;
          font-weight: 750;
          color: #1D4ED8;
        }

        .pob-stats {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }

        .pob-stat {
          flex: 1;
          padding: 9px 8px;
          text-align: center;
          background: #FFFFFF;
          border: 2.5px solid #431407;
          border-radius: 12px;
        }

        .pob-stat b {
          display: block;
          font-size: 19px;
          font-weight: 900;
          line-height: 1;
        }

        .pob-stat span {
          display: block;
          margin-top: 4px;
          font-size: 9.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #C2410C;
        }

        @keyframes pob-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        @keyframes pob-pop {
          from { opacity: 0; transform: translateY(14px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes pob-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pob-pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.45); }
          50% { box-shadow: 0 0 0 7px rgba(249,115,22,0); }
        }

        @keyframes pob-shimmer {
          from { background-position: 120% 0; }
          to { background-position: -120% 0; }
        }

        @media (max-width: 640px) {
          .pob-stage {
            flex-direction: column-reverse;
            align-items: flex-start;
            padding: 0 12px 8px;
          }

          .pob-mascot {
            width: 128px;
            height: 142px;
            margin-top: -8px;
          }

          .pob-bubble {
            width: 100%;
            margin: 0 0 2px;
            max-height: calc(100dvh - 170px);
          }

          .pob-bubble::after {
            left: 40px;
            bottom: -13px;
            transform: rotate(-45deg);
          }

          .pob-phase-review .pob-stage {
            flex-direction: row;
            align-items: center;
            padding: 10px;
          }

          .pob-phase-review .pob-mascot {
            left: 18px;
            top: 18px;
            width: 66px;
            height: 76px;
            margin-top: 0;
          }

          .pob-phase-review .pob-bubble {
            width: calc(100vw - 20px);
            max-height: calc(100dvh - 20px);
            margin: 0;
            padding: 12px 13px 13px;
          }

          .pob-phase-review .pob-header,
          .pob-phase-review .pob-title,
          .pob-phase-review .pob-review-body {
            padding-left: 70px;
          }

          .pob-book-page {
            padding: 9px 10px 10px;
          }

          .pob-book-page-left {
            padding-right: 14px;
          }

          .pob-book-page-right {
            padding-left: 14px;
          }

          .pob-book-spine {
            width: 16px;
          }

          .pob-kit-cols,
          .pob-kit-grid,
          .pob-strategy-grid {
            grid-template-columns: 1fr;
          }

          .pob-book .pob-kit-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
          }

          .pob-zone-detail-head {
            grid-template-columns: 36px minmax(0, 1fr) 36px;
            gap: 8px;
          }

          .pob-zone-nav {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            font-size: 21px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pob-mascot,
          .pob-mascot-pose,
          .pob-bubble,
          .pob-scan-row,
          .pob-pulse,
          .pob-creative {
            animation: none !important;
          }

          .pob-scan-row {
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
}

function extractDomain(url: string): string {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function persistCreative(brief: CompanyBrief, imageUrl: string, source: string) {
  try {
    localStorage.setItem("vs:creative", JSON.stringify({
      imageUrl,
      company: brief.identity.companyName,
      source,
    }));
    localStorage.setItem("vs:brief", JSON.stringify(brief));
  } catch { /* ignore storage failures */ }
}

function listToTextarea(items?: string[]): string {
  return (items ?? []).join("\n");
}

function textareaToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function buildFallbackBrief(url: string): CompanyBrief {
  const clean = url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(".")[0]
    .replace(/[-_]/g, " ");
  const companyName = clean
    ? clean.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
    : "Your Company";

  return {
    url,
    identity: {
      companyName,
      industry: "B2B software",
      description: "A B2B company that needs a concise outdoor message and a focused account-based campaign.",
      brandAdjectives: ["direct", "credible", "modern"],
      tagline: "Built for teams ready to scale",
    },
    visualSystem: {
      primaryColor: "#C2410C",
      styleReference: "Clean enterprise campaign with strong contrast and minimal copy.",
    },
    campaign: {
      coreMessage: `${companyName} helps growing teams move faster with less operational drag.`,
      offerOrHook: "Local campaign for high-intent accounts clustered nearby.",
      callToAction: "Book a demo",
      campaignObjective: "awareness",
    },
    audience: {
      description: "Growth, finance, operations, and executive buyers at scaling B2B companies.",
      tone: "sharp and practical",
      contextWhenSeen: "mixed",
    },
    strategy: {
      positioning: `${companyName} is positioned as a practical B2B solution for teams trying to scale without extra operational drag.`,
      customerProblem: "Growing teams are losing momentum to manual workflows, unclear ownership, and scattered campaign execution.",
      customerPromise: "Help teams move faster with a campaign message that feels specific, credible, and easy to act on.",
      differentiators: [
        "Focused on high-intent local account clusters",
        "Connects billboard creative to measurable campaign follow-up",
        "Simple enough to understand from a glance",
      ],
      proofPoints: [
        "Website scan was unavailable, so this is a conservative fallback brief.",
        "Campaign zones are matched to nearby account and foot-traffic signals.",
      ],
      messageHierarchy: [
        `${companyName} helps growing teams move faster.`,
        "Less operational drag.",
        "One direct CTA.",
      ],
      creativeMandatories: [
        "Use high contrast and minimal copy",
        "Make the buyer outcome obvious",
        "Avoid generic startup abstractions",
      ],
    },
    sourceContext: {
      sourceSummary: "Fallback brief generated because the website scan did not return in time.",
      observedClaims: [],
      observedCtas: [],
      evidenceSnippets: [],
    },
    heuristic: true,
  };
}
