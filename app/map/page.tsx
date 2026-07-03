"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Map from "../components/Map";
import OnboardingDialog from "../components/OnboardingDialog";
import type { OpportunityWithPolygon } from "../lib/opportunityBlobs";

function isCampaignLaunch() {
  const params = new URLSearchParams(window.location.search);
  return params.get("campaign") === "1" || params.has("mode");
}

export default function MapPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Step 3 of the onboarding tutorial: the dialog fetches the opportunity
  // blobs and hands them here; the map renders them and reports taps back.
  const [onboardingZones, setOnboardingZones] = useState<OpportunityWithPolygon[] | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  useEffect(() => {
    setShowOnboarding(!isCampaignLaunch());
  }, []);

  function handleComplete() {
    setShowOnboarding(false);
    setOnboardingZones(null);
    setSelectedZoneId(null);
  }

  function handleRestart() {
    setOnboardingZones(null);
    setSelectedZoneId(null);
    setShowOnboarding(true);
  }

  return (
    <main style={{ position: "fixed", inset: 0 }}>
      <Map
        onboardingActive={showOnboarding}
        onboardingBlobs={showOnboarding ? onboardingZones : null}
        selectedBlobId={selectedZoneId}
        onSelectBlob={setSelectedZoneId}
      />
      {!showOnboarding && (
        <div className="absolute left-4 top-4 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRestart}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-black/50 px-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/70"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2a10 10 0 1 0 10 10M12 2v5M12 2l4 3M12 2L8 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Onboarding
          </button>
          <Link
            href="/sightline"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-black/50 px-3 text-xs font-semibold text-white backdrop-blur transition hover:bg-black/70"
          >
            Opportunities
          </Link>
        </div>
      )}
      {showOnboarding && (
        <OnboardingDialog
          onComplete={handleComplete}
          onZonesChange={setOnboardingZones}
          selectedZoneId={selectedZoneId}
          onSelectZone={setSelectedZoneId}
        />
      )}
    </main>
  );
}
