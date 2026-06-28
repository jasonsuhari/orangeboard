"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AttentionSimResult, Region, SaliencyResult, SceneElement, ViewerAgent, VlmPerception } from "../lib/types";
import { computeSaliency, withSemanticPriors } from "../lib/saliency";
import {
  AGENT_PERSONAS,
  effectiveFixations,
  fuseStreet,
  heuristicStreetPerception,
  simulateStreetAgents,
} from "../lib/attention";
import { drawCover, drawHeatmap, drawRegionBox, drawScanpath } from "../lib/canvasDraw";
import { detectBillboard, isDetectorLoaded } from "../lib/owlDetector";

type BoxSource = "nvidia" | "vlm" | "manual" | "owlvit";
const BOX_RANK: Record<BoxSource, number> = { vlm: 0, nvidia: 1, owlvit: 2, manual: 3 };

/* ──────────────────────────────────────────────────────────────────────────
   Vision Studio — /vision

   Upload a real street photo that contains a billboard. The bottom-up saliency
   engine predicts where the eye goes; the VLM locates the billboard and reacts
   to the scene; synthetic viewers each get a dwell budget and we measure the
   headline question: how many seconds until they notice the board — if ever.
   ────────────────────────────────────────────────────────────────────────── */

type Overlay = "heatmap" | "scanpath" | "clean";
const MAX_W = 960;

export default function VisionStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);
  const baseSalRef = useRef<SaliencyResult | null>(null); // bottom-up only, before priors
  const autoRef = useRef<string | null>(null); // which src we've auto-analyzed
  const [dims, setDims] = useState({ w: MAX_W, h: Math.round((MAX_W * 9) / 16) });

  const [src, setSrc] = useState<string | null>(null);
  const [saliency, setSaliency] = useState<SaliencyResult | null>(null);
  const [elements, setElements] = useState<SceneElement[]>([]);
  const [tainted, setTainted] = useState(false);

  const [overlay, setOverlay] = useState<Overlay>("heatmap");
  const [agentId, setAgentId] = useState("driver");
  const [reveal, setReveal] = useState(1);

  const [region, setRegion] = useState<Region | null>(null);
  const [boxSource, setBoxSource] = useState<BoxSource | null>(null);
  const boxSourceRef = useRef<BoxSource | null>(null);
  const [dragRect, setDragRect] = useState<Region | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  // Free in-browser OWL-ViT detector (no key).
  const [useOwl, setUseOwl] = useState(false);
  const [owlStatus, setOwlStatus] = useState<"idle" | "loading" | "running" | "ready" | "error">("idle");
  const [owlPct, setOwlPct] = useState(0);
  const owlRanRef = useRef<string | null>(null);

  /* Apply a detected box, but never let a weaker source overwrite a stronger one
     (manual > OWL-ViT > NVIDIA > GPT-4o). */
  const applyBox = useCallback((box: Region, source: BoxSource) => {
    const cur = boxSourceRef.current;
    if (cur && BOX_RANK[source] < BOX_RANK[cur]) return;
    boxSourceRef.current = source;
    setBoxSource(source);
    setRegion(box);
  }, []);

  const [perception, setPerception] = useState<VlmPerception | null>(null);
  const [result, setResult] = useState<AttentionSimResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const persona = AGENT_PERSONAS.find((p) => p.id === agentId) ?? AGENT_PERSONAS[1];

  const agents = useMemo<ViewerAgent[]>(
    () => (saliency && region ? simulateStreetAgents(saliency, region) : []),
    [saliency, region],
  );

  /* ── Load an uploaded file → image → saliency ── */
  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setErr("Please drop an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  /* Pull an image out of a drop / paste — file, dragged web image, or URL. */
  const ingest = useCallback(
    (dt: DataTransfer | null): boolean => {
      if (!dt) return false;
      const file = Array.from(dt.files || []).find((f) => f.type.startsWith("image/"));
      if (file) {
        loadFile(file);
        return true;
      }
      for (const item of Array.from(dt.items || [])) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            loadFile(f);
            return true;
          }
        }
      }
      const uri = (dt.getData("text/uri-list") || dt.getData("text/plain") || "").split("\n")[0].trim();
      if (/^(https?:|data:image\/)/i.test(uri)) {
        setSrc(uri);
        return true;
      }
      const html = dt.getData("text/html");
      const m = html && html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (m) {
        setSrc(m[1]);
        return true;
      }
      setErr("Couldn't read that — try saving the image and dropping the file.");
      return false;
    },
    [loadFile],
  );

  /* Catch drops/paste anywhere on the page so a near-miss doesn't open the file. */
  useEffect(() => {
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      ingest(e.dataTransfer);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onPaste = (e: ClipboardEvent) => {
      if (ingest(e.clipboardData)) e.preventDefault();
    };
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("paste", onPaste);
    };
  }, [ingest]);

  useEffect(() => {
    if (!src) return;
    setSaliency(null);
    setElements([]);
    setRegion(null);
    setBoxSource(null);
    boxSourceRef.current = null;
    setResult(null);
    setPerception(null);
    setErr(null);
    setTainted(false);
    setOwlStatus("idle");
    setOwlPct(0);
    baseSalRef.current = null;

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const w = Math.min(MAX_W, img.width);
      const h = Math.round((w * img.height) / img.width);
      setDims({ w, h });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const sal = computeSaliency(ctx.getImageData(0, 0, w, h));
        baseSalRef.current = sal;
        setSaliency(sal);
      } catch {
        setTainted(true);
      }
    };
    img.onerror = () => setErr("Could not load that image.");
    img.src = src;
  }, [src]);

  /* ── Auto-detect the billboard the moment the saliency map is ready ── */
  useEffect(() => {
    if (saliency && src && !analyzing && autoRef.current !== src) {
      autoRef.current = src;
      void analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saliency, src]);

  /* ── Free in-browser OWL-ViT detection (opt-in, no key) ── */
  useEffect(() => {
    if (!useOwl || !src || tainted) return;
    if (owlRanRef.current === src) return;
    owlRanRef.current = src;
    let cancelled = false;
    (async () => {
      try {
        setOwlStatus(isDetectorLoaded() ? "running" : "loading");
        const img = imgRef.current;
        const w = img?.naturalWidth || dims.w;
        const h = img?.naturalHeight || dims.h;
        const dw = Math.min(768, w);
        const dh = Math.round((dw * h) / w);
        const url = img ? rasterize(img, dw, dh, 0.85) ?? src : src;
        // Re-rank OWL-ViT boxes against the bottom-up saliency map (sky already
        // suppressed) so a confident box over empty sky loses to a real board.
        const base = baseSalRef.current;
        const scoreBox = base ? (box: Region) => saliencyMeanInBox(base, box) : undefined;
        const hit = await detectBillboard(
          url,
          dw,
          dh,
          (p) => {
            if (cancelled) return;
            if (p.status === "progress" && typeof p.progress === "number") setOwlPct(Math.round(p.progress));
            if (p.status !== "progress" && p.status !== "done") setOwlStatus("loading");
            if (p.status === "ready" || p.status === "done") setOwlStatus("running");
          },
          scoreBox,
        );
        if (cancelled) return;
        if (hit) applyBox(hit.box, "owlvit");
        else setErr("OWL-ViT didn't find a billboard — try the box drag or another shot.");
        setOwlStatus("ready");
      } catch (e) {
        if (cancelled) return;
        console.error("OWL-ViT detection failed:", e);
        setOwlStatus("error");
        setErr("In-browser detector failed to load — staying on the GPT-4o box.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useOwl, src, tainted]);

  /* ── Animate scanpath reveal ── */
  useEffect(() => {
    if (!saliency || overlay !== "scanpath") {
      setReveal(1);
      return;
    }
    const eff = effectiveFixations(persona.dwellMs);
    const duration = Math.min(2800, eff * 260);
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

  /* ── Composite the scene + overlays + box ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCover(ctx, img, canvas.width, canvas.height);
    if (saliency && overlay === "heatmap") drawHeatmap(ctx, saliency);
    if (saliency && overlay === "scanpath") drawScanpath(ctx, saliency, persona.dwellMs, reveal);
    const box = dragRect ?? region;
    if (box) {
      const label = dragRect
        ? "Drag to mark billboard"
        : boxSource === "nvidia"
          ? "Billboard · Grounding DINO"
          : boxSource === "owlvit"
            ? "Billboard · OWL-ViT"
            : boxSource === "manual"
              ? "Billboard · you"
              : "Billboard";
      drawRegionBox(ctx, box, label);
    }
  }, [saliency, overlay, persona.dwellMs, reveal, region, dragRect, boxSource]);

  /* ── Recompute scores when the region or perception changes ──
     The region is the *localized* ad box; attention is predicted independently,
     so the score is an honest overlap (no snapping to where attention already is). */
  useEffect(() => {
    if (!saliency || !region) return;
    const p = perception ?? heuristicStreetPerception();
    setResult(fuseStreet(saliency, p, simulateStreetAgents(saliency, region), region));
  }, [saliency, region, perception]);

  /* ── Drag to mark the billboard ── */
  function evtToNorm(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  }
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!saliency) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = evtToNorm(e);
    setDragRect({ ...dragStart.current, w: 0, h: 0 });
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragStart.current) return;
    const c = evtToNorm(e);
    const s = dragStart.current;
    setDragRect({ x: Math.min(s.x, c.x), y: Math.min(s.y, c.y), w: Math.abs(c.x - s.x), h: Math.abs(c.y - s.y) });
  }
  function onPointerUp() {
    const r = dragRect;
    dragStart.current = null;
    setDragRect(null);
    if (r && r.w > 0.03 && r.h > 0.03) applyBox(r, "manual");
  }

  /* ── Run scene analysis: GPT-4o (semantics) + Grounding DINO (box), in parallel ── */
  async function analyze() {
    if (analyzing || !saliency) return;
    setAnalyzing(true);
    setErr(null);
    try {
      const canvas = canvasRef.current;
      const img = imgRef.current;

      // Full-res JPEG for the VLM, small JPEG for the detector (inline-size limit).
      let png = src ?? "";
      let det: { url: string; w: number; h: number } | null = null;
      if (canvas && img && !tainted) {
        png = rasterize(img, canvas.width, canvas.height, 0.9) ?? png;
        const dw = Math.min(640, canvas.width);
        const dh = Math.round((dw * canvas.height) / canvas.width);
        const durl = rasterize(img, dw, dh, 0.62);
        if (durl) det = { url: durl, w: dw, h: dh };
      }

      const vlmP = fetch("/api/vision-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: png, mode: "street", context: persona.blurb }),
      })
        .then((r) => r.json())
        .catch(() => null);

      const detP = det
        ? fetch("/api/detect-billboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: det.url, imageW: det.w, imageH: det.h }),
          })
            .then((r) => r.json())
            .catch(() => null)
        : Promise.resolve(null);

      const [j, d] = (await Promise.all([vlmP, detP])) as [
        { perception?: VlmPerception; billboardBox?: Region | null; elements?: SceneElement[] } | null,
        { box?: Region | null; source?: string } | null,
      ];

      const p = j?.perception ?? heuristicStreetPerception();
      const els = j?.elements ?? [];
      setPerception(p);
      setElements(els);

      // Fuse the VLM's distractors (faces, people, bright signs) as top-down
      // priors into the bottom-up map — the eye now competes for the billboard.
      const base = baseSalRef.current;
      if (base) {
        const priors = els
          .filter((e) => !e.isBillboard)
          .map((e) => ({
            cx: e.box.x + e.box.w / 2,
            cy: e.box.y + e.box.h / 2,
            r: Math.max(e.box.w, e.box.h) / 2,
            weight: e.draw / 100,
          }));
        setSaliency(priors.length ? withSemanticPriors(base, priors) : base);
      }

      // Prefer NVIDIA's tight box; fall back to the VLM box, then a guess.
      // applyBox won't override a stronger source (OWL-ViT / manual) if one ran.
      const detBox = d?.box ?? null;
      const vlmBox = j?.billboardBox ?? null;
      if (detBox) {
        applyBox(detBox, "nvidia");
      } else if (vlmBox) {
        applyBox(vlmBox, "vlm");
      } else if (!boxSourceRef.current) {
        applyBox({ x: 0.34, y: 0.18, w: 0.32, h: 0.22 }, "vlm");
        setErr("Couldn't auto-locate the billboard — drag a box over it, or use the in-browser detector.");
      }
    } catch {
      setPerception(heuristicStreetPerception());
      setErr("Scene analysis failed — showing the saliency read only.");
    } finally {
      setAnalyzing(false);
    }
  }

  /* ── Empty state: uploader ── */
  if (!src) return <Uploader onFile={loadFile} err={err} />;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Stage */}
      <div className="lg:col-span-3">
        <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900">
          <canvas
            ref={canvasRef}
            width={dims.w}
            height={dims.h}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="block w-full cursor-crosshair touch-none select-none"
          />
          {!saliency && !tainted && (
            <div className="absolute inset-0 grid place-items-center bg-neutral-900/40 text-sm text-white/80">
              Running saliency model…
            </div>
          )}
          {tainted && (
            <div className="absolute inset-x-0 bottom-0 bg-black/70 px-3 py-2 text-center text-[11px] text-white/85">
              This image is cross-origin, so the heatmap is off — drag a box over the billboard and hit
              Analyze (the VLM still reads it).
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
            {overlay === "heatmap"
              ? "Attention heatmap"
              : overlay === "scanpath"
                ? `Gaze scanpath · ${persona.label}`
                : "Street scene"}
          </div>
        </div>

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
          <button
            onClick={() => setSrc(null)}
            className="ml-auto rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:text-ink"
          >
            New image
          </button>
        </div>

        {/* Free, no-key in-browser detector */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setUseOwl((v) => !v)}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition " +
              (useOwl
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : "border-neutral-200 text-neutral-600 hover:border-orange-200")
            }
          >
            <span className={"h-1.5 w-1.5 rounded-full " + (useOwl ? "bg-orange-500" : "bg-neutral-300")} />
            Detect in-browser (OWL-ViT) · free, no key
          </button>
          {useOwl && (
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              {owlStatus === "loading" && <><Spinner /> Downloading model… {owlPct}%</>}
              {owlStatus === "running" && <><Spinner /> Detecting…</>}
              {owlStatus === "ready" && boxSource === "owlvit" && <span className="text-green-600">Located by OWL-ViT ✓</span>}
              {owlStatus === "ready" && boxSource !== "owlvit" && "No box found"}
              {owlStatus === "error" && <span className="text-amber-600">Load failed — using GPT-4o box</span>}
            </span>
          )}
        </div>

        {saliency && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Focus" value={pct(saliency.concentration)} hint="single focal point" />
            <Stat label="Clutter" value={pct(saliency.entropy)} hint="competing hotspots" invert />
            <Stat label="Contrast" value={pct(saliency.contrast)} hint="reads at distance" />
          </div>
        )}
        <p className="mt-2 text-xs text-neutral-400">
          Tip: drag a box directly on the image to mark the billboard yourself.
        </p>
      </div>

      {/* Controls + results */}
      <div className="lg:col-span-2">
        {!result ? (
          <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              {analyzing && <Spinner />}
              {analyzing ? "Locating the billboard & competitors…" : "Find the billboard"}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              The VLM auto-detects the board and everything else fighting for the eye; then we measure
              how fast each viewer's gaze lands on it.
            </p>
            <div className="mt-3 space-y-2">
              {(agents.length ? agents : AGENT_PERSONAS.map(stub)).map((a) => (
                <AgentRow key={a.id} agent={a} selected={a.id === agentId} onPick={() => { setAgentId(a.id); setOverlay("scanpath"); }} />
              ))}
            </div>
            {!analyzing && (
              <button
                onClick={analyze}
                disabled={!saliency}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Re-run detection →
              </button>
            )}
            {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
          </div>
        ) : (
          <StreetResult result={result} elements={elements} analyzing={analyzing} onRerun={analyze} err={err} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Uploader ─────────────────────────────── */

function Uploader({ onFile, err }: { onFile: (f: File) => void; err: string | null }) {
  const [over, setOver] = useState(false);
  return (
    <div className="mx-auto max-w-2xl">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={() => setOver(false)}
        className={
          "flex aspect-[16/9] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition " +
          (over ? "border-orange-400 bg-orange-50" : "border-neutral-300 bg-neutral-50 hover:border-orange-300 hover:bg-orange-50/40")
        }
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-orange-600">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 16V4m0 0L7 9m5-5l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <p className="mt-4 text-lg font-semibold text-ink">Drop a street photo with a billboard</p>
        <p className="mt-1 text-sm text-neutral-500">click to browse · or paste (⌘/Ctrl+V) · JPG / PNG</p>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>
      {err && <p className="mt-3 text-center text-sm text-red-600">{err}</p>}
    </div>
  );
}

/* ─────────────────────────────── Result ─────────────────────────────── */

function StreetResult({
  result,
  elements,
  analyzing,
  onRerun,
  err,
}: {
  result: AttentionSimResult;
  elements: SceneElement[];
  analyzing: boolean;
  onRerun: () => void;
  err: string | null;
}) {
  const { scores, perception, verdict, street } = result;
  const ttn = street?.timeToNoticeMs ?? null;
  const competitors = elements.filter((e) => !e.isBillboard).sort((a, b) => b.draw - a.draw).slice(0, 4);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5">
      {/* Headline: time to notice */}
      <div className="rounded-2xl bg-ink p-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-300">Time to notice</p>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-4xl font-semibold tabular-nums">{ttn !== null ? (ttn / 1000).toFixed(1) : "—"}</span>
          <span className="mb-1 text-sm text-neutral-400">{ttn !== null ? "s avg" : "never found"}</span>
        </div>
        {street && (
          <p className="mt-1 text-xs text-neutral-400">
            Noticed by {street.noticedBy}/{street.total} viewers · {Math.round(street.regionShare * 100)}% of scene attention
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <ScoreCard label="Visibility" value={scores.visibility} accent />
        <ScoreCard label="Recall" value={scores.recall} accent />
        <ScoreCard label="Glanceability" value={scores.glanceability} />
        <ScoreCard label="Shareability" value={scores.shareability} />
      </div>
      <p className="mt-1 text-[10px] text-neutral-400">
        Visibility &amp; Glanceability — saliency model. Recall &amp; Shareability — VLM estimates.
      </p>

      <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800">{verdict}</p>

      {competitors.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">Stealing the eye</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {competitors.map((c, i) => (
              <span
                key={`${c.label}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-700"
              >
                {c.label}
                <span className="font-semibold text-orange-600">{c.draw}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Passer-by report</span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
            {perception.source === "vlm" ? "VLM · gpt-4o" : "heuristic"}
          </span>
        </div>
        <dl className="mt-3 space-y-2.5 text-sm">
          <ReportRow label="Notices first" value={perception.noticedFirst} />
          <ReportRow label="Billboard says" value={perception.message} />
          <ReportRow label="Remembers (5s)" value={perception.fiveSecondMemory} />
        </dl>
        <p className="mt-3 border-t border-neutral-100 pt-3 text-sm text-neutral-600">
          <span className="font-medium text-ink">Fix:</span> {perception.critique}
        </p>
      </div>

      {err && <p className="mt-3 text-xs text-amber-600">{err}</p>}

      <button
        onClick={onRerun}
        disabled={analyzing}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-neutral-50 disabled:opacity-50"
      >
        {analyzing ? <><Spinner /> Re-analyzing…</> : <>Re-analyze</>}
      </button>
    </div>
  );
}

/* ─────────────────────────────── Small parts ─────────────────────────────── */

function stub(p: { id: string; label: string; context: ViewerAgent["context"]; dwellMs: number }): ViewerAgent {
  return { ...p, glanceability: 0, effectiveFixations: effectiveFixations(p.dwellMs), landedOnFocus: false, note: "" };
}

function AgentRow({ agent, selected, onPick }: { agent: ViewerAgent; selected: boolean; onPick: () => void }) {
  const scored = agent.note !== "";
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
        <p className="text-[11px] text-neutral-500">
          {scored ? agent.note : `${(agent.dwellMs / 1000).toFixed(1)}s glance · ${agent.effectiveFixations} fixations`}
        </p>
      </div>
      {scored && (
        <span
          className={
            "rounded-full px-2 py-0.5 text-xs font-semibold " +
            (agent.found ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")
          }
        >
          {agent.found ? `${((agent.foundAtMs ?? 0) / 1000).toFixed(1)}s` : "miss"}
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
    { v: "clean", label: "Photo" },
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

/** Mean saliency (0–1) inside a normalized box — how much real visual content
 *  a candidate billboard region actually contains. Empty sky scores ~0. */
function saliencyMeanInBox(sal: SaliencyResult, box: Region): number {
  const { width: w, height: h, map } = sal;
  const x0 = Math.max(0, Math.floor(box.x * w));
  const x1 = Math.min(w, Math.ceil((box.x + box.w) * w));
  const y0 = Math.max(0, Math.floor(box.y * h));
  const y1 = Math.min(h, Math.ceil((box.y + box.h) * h));
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += map[y * w + x];
      count++;
    }
  }
  return count ? sum / count : 0;
}

/** Draw an image to an offscreen canvas and return a JPEG data URL (or null). */
function rasterize(img: HTMLImageElement, w: number, h: number, quality: number): string | null {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  try {
    return c.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}
