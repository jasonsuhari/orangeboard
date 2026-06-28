# Billboard Vision — Detection & Attention

The `/vision` studio answers one question for a real street photo: **how many seconds until a passer-by notices the billboard — if ever.** To do that honestly it has to (1) find the billboard in the frame, and (2) predict where human eyes actually go, *independently* of where the board is. This doc details the ML pipeline, with a focus on the **saliency-content re-rank** that keeps the detector from putting the box on empty sky.

## The headline number

The result panel leads with **Time to notice** (`x.x s avg`, or "never found") plus *"Noticed by N/4 viewers · M% of scene attention."* Everything below — Visibility, Recall, Glanceability, Shareability — is downstream of two inputs: the **billboard box** and the **saliency map**. If the box is wrong, every number is wrong. That is exactly the failure the re-rank fixes.

## Two halves: bottom-up saliency + top-down semantics

The attention model is a hybrid, mirroring how human vision actually works:

- **Bottom-up — `app/lib/saliency.ts`.** A compact Itti–Koch saliency model runs fully client-side on the photo's pixels (no weights, no network). Center–surround contrast across intensity, colour-opponent (R-G / B-Y), and orientation (edge) channels is normalized and fused into a saliency map, then a winner-take-all scanpath with inhibition-of-return predicts the fixation sequence. A `suppressSky` pass knocks down bright, low-texture, upper-frame cells — **humans never fixate empty sky**, and this is the property the re-rank reuses.
- **Top-down — `app/api/vision-simulate` (GPT-4o).** The VLM acts as a synthetic passer-by: it lists everything *else* that involuntarily grabs the eye (faces, people, bright storefront signs, vehicles) with a `draw` score. Those become semantic priors (`withSemanticPriors`) fused into the bottom-up map, so the eye now *competes* for the billboard instead of finding it for free.

The key honesty property: **attention is predicted without knowing where the ad is.** The score is a real overlap between independently-predicted gaze and the located board — no snapping the heatmap to the answer.

## Locating the billboard — three detectors, ranked

A billboard box can come from three sources, ranked so a stronger source never gets overwritten by a weaker one (`BOX_RANK` in `VisionStudio.tsx`):

| Source | Where it runs | How it boxes | Rank |
|---|---|---|---|
| GPT-4o VLM | `/api/vision-simulate` | Describes the scene; returns a rough box | 0 (weakest) |
| NVIDIA Grounding DINO | `/api/detect-billboard` | Open-vocab detector, tight boxes, needs `NVIDIA_API_KEY` | 1 |
| OWL-ViT (Transformers.js) | **In-browser**, opt-in, no key | Open-vocab ONNX model, WebGPU→WASM | 2 |
| Manual drag | The user's cursor | Ground truth | 3 (strongest) |

OWL-ViT (`Xenova/owlvit-base-patch32`, q8-quantized) is the free, zero-key path — it downloads once from the HF CDN and caches in the browser. Being small and quantized, it is **confident but imprecise**, which is where the problem starts.

## The problem: confidence ≠ a real billboard

OWL-ViT is prompted with ad terms (`"a billboard"`, `"an advertising billboard"`, …) and returns up to 12 candidate boxes with confidence scores. The original selection was:

```ts
cands.sort((a, b) => b.score - a.score);
return cands[0];   // highest model confidence wins
```

The only guards were a size filter (drop boxes smaller than 1.5% or larger than 85% of the frame). Nothing checked that the box sat on *actual visual content*. On a real Street View frame, OWL-ViT confidently boxed an **empty patch of sky next to a utility pole** in the upper-left. It passed the size filter, won on raw confidence, and the box was placed over blank sky.

Downstream, the attention model did its job *correctly*: no predicted fixation lands on empty sky (the scanpath plus `suppressSky` guarantee it), so the sim reported **Time to notice: never found, Visibility 1/100, "Blends into the street — no synthetic viewer's eye lands on it."** Garbage box in, garbage score out — the numbers were honest, the box was not.

## The fix: re-rank candidates by saliency content

We already compute, client-side, a signal that knows the difference between a billboard and blank sky: the **bottom-up saliency map** (`baseSalRef` — the pure visual read, before VLM priors, with sky already suppressed). A real billboard is a textured, high-contrast rectangle and sits on high saliency; an empty-sky box sits on near-zero saliency.

So instead of ranking candidates on model confidence alone, we blend in how much real content each box contains:

```ts
// app/lib/owlDetector.ts
const content = scoreBox ? clamp01(scoreBox(c.box)) : 1;   // mean saliency in box, 0–1
rank = c.score * (0.15 + 0.85 * content);
```

```ts
// app/components/VisionStudio.tsx — scorer wired from the saliency map
function saliencyMeanInBox(sal: SaliencyResult, box: Region): number {
  // mean of the normalized saliency map over the box's grid cells, 0–1
}
const scoreBox = base ? (box) => saliencyMeanInBox(base, box) : undefined;
detectBillboard(url, dw, dh, onProgress, scoreBox);
```

The blend weights are deliberate:

- A box over **blank sky** scores `content ≈ 0`, so its rank collapses to `score × 0.15` — an 85% penalty. It can no longer win on confidence alone.
- A **real, textured billboard** scores high `content`, keeping `0.15 + 0.85·content ≈ most of its confidence`.
- The floor of `0.15` (not `0`) means content *demotes* but never fully vetoes the model — if every candidate is low-content, we still return the most content-rich one rather than nothing.

`scoreBox` is **optional**; with no scorer passed, `rank === score` and behavior is identical to before. The saliency knowledge stays in the component (where the map lives); the detector stays a clean, decoupled lib.

### Why this is the right signal

- It's **already computed** — zero extra cost, no extra model, no network. The map is in memory before OWL-ViT is even toggled on.
- It's **physically aligned with the question.** The whole product measures whether eyes land on the board. Ranking the box by where eyes *can* land (saliency) uses the same physics as the score it feeds.
- It's **self-correcting with `suppressSky`.** The same pass that stops the scanpath fixating sky also zeroes the content score of a sky box — one mechanism, two payoffs.

## Predicting "time to notice" — synthetic viewers

Once the box is located, four synthetic viewers (`AGENT_PERSONAS`) each get a real **dwell budget** and we test whether their predicted gaze lands on the box within it:

| Viewer | Dwell | Why |
|---|---|---|
| Phone-glance scroller | 0.6 s | Sees the screenshot online |
| Rushing driver | 1.1 s | One glance from a moving car |
| Passenger / rider | 2.2 s | Relaxed look out the window |
| Sidewalk pedestrian | 4.2 s | Walks past and can dwell |

`effectiveFixations = floor(dwellMs / 230ms)` caps how many scanpath fixations fit the window. `gazeOnRegion` walks those fixations in order; the first one to fall inside the box (plus a small `FOVEAL_MARGIN` of ±2.5% for ~1–2° of foveal coverage) is the **time to notice** for that viewer. `fuseStreet` averages the finders, counts `noticedBy / total`, and computes `regionShare` (fraction of total scene saliency inside the box). Final scores:

- **Visibility** = `0.7·avgGlance + 60·regionShare` — did eyes physically land on it.
- **Recall** = `0.5·brandRecall + 0.2·regionShare + 0.3·legibility` — VLM comprehension weighted by placement.
- **Shareability** = VLM screenshot-worthiness.

## Fallback chain

Each layer degrades independently; the studio never breaks, it just gets less precise:

| Unavailable | Effect |
|---|---|
| `OPENAI_API_KEY` | `heuristicStreetPerception()` — placement/contrast read only, no VLM comprehension |
| `NVIDIA_API_KEY` | No Grounding DINO box; OWL-ViT or VLM box is used |
| OWL-ViT not toggled / model load fails | Falls back to the GPT-4o box; status shows "using GPT-4o box" |
| Saliency unavailable (cross-origin/tainted canvas) | `scoreBox` is `undefined` → detector ranks on confidence only (old behavior); user can drag a box |
| Nothing locates the board | A default guess box + prompt to drag one manually |

## What is and isn't real

### Defensible claims

- **"A bottom-up Itti–Koch saliency model predicts gaze on the actual pixels, client-side — no cloud round-trip."**
- **"Billboard detection re-ranks open-vocabulary boxes by visual saliency, so a confident detection over empty sky is rejected in favor of the real, content-rich board."**
- **"Attention is predicted independently of the ad's location — the score is an honest overlap, not snapped to the answer."**

### Known gaps

- **OWL-ViT is small and quantized.** The re-rank rescues mis-localized boxes when a better candidate exists in the top-12; if the model never proposes a box near the real board, the manual drag is the fallback.
- **The re-rank covers the in-browser OWL-ViT path only.** Server-side Grounding DINO (`/api/detect-billboard`) has no saliency map and still picks top-confidence; its boxes are generally tighter, so it's left as-is.
- **Saliency is a model, not eye-tracking.** It approximates pre-attentive human vision; it is not data from real viewers looking at this specific scene.
- **Dwell budgets are calibrated averages**, not per-person measurements.

## Architecture

```
app/lib/saliency.ts              Itti–Koch saliency, scanpath, suppressSky, semantic priors
app/lib/owlDetector.ts           In-browser OWL-ViT (Transformers.js) + saliency re-rank
app/lib/attention.ts             Dwell-budget agents, gazeOnRegion, time-to-notice, fuseStreet
app/api/detect-billboard/route.ts  NVIDIA Grounding DINO proxy (needs key)
app/api/vision-simulate/route.ts   GPT-4o synthetic viewer + scene elements (needs key)
app/components/VisionStudio.tsx    Orchestrates: saliency → detect → re-rank → simulate → score
```

Flow: upload → `computeSaliency` (bottom-up map, cached in `baseSalRef`) → detectors run in parallel → OWL-ViT candidates re-ranked against `baseSalRef` → box applied by source rank → `simulateStreetAgents` + `fuseStreet` → scores and time-to-notice.
