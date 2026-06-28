# Orangeboard

**Passive outbound for physical ABM.** Find where your ICP physically gathers, then launch the billboard play — placement, creative, attention proof, and outbound — from one workspace.

> Built for the YC AI Growth Hackathon.

---

## Problem you're solving

B2B growth teams pour money into digital outbound, but the inbox is saturated and physical/out-of-home (OOH) advertising is treated as a brand-only, un-targetable channel. Buying a billboard today means:

- You can't easily tell **where your actual target accounts cluster** in a city.
- OOH inventory is opaque — permits, owners, pricing, and visibility all live in scattered city records and broker spreadsheets.
- You have **no way to predict whether the board will actually be seen** before you spend.
- The physical placement never connects back to your CRM or outbound motion, so there's no follow-up loop.

Orangeboard treats a billboard as an account-based marketing (ABM) channel: it finds the streets where your ideal customers concentrate, recommends real permitted inventory there, generates locally-native creative, predicts attention, and hands the matched accounts off to outbound — turning a one-shot brand buy into a measurable, targeted growth play.

## How the app works

The product is a guided pipeline. Each stage feeds the next:

1. **Onboard from a URL.** Drop in a company website. Orangeboard scrapes the homepage and infers a structured **creative brief** (identity, voice, color palette, core message, CTA) and an **ICP** (audience, segment, intent signals).
2. **Find opportunity "blobs."** Against a dataset of San Francisco businesses, the app clusters companies that match the ICP into geographic **opportunity blobs** — e.g. "SoMa SaaS Finance Cluster," "Dreamforce CFO Blitz." Each blob is scored and re-scored live as you edit the ICP.
3. **Pick placements.** For the selected blob, Orangeboard ranks **real, permitted billboard inventory** (SF General Advertising Sign records) by visibility, dwell time, and proximity to target accounts — each with a deep link to the city permit/purchase record.
4. **Generate local creative.** It produces billboard creative tuned to the brief and the street context, then composites it onto the real sign in a 3D scene.
5. **Test attention.** A 3D map of the city runs a crowd + traffic simulation; **Vision Studio** uses a vision-language model to predict what a passer-by actually notices — billboard found / first thing the eye lands on, brand recall, legibility, shareability — from Street View or an uploaded photo.
6. **Export & hand off.** One click renders a **PDF campaign report**, and the **Outbound Queue** runs a live Orange Slice pipeline — real LinkedIn company search against the selected board's audience → enrichment → decision-maker discovery → an AI-drafted pitch email per account (with Fiber AI work-email reveal when available). Without API keys the queue shows a staged preview instead of erroring.

## Notable features

- **URL → creative brief + ICP** — an animated "scan" of the company site that returns a structured brief and ideal-customer profile.
- **Opportunity blobs** — physical-world clusters of ICP companies, scored and live-re-ranked as the ICP is edited.
- **Real permitted inventory** — ranked SF General Advertising Sign records with city permit deep-links, visibility scores, and dwell estimates (not invented placements).
- **AI-generated local creative** — board art generated from the brief and composited onto the actual sign geometry.
- **Depth-correct 3D city** — a Mapbox + deck.gl scene with interleaved 3D buildings, a live **crowd simulation**, **traffic flow**, and pedestrian "vision" agents that capture what they'd see.
- **Vision Studio attention testing** — a VLM scores a street scene for what grabs the eye, brand recall, legibility, and shareability, with a heuristic saliency fallback.
- **Live environment** — current weather and time-of-day (via Open-Meteo) drive the look of the scene.
- **One-click PDF campaign report** and a **live Outbound Queue** — Orange Slice account search, enrichment, decision-maker discovery, and AI-drafted pitch emails (plus Fiber AI email reveal), wired into the app via `/api/outbound` and triggered per board.

## Why we built this

OOH is one of the last large ad channels that's still bought on gut feel. Meanwhile every growth team already knows their ICP and runs ABM digitally. We wanted to ask: **what if a billboard were just another ABM surface** — targetable by account density, generatable, testable before spend, and connected to outbound?

The hackathon was the forcing function to prove the full loop end to end — from a single URL to a placement recommendation, generated creative, an attention prediction, and a queued outbound motion — rather than any one piece in isolation.

## Tech stack

**Framework & UI**
- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- Zod for schema validation

**Maps, 3D & simulation**
- Mapbox GL + `react-map-gl`
- deck.gl (`core`, `layers`, `mapbox`, `react`, `widgets`) for interleaved 3D layers, crowd, and traffic-flow rendering
- three.js + `@react-three/fiber` + `@react-three/drei` for 3D billboard meshes
- `@huggingface/transformers` for in-browser ML (saliency)

**AI & vision**
- OpenAI — `gpt-4o` vision for attention scoring, `gpt-image-1` for creative generation
- Google Street View imagery for real-scene attention testing

**Automation & data**
- Playwright — site screenshots and headless PDF report rendering
- Open-Meteo — live weather / current conditions
- SF Planning **General Advertising Sign Program** records + Accela permit portal for real inventory
- SF roads & pedestrian-count datasets (prefetched at build)
- **Fiber AI** for account enrichment
- **Orange Slice** (`orangeslice`) for the outbound / sales-ops workflow

## Challenges we ran into

- **Compositing 2D creative onto a 3D world correctly.** Getting generated art to sit on the actual sign meant projecting billboard corners and interleaving deck.gl with Mapbox so the creative respects building depth and occlusion instead of floating on top.
- **Making VLM output trustworthy.** Vision models happily return prose; we needed strict JSON, scene-grounded prompts that ignore Street View UI/watermarks, and a heuristic saliency fallback for when the model is unavailable or off-format.
- **Grounding in real inventory.** OOH permit data is messy — we mapped SF General Advertising Sign records to coordinates and purchase links, while being explicit in the UI that pricing, dimensions, and availability still require seller/field verification.
- **Browser-side simulation performance.** Running crowd agents, traffic flow, and pedestrian-vision triggers live in the browser without dropping the frame rate took careful layer budgeting.
- **A coherent end-to-end loop under hackathon time.** Each stage produces the exact input the next stage needs, so the demo holds together from URL to outbound.

## Success stories & metrics

> Demo-stage results — illustrative of what the pipeline produces end to end. Replace with live figures as they're measured.

- **URL → campaign in one sitting:** a single company website produces an inferred brief, ICP, ranked opportunity blobs, recommended permitted boards, generated creative, an attention score, and a queued outbound list — no manual research step.
- **Targeted, not sprayed:** top demo blobs surface dozens of matched ICP accounts around a single corridor (e.g. ~30–50 accounts clustered near one SoMa/Moscone placement), so a single board reaches a dense slice of the pipeline.
- **Spend-saving attention check:** Vision Studio flags low-legibility or low-recall placements *before* purchase, turning a blind brand buy into a pre-tested one.
- **One-click deliverable:** the full campaign package exports to a shareable PDF for stakeholder sign-off.
