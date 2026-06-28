"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { CompanyBrief } from "../lib/types";
import SiteScrollPreview from "./SiteScrollPreview";

const Billboard3D = dynamic(() => import("./Billboard3D"), {
  ssr: false,
  loading: () => <SceneSkeleton label="Loading 3D scene…" />,
});

const AttentionSim = dynamic(() => import("./AttentionSim"), {
  ssr: false,
  loading: () => (
    <div className="mt-10 rounded-3xl border border-neutral-200 bg-white p-7 text-sm text-neutral-400">
      Loading agent vision…
    </div>
  ),
});

const DEFAULT_CREATIVE = "/sample-creative.svg";

type Status = "idle" | "reading" | "generating" | "done" | "error";

const STEPS = [
  { key: "reading", label: "Reading the website" },
  { key: "generating", label: "Generating the creative" },
  { key: "done", label: "Live on a billboard" },
] as const;

export default function CreateFlow() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [brief, setBrief] = useState<CompanyBrief | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(DEFAULT_CREATIVE);
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || status === "reading" || status === "generating") return;
    setError(null);
    setBrief(null);

    try {
      // ① Read the website → structured brief
      setStatus("reading");
      const briefRes = await fetch("/api/company-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const briefJson = await briefRes.json();
      if (!briefRes.ok) throw new Error(briefJson.error || "Could not read that site");
      const nextBrief = briefJson.brief as CompanyBrief;

      // ② Brief → billboard creative. A precomputed (cached) brief already
      // carries its high-quality creative, so we skip the slow generation step.
      let creative: { imageUrl: string; source: string };
      if (nextBrief.media?.imageUrl) {
        creative = { imageUrl: nextBrief.media.imageUrl, source: nextBrief.media.source };
      } else {
        setBrief(nextBrief);
        setStatus("generating");
        const creativeRes = await fetch("/api/generate-creative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brief: nextBrief }),
        });
        const creativeJson = await creativeRes.json();
        if (!creativeRes.ok) throw new Error(creativeJson.error || "Could not generate creative");
        creative = { imageUrl: creativeJson.imageUrl, source: creativeJson.source };
      }

      setBrief(nextBrief);
      setImageUrl(creative.imageUrl);
      setSource(creative.source);
      setStatus("done");

      // Stash it so the map can composite this exact creative onto a real sign.
      try {
        localStorage.setItem(
          "vs:creative",
          JSON.stringify({
            imageUrl: creative.imageUrl,
            company: nextBrief.identity.companyName,
            source: creative.source,
          })
        );
        localStorage.setItem("vs:brief", JSON.stringify(nextBrief));
      } catch {
        /* storage may be unavailable; the map falls back to the sample */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  const busy = status === "reading" || status === "generating";
  const currentStepIndex = status === "reading" ? 0 : status === "generating" ? 1 : status === "done" ? 2 : -1;

  return (
    <div className="mx-auto mt-12 w-full max-w-5xl">
      {/* Input — the start of the whole pipeline */}
      <form
        onSubmit={run}
        className="mx-auto flex w-full max-w-xl flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg shadow-neutral-900/5 sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 text-neutral-400" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" stroke="currentColor" strokeWidth="2" />
          </svg>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter your company website…"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full bg-transparent py-2.5 text-base text-ink outline-none placeholder:text-neutral-400"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <>
              <Spinner /> Working…
            </>
          ) : (
            <>Generate creative</>
          )}
        </button>
      </form>

      {/* Quick-fill examples */}
      {status === "idle" && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
          <span>Try:</span>
          {["linear.app", "notion.so", "patagonia.com"].map((ex) => (
            <button
              key={ex}
              onClick={() => setUrl(ex)}
              className="rounded-full border border-neutral-200 px-2.5 py-1 font-medium text-neutral-500 transition hover:border-orange-200 hover:text-orange-600"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Step indicator */}
      {currentStepIndex >= 0 && (
        <div className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 text-xs font-medium">
          {STEPS.map((s, i) => {
            const state = i < currentStepIndex ? "done" : i === currentStepIndex ? "active" : "todo";
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span
                  className={
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 " +
                    (state === "active"
                      ? "bg-orange-50 text-orange-700"
                      : state === "done"
                        ? "bg-green-50 text-green-700"
                        : "bg-neutral-100 text-neutral-400")
                  }
                >
                  {state === "active" ? <Spinner /> : state === "done" ? <Check /> : <Dot />}
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <span className="h-px w-4 bg-neutral-200" />}
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mx-auto mt-4 max-w-xl rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Stage: 3D billboard + brief */}
      <div className="mt-8 grid gap-5 lg:grid-cols-5">
        <div className="relative lg:col-span-3">
          <div className="aspect-[16/11] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-gradient-to-b from-neutral-100 to-neutral-50 shadow-2xl shadow-neutral-900/10">
            <Billboard3D imageUrl={imageUrl} />
          </div>
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-neutral-500 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
            Drag to orbit · live preview
          </div>
          {source && status === "done" && (
            <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-neutral-500 backdrop-blur">
              {source === "openai" ? "AI-generated" : "brand-matched mock"}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {status === "reading" ? (
            <SiteScrollPreview url={url} />
          ) : brief ? (
            <BriefCard brief={brief} done={status === "done"} />
          ) : (
            <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/60 p-6 text-left">
              <h3 className="text-sm font-semibold text-ink">How it starts</h3>
              <ol className="mt-3 space-y-2.5 text-sm text-neutral-600">
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-500">1.</span> Drop in your company URL.
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-500">2.</span> We read your brand — colors, tone, message.
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-orange-500">3.</span> A billboard-ready creative renders on a real
                  3D board.
                </li>
              </ol>
              <p className="mt-4 text-xs text-neutral-400">
                From here Peel places it, simulates recall, and predicts ROAS.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Step 04 — agent vision: saliency + synthetic viewers + VLM */}
      {status === "done" && <AttentionSim imageUrl={imageUrl} brief={brief} />}

      {status === "done" && (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/map"
            className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Place it on the map →
          </Link>
          <button
            onClick={() => {
              setStatus("idle");
              setBrief(null);
              setImageUrl(DEFAULT_CREATIVE);
              setSource(null);
            }}
            className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-neutral-50"
          >
            Try another site
          </button>
        </div>
      )}
    </div>
  );
}

function BriefCard({ brief, done }: { brief: CompanyBrief; done: boolean }) {
  const primary = validHex(brief.visualSystem.primaryColor) ?? "#F97316";
  const secondary = validHex(brief.visualSystem.secondaryColor);
  const accents = (brief.visualSystem.accentColors ?? [])
    .map(validHex)
    .filter((hex): hex is string => Boolean(hex))
    .filter((hex) => hex !== primary && hex !== secondary)
    .slice(0, 2);
  const onPrimary = readableOnHex(primary);
  const mutedOnPrimary =
    onPrimary === "#ffffff" ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.48)";
  const gradientColors = [primary, secondary, ...accents].filter((hex): hex is string => Boolean(hex));

  const paletteSwatches: { hex: string; label: string }[] = [
    { hex: primary, label: "Primary" },
    secondary
      ? { hex: secondary, label: "Secondary" }
      : { hex: tintHex(primary, 0.7), label: "Tint" },
    ...accents.map((hex, index) => ({ hex, label: `Accent ${index + 1}` })),
    { hex: onPrimary === "#ffffff" ? "#0a0a0a" : "#ffffff", label: "Ink" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-lg shadow-neutral-900/5">
      {/* Brand header */}
      <div
        className="relative shrink-0 px-5 pb-6 pt-5"
        style={{
          background: `linear-gradient(140deg, ${shadeHex(primary, 0.14)}, ${primary} 55%, ${shadeHex(primary, -0.2)})`,
        }}
      >
        {brief.heuristic && (
          <span
            className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm"
            style={{ color: mutedOnPrimary }}
          >
            heuristic
          </span>
        )}
        <span className="block text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: mutedOnPrimary }}>
          Creative brief
        </span>
        <h3 className="mt-1.5 text-xl font-bold leading-tight tracking-tight" style={{ color: onPrimary }}>
          {brief.identity.companyName}
        </h3>
        {brief.identity.tagline && (
          <p
            className="mt-1 text-sm leading-snug"
            style={{ color: onPrimary === "#ffffff" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)" }}
          >
            &ldquo;{brief.identity.tagline}&rdquo;
          </p>
        )}
        <p className="mt-0.5 text-xs" style={{ color: mutedOnPrimary }}>
          {brief.identity.industry}
        </p>
      </div>

      {/* Color palette */}
      <div className="shrink-0 border-b border-neutral-100 bg-neutral-50/80 px-5 py-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-400">Color palette</p>
        <div
          className="mb-4 h-7 rounded-lg"
          style={{
            background:
              gradientColors.length > 1
                ? `linear-gradient(90deg, ${gradientColors.join(", ")})`
                : `linear-gradient(90deg, ${shadeHex(primary, 0.35)}, ${primary}, ${shadeHex(primary, -0.28)})`,
          }}
        />
        <div className="flex flex-wrap gap-4">
          {paletteSwatches.map((s) => (
            <ColorSwatch key={s.label} hex={s.hex} label={s.label} />
          ))}
        </div>
      </div>

      {/* Fields */}
      <dl className="flex-1 space-y-3 px-5 py-4 text-sm">
        <Field label="Core message" value={brief.campaign.coreMessage} />
        <Field label="Audience" value={brief.audience.description} />
        <Field label="Call to action" value={brief.campaign.callToAction} />
        {brief.visualSystem.styleReference && (
          <Field label="Style ref" value={brief.visualSystem.styleReference} />
        )}
      </dl>

      {/* Adjective pills + status */}
      <div className="shrink-0 px-5 pb-5">
        <div className="flex flex-wrap gap-1.5">
          {brief.identity.brandAdjectives?.slice(0, 4).map((a) => (
            <span
              key={a}
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: `${primary}1a`, color: primary }}
            >
              {a}
            </span>
          ))}
        </div>
        {!done && (
          <p className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
            <Spinner /> Painting the billboard…
          </p>
        )}
      </div>
    </div>
  );
}

function ColorSwatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="h-9 w-9 rounded-xl ring-1 ring-black/10" style={{ background: hex }} />
      <span className="font-mono text-[9px] uppercase tracking-tight text-neutral-500">{hex}</span>
      <span className="text-[9px] text-neutral-400">{label}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-neutral-700">{value}</dd>
    </div>
  );
}

function SceneSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
      <span className="flex items-center gap-2">
        <Spinner /> {label}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />;
}

// ─── Colour helpers ──────────────────────────────────────────────────────────

function validHex(h?: string): string | undefined {
  return h && /^#[0-9a-fA-F]{6}$/i.test(h) ? h.toUpperCase() : undefined;
}

function readableOnHex(hex: string): "#ffffff" | "#0a0a0a" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? "#0a0a0a" : "#ffffff";
}

function shadeHex(hex: string, amt: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(hex.slice(1, 3), 16) * (1 + amt));
  const g = clamp(parseInt(hex.slice(3, 5), 16) * (1 + amt));
  const b = clamp(parseInt(hex.slice(5, 7), 16) * (1 + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function tintHex(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
