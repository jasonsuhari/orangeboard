"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Map from "../components/Map";
import OnboardingDialog from "../components/OnboardingDialog";

const ONBOARDING_KEY = "orangeboard:onboarded";

export default function MapPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, []);

  function handleComplete() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  }

  function handleRestart() {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  }

  return (
    <main style={{ position: "fixed", inset: 0 }}>
      <Map />
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
      {showOnboarding && <OnboardingDialog onComplete={handleComplete} />}
    </main>
  );
}
