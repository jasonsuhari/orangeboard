# Orangeboard

**An AI sales engine for out-of-home inventory.**

Orangeboard helps billboard owners turn physical ad inventory into qualified
outbound campaigns. It maps each billboard, analyzes what is around it, enriches
nearby businesses with Fiber AI, ranks who the board is relevant for, generates a
board-specific creative mockup, and drafts the pitch.

Built for the YC AI Growth Hackathon by Orange Slice.

---

## The Thesis

Most billboard sales still happen like a real estate transaction: static
inventory, generic media kits, vague audience claims, and manual outreach.
Orangeboard turns every billboard into a geospatial lead magnet.

The product does not need to claim it knows exactly who walks past a board. The
stronger, defensible claim is:

> Orangeboard identifies commercial context around a billboard, scores the
> board's physical visibility, and turns that signal into targeted advertiser
> outreach.

That makes the growth motion seller-facing:

1. A billboard owner has inventory to sell.
2. Orangeboard analyzes each board's location and visibility.
3. Fiber AI enriches nearby businesses and commercial clusters.
4. Orangeboard ranks advertiser fit and generates a mockup.
5. The seller gets a personalized pitch for each best-fit advertiser.

The 3D map and visibility simulation are not the product by themselves. They are
the proof artifact inside the sales motion.

---

## Product Loop

### 1. Discover Billboard Inventory

Load real billboard positions on a 3D Mapbox map. Each board is represented with
location, address, permit metadata, and eventually physical details like facing,
size, and road context.

### 2. Analyze Physical Visibility

For each board, compute practical visibility signals:

- Line of sight
- Occlusion from buildings
- Apparent size from pedestrian or vehicle paths
- Dwell time
- Time of day and weather context
- Creative saliency

These are the numbers Orangeboard can defend because they come from geometry,
map data, and model outputs rather than made-up conversion claims.

### 3. Find Nearby Businesses

Use a geo source such as Google Maps, Mapbox Places, OpenStreetMap, or Foursquare
to identify businesses and offices near the board.

Example signals:

- SaaS offices near a SoMa board
- Gyms and wellness studios near a residential corridor
- Restaurants, bars, and venues near nightlife-heavy streets
- Coworking spaces and startup offices near transit hubs

This is context detection, not people tracking.

### 4. Enrich With Fiber AI

Fiber AI is the data layer. Once nearby businesses or target accounts are found,
Fiber can enrich them with company intelligence:

- Company name and domain
- Industry and category
- Headcount and growth signals
- Hiring and job-posting signals
- Contact and decision-maker data where available

That turns "there are businesses nearby" into "this board sits inside a fintech,
SaaS, fitness, restaurant, or consumer-retail cluster."

### 5. Rank Advertiser Fit

Orangeboard scores which advertisers should care about the board.

For B2B, the score can include:

```txt
nearby target-account density
  x physical visibility
  x dwell time
  x ICP fit
  x creative suitability
```

For B2C, the score can include:

```txt
local business mix
  x neighborhood context
  x foot/vehicle exposure
  x time-of-day fit
  x creative saliency
```

The output is a ranked list of advertiser opportunities per board.

### 6. Generate Creative Mockups And Pitches

For each advertiser match, Orangeboard generates:

- A creative concept for that exact board
- A mockup in the local scene
- A visibility and context summary
- A personalized outbound pitch

Example pitch:

> This board sits near a dense cluster of fintech and SaaS offices around
> Caltrain, with strong commuter dwell during morning and evening traffic. We
> mocked up a campaign for your ICP and estimated the board's visibility from the
> pedestrian approach path.

---

## Where Orange Slice Fits

Orange Slice can become the GTM workflow layer after the core board intelligence
works.

Orangeboard provides the physical-world signal:

- Billboard
- Nearby businesses
- Fiber enrichment
- Advertiser fit score
- Creative mockup
- Draft pitch

Orange Slice turns that signal into an agentic campaign spreadsheet:

- One row per board-advertiser opportunity
- Enrichment columns
- ICP-fit scoring columns
- Decision-maker lookup
- Personalized copy generation
- Export or push to CRM/outbound tools

The clean separation:

- **Fiber AI**: company and people data layer
- **Orangeboard**: spatial intelligence and proof layer
- **Orange Slice**: campaign workflow and outbound automation layer

---

## Demo Spine

The 90-second demo should end on growth, not just visualization.

1. Pick a billboard on the 3D map.
2. Show nearby businesses and commercial clusters.
3. Enrich the businesses with Fiber AI.
4. Rank the best-fit advertisers.
5. Generate a creative mockup on the board.
6. Show the visibility and dwell proof.
7. Draft the outbound pitch.

One-line demo claim:

> Orangeboard finds who should buy each billboard and gives the seller a
> board-specific pitch with proof.

---

## Real Signals vs Projections

Orangeboard should be explicit about what is computed, estimated, and projected.

**Computed or grounded now:**

- Billboard coordinates
- Nearby businesses
- Commercial category clusters
- Physical visibility
- Dwell time estimates
- Creative saliency
- Fiber-enriched company data

**Modeled estimates:**

- Audience context
- Advertiser fit
- Recall likelihood
- Creative effectiveness

**Future measurement layer:**

- Brand-search lift
- QR or short-code response
- Geofenced conversion lift
- Holdout-market experiments
- ROAS

This boundary keeps the pitch credible. Orangeboard is strongest when it sells
real-world context and visibility as a lead-generation signal, not when it
pretends to have overnight attribution.

---

## Hackathon Track Fit

- **Revenue on Autopilot**: turns billboard inventory into automated outbound.
- **Reading Minds**: detects location-based commercial signals and advertiser
  fit.
- **Sales Cyborgs**: gives sellers AI-generated research, mockups, and pitches.
- **AI Ad Factories**: generates board-specific creative variants.

---

## Map UI Design

The `/map` route overlays a trapezoidal cockpit nav panel on the full-screen 3D
Mapbox view.

The panel sits at the bottom-center of the viewport. Its outer container is a
fixed-size div (`580 x 96 px`), and a CSS `clip-path` trapezoid gives it the
console silhouette:

```css
clip-path: polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%);
```

A `filter: drop-shadow()` on the wrapper projects a shadow that follows the
clipped shape.

| Property | Value |
| --- | --- |
| Background | `rgba(255, 255, 255, 0.94)` |
| Blur | `backdrop-filter: blur(14px)` |
| Top rule | `1px solid rgba(0,0,0,0.08)` |
| Active color | `#f97316` |
| Inactive color | `#737373` |

Labels use `ui-monospace` at `8.5px`, uppercase, with restrained white surfaces,
1 px rules, and a single brand-orange accent.

---

## Stack

- **Next.js** and **TypeScript**: app framework
- **Mapbox GL**: 3D map, billboard placement, scene preview
- **Fiber AI**: business and company enrichment
- **Orange Slice**: later campaign spreadsheet and outbound workflow
- **LLM creative generation**: board-specific ad concepts and pitches

---

## Getting Started

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

---

## Billboard Data

Real San Francisco billboard inventory ships in `data/`, scraped from SF
Planning's General Advertising Sign Program (GASP), the city's registry of
permitted billboards. The current dataset contains 559 signs with exact
coordinates.

| File | Use |
| --- | --- |
| `data/sf-billboards.geojson` | Mapbox-ready `FeatureCollection` of points |
| `data/sf-billboards.csv` | Spreadsheet and analysis format |

### Refresh The Data

```bash
node scripts/scrape-billboards.mjs
```

This re-pulls the live inventory and rewrites both files in `data/`. No API key
is needed.

### Fields Per Sign

| Field | Meaning |
| --- | --- |
| `lon`, `lat` / `geometry.coordinates` | Exact WGS84 position |
| `address`, `record_name` | Street location |
| `record_status`, `record_status_date` | Permit status |
| `date_opened`, `date_closed` | Permit lifecycle |
| `record_id`, `acalink`, `aalink` | City permit number and Accela links |
| `planner_name`, `planner_email`, `planner_phone` | Assigned city planner |

### Access From Code

To `fetch()` the GeoJSON client-side, it must be under `public/`, or imported
directly from the app.

```ts
const res = await fetch("/sf-billboards.geojson");
const billboards = await res.json();

map.addSource("billboards", { type: "geojson", data: billboards });
map.addLayer({
  id: "billboards",
  type: "circle",
  source: "billboards",
  paint: { "circle-radius": 5, "circle-color": "#ff7a00" },
});
```

GASP is physical inventory, not a rental marketplace. Bookable listing metadata
such as dimensions, daily impressions, CPM, and pricing would come from
commercial OOH platforms or seller-provided data.
