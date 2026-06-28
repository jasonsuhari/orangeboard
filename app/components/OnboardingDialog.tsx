"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyBrief } from "../lib/types";

// ─── types ─────────────────────────────────────────────────────────────────────

type ScanPhase = "idle" | "scanning" | "revealed";

const SCAN_LINES = [
  "Connecting to homepage…",
  "Reading brand identity…",
  "Extracting core message…",
  "Identifying audience signals…",
  "Building creative brief…",
];

// ─── root component ────────────────────────────────────────────────────────────

export default function OnboardingDialog({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [website, setWebsite] = useState("");
  const [brief, setBrief] = useState<CompanyBrief | null>(null);

  async function handleAnalyze(event: React.FormEvent) {
    event.preventDefault();
    if (!website.trim() || scanPhase === "scanning") return;

    setScanPhase("scanning");
    const start = Date.now();

    try {
      const response = await fetch("/api/company-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
      });
      const payload = (await response.json()) as { brief?: CompanyBrief; error?: string };
      if (!response.ok || !payload.brief) throw new Error(payload.error || "Could not analyze");
      applyBrief(payload.brief);
    } catch {
      applyBrief(buildFallbackBrief(website));
    }

    const elapsed = Date.now() - start;
    const remaining = Math.max(0, 3200 - elapsed);
    await new Promise<void>((r) => setTimeout(r, remaining));
    setScanPhase("revealed");
  }

  function applyBrief(b: CompanyBrief) {
    setBrief(b);
  }

  function handleGoToSightline() {
    if (brief) localStorage.setItem("orangeboard:brief", JSON.stringify(brief));
    onComplete();
    router.push("/sightline");
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Orangeboard onboarding
            </p>
            <h2 id="onboarding-title" className="mt-1 text-xl font-semibold tracking-tight">
              Set up your campaign
            </h2>
          </div>
        </div>

        <div className="max-h-[calc(92vh-73px)] overflow-y-auto">
          {scanPhase === "idle" && (
            <ProfileIdle
              website={website}
              onWebsiteChange={setWebsite}
              onAnalyze={handleAnalyze}
            />
          )}
          {scanPhase === "scanning" && <ScanAnimation website={website} />}
          {scanPhase === "revealed" && brief && (
            <ProfileRevealed
              brief={brief}
              onNext={handleGoToSightline}
            />
          )}
        </div>
      </section>
    </div>
  );
}

// ─── profile: idle ─────────────────────────────────────────────────────────────

function ProfileIdle({
  website,
  onWebsiteChange,
  onAnalyze,
}: {
  website: string;
  onWebsiteChange: (v: string) => void;
  onAnalyze: (e: React.FormEvent) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-8 py-16">
      <p className="max-w-sm text-center text-sm text-neutral-500">
        Enter your company website and we will infer your creative brief and ICP.
      </p>
      <form onSubmit={onAnalyze} className="flex w-full max-w-md gap-2">
        <input
          value={website}
          onChange={(e) => onWebsiteChange(e.target.value)}
          placeholder="ramp.com"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          className="h-11 flex-1 rounded-md border border-neutral-300 px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
        <button
          type="submit"
          disabled={!website.trim()}
          className="inline-flex h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analyze
        </button>
      </form>
      <button
        type="button"
        disabled
        className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-orange-500 px-5 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
      >
        Find opportunities
      </button>
    </div>
  );
}

// ─── profile: scan animation ───────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ScanAnimation({ website }: { website: string }) {
  const domain = extractDomain(website);
  const [imgLoaded, setImgLoaded] = useState(false);
  const withScheme = (url: string) => /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const shot = `/api/screenshot?url=${encodeURIComponent(withScheme(website))}`;

  return (
    <div className="flex flex-col items-center justify-center gap-0 bg-neutral-50 px-6 py-8 min-h-[480px]">
      <div className="w-full max-w-xl overflow-hidden rounded-lg border border-neutral-200 shadow-xl">
        <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-2.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-white border border-neutral-200 px-3 py-1.5">
            <LockIcon />
            <span className="truncate text-xs text-neutral-500">{domain}</span>
          </div>
        </div>

        <div className="relative h-[26rem] overflow-hidden bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shot}
            alt={`${domain} website`}
            onLoad={() => setImgLoaded(true)}
            draggable={false}
            className={`absolute left-0 top-0 w-full select-none ${imgLoaded ? "animate-site-scroll" : "opacity-0"}`}
          />

          {!imgLoaded && (
            <div className="absolute inset-0 p-4 space-y-2.5">
              <div className="h-4 w-3/5 rounded bg-neutral-200 animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-neutral-200/80 animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-neutral-200/80 animate-pulse" />
              <div className="h-10 w-full rounded bg-neutral-200/60 animate-pulse mt-3" />
              <div className="h-3 w-3/4 rounded bg-neutral-200/80 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-neutral-200/80 animate-pulse" />
              <div className="flex gap-3 mt-3">
                <div className="h-8 w-1/3 rounded bg-neutral-200/60 animate-pulse" />
                <div className="h-8 w-1/3 rounded bg-neutral-200/60 animate-pulse" />
              </div>
              <div className="h-3 w-5/6 rounded bg-neutral-200/80 animate-pulse mt-2" />
              <div className="h-3 w-2/3 rounded bg-neutral-200/80 animate-pulse" />
            </div>
          )}

          <div
            className="absolute left-0 right-0 h-[3px] pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.6) 20%, rgba(249,115,22,1) 50%, rgba(249,115,22,0.6) 80%, transparent 100%)",
              animation: "scan-sweep 1.6s ease-in-out infinite",
            }}
          />
          <div
            className="absolute left-0 right-0 h-14 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(249,115,22,0.1), transparent)",
              animation: "scan-sweep 1.6s ease-in-out infinite",
              marginTop: "-28px",
            }}
          />
        </div>
      </div>

      <div className="mt-5 w-full max-w-xl space-y-1.5 font-mono">
        {SCAN_LINES.map((line, i) => (
          <p
            key={line}
            className="text-xs text-neutral-500"
            style={{
              opacity: 0,
              animation: `fade-in-up 0.4s ease forwards`,
              animationDelay: `${0.3 + i * 0.55}s`,
            }}
          >
            <span className="text-orange-500 mr-2">›</span>
            {line}
          </p>
        ))}
        <p
          className="text-xs font-semibold text-green-600"
          style={{
            opacity: 0,
            animation: `fade-in-up 0.4s ease forwards`,
            animationDelay: `${0.3 + SCAN_LINES.length * 0.55}s`,
          }}
        >
          <span className="mr-2">✓</span>
          Analysis complete
        </p>
      </div>

      <style>{`
        @keyframes scan-sweep {
          0%   { top: -4px; }
          100% { top: 100%; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── profile: revealed ─────────────────────────────────────────────────────────

function ProfileRevealed({ brief, onNext }: { brief: CompanyBrief; onNext: () => void }) {
  return (
    <div className="p-6">
      <div
        className="grid gap-4 lg:grid-cols-2"
        style={{ animation: "fade-in-up 0.5s ease forwards", opacity: 0 }}
      >
        <CreativeBriefCard brief={brief} />
        <ICPProfileCard brief={brief} />
      </div>

      <div
        className="mt-5 flex justify-end border-t border-neutral-200 pt-4"
        style={{ animation: "fade-in-up 0.4s ease 0.28s forwards", opacity: 0 }}
      >
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-10 items-center justify-center rounded-md bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          Find opportunities →
        </button>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function CreativeBriefCard({ brief }: { brief: CompanyBrief }) {
  const primary = obValidHex(brief.visualSystem.primaryColor) ?? "#F97316";
  const secondary = obValidHex(brief.visualSystem.secondaryColor);
  const accents = (brief.visualSystem.accentColors ?? [])
    .map(obValidHex)
    .filter((hex): hex is string => Boolean(hex))
    .filter((hex) => hex !== primary && hex !== secondary)
    .slice(0, 2);
  const onPrimary = obReadableOn(primary);
  const mutedOnPrimary = onPrimary === "#ffffff" ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.48)";
  const gradientColors = [primary, secondary, ...accents].filter((hex): hex is string => Boolean(hex));
  const paletteSwatches = [
    { hex: primary, label: "Primary" },
    secondary ? { hex: secondary, label: "Secondary" } : { hex: obTint(primary, 0.7), label: "Tint" },
    ...accents.map((hex, index) => ({ hex, label: `Accent ${index + 1}` })),
    { hex: onPrimary === "#ffffff" ? "#0a0a0a" : "#ffffff", label: "Ink" },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div
        className="px-4 pb-5 pt-4"
        style={{
          background: `linear-gradient(140deg, ${obShade(primary, 0.14)}, ${primary} 55%, ${obShade(primary, -0.2)})`,
        }}
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: mutedOnPrimary }}>
          Creative brief
        </p>
        <h3 className="mt-1 text-base font-bold leading-tight tracking-tight" style={{ color: onPrimary }}>
          {brief.identity.companyName}
        </h3>
        {brief.identity.tagline && (
          <p className="mt-0.5 text-xs leading-snug" style={{ color: onPrimary === "#ffffff" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)" }}>
            &ldquo;{brief.identity.tagline}&rdquo;
          </p>
        )}
        <p className="mt-0.5 text-[11px]" style={{ color: mutedOnPrimary }}>{brief.identity.industry}</p>
      </div>

      <div className="border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">Color palette</p>
        <div
          className="mb-3 h-5 rounded"
          style={{
            background:
              gradientColors.length > 1
                ? `linear-gradient(90deg, ${gradientColors.join(", ")})`
                : `linear-gradient(90deg, ${obShade(primary, 0.35)}, ${primary}, ${obShade(primary, -0.28)})`,
          }}
        />
        <div className="flex flex-wrap gap-3">
          {paletteSwatches.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <div className="h-7 w-7 rounded-lg ring-1 ring-black/10" style={{ background: s.hex }} />
              <span className="font-mono text-[8px] uppercase text-neutral-500">{s.hex}</span>
              <span className="text-[8px] text-neutral-400">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <dl className="space-y-2.5 p-4">
        <BriefField label="Core message" value={brief.campaign.coreMessage} />
        <BriefField label="Audience" value={brief.audience.description} />
        <BriefField label="CTA" value={brief.campaign.callToAction} />
        {brief.visualSystem.styleReference && <BriefField label="Style ref" value={brief.visualSystem.styleReference} />}
      </dl>

      {(brief.identity.brandAdjectives?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-4">
          {brief.identity.brandAdjectives.slice(0, 4).map((a) => (
            <span key={a} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: `${primary}1a`, color: primary }}>
              {a}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function ICPProfileCard({ brief }: { brief: CompanyBrief }) {
  const contextLabel =
    brief.audience.contextWhenSeen === "driving" ? "Commuter"
    : brief.audience.contextWhenSeen === "walking" ? "Pedestrian"
    : brief.audience.contextWhenSeen === "scrolling" ? "Digital scroller"
    : "Multi-context";

  const toneChips = brief.audience.tone?.split(/[,\s]+/).filter(Boolean).slice(0, 4) ?? [];

  return (
    <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="relative h-[56px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-neutral-800 to-ink" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 16px,rgba(255,255,255,0.06) 16px,rgba(255,255,255,0.06) 17px),repeating-linear-gradient(90deg,transparent,transparent 16px,rgba(255,255,255,0.06) 16px,rgba(255,255,255,0.06) 17px)",
          }}
        />
        <span className="absolute bottom-2 right-3 text-[9px] font-bold uppercase tracking-[0.14em] text-white/35">
          ICP Profile
        </span>
      </div>

      <div className="-mt-5 px-4 pb-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-orange-500 shadow-md">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="8" r="4" fill="white" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" fill="white" />
          </svg>
        </div>
      </div>

      <div className="px-4 pb-3 pt-1">
        <h3 className="text-sm font-semibold text-ink">Target persona</h3>
        <p className="mt-1 text-sm leading-relaxed text-neutral-600">{brief.audience.description}</p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-neutral-100 border-t border-neutral-100">
        <div className="py-3 text-center">
          <p className="text-sm font-bold text-ink">{contextLabel}</p>
          <p className="text-[10px] text-neutral-400">Context</p>
        </div>
        <div className="py-3 text-center">
          <p className="text-sm font-bold capitalize text-ink">{brief.campaign.campaignObjective ?? "Awareness"}</p>
          <p className="text-[10px] text-neutral-400">Objective</p>
        </div>
      </div>

      {toneChips.length > 0 && (
        <div className="border-t border-neutral-100 px-4 py-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">Brand tone</p>
          <div className="flex flex-wrap gap-1.5">
            {toneChips.map((t) => (
              <span key={t} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium capitalize text-blue-600">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BriefField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-700">{value}</dd>
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" className="text-neutral-500" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" className="text-neutral-500" />
    </svg>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────────────

function buildFallbackBrief(url: string): CompanyBrief {
  const clean = url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(".")[0]
    .replace(/[-_]/g, " ");
  const companyName = clean
    ? clean.split(" ").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
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
      primaryColor: "#f97316",
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
    heuristic: true,
  };
}

function obValidHex(h?: string): string | undefined {
  return h && /^#[0-9a-fA-F]{6}$/i.test(h) ? h.toUpperCase() : undefined;
}

function obReadableOn(hex: string): "#ffffff" | "#0a0a0a" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? "#0a0a0a" : "#ffffff";
}

function obShade(hex: string, amt: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(hex.slice(1, 3), 16) * (1 + amt));
  const g = clamp(parseInt(hex.slice(3, 5), 16) * (1 + amt));
  const b = clamp(parseInt(hex.slice(5, 7), 16) * (1 + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function obTint(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
