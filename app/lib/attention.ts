import type {
  AttentionSimResult,
  CompanyBrief,
  Region,
  SaliencyResult,
  ViewerAgent,
  VlmPerception,
} from "./types";
import { FIXATION_MS } from "./saliency";

/* ──────────────────────────────────────────────────────────────────────────
   Agent fusion — the human-visibility + comprehension layer.

   Synthetic viewer agents each get a real dwell budget (a phone-scroller has
   well under a second; a pedestrian can dwell). Only the fixations that fit in
   that window register — this is the *visibility* physics. The bottom-up
   saliency (where the eye goes) is then fused with the top-down VLM perception
   (what the mind takes away) into calibrated visibility + recall scores.
   ────────────────────────────────────────────────────────────────────────── */

export interface AgentPersona {
  id: string;
  label: string;
  context: ViewerAgent["context"];
  dwellMs: number;
  blurb: string;
}

/** The four synthetic viewers we simulate. Ordered shortest → longest dwell. */
export const AGENT_PERSONAS: AgentPersona[] = [
  { id: "scroller", label: "Phone-glance scroller", context: "scrolling", dwellMs: 600, blurb: "Sees the screenshot online — under a second" },
  { id: "driver", label: "Rushing driver", context: "driving", dwellMs: 1100, blurb: "One glance from a moving car" },
  { id: "passenger", label: "Passenger / rider", context: "passenger", dwellMs: 2200, blurb: "Looks out the window, relaxed" },
  { id: "pedestrian", label: "Sidewalk pedestrian", context: "walking", dwellMs: 4200, blurb: "Walks past and can dwell" },
];

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** A cluttered creative (high entropy) needs more fixations to comprehend. */
function fixationsToComprehend(s: SaliencyResult): number {
  return clamp(2 + s.entropy * 6, 2, 9);
}

/** Number of fixations that fit inside a dwell window. */
export function effectiveFixations(dwellMs: number): number {
  return Math.max(1, Math.floor(dwellMs / FIXATION_MS));
}

export function simulateAgents(s: SaliencyResult, personas: AgentPersona[] = AGENT_PERSONAS): ViewerAgent[] {
  const need = fixationsToComprehend(s);
  return personas.map((p) => {
    const eff = effectiveFixations(p.dwellMs);
    const captured = s.fixations.slice(0, eff);
    const avgStrength = captured.length
      ? captured.reduce((a, f) => a + f.strength, 0) / captured.length
      : 0;
    const coverage = clamp(eff / need, 0, 1);
    const peakFactor = 0.4 + 0.6 * s.peak; // a weak creative caps everyone out
    const glance = clamp(100 * peakFactor * (0.55 * coverage + 0.45 * avgStrength), 0, 100);
    const landed = eff >= need * 0.6 && (captured[0]?.strength ?? 0) > 0.45;
    return {
      id: p.id,
      label: p.label,
      context: p.context,
      dwellMs: p.dwellMs,
      glanceability: Math.round(glance),
      effectiveFixations: eff,
      landedOnFocus: landed,
      note: landed
        ? "Locked onto the focal point in time"
        : eff < need
          ? "Looked away before the message landed"
          : "Attention scattered — no clear hook",
    };
  });
}

function makeVerdict(visibility: number, recall: number, shareability: number): string {
  if (visibility >= 70 && recall >= 65) return "Stops the eye and sticks — strong OOH creative.";
  if (visibility >= 70 && recall < 50) return "Grabs attention but the message slips away. Tighten the hook.";
  if (visibility < 45) return "Gets lost at a glance. Needs a single dominant focal point.";
  if (shareability >= 70) return "Built to be screenshotted — lean into the virality.";
  if (recall >= 65) return "Memorable, but it has to fight to be noticed first.";
  return "Reads as average OOH — competent, not yet arresting.";
}

/** Fuse bottom-up saliency, agent visibility, and VLM comprehension. */
export function fuse(
  s: SaliencyResult,
  perception: VlmPerception,
  agents: ViewerAgent[],
): AttentionSimResult {
  const avgGlance = agents.length
    ? agents.reduce((a, g) => a + g.glanceability, 0) / agents.length
    : 0;
  const avgCoverage = clamp(avgGlance / 100, 0, 1);

  const visibility = Math.round(
    clamp(100 * (0.45 * s.peak + 0.22 * s.contrast + 0.33 * avgCoverage), 0, 100),
  );
  const recall = Math.round(
    clamp(0.45 * perception.brandRecall + 0.25 * (s.concentration * 100) + 0.3 * perception.legibility, 0, 100),
  );
  const shareability = Math.round(clamp(perception.shareability, 0, 100));
  const glanceability = Math.round(avgGlance);

  return {
    saliencySummary: {
      peak: round2(s.peak),
      concentration: round2(s.concentration),
      entropy: round2(s.entropy),
      contrast: round2(s.contrast),
    },
    agents,
    perception,
    scores: { visibility, recall, glanceability, shareability },
    verdict: makeVerdict(visibility, recall, shareability),
  };
}

/* ───────────────────── Street mode — billboard in a scene ───────────────────── */

/** Foveal/parafoveal coverage (~1–2° of visual angle). A fixed perceptual
 *  constant — NOT derived from where the ad is — so the "did gaze land on it"
 *  test forgives sub-degree imprecision without leaking the answer. */
const FOVEAL_MARGIN = 0.025;

function inRegion(x: number, y: number, r: Region): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function inRegionTol(x: number, y: number, r: Region, m: number): boolean {
  return x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m;
}

/** When (and whether) a viewer's gaze lands on a region within their dwell. */
export function gazeOnRegion(
  s: SaliencyResult,
  region: Region,
  dwellMs: number,
): { found: boolean; firstMs: number | null; order: number | null; share: number } {
  const eff = effectiveFixations(dwellMs);
  const fix = s.fixations.slice(0, eff);
  let firstMs: number | null = null;
  let order: number | null = null;
  let hit = 0;
  let total = 0;
  for (const f of fix) {
    total += f.strength;
    if (inRegionTol(f.x, f.y, region, FOVEAL_MARGIN)) {
      hit += f.strength;
      if (firstMs === null) {
        firstMs = f.tMs;
        order = f.order;
      }
    }
  }
  return { found: firstMs !== null, firstMs, order, share: total ? hit / total : 0 };
}

/** Share of the whole scene's saliency that falls inside a region, 0–1. */
export function regionSaliencyShare(s: SaliencyResult, region: Region): number {
  let inside = 0;
  let total = 0;
  for (let y = 0; y < s.height; y++) {
    const ny = y / (s.height - 1);
    for (let x = 0; x < s.width; x++) {
      const v = s.map[y * s.width + x];
      total += v;
      if (inRegion(x / (s.width - 1), ny, region)) inside += v;
    }
  }
  return total ? clamp(inside / total, 0, 1) : 0;
}

/** Synthetic viewers, scored on whether/when they spot the billboard. */
export function simulateStreetAgents(
  s: SaliencyResult,
  region: Region,
  personas: AgentPersona[] = AGENT_PERSONAS,
): ViewerAgent[] {
  return personas.map((p) => {
    const g = gazeOnRegion(s, region, p.dwellMs);
    let glance: number;
    if (g.found) {
      const earliness = 1 - clamp((g.firstMs ?? p.dwellMs) / p.dwellMs, 0, 1);
      glance = 100 * clamp(0.4 + 0.35 * earliness + 0.45 * g.share, 0, 1);
    } else {
      glance = 100 * clamp(0.12 * g.share, 0, 1);
    }
    return {
      id: p.id,
      label: p.label,
      context: p.context,
      dwellMs: p.dwellMs,
      glanceability: Math.round(clamp(glance, 0, 100)),
      effectiveFixations: effectiveFixations(p.dwellMs),
      landedOnFocus: g.found,
      found: g.found,
      foundAtMs: g.firstMs,
      note: g.found
        ? `Spotted it at ${((g.firstMs ?? 0) / 1000).toFixed(1)}s`
        : "Never noticed the billboard",
    };
  });
}

function streetVerdict(noticedBy: number, total: number, ttn: number | null, recall: number): string {
  if (noticedBy === 0) return "Blends into the street — no synthetic viewer's eye lands on it.";
  if (noticedBy === total && ttn !== null && ttn < 700) return "Impossible to miss — every viewer locks on almost instantly.";
  if (noticedBy === total) return "Everyone eventually finds it, but it has to compete for the eye.";
  if (noticedBy <= total / 2) return "Only the lingering viewers spot it — too easy to walk past.";
  if (recall >= 65) return "Found and remembered — but rushed viewers still miss it.";
  return "Gets noticed by some — a stronger focal point would widen the net.";
}

/** Fuse saliency + region + VLM for a billboard-in-a-street-scene. */
export function fuseStreet(
  s: SaliencyResult,
  perception: VlmPerception,
  agents: ViewerAgent[],
  region: Region,
): AttentionSimResult {
  const regionShare = regionSaliencyShare(s, region);
  const avgGlance = agents.length ? agents.reduce((a, g) => a + g.glanceability, 0) / agents.length : 0;
  const found = agents.filter((a) => a.found);
  const noticedBy = found.length;
  const timeToNoticeMs = found.length
    ? Math.round(found.reduce((a, g) => a + (g.foundAtMs ?? 0), 0) / found.length)
    : null;

  const foundFrac = agents.length > 0 ? noticedBy / agents.length : 0;
  const visibility = Math.round(clamp(0.7 * avgGlance + 30 * regionShare * foundFrac, 0, 100));
  const recall = Math.round(
    clamp(0.5 * perception.brandRecall + 0.2 * (regionShare * 100) + 0.3 * perception.legibility, 0, 100),
  );
  const shareability = Math.round(clamp(perception.shareability, 0, 100));
  const glanceability = Math.round(avgGlance);

  return {
    saliencySummary: {
      peak: round2(s.peak),
      concentration: round2(s.concentration),
      entropy: round2(s.entropy),
      contrast: round2(s.contrast),
    },
    agents,
    perception,
    scores: { visibility, recall, glanceability, shareability },
    verdict: streetVerdict(noticedBy, agents.length, timeToNoticeMs, recall),
    street: { region, timeToNoticeMs, noticedBy, total: agents.length, regionShare: round2(regionShare) },
  };
}

/* ─────────────── Heuristic VLM fallback (no API key / SVG creative) ─────────────── */

/** A reasonable perception derived from the brief alone, so the simulation is
 *  always demoable. Mirrors the no-key fallback pattern used across the app. */
export function heuristicPerception(brief?: CompanyBrief | null): VlmPerception {
  const hasTagline = Boolean(brief?.identity?.tagline);
  const hasCta = Boolean(brief?.campaign?.callToAction);
  const company = brief?.identity?.companyName ?? "the brand";
  const tagline = brief?.identity?.tagline ?? brief?.campaign?.coreMessage ?? "the headline";
  const adjectives = brief?.identity?.brandAdjectives ?? [];
  const tone = brief?.audience?.tone ?? (adjectives.slice(0, 2).join(", ") || "confident");

  return {
    noticedFirst: `The ${company} wordmark and the bold ${tagline.split(" ").slice(0, 4).join(" ")}…`,
    message: brief?.campaign?.coreMessage ?? `What ${company} stands for`,
    fiveSecondMemory: hasTagline
      ? `${company} — "${tagline}"`
      : `${company}, ${tone}`,
    brandRecall: hasTagline ? 72 : 58,
    legibility: hasCta ? 76 : 66,
    shareability: adjectives.some((a) => /bold|playful|wild|fun|loud|viral/i.test(a)) ? 68 : 52,
    emotion: tone,
    critique: hasTagline
      ? "Strong line — make sure the logo doesn't compete with it for first fixation."
      : "Add one punchy line so there's a message to remember, not just a logo.",
    source: "heuristic",
  };
}

/** Heuristic perception for an uploaded street scene (no brief, no key). */
export function heuristicStreetPerception(): VlmPerception {
  return {
    noticedFirst: "The brightest, highest-contrast element in the frame",
    message: "Hard to read from the photo alone — judged on placement and contrast",
    fiveSecondMemory: "The scene more than the billboard",
    brandRecall: 55,
    legibility: 60,
    shareability: 48,
    emotion: "neutral",
    critique: "Raise contrast against the surroundings so the eye lands on the board first.",
    source: "heuristic",
  };
}
