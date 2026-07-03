/* ──────────────────────────────────────────────────────────────────────────
   Brand color parsing and ranking for the company brief builder — CSS color
   parsing (hex / rgb / hsl), context-weighted scoring of color mentions, and
   pickers that turn ranked candidates into primary / secondary / accents.
   ────────────────────────────────────────────────────────────────────────── */

import type { CompanyBrief } from "./types";
import type { PageSignals } from "./htmlExtract";

export type ParsedColor = { hex: string; alpha: number };
export type ColorStats = {
  hex: string;
  count: number;
  firstSeen: number;
  weight: number;
};

const BRAND_COLOR_CONTEXT =
  /\b(accent|acid|brand|primary|secondary|cta|button|btn|link|hover|focus|active|selected|highlight|hero|gradient|glow|pill|badge|mark|underline|selection)\b/i;
const MUTED_COLOR_CONTEXT = /\b(transparent|shadow|ring|border|line|divider|overlay|backdrop|disabled|placeholder)\b/i;

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function normalizeHexColor(raw: string): ParsedColor | null {
  const h = raw.replace("#", "").trim();
  if (![3, 4, 6, 8].includes(h.length) || !/^[0-9a-fA-F]+$/.test(h)) return null;

  let rgb = h;
  let alpha = 1;
  if (h.length === 3 || h.length === 4) {
    rgb = h
      .slice(0, 3)
      .split("")
      .map((c) => c + c)
      .join("");
    if (h.length === 4) alpha = parseInt(h[3] + h[3], 16) / 255;
  } else if (h.length === 8) {
    rgb = h.slice(0, 6);
    alpha = parseInt(h.slice(6, 8), 16) / 255;
  }

  if (alpha <= 0.02) return null;
  return { hex: `#${rgb.toUpperCase()}`, alpha };
}

function parseCssChannel(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  if (v.endsWith("%")) {
    const pct = Number.parseFloat(v);
    return Number.isFinite(pct) ? clamp255((pct / 100) * 255) : null;
  }
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? clamp255(n) : null;
}

function parseCssAlpha(value?: string): number {
  if (!value) return 1;
  const v = value.trim();
  if (v.endsWith("%")) {
    const pct = Number.parseFloat(v);
    return Number.isFinite(pct) ? Math.max(0, Math.min(1, pct / 100)) : 1;
  }
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1;
}

function parseRgbColor(raw: string): ParsedColor | null {
  const body = raw.replace(/^rgba?\(/i, "").replace(/\)$/i, "").replace(/\s*\/\s*/, " / ");
  const parts = body.includes(",") ? body.split(/\s*,\s*/) : body.trim().split(/\s+/);
  const slash = parts.indexOf("/");
  const channels = slash >= 0 ? parts.slice(0, slash) : parts.slice(0, 3);
  const alphaPart = slash >= 0 ? parts[slash + 1] : parts[3];
  if (channels.length < 3 || channels.some((part) => /^var\(/i.test(part))) return null;

  const r = parseCssChannel(channels[0]);
  const g = parseCssChannel(channels[1]);
  const b = parseCssChannel(channels[2]);
  const alpha = parseCssAlpha(alphaPart);
  if (r === null || g === null || b === null || alpha <= 0.02) return null;
  return { hex: toHex(r, g, b), alpha };
}

function parseHslColor(raw: string): ParsedColor | null {
  const body = raw.replace(/^hsla?\(/i, "").replace(/\)$/i, "").replace(/\s*\/\s*/, " / ");
  const parts = body.includes(",") ? body.split(/\s*,\s*/) : body.trim().split(/\s+/);
  const slash = parts.indexOf("/");
  const channels = slash >= 0 ? parts.slice(0, slash) : parts.slice(0, 3);
  const alphaPart = slash >= 0 ? parts[slash + 1] : parts[3];
  if (channels.length < 3 || channels.some((part) => /^var\(/i.test(part))) return null;

  const h = Number.parseFloat(channels[0]);
  const s = Number.parseFloat(channels[1]) / 100;
  const l = Number.parseFloat(channels[2]) / 100;
  const alpha = parseCssAlpha(alphaPart);
  if (![h, s, l].every(Number.isFinite) || alpha <= 0.02) return null;

  const hueToRgb = (p: number, q: number, t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };

  const normalizedHue = (((h % 360) + 360) % 360) / 360;
  let r: number;
  let g: number;
  let b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, normalizedHue + 1 / 3);
    g = hueToRgb(p, q, normalizedHue);
    b = hueToRgb(p, q, normalizedHue - 1 / 3);
  }
  return { hex: toHex(r * 255, g * 255, b * 255), alpha };
}

export function parseCssColor(raw: string): ParsedColor | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("#")) return normalizeHexColor(value);
  if (/^rgba?\(/i.test(value)) return parseRgbColor(value);
  if (/^hsla?\(/i.test(value)) return parseHslColor(value);
  return null;
}

function colorMetrics(hex: string): { saturation: number; lightness: number; neutral: boolean } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lightness = (max + min) / 510;
  return {
    saturation,
    lightness,
    neutral: max - min <= 10 || saturation < 0.08 || lightness <= 0.06 || lightness >= 0.97,
  };
}

function colorDistance(a: string, b: string): number {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2) / 441.7;
}

function contextWeight(text: string, index: number, baseWeight: number): number {
  const context = text.slice(Math.max(0, index - 90), Math.min(text.length, index + 90));
  let weight = baseWeight;
  if (BRAND_COLOR_CONTEXT.test(context)) weight += 4;
  if (/\b(button|btn|cta|call-to-action|subscribe|signup|sign-up|buy|book|demo)\b/i.test(context)) weight += 3;
  if (/@supports|color-mix|rgb\(from|lab\(/i.test(context)) weight *= 0.02;
  if (
    /--color-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/i.test(context) ||
    /\b(?:bg|text|border|ring|outline|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/i.test(context)
  ) {
    weight *= 0.04;
  }
  if (/\b(--tw-|tailwind|shadow|ring-offset)\b/i.test(context)) weight *= 0.45;
  if (MUTED_COLOR_CONTEXT.test(context) && !BRAND_COLOR_CONTEXT.test(context)) weight *= 0.65;
  return weight;
}

export function addColorHit(
  stats: Map<string, ColorStats>,
  parsed: ParsedColor | null,
  weight: number,
  firstSeen: number,
): void {
  if (!parsed) return;
  const metrics = colorMetrics(parsed.hex);
  const alphaWeight = parsed.alpha < 0.95 ? 0.35 + parsed.alpha * 0.65 : 1;
  const colorWeight = metrics.neutral ? 0.28 : 1 + metrics.saturation * 0.45;
  const adjustedWeight = weight * alphaWeight * colorWeight;
  const existing = stats.get(parsed.hex);
  if (existing) {
    existing.count += 1;
    existing.weight += adjustedWeight;
    existing.firstSeen = Math.min(existing.firstSeen, firstSeen);
  } else {
    stats.set(parsed.hex, { hex: parsed.hex, count: 1, firstSeen, weight: adjustedWeight });
  }
}

export function collectColorHintsFromText(
  text: string,
  stats: Map<string, ColorStats>,
  baseWeight: number,
  orderOffset = 0,
): void {
  const slice = text.slice(0, 220_000);
  const hexRe = /#([0-9a-fA-F]{3,8})\b/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(slice)) !== null) {
    if (m.index > 0 && slice[m.index - 1] === "&") continue;
    addColorHit(stats, normalizeHexColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }

  const rgbRe = /rgba?\(\s*[^)]+\)/gi;
  while ((m = rgbRe.exec(slice)) !== null) {
    addColorHit(stats, parseRgbColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }

  const hslRe = /hsla?\(\s*[^)]+\)/gi;
  while ((m = hslRe.exec(slice)) !== null) {
    addColorHit(stats, parseHslColor(m[0]), contextWeight(slice, m.index, baseWeight), orderOffset + m.index);
  }
}

export function rankedColorHints(stats: Map<string, ColorStats>): string[] {
  return [...stats.values()]
    .filter((s) => s.weight >= 0.35)
    .sort((a, b) => b.weight - a.weight || b.count - a.count || a.firstSeen - b.firstSeen)
    .map((s) => s.hex);
}

function validHexColor(hex?: string | null): string | undefined {
  return hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : undefined;
}

function brandColorScore(hex: string, index: number): number {
  const metrics = colorMetrics(hex);
  const lightnessFit = metrics.lightness > 0.11 && metrics.lightness < 0.94 ? 1 : 0.25;
  const orderBonus = Math.max(0, 24 - index) * 0.03;
  return metrics.saturation * lightnessFit + orderBonus - (metrics.neutral ? 0.75 : 0);
}

export function pickAccentColors(colors: string[], primary?: string, secondary?: string): string[] {
  const used = new Set([primary, secondary].filter(Boolean));
  return colors
    .map(validHexColor)
    .filter((hex): hex is string => Boolean(hex))
    .filter((hex) => !used.has(hex) && !colorMetrics(hex).neutral)
    .filter((hex, index, arr) => arr.findIndex((other) => colorDistance(hex, other) < 0.08) === index)
    .slice(0, 4);
}

export function pickBrandColor(colors: string[], themeColor: string): string | undefined {
  const theme = validHexColor(parseCssColor(themeColor)?.hex ?? themeColor);
  const scored = colors
    .map(validHexColor)
    .filter((hex): hex is string => Boolean(hex))
    .map((hex, index) => {
      return { hex, score: brandColorScore(hex, index) };
    })
    .sort((a, b) => b.score - a.score);

  const distinctive = scored.find((candidate) => !colorMetrics(candidate.hex).neutral && candidate.score > 0.2)?.hex;
  if (theme && !colorMetrics(theme).neutral) return theme;
  if (distinctive) return distinctive;
  return theme ?? scored[0]?.hex ?? colors.map(validHexColor).find(Boolean);
}

export function pickSecondaryBrandColor(colors: string[], primary?: string): string | undefined {
  const candidates = colors
    .map(validHexColor)
    .filter((hex): hex is string => Boolean(hex))
    .filter((hex) => hex !== primary);
  if (!candidates.length) return undefined;
  if (!primary) return candidates[0];
  const distinct = candidates.filter((hex) => colorDistance(hex, primary) > 0.18);
  const baseNeutral = distinct.find((hex) => {
    const metrics = colorMetrics(hex);
    return metrics.neutral && metrics.lightness > 0.02 && metrics.lightness < 0.96;
  });
  return baseNeutral ?? distinct.find((hex) => !colorMetrics(hex).neutral) ?? distinct[0] ?? candidates[0];
}

export function normalizeBriefColors(brief: Omit<CompanyBrief, "url">, signals: PageSignals): void {
  brief.visualSystem ??= {};
  const inferredPrimary = pickBrandColor(signals.colorHints, signals.themeColor);
  const modelPrimary = validHexColor(brief.visualSystem.primaryColor);
  const shouldOverridePrimary =
    !modelPrimary ||
    Boolean(
      inferredPrimary &&
        modelPrimary !== inferredPrimary &&
        colorMetrics(modelPrimary).neutral &&
        !colorMetrics(inferredPrimary).neutral,
    );

  brief.visualSystem.primaryColor = shouldOverridePrimary ? inferredPrimary ?? "#F97316" : modelPrimary;
  const primary = brief.visualSystem.primaryColor;

  const modelSecondary = validHexColor(brief.visualSystem.secondaryColor);
  brief.visualSystem.secondaryColor =
    modelSecondary && modelSecondary !== primary
      ? modelSecondary
      : pickSecondaryBrandColor(signals.colorHints, primary);

  const existingAccents = (brief.visualSystem.accentColors ?? [])
    .map(validHexColor)
    .filter((hex): hex is string => Boolean(hex));
  const inferredAccents = pickAccentColors(signals.colorHints, primary, brief.visualSystem.secondaryColor);
  brief.visualSystem.accentColors = [...new Set([...existingAccents, ...inferredAccents])].slice(0, 4);
}
