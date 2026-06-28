"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AttentionSimResult, CompanyBrief, SaliencyResult, ViewerAgent, VlmPerception } from "../lib/types";
import { computeSaliency } from "../lib/saliency";
import { AGENT_PERSONAS, effectiveFixations, fuse, heuristicPerception, simulateAgents } from "../lib/attention";
import { drawCover, drawHeatmap, drawScanpath } from "../lib/canvasDraw";

/* ──────────────────────────────────────────────────────────────────────────
   Agent vision — the "Preview & simulate" stage.

   Left: the creative with a live attention heatmap (bottom-up Itti–Koch
   saliency, computed in-browser) and the predicted gaze scanpath for the
   selected viewer agent. Right: synthetic viewer agents (each with a dwell
   budget) + the fused VLM report and visibility/recall scores.
   ────────────────────────────────────────────────────────────────────────── */

const CW = 768;
const CH = 432; // 16:9 internal resolution

type Overlay = "heatmap" | "scanpath" | "clean";

export default function AttentionSim({ imageUrl, brief }: { imageUrl: string; brief: CompanyBrief | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);

  const [saliency, setSaliency] = useState<SaliencyResult | null>(null);
  const [tainted, setTainted] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>("heatmap");
  const [agentId, setAgentId] = useState("driver");
  const [reveal, setReveal] = useState(1); // 0..1 scanpath animation progress

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AttentionSimResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const persona = AGENT_PERSONAS.find((p) => p.id === agentId) ?? AGENT_PERSONAS[1];
  const agents = useMemo(() => (saliency ? simulateAgents(saliency) : []), [saliency]);

  // Load creative → ImageData → run the saliency model.
  useEffect(() => {
    let cancelled = false;
    setSaliency(null);
    setResult(null);
    setErr(null);
    setTainted(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawCover(ctx, img, CW, CH);
      try {
        const data = ctx.getImageData(0, 0, CW, CH);
        setSaliency(computeSaliency(data));
      } catch {
        setTainted(true); // cross-origin image — can't read pixels
      }
    };
    img.onerror = () => !cancelled && setErr("Could not load the creative image.");
    img.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // Animate the scanpath reveal whenever the agent or saliency changes.
  useEffect(() => {
    if (!saliency || overlay !== "scanpath") {
      setReveal(1);
      return;
    }
    const eff = effectiveFixations(persona.dwellMs);
    const duration = Math.min(2600, eff * 260);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setReveal(t);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [saliency, overlay, persona.dwellMs]);

  // Composite: creative + chosen overlay.
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCover(ctx, img, CW, CH);
    if (!saliency) return;
    if (overlay === "heatmap") drawHeatmap(ctx, saliency);
    if (overlay === "scanpath") drawScanpath(ctx, saliency, persona.dwellMs, reveal);
  }, [saliency, overlay, persona.dwellMs, reveal]);

  async function runAgents() {
    if (running) return;
    setRunning(true);
    setErr(null);
    try {
      // Rasterize the canvas (creative only) to a PNG the VLM can read.
      let pngForVlm = imageUrl;
      const base = canvasRef.current;
      if (base && imgRef.current && !tainted) {
        const tmp = document.createElement("canvas");
        tmp.width = CW;
        tmp.height = CH;
        const tctx = tmp.getContext("2d");
        if (tctx) {
          drawCover(tctx, imgRef.current, CW, CH);
          try {
            pngForVlm = tmp.toDataURL("image/png");
          } catch {
            /* tainted — fall through to original url */
          }
        }
      }

      let perception: VlmPerception;
      try {
        const res = await fetch("/api/vision-simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: pngForVlm, brief, context: persona.blurb }),
        });
        const j = await res.json();
        perception = (j.perception as VlmPerception) ?? heuristicPerception(brief);
      } catch {
        perception = heuristicPerception(brief);
      }

      const sal = saliency ?? fallbackSaliency();
      setResult(fuse(sal, perception, agents.length ? agents : simulateAgents(sal)));
    } catch {
      setErr("Simulation failed — showing what we could compute.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mt-10 rounded-3xl border border-neutral-200 bg-white p-5 text-left shadow-xl shadow-neutral-900/5 sm:p-7">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-500">
            Step 04 · Agent vision
          </span>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight">Will anyone actually see it?</h3>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            A hybrid attention model: a bottom-up saliency engine simulates where the human eye
            fixates, synthetic viewers apply a real glance budget, and a VLM reads the creative the
            way a person would — fused into visibility &amp; recall.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <ModelChip label="Bottom-up saliency" sub="Itti–Koch · in-browser" />
          <ModelChip label="Top-down VLM" sub={result?.perception.source === "vlm" ? "gpt-4o" : "gpt-4o · heuristic"} />
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Stage */}
        <div className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900">
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              className="block w-full"
              style={{ aspectRatio: "16 / 9" }}
            />
            {!saliency && !err && !tainted && (
              <div className="absolute inset-0 grid place-items-center bg-neutral-900/40 text-sm text-white/80">
                Running saliency model…
              </div>
            )}
            {tainted && (
              <div className="absolute inset-0 grid place-items-center bg-neutral-900/60 p-4 text-center text-sm text-white/80">
                Pixel read blocked for this image — run the agents for the VLM read.
              </div>
            )}
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
              {overlay === "heatmap"
                ? "Attention heatmap"
                : overlay === "scanpath"
                  ? `Gaze scanpath · ${persona.label}`
                  : "Creative"}
            </div>
          </div>

          {/* Overlay toggles */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SegToggle value={overlay} onChange={setOverlay} />
            {overlay === "scanpath" && (
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="ml-auto rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 outline-none transition hover:border-orange-200"
              >
                {AGENT_PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} · {(p.dwellMs / 1000).toFixed(1)}s
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Saliency readout */}
          {saliency && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Focus" value={pct(saliency.concentration)} hint="single focal point" />
              <Stat label="Clutter" value={pct(saliency.entropy)} hint="competing hotspots" invert />
              <Stat label="Contrast" value={pct(saliency.contrast)} hint="reads at distance" />
            </div>
          )}
        </div>

        {/* Agents + run */}
        <div className="lg:col-span-2">
          {!result ? (
            <div className="flex h-full flex-col">
              <p className="text-sm font-medium text-neutral-700">Synthetic viewers</p>
              <p className="mt-1 text-xs text-neutral-500">
                Each agent gets a real dwell budget. Only the fixations that fit register.
              </p>
              <div className="mt-3 space-y-2">
                {(agents.length ? agents : AGENT_PERSONAS.map(personaStub)).map((a) => (
                  <AgentRow key={a.id} agent={a} selected={a.id === agentId} onPick={() => { setAgentId(a.id); setOverlay("scanpath"); }} />
                ))}
              </div>
              <button
                onClick={runAgents}
                disabled={running}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? <><Spinner /> Simulating attention…</> : <>Run synthetic agents →</>}
              </button>
              {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
            </div>
          ) : (
            <ResultPanel result={result} onRerun={runAgents} running={running} />
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Result panel ─────────────────────────────── */

function ResultPanel({ result, onRerun, running }: { result: AttentionSimResult; onRerun: () => void; running: boolean }) {
  const { scores, perception, verdict } = result;
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-2">
        <ScoreCard label="Visibility" value={scores.visibility} accent />
        <ScoreCard label="Recall" value={scores.recall} accent />
        <ScoreCard label="Glanceability" value={scores.glanceability} />
        <ScoreCard label="Shareability" value={scores.shareability} />
      </div>

      <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">{verdict}</p>

      <div className="mt-4 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Synthetic viewer report</span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
            {perception.source === "vlm" ? "VLM" : "heuristic"}
          </span>
        </div>
        <dl className="mt-3 space-y-2.5 text-sm">
          <ReportRow label="Notices first" value={perception.noticedFirst} />
          <ReportRow label="Takes away" value={perception.message} />
          <ReportRow label="Remembers (5s)" value={perception.fiveSecondMemory} />
          <ReportRow label="Feels" value={perception.emotion} />
        </dl>
        <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
          <span className="font-medium text-ink">Fix:</span> {perception.critique}
        </p>
      </div>

      <button
        onClick={onRerun}
        disabled={running}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {running ? <><Spinner /> Re-running…</> : <>Re-run simulation</>}
      </button>
    </div>
  );
}

/* ─────────────────────────────── Small parts ─────────────────────────────── */

function personaStub(p: { id: string; label: string; context: ViewerAgent["context"]; dwellMs: number }): ViewerAgent {
  return { ...p, glanceability: 0, effectiveFixations: effectiveFixations(p.dwellMs), landedOnFocus: false, note: "" };
}

function AgentRow({ agent, selected, onPick }: { agent: ViewerAgent; selected: boolean; onPick: () => void }) {
  return (
    <button
      onClick={onPick}
      className={
        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition " +
        (selected ? "border-orange-300 bg-orange-50/60" : "border-neutral-200 hover:border-orange-200")
      }
    >
      <div className="flex-1">
        <p className="text-sm font-medium text-ink">{agent.label}</p>
        <p className="text-[11px] text-neutral-500">{(agent.dwellMs / 1000).toFixed(1)}s glance · {agent.effectiveFixations} fixations</p>
      </div>
      {agent.glanceability > 0 && (
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-semibold " +
            (agent.glanceability >= 60
              ? "bg-green-100 text-green-700"
              : agent.glanceability >= 35
                ? "bg-amber-100 text-amber-700"
                : "bg-red-100 text-red-700")
          }
        >
          {agent.glanceability}
        </span>
      )}
    </button>
  );
}

function ScoreCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={"rounded-xl border p-3 " + (accent ? "border-orange-200 bg-orange-50/50" : "border-neutral-200")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="mt-1 flex items-end gap-1">
        <span className={"text-2xl font-semibold tabular-nums " + (accent ? "text-orange-600" : "text-ink")}>{value}</span>
        <span className="mb-0.5 text-xs text-neutral-400">/100</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className={"h-full rounded-full " + (accent ? "bg-orange-500" : "bg-neutral-400")} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="mt-0.5 text-neutral-700">{value}</dd>
    </div>
  );
}

function Stat({ label, value, hint, invert }: { label: string; value: number; hint: string; invert?: boolean }) {
  const good = invert ? value <= 45 : value >= 55;
  return (
    <div className="rounded-xl border border-neutral-200 px-2 py-2">
      <p className={"text-lg font-semibold tabular-nums " + (good ? "text-green-600" : "text-neutral-700")}>{value}</p>
      <p className="text-[11px] font-medium text-neutral-600">{label}</p>
      <p className="text-[10px] text-neutral-400">{hint}</p>
    </div>
  );
}

function SegToggle({ value, onChange }: { value: Overlay; onChange: (v: Overlay) => void }) {
  const opts: { v: Overlay; label: string }[] = [
    { v: "heatmap", label: "Heatmap" },
    { v: "scanpath", label: "Scanpath" },
    { v: "clean", label: "Creative" },
  ];
  return (
    <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={
            "rounded-full px-3 py-1.5 text-xs font-medium transition " +
            (value === o.v ? "bg-white text-ink shadow-sm" : "text-neutral-500 hover:text-ink")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ModelChip({ label, sub }: { label: string; sub: string }) {
  return (
    <span className="inline-flex flex-col rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1">
      <span className="text-[11px] font-semibold text-ink">{label}</span>
      <span className="text-[10px] text-neutral-500">{sub}</span>
    </span>
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

function pct(v: number): number {
  return Math.round(v * 100);
}

function fallbackSaliency(): SaliencyResult {
  return { width: 1, height: 1, map: [0.5], fixations: [], peak: 0.5, concentration: 0.5, entropy: 0.5, contrast: 0.5 };
}
