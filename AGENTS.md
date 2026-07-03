@orangeslice-docs/AGENTS.md

# Peel (orangeboard) — Engineering Guide

Peel is an OOH (out-of-home) billboard campaign prototype: a marketing landing page with a
waitlist, plus a 3D San Francisco map demo that simulates street-level attention on billboards
and generates AI campaign briefs, creatives, and reports. See `README.md` for the product
thesis; this file is the canonical source for repo-specific engineering rules.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4
- deck.gl 9 interleaved with mapbox-gl 3 for the 3D map; three.js for billboard meshes
- Playwright (production dep) — server-side PDF rendering for `/api/campaign-report` only
- Convex is configured for deployment (`convex/health.ts`) but not yet used by app code
- OpenAI APIs power brief/creative/vision-agent generation, with heuristic fallbacks when
  `OPENAI_API_KEY` is unset — the app must keep working with zero keys configured

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server via `scripts/dev-server.mjs` (guards against concurrent servers, uses `.next-dev/`) |
| `npm run dev:clean` | Same, but clears the `.next-dev/` cache first |
| `npm run typecheck` | `tsc --noEmit` — must pass before every commit |
| `npm run lint` | `eslint .` (flat config) — zero errors required; don't add new warnings |
| `npm run build` | `prefetch` (SF roads + pedestrian counts) then `next build` |
| `npm run prefetch` | Regenerates `public/sf-roads.geojson` and `public/sf-ped-counts.json` (both committed) |
| `npm run cache-brief` | Pre-generates company brief cache into `data/brief-cache/` |

Node version is pinned in `.nvmrc`. Never start a second dev server by calling `next dev`
directly — always go through `npm run dev`.

## Architecture map

- `app/page.tsx` — marketing landing page + waitlist (the shipped surface)
- `app/map/` — the demo app: `app/components/Map.tsx` orchestrates deck.gl layers, the
  crowd/traffic simulation loop, the onboarding flow, and the pedestrian vision journal
- `app/components/map/` — extracted map modules (constants, onboarding overlays, journal panels)
- `app/components/onboarding/` — onboarding dialog constants, helpers, and stylesheet
- `app/sightline/`, `app/vision/` — secondary demo routes (reachable by URL, not linked from
  the landing page)
- `app/lib/` — shared logic. Server-only helpers live under `app/lib/server/`. Report
  generation is `app/lib/campaignReport.ts` (facade) + `app/lib/campaignReport/` modules;
  brief scraping/generation is `app/lib/companyBrief.ts` (facade) + sibling modules
- `app/api/*/route.ts` — route handlers; all degrade gracefully (empty/heuristic responses)
  when upstream keys are missing
- `scripts/` — build-time prefetch (`fetch-sf-*.mjs`, wired into `npm run build`) and manual
  data-pipeline scripts (`scrape-billboards.mjs` → `billboard-buying-data.mjs`)
- `data/`, `public/*.geojson`, `public/sf-ped-counts.json` — committed datasets; regenerate
  with `npm run prefetch` / the manual scripts, don't hand-edit

## Environment variables

All optional unless noted; the app falls back to heuristics/synthetic data without them.
Copy `.env.example` to `.env.local` to configure. Never commit secrets.

- `NEXT_PUBLIC_MAPBOX_TOKEN` — required for the map routes to render at all
- `OPENAI_API_KEY` (+ `OPENAI_BRIEF_MODEL`, `OPENAI_VISION_MODEL`, `OPENAI_IMAGE_MODEL`,
  `OPENAI_IMAGE_MODEL_LIVE`, `OPENAI_IMAGE_QUALITY_LIVE`, `OPENAI_IMAGE_ENDPOINT`,
  `OPENAI_PED_AGENT_MODEL`, `OPENAI_CHAT_MODEL`) — briefs, creatives, vision agents
- `GOOGLE_MAPS_API_KEY` — Street View composites
- `NVIDIA_API_KEY`, `NVIDIA_GDINO_URL` — billboard detection
- `ORANGESLICE_API_KEY`, `FIBER_API_KEY` — outbound workflows
- `MUNI_511_API_KEY` — richer transit feed (falls back to public NextBus)
- `CONVEX_DEPLOY_KEY` — deploy-time only (`scripts/vercel-build.mjs`)

## Engineering practices

### Validation gates
- `npm run typecheck` and `npm run lint` must pass before every commit. CI enforces both plus
  a production build on every PR.
- For changes to the simulation loop, deck.gl layers, or route handlers, also run
  `npx next build` locally — prerendering catches things `tsc` doesn't.
- There is no test suite yet. If you add one, use Vitest, colocate tests as `*.test.ts`, and
  wire it into `.github/workflows/ci.yml`.

### Module size and shape
- Soft cap ~400 lines per file. `Map.tsx` once hit 3,900 lines and had to be dismantled —
  don't let a file grow past the cap without splitting view / state / pure helpers.
- Pure logic goes in `app/lib/` (server-only code under `app/lib/server/`); React pieces stay
  in `app/components/`. New client component files start with `"use client"`.
- No large inline `<style>` template strings — use a stylesheet (see
  `app/components/onboarding/onboarding.css`) or Tailwind classes.
- Facades: `app/lib/campaignReport.ts` and `app/lib/companyBrief.ts` re-export their module
  folders. Keep import paths stable through those facades.

### Type safety
- `strict` TypeScript; `@typescript-eslint/no-explicit-any` is an error. Type every
  `res.json()` / `JSON.parse` result at the boundary with a minimal shape type — don't cast
  through `any` to silence the compiler.

### API routes
- Route caching/config directives (`revalidate`, `runtime`, `maxDuration`, `dynamic`,
  `Cache-Control`) are intentional per route — don't normalize or change them casually.
- Missing upstream keys must degrade (empty array, heuristic result, `configured: false`),
  never 500. Follow the existing pattern in `app/api/muni-vehicles/route.ts`.
- Reuse `app/lib/server/` helpers (JSON body parsing, OpenAI chat calls) instead of copying
  fetch scaffolding into new routes.

### Dead code
- Delete superseded code in the same PR that supersedes it; git history is the archive.
- BUT: several modules are staged future work with no callers yet (e.g. outbound flows,
  campaign-buildings). Before deleting an "unused" module, check `git log` recency and ask if
  it was touched recently.

### Git
- Branches: `feat/…`, `fix/…`, `chore/…` (kebab-case). Commits: Conventional Commits.
- Keep refactor commits separate from behavior changes.
- Line endings are normalized to LF via `.gitattributes`; build artifacts
  (`tsconfig.tsbuildinfo`, `.next*/`) stay untracked.

## Deployment

Vercel builds via `npm run vercel-build` (`scripts/vercel-build.mjs`): when
`CONVEX_DEPLOY_KEY` is present it deploys Convex and then builds Next; otherwise it just runs
`npm run build`. CI (`.github/workflows/ci.yml`) is the quality gate; Vercel's Git
integration is the CD pipeline — merged `main` deploys automatically.
