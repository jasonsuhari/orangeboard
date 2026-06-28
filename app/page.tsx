"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import type { CompanyBrief } from "./lib/types";

type Stage = "accounts" | "boards" | "creative" | "outbound";
type OnboardingStep = "profile" | "map" | "done";
type EditTarget = "brief" | "icp" | null;

type CampaignOpportunity = {
  id: string;
  title: string;
  kind: string;
  area: string;
  timing: string;
  summary: string;
  accounts: number;
  events: number;
  placements: number;
  score: number;
  creativeAngle: string;
  outboundHook: string;
  blob: {
    left: string;
    top: string;
    width: number;
    height: number;
    rotate: string;
    radius: string;
  };
};

const stages: Array<{ id: Stage; label: string }> = [
  { id: "accounts", label: "Accounts" },
  { id: "boards", label: "Boards" },
  { id: "creative", label: "Creative" },
  { id: "outbound", label: "Outbound" },
];

const opportunities: CampaignOpportunity[] = [
  {
    id: "soma-finance",
    title: "SoMa SaaS Finance Cluster",
    kind: "Account concentration",
    area: "4th St near Caltrain",
    timing: "Morning commute",
    summary: "Dense SaaS and fintech office cluster with repeat commute exposure.",
    accounts: 31,
    events: 2,
    placements: 4,
    score: 96,
    creativeAngle: "Finance teams should close month before the ride home.",
    outboundHook: "We are running a local finance-ops campaign around your SoMa team.",
    blob: {
      left: "51%",
      top: "48%",
      width: 168,
      height: 112,
      rotate: "-8deg",
      radius: "54% 46% 58% 42% / 48% 55% 45% 52%",
    },
  },
  {
    id: "dreamforce-cfo",
    title: "Dreamforce CFO Blitz",
    kind: "Local event",
    area: "Moscone Center",
    timing: "Event week",
    summary: "Finance leaders and RevOps teams cluster around Moscone during sessions.",
    accounts: 47,
    events: 5,
    placements: 8,
    score: 92,
    creativeAngle: "Built for finance leaders scaling on Salesforce.",
    outboundHook: "We are activating around Dreamforce for finance leaders in your segment.",
    blob: {
      left: "36%",
      top: "34%",
      width: 154,
      height: 126,
      rotate: "11deg",
      radius: "45% 55% 43% 57% / 58% 43% 57% 42%",
    },
  },
  {
    id: "fidi-conquest",
    title: "FiDi Competitor Conquest",
    kind: "Competitor corridor",
    area: "Market St and FiDi",
    timing: "Weekday lunch",
    summary: "Target accounts and competitor offices overlap near high-footfall corridors.",
    accounts: 24,
    events: 1,
    placements: 5,
    score: 88,
    creativeAngle: "Outgrow the spend stack your competitor still uses.",
    outboundHook: "We noticed your team is in the FiDi corridor we are activating this week.",
    blob: {
      left: "63%",
      top: "31%",
      width: 146,
      height: 104,
      rotate: "6deg",
      radius: "60% 40% 50% 50% / 42% 50% 50% 58%",
    },
  },
  {
    id: "mission-hiring",
    title: "Mission Hiring Signal",
    kind: "Talent and recruiting",
    area: "Mission corridor",
    timing: "Evening foot traffic",
    summary: "Startup employees and engineering candidates concentrate near transit and venues.",
    accounts: 18,
    events: 3,
    placements: 3,
    score: 81,
    creativeAngle: "Build the finance stack before the team doubles.",
    outboundHook: "Your hiring motion suggests this local expansion campaign may be relevant.",
    blob: {
      left: "67%",
      top: "66%",
      width: 134,
      height: 98,
      rotate: "-15deg",
      radius: "48% 52% 59% 41% / 51% 45% 55% 49%",
    },
  },
];

const baseBoards = [
  {
    id: "OB-104",
    location: "4th St near Caltrain",
    visibility: "High",
    dwell: "22s",
    note: "Commute-heavy approach into SoMa offices",
    x: "54%",
    y: "47%",
  },
  {
    id: "OB-218",
    location: "Market St corridor",
    visibility: "Medium",
    dwell: "14s",
    note: "Dense office mix with street-level foot traffic",
    x: "37%",
    y: "34%",
  },
  {
    id: "OB-337",
    location: "Mission St approach",
    visibility: "Medium",
    dwell: "11s",
    note: "Good evening exposure, weaker account density",
    x: "67%",
    y: "63%",
  },
];

const accounts = [
  {
    name: "Northstar Ledger",
    segment: "Series B SaaS",
    area: "SoMa",
    fit: 94,
    signal: "Hiring finance ops",
  },
  {
    name: "Atlas Workflow",
    segment: "B2B software",
    area: "4th & King",
    fit: 91,
    signal: "New controller role",
  },
  {
    name: "Mergebase",
    segment: "API platform",
    area: "Caltrain",
    fit: 88,
    signal: "Headcount growth",
  },
  {
    name: "Pillar Systems",
    segment: "Enterprise SaaS",
    area: "FiDi",
    fit: 84,
    signal: "Ops expansion",
  },
];

const defaultBriefText =
  "Ramp-style finance operations platform with a direct, high-trust voice. Use crisp copy, strong contrast, and proof-driven language. The outdoor creative should feel native to the local commute context, not like a generic brand ad.";

const defaultIcpText =
  "Series B-C SaaS finance teams in San Francisco. Prioritize CFOs, controllers, RevOps, and finance operations leaders at 50-500 person companies with hiring, headcount growth, or spend-management complexity.";

export default function Home() {
  const [stage, setStage] = useState<Stage>("boards");
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("profile");
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [website, setWebsite] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("Ramp");
  const [creativeBrief, setCreativeBrief] = useState(defaultBriefText);
  const [icp, setIcp] = useState(defaultIcpText);
  const [selectedOpportunity, setSelectedOpportunity] = useState(opportunities[0]);
  const [selectedBoardId, setSelectedBoardId] = useState(baseBoards[0].id);

  const stageIndex = useMemo(
    () => stages.findIndex((item) => item.id === stage),
    [stage]
  );

  const boards = useMemo(
    () =>
      baseBoards.map((board, index) => ({
        ...board,
        fit: Math.max(72, selectedOpportunity.score - index * 8),
        accounts: Math.max(6, selectedOpportunity.accounts - index * 7),
      })),
    [selectedOpportunity]
  );

  const selectedBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0];

  const creativeVariants = useMemo(
    () => [
      selectedOpportunity.creativeAngle,
      `A local campaign for ${selectedOpportunity.area}.`,
      "Make the physical touchpoint feel familiar before sales follows up.",
    ],
    [selectedOpportunity]
  );

  const outboundRows = useMemo(
    () =>
      accounts.slice(0, 3).map((account, index) => ({
        account: account.name,
        contact: index === 0 ? "VP Finance" : index === 1 ? "Controller" : "Head of Ops",
        hook:
          index === 0
            ? selectedOpportunity.outboundHook
            : `Your team is near our ${selectedOpportunity.area} activation.`,
        status: index === 0 ? "Drafted" : index === 1 ? "Ready" : "Needs contact",
      })),
    [selectedOpportunity]
  );

  async function analyzeWebsite(event: React.FormEvent) {
    event.preventDefault();
    if (!website.trim() || analysisStatus === "loading") return;

    setAnalysisStatus("loading");
    setAnalysisError(null);

    try {
      const response = await fetch("/api/company-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }),
      });
      const payload = (await response.json()) as { brief?: CompanyBrief; error?: string };

      if (!response.ok || !payload.brief) {
        throw new Error(payload.error || "Could not analyze that website");
      }

      applyBrief(payload.brief);
      setAnalysisStatus("done");
    } catch (error) {
      const fallback = buildFallbackBrief(website);
      applyBrief(fallback);
      setAnalysisStatus("error");
      setAnalysisError(
        error instanceof Error
          ? `${error.message}. Using a demo-safe inferred profile instead.`
          : "Using a demo-safe inferred profile instead."
      );
    }
  }

  function applyBrief(brief: CompanyBrief) {
    setCompanyName(brief.identity.companyName);
    setCreativeBrief(
      [
        `${brief.identity.companyName} is a ${brief.identity.industry || "B2B company"}.`,
        brief.identity.description,
        `Core message: ${brief.campaign.coreMessage}`,
        brief.campaign.offerOrHook ? `Hook: ${brief.campaign.offerOrHook}` : "",
        brief.campaign.callToAction ? `CTA: ${brief.campaign.callToAction}` : "",
        brief.visualSystem.primaryColor
          ? `Visual cue: use ${brief.visualSystem.primaryColor} as the dominant accent.`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
    setIcp(
      [
        brief.audience.description,
        "Prioritize accounts clustered around offices, events, commute paths, and competitor corridors.",
        "Use physical exposure as passive outbound before sales follow-up.",
      ].join("\n")
    );
  }

  function continueToMap() {
    setOnboardingStep("map");
    setEditTarget(null);
  }

  function launchWorkspace() {
    setOnboardingStep("done");
    setSelectedBoardId(baseBoards[0].id);
    setStage("boards");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-ink">
      <TopBar />

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">
              Passive outbound for physical ABM
            </p>
            <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Find where your ICP gathers, then launch the physical play.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
              Orangeboard infers your creative brief and ICP, discovers physical-world
              opportunity blobs, and turns one into placement, creative, proof, and outbound.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link
              href="/map"
              className="inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Open Map
            </Link>
            <Link
              href="/vision"
              className="inline-flex h-10 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-neutral-400"
            >
              Vision Studio
            </Link>
          </div>
        </div>
      </section>

      <section id="accounts" className="mx-auto max-w-7xl px-5 py-5">
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3">
              <h2 className="text-sm font-semibold">Campaign Setup</h2>
            </div>
            <div className="space-y-5 p-4">
              <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                  Selected opportunity
                </p>
                <p className="mt-1 text-sm font-semibold text-orange-950">
                  {selectedOpportunity.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-orange-800">
                  {selectedOpportunity.summary}
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  ICP
                </span>
                <textarea
                  value={icp}
                  onChange={(event) => setIcp(event.target.value)}
                  rows={6}
                  className="mt-2 w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Territory" value="San Francisco" />
                <Field label="Motion" value={selectedOpportunity.kind} />
                <Field label="Goal" value="Pipeline" />
                <Field label="Channel" value="Physical ABM" />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Workflow
                  </span>
                  <span className="text-xs text-neutral-400">Step {stageIndex + 1}/4</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stages.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStage(item.id)}
                      className={
                        "h-9 rounded-md border px-3 text-left text-xs font-semibold transition " +
                        (stage === item.id
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300")
                      }
                    >
                      {index + 1}. {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Data Sources
                </p>
                <div className="mt-3 space-y-2 text-sm text-neutral-700">
                  <SourceRow label="Website" value={companyName} />
                  <SourceRow label="Fiber AI" value="Account enrichment" />
                  <SourceRow label="Mapbox" value="3D visibility scene" />
                  <SourceRow label="Orange Slice" value="Outbound workflow" />
                </div>
              </div>
            </div>
          </aside>

          <section id="boards" className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Opportunity Map + Billboard Inventory</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  ICP concentration, events, and physical placements in one workspace.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Legend color="bg-orange-500" label="Boards" />
                <Legend color="bg-ink" label="Accounts" />
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="relative min-h-[520px] overflow-hidden bg-[#e9ece7]">
                <MapTexture />
                <OpportunityBlob
                  opportunity={selectedOpportunity}
                  selected
                  compact
                  onSelect={() => undefined}
                />
                {boards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => setSelectedBoardId(board.id)}
                    className={
                      "absolute z-20 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-bold shadow-sm transition " +
                      (selectedBoard.id === board.id
                        ? "border-ink bg-orange-500 text-white"
                        : "border-white bg-orange-500 text-white hover:scale-105")
                    }
                    style={{ left: board.x, top: board.y }}
                    aria-label={`Select ${board.id}`}
                  >
                    {board.id.split("-")[1]}
                  </button>
                ))}

                {accounts.map((account, index) => (
                  <span
                    key={account.name}
                    className="absolute z-10 h-3 w-3 rounded-full border-2 border-white bg-ink shadow-sm"
                    style={{
                      left: `${30 + index * 9}%`,
                      top: `${42 + (index % 2) * 13}%`,
                    }}
                    aria-label={account.name}
                  />
                ))}

                <div className="absolute bottom-4 left-4 z-30 w-[min(380px,calc(100%-2rem))] rounded-md border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                        Best board for this blob
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">{selectedBoard.location}</h3>
                    </div>
                    <span className="rounded-md bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-700">
                      {selectedBoard.fit}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    {selectedBoard.note}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <Metric label="Accounts" value={selectedBoard.accounts.toString()} />
                    <Metric label="Visibility" value={selectedBoard.visibility} />
                    <Metric label="Dwell" value={selectedBoard.dwell} />
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-200 xl:border-l xl:border-t-0">
                <div className="border-b border-neutral-200 px-4 py-3">
                  <h3 className="text-sm font-semibold">Ranked Boards</h3>
                </div>
                <div className="divide-y divide-neutral-100">
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => setSelectedBoardId(board.id)}
                      className={
                        "block w-full px-4 py-3 text-left transition " +
                        (selectedBoard.id === board.id ? "bg-orange-50" : "bg-white hover:bg-neutral-50")
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{board.location}</p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {board.accounts} target accounts nearby
                          </p>
                        </div>
                        <span className="text-sm font-bold text-orange-600">{board.fit}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <aside id="outbound" className="space-y-4">
            <OutputPanel
              title="Campaign Output"
              subtitle="What the growth team gets from this physical play."
            >
              <div className="space-y-3">
                <OutputRow label="Creative brief" value={creativeBrief} />
                <OutputRow label="Selected blob" value={selectedOpportunity.title} />
                <OutputRow label="Selected board" value={selectedBoard.location} />
                <OutputRow
                  label="Why it fits"
                  value={`${selectedBoard.accounts} nearby accounts, ${selectedBoard.visibility.toLowerCase()} visibility, ${selectedBoard.dwell} dwell`}
                />
              </div>
            </OutputPanel>

            <OutputPanel title="Local Creative" subtitle="Generated for this street and account cluster.">
              <div className="aspect-[16/9] rounded-md border border-neutral-200 bg-ink p-4 text-white">
                <div className="flex h-full flex-col justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
                    {companyName} near {selectedOpportunity.area}
                  </p>
                  <p className="text-2xl font-semibold leading-tight">
                    {creativeVariants[0]}
                  </p>
                  <p className="text-sm text-neutral-300">
                    Built for {selectedOpportunity.kind.toLowerCase()} in {selectedOpportunity.area}.
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {creativeVariants.slice(1).map((variant) => (
                  <p key={variant} className="rounded-md border border-neutral-200 px-3 py-2 text-xs text-neutral-600">
                    {variant}
                  </p>
                ))}
              </div>
            </OutputPanel>

            <OutputPanel title="Outbound Queue" subtitle="Orange Slice handoff for coordinated follow-up.">
              <div className="divide-y divide-neutral-100">
                {outboundRows.map((row) => (
                  <div key={row.account} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{row.account}</p>
                        <p className="mt-0.5 text-xs text-neutral-500">{row.contact}</p>
                      </div>
                      <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                        {row.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-600">{row.hook}</p>
                  </div>
                ))}
              </div>
            </OutputPanel>
          </aside>
        </div>
      </section>

      {onboardingStep !== "done" && (
        <OnboardingDialog
          step={onboardingStep}
          website={website}
          companyName={companyName}
          creativeBrief={creativeBrief}
          icp={icp}
          editTarget={editTarget}
          analysisStatus={analysisStatus}
          analysisError={analysisError}
          selectedOpportunity={selectedOpportunity}
          onWebsiteChange={setWebsite}
          onAnalyze={analyzeWebsite}
          onCreativeBriefChange={setCreativeBrief}
          onIcpChange={setIcp}
          onEditTargetChange={setEditTarget}
          onNext={continueToMap}
          onBack={() => setOnboardingStep("profile")}
          onOpportunitySelect={setSelectedOpportunity}
          onLaunch={launchWorkspace}
        />
      )}
    </main>
  );
}

function OnboardingDialog({
  step,
  website,
  companyName,
  creativeBrief,
  icp,
  editTarget,
  analysisStatus,
  analysisError,
  selectedOpportunity,
  onWebsiteChange,
  onAnalyze,
  onCreativeBriefChange,
  onIcpChange,
  onEditTargetChange,
  onNext,
  onBack,
  onOpportunitySelect,
  onLaunch,
}: {
  step: OnboardingStep;
  website: string;
  companyName: string;
  creativeBrief: string;
  icp: string;
  editTarget: EditTarget;
  analysisStatus: "idle" | "loading" | "done" | "error";
  analysisError: string | null;
  selectedOpportunity: CampaignOpportunity;
  onWebsiteChange: (value: string) => void;
  onAnalyze: (event: React.FormEvent) => void;
  onCreativeBriefChange: (value: string) => void;
  onIcpChange: (value: string) => void;
  onEditTargetChange: (value: EditTarget) => void;
  onNext: () => void;
  onBack: () => void;
  onOpportunitySelect: (value: CampaignOpportunity) => void;
  onLaunch: () => void;
}) {
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
              {step === "profile" ? "Infer your brief and ICP" : "Pick the physical opportunity blob"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <span className={step === "profile" ? "text-orange-600" : "text-neutral-400"}>1. Profile</span>
            <span className="h-px w-6 bg-neutral-200" />
            <span className={step === "map" ? "text-orange-600" : "text-neutral-400"}>2. Map</span>
          </div>
        </div>

        {step === "profile" ? (
          <div className="max-h-[calc(92vh-73px)] overflow-y-auto p-5">
            <form onSubmit={onAnalyze} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Company website
                </span>
                <input
                  value={website}
                  onChange={(event) => onWebsiteChange(event.target.value)}
                  placeholder="ramp.com"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="mt-2 h-11 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </label>
              <button
                type="submit"
                disabled={!website.trim() || analysisStatus === "loading"}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {analysisStatus === "loading" ? "Reading..." : "Analyze"}
              </button>
            </form>

            {analysisError && (
              <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                {analysisError}
              </p>
            )}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <EditableProfileCard
                title="Creative brief"
                eyebrow={companyName}
                value={creativeBrief}
                editing={editTarget === "brief"}
                empty={analysisStatus === "idle" || analysisStatus === "loading"}
                emptyText="Analyze the website to infer positioning, voice, and the first outdoor creative direction."
                onEdit={() => onEditTargetChange(editTarget === "brief" ? null : "brief")}
                onChange={onCreativeBriefChange}
              />
              <EditableProfileCard
                title="ICP profile"
                eyebrow="Passive outbound target"
                value={icp}
                editing={editTarget === "icp"}
                empty={analysisStatus === "idle" || analysisStatus === "loading"}
                emptyText="Orangeboard will infer who the campaign should reach, then use location and event signals to find physical concentration."
                onEdit={() => onEditTargetChange(editTarget === "icp" ? null : "icp")}
                onChange={onIcpChange}
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-neutral-200 pt-4">
              <p className="text-xs text-neutral-500">
                The dialog is intentionally locked until a campaign opportunity is selected.
              </p>
              <button
                type="button"
                disabled={analysisStatus === "idle" || analysisStatus === "loading"}
                onClick={onNext}
                className="inline-flex h-10 items-center justify-center rounded-md bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next: find blobs
              </button>
            </div>
          </div>
        ) : (
          <div className="grid max-h-[calc(92vh-73px)] overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="relative min-h-[620px] overflow-hidden bg-[#e9ece7]">
              <MapTexture />
              {opportunities.map((opportunity) => (
                <OpportunityBlob
                  key={opportunity.id}
                  opportunity={opportunity}
                  selected={selectedOpportunity.id === opportunity.id}
                  onSelect={() => onOpportunitySelect(opportunity)}
                />
              ))}
              <div className="absolute left-5 top-5 z-30 max-w-sm rounded-md border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                  Physical opportunity map
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  Blobs combine estimated ICP density, local events, office clusters,
                  competitor locations, and available physical placements.
                </p>
              </div>
            </div>

            <aside className="border-t border-neutral-200 bg-white p-5 lg:border-l lg:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                Focused blob
              </p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-tight">
                {selectedOpportunity.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                {selectedOpportunity.summary}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Score" value={selectedOpportunity.score.toString()} />
                <Metric label="Accounts" value={selectedOpportunity.accounts.toString()} />
                <Metric label="Events" value={selectedOpportunity.events.toString()} />
                <Metric label="Placements" value={selectedOpportunity.placements.toString()} />
              </div>

              <div className="mt-5 space-y-3">
                <OutputRow label="Area" value={selectedOpportunity.area} />
                <OutputRow label="Timing" value={selectedOpportunity.timing} />
                <OutputRow label="Creative angle" value={selectedOpportunity.creativeAngle} />
                <OutputRow label="Outbound hook" value={selectedOpportunity.outboundHook} />
              </div>

              <div className="mt-6 flex gap-2 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-ink transition hover:border-neutral-400"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={onLaunch}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Build campaign
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}

function EditableProfileCard({
  title,
  eyebrow,
  value,
  editing,
  empty,
  emptyText,
  onEdit,
  onChange,
}: {
  title: string;
  eyebrow: string;
  value: string;
  editing: boolean;
  empty: boolean;
  emptyText: string;
  onEdit: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <section className="min-h-[280px] rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-600">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-sm font-semibold">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          disabled={empty}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
      <div className="p-4">
        {empty ? (
          <div className="flex min-h-[188px] items-center justify-center rounded-md border border-dashed border-neutral-300 bg-white px-5 text-center text-sm leading-relaxed text-neutral-500">
            {emptyText}
          </div>
        ) : editing ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={9}
            className="w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
        ) : (
          <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
            {value}
          </p>
        )}
      </div>
    </section>
  );
}

function OpportunityBlob({
  opportunity,
  selected,
  compact = false,
  onSelect,
}: {
  opportunity: CampaignOpportunity;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "absolute z-20 -translate-x-1/2 -translate-y-1/2 text-left transition " +
        (selected ? "scale-105" : "hover:scale-[1.03]")
      }
      style={{ left: opportunity.blob.left, top: opportunity.blob.top }}
      aria-label={`Focus ${opportunity.title}`}
    >
      <span
        className={
          "block border shadow-lg backdrop-blur " +
          (selected
            ? "border-orange-600 bg-orange-500/35 ring-4 ring-orange-500/15"
            : "border-orange-300/70 bg-orange-400/20")
        }
        style={{
          width: compact ? opportunity.blob.width * 0.72 : opportunity.blob.width,
          height: compact ? opportunity.blob.height * 0.72 : opportunity.blob.height,
          transform: `rotate(${opportunity.blob.rotate})`,
          borderRadius: opportunity.blob.radius,
        }}
      />
      {!compact && (
        <span className="absolute left-1/2 top-1/2 z-30 w-44 -translate-x-1/2 -translate-y-1/2 rounded-md border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-orange-600">
            {opportunity.kind}
          </span>
          <span className="mt-1 block text-sm font-semibold text-ink">
            {opportunity.title}
          </span>
          <span className="mt-1 block text-xs text-neutral-500">
            {opportunity.accounts} accounts, {opportunity.placements} placements
          </span>
        </span>
      )}
    </button>
  );
}

function TopBar() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-orange-500 text-white">
            <BoardIcon />
          </span>
          <span className="text-base font-semibold tracking-tight">Orangeboard</span>
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-neutral-600 md:flex">
          <a href="#accounts" className="transition hover:text-ink">
            Accounts
          </a>
          <a href="#boards" className="transition hover:text-ink">
            Boards
          </a>
          <a href="#outbound" className="transition hover:text-ink">
            Outbound
          </a>
        </div>
        <div className="text-xs font-medium text-neutral-500">
          YC AI Growth Hackathon
        </div>
      </nav>
    </header>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-800">{value}</p>
    </div>
  );
}

function SourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <span className="text-right text-xs text-neutral-500">{value}</span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-neutral-500">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-2 py-2 text-center">
      <p className="font-semibold text-neutral-900">{value}</p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{label}</p>
    </div>
  );
}

function OutputPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
        {value}
      </p>
    </div>
  );
}

function MapTexture() {
  return (
    <>
      <div className="absolute left-[8%] top-[18%] h-[72%] w-[12%] rotate-12 bg-white/60" />
      <div className="absolute left-[26%] top-[-8%] h-[118%] w-[9%] -rotate-12 bg-white/70" />
      <div className="absolute left-[48%] top-[-4%] h-[108%] w-[11%] rotate-6 bg-white/60" />
      <div className="absolute left-[71%] top-[8%] h-[92%] w-[10%] -rotate-6 bg-white/70" />
      <div className="absolute left-0 top-[36%] h-[10%] w-full -rotate-3 bg-white/55" />
      <div className="absolute left-0 top-[62%] h-[8%] w-full rotate-2 bg-white/60" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(10,10,10,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(10,10,10,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute right-4 top-4 rounded-md border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-600 shadow-sm">
        San Francisco signal map
      </div>
    </>
  );
}

function BoardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="10" rx="2" fill="currentColor" />
      <path
        d="M12 15v5M8.5 20h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function buildFallbackBrief(url: string): CompanyBrief {
  const clean = url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(".")[0]
    .replace(/[-_]/g, " ");
  const companyName = clean
    ? clean
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Your Company";

  return {
    url,
    identity: {
      companyName,
      industry: "B2B software",
      description:
        "A B2B company that needs a concise outdoor message and a focused account-based campaign.",
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
      description:
        "Growth, finance, operations, and executive buyers at scaling B2B companies.",
      tone: "sharp and practical",
      contextWhenSeen: "mixed",
    },
    heuristic: true,
  };
}
