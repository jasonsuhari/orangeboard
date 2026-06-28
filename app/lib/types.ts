/* Structured company brief — the contract between the discover step and the
   creative-generation step. Adapted from the Sightline pipeline. */

export interface CompanyBriefIdentity {
  companyName: string;
  industry: string;
  description: string;
  brandAdjectives: string[];
  tagline?: string;
}

export interface CompanyBriefVisualSystem {
  primaryColor?: string;
  secondaryColor?: string;
  accentColors?: string[];
  logoUrl?: string;
  fonts?: string[];
  styleReference?: string;
  avoidList?: string[];
}

export interface CompanyBriefCampaign {
  coreMessage: string;
  offerOrHook?: string;
  callToAction?: string;
  campaignObjective?: "awareness" | "conversion" | "foot-traffic" | "app-downloads";
}

export interface CompanyBriefAudience {
  description: string;
  tone?: string;
  contextWhenSeen?: "driving" | "walking" | "scrolling" | "mixed";
}

/** The generated billboard creative that belongs to a brief. Lives on the
 *  brief so the cached version travels as one object (brief + media). */
export interface CreativeMedia {
  /** Same-origin path or data URL — usable directly as a WebGL texture. */
  imageUrl: string;
  /** The prompt the image model was given. */
  prompt: string;
  /** "openai" (live), "cache" (precomputed), or "svg" (no-key fallback). */
  source: "openai" | "cache" | "svg";
  /** Which image model produced it, e.g. "gpt-image-2" or "gpt-image-1". */
  model?: string;
}

export interface CompanyBrief {
  url: string;
  identity: CompanyBriefIdentity;
  visualSystem: CompanyBriefVisualSystem;
  campaign: CompanyBriefCampaign;
  audience: CompanyBriefAudience;
  /** The billboard creative for this brief, when one has been generated. */
  media?: CreativeMedia;
  /** True when produced by the heuristic fallback rather than an LLM. */
  heuristic?: boolean;
}

/* ──────────────────────────────────────────────────────────────────────────
   Agent vision — the "Preview & simulate" step.

   A hybrid attention model: a bottom-up visual-saliency engine (Itti–Koch,
   runs client-side on the creative's pixels) predicts where human eyes fixate;
   synthetic viewer agents apply a real dwell budget (visibility); and a VLM
   reads the creative top-down (comprehension). Fused into visibility + recall.
   ────────────────────────────────────────────────────────────────────────── */

/** A single gaze fixation in the predicted scanpath. Coords are normalized 0–1. */
export interface Fixation {
  x: number;
  y: number;
  /** Saliency at this point, 0–1. */
  strength: number;
  /** 1-based order in the winner-take-all scanpath. */
  order: number;
  /** Cumulative time at which this fixation occurs (ms). */
  tMs: number;
}

/** Output of the bottom-up saliency model. */
export interface SaliencyResult {
  /** Working-grid dimensions for the saliency map. */
  width: number;
  height: number;
  /** Row-major saliency, 0–1, length width*height. */
  map: number[];
  /** Predicted gaze scanpath (winner-take-all + inhibition of return). */
  fixations: Fixation[];
  /** Strongest saliency value, 0–1 — does anything grab the eye at all? */
  peak: number;
  /** How concentrated attention is, 0–1 (1 = a single dominant focal point). */
  concentration: number;
  /** Normalized spatial entropy, 0–1 — visual clutter / competing hotspots. */
  entropy: number;
  /** Global RMS contrast, 0–1 — readability of the creative from distance. */
  contrast: number;
}

/** A normalized rectangle (0–1) — e.g. the billboard within a street photo. */
export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A thing in a street scene that competes for the eye — used as a top-down
 *  attention prior. Itti–Koch alone can't see faces/people/text; the VLM
 *  supplies these so the gaze model reflects real scene semantics. */
export interface SceneElement {
  label: string;
  isBillboard: boolean;
  box: Region;
  /** How strongly this pulls the eye, 0–100 (bright / faces / motion score high). */
  draw: number;
}

/** A synthetic viewer with a dwell budget — the human "visibility" layer. */
export interface ViewerAgent {
  id: string;
  label: string;
  context: "driving" | "walking" | "passenger" | "scrolling";
  /** Exposure window in ms. */
  dwellMs: number;
  /** 0–100 — how much of the message this agent captures in its window. */
  glanceability: number;
  /** Fixations that fit inside the dwell budget. */
  effectiveFixations: number;
  /** Did gaze settle on the dominant focal point before looking away? */
  landedOnFocus: boolean;
  note: string;
  /** Street mode: did this viewer's gaze ever land on the billboard? */
  found?: boolean;
  /** Street mode: time (ms) at which gaze first hit the billboard, if ever. */
  foundAtMs?: number | null;
}

/** Top-down comprehension from the VLM acting as a synthetic viewer. */
export interface VlmPerception {
  noticedFirst: string;
  message: string;
  fiveSecondMemory: string;
  /** 0–100 scores. */
  brandRecall: number;
  legibility: number;
  shareability: number;
  emotion: string;
  critique: string;
  source: "vlm" | "heuristic";
}

/** Fused result of the whole agent-vision simulation. */
export interface AttentionSimResult {
  saliencySummary: {
    peak: number;
    concentration: number;
    entropy: number;
    contrast: number;
  };
  agents: ViewerAgent[];
  perception: VlmPerception;
  scores: {
    /** Will it physically be seen and registered? */
    visibility: number;
    /** Will it be remembered? */
    recall: number;
    /** Average glance capture across agents. */
    glanceability: number;
    /** Predicted viral / shareable potential. */
    shareability: number;
  };
  verdict: string;
  /** Street mode only — billboard-in-scene attention summary. */
  street?: {
    region: Region;
    /** Average time (ms) for viewers who found it; null if none did. */
    timeToNoticeMs: number | null;
    /** How many agents noticed the billboard, out of total. */
    noticedBy: number;
    total: number;
    /** Share of total scene saliency that falls on the billboard, 0–1. */
    regionShare: number;
  };
}
