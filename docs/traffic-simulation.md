# SF Traffic Simulation

Peel renders a live traffic simulation on the SF map to give clients a visceral sense of how many people actually flow past each billboard location. This doc explains what's real, what's modeled, and how to defend the numbers in a sales conversation.

## What it shows

Three agent types are rendered as 3D extruded columns via deck.gl:

| Agent | Color | Count |
|---|---|---|
| Pedestrians | Warm cream | ~200 (time-scaled) |
| Vehicles | White/silver | ~80 (time-scaled) |
| Buses | Blue | Live from Muni |

## Data sources

### Buses — real GPS positions

Buses are pulled from SF Muni's public NextBus/Umo live feed with no API key required:

```
https://retro.umoiq.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t=0
```

The `/api/muni-vehicles` route handler proxies this every 30 seconds (ISR-cached to avoid hammering the feed). Each bus on the map is a real Muni vehicle with a real GPS position and route tag. When the feed is healthy, the legend shows a green "NextBus real-time · 30s" badge.

Upgrade path: set `MUNI_511_API_KEY` in your environment to switch to the 511.org SIRI JSON endpoint, which provides richer metadata (line name, next stop, etc.) from the same underlying fleet.

### Road network — OpenStreetMap

Vehicle and pedestrian paths are constrained to SF's actual street geometry, fetched from Overpass API at build time:

```
node scripts/fetch-sf-roads.mjs   # → public/sf-roads.geojson (~13 MB)
```

This produces 52,373 road segments covering:
- **Vehicle roads**: trunk, primary, secondary, tertiary, residential (13,090 segments)
- **Pedestrian ways**: footway, pedestrian, path (39,283 segments)

Each segment carries a `speedMult` calibrated by road class (trunk = 1.4×, residential = 0.65×). Agents follow segment geometry, turn at junctions, and reverse at dead ends.

When the road network loads on the client (~1–2s after map paint), agents silently migrate from a random-walk fallback to road-constrained movement. No visual pop — they were already moving; they just start following streets.

### Pedestrian density — SFMTA intersection counts

Pedestrian spawn locations are weighted by intersection-level foot-traffic data:

```
node scripts/fetch-sf-ped-counts.mjs   # → public/sf-ped-counts.json
```

The script tries the DataSF pedestrian volume dataset (`v74d-emmt`), then two fallback dataset IDs. If all three 404 (as they did as of mid-2025), it falls back to 20 hardcoded SF hotspots with manually calibrated relative weights:

| Intersection | 9am weight |
|---|---|
| Union Square | 1.00 |
| Powell St BART | 0.95 |
| Ferry Building | 0.90 |
| Financial District | 0.88 |
| Market/3rd St | 0.85 |
| ... | ... |

Agents spawn proportionally denser at high-weight intersections. Downtown SoMa/FiDi should visibly show more activity than the Sunset or Twin Peaks.

### Time-of-day scaling

Both pedestrian and vehicle counts scale with a 24-hour demand curve calibrated to SF patterns:

```
[0.10, 0.05, 0.03, 0.03, 0.05, 0.20,   // midnight–5am
 0.60, 0.90, 1.00, 0.80, 0.70, 0.80,   // 6am–11am  ← morning peak at 8am
 0.90, 0.80, 0.70, 0.70, 0.80, 1.00,   // noon–5pm  ← evening peak at 5pm
 0.90, 0.70, 0.60, 0.50, 0.30, 0.20]   // 6pm–11pm
```

Agent count is rechecked every 5 minutes. At 8am the simulation runs at full density; at 3am it runs at ~3–5%.

## What is and isn't real

### Defensible claims

- **"Buses show real GPS positions from SF Muni's live vehicle feed, updated every 30 seconds."**
- **"Pedestrian density is weighted by SFMTA intersection counts and scales by hour of day."**
- **"Vehicles follow SF's actual street network from OpenStreetMap."**

### Known gaps

- **Individual paths are probabilistic.** Once an agent spawns at a real location on a real street, it picks turns at junctions randomly. We know *where* to put them; we don't track individual journeys.
- **Car count is calibrated, not live.** We don't have access to SFMTA loop-detector data for real-time vehicle volume. The 80-agent baseline is a rough SF average; the time-of-day curve scales it.
- **Speed is boosted ~80× for visibility.** Real pedestrians walk at ~1.4 m/s. At zoom 12–14, that's effectively stationary. The simulation runs at 80× to make movement perceptible while keeping agents geo-anchored.
- **Only SF Muni surface vehicles.** BART, Caltrain, and AC Transit vehicles are not shown. Muni Metro (underground) vehicles don't report GPS position.
- **No event-driven spikes.** A Giants game or Dreamforce adds real crowd density that the model doesn't capture.

## Fallback chain

Each data layer degrades independently — the simulation never breaks, it just becomes less precise:

| Data unavailable | Effect |
|---|---|
| `/sf-roads.geojson` 404 | Agents use random walk; still geo-bounded to SF |
| `/sf-ped-counts.json` 404 | Peds spawn uniformly on road network |
| Muni API returns `[]` | Synthetic buses follow 8 hardcoded SF Muni route paths |
| All three fail | Identical to the original v1 simulation — no regression, no console errors |

## Architecture

```
scripts/fetch-sf-roads.mjs        Overpass → public/sf-roads.geojson (build-time)
scripts/fetch-sf-ped-counts.mjs   DataSF  → public/sf-ped-counts.json (build-time)
app/api/muni-vehicles/route.ts    NextBus XML proxy, ISR revalidate=30 (runtime)
app/lib/trafficSim.ts             Road network builder, agent spawning, stepping
app/components/crowdLayers.ts     deck.gl ColumnLayer crowd renderer (body+head stacks)
app/components/Map.tsx            Wires effects: load → poll → RAF → overlay.setProps()
```

The RAF loop runs at ~60fps. At each tick it advances agent positions, then calls `overlay.setProps({ layers: buildCrowdLayers(agents) })`. deck.gl diffs the layer list and only re-uploads changed GPU buffers, so the overhead is proportional to agents that actually moved.
