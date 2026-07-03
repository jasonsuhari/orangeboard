import type { CompanyBrief } from "./types";

/* Shared creative helpers: a prompt builder for image models and a
   deterministic SVG billboard generator used when no image API is configured. */

// Convert hex color codes to natural language so the model doesn't render them
// as text. Ported from sightline's generate-creative route.
export function hexToColorName(hex?: string): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "a deep brand color";
  const h = hex.replace("#", "").toLowerCase();
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2 / 255;

  // Named color shortcuts for common brand colors
  const named: Record<string, string> = {
    "ffe500": "vivid electric yellow", "ffff00": "pure yellow", "ff0000": "bold red",
    "000000": "pure black", "ffffff": "pure white", "0000ff": "pure blue",
    "ff6600": "vivid orange", "00ff00": "pure green", "ff69b4": "hot pink",
    "1a1a2e": "deep navy", "2d7dff": "bright blue", "28b487": "teal green",
  };
  if (named[h]) return named[h];

  const lightness = l < 0.2 ? "deep " : l < 0.4 ? "dark " : l > 0.8 ? "light " : l > 0.9 ? "pale " : "";
  if (max === min) return `${lightness}gray`;
  if (r > g && r > b) return g > b * 1.3 ? `${lightness}warm orange` : `${lightness}red`;
  if (g > r && g > b) return r > b * 1.1 ? `${lightness}yellow-green` : `${lightness}green`;
  if (b > r && b > g) return r > g * 1.1 ? `${lightness}purple` : `${lightness}blue`;
  if (r > b && g > b) return `${lightness}yellow`;
  if (r > g && b > g) return `${lightness}magenta`;
  return `${lightness}cyan`;
}

function validHex(hex?: string): string | undefined {
  return hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toUpperCase() : undefined;
}

function stripHexCodes(prompt: string): string {
  return prompt.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
    const full = match.length === 4
      ? `#${match[1]}${match[1]}${match[2]}${match[2]}${match[3]}${match[3]}`
      : match;
    return hexToColorName(full);
  });
}

// Soften negative phrasing that image providers tend to reject or render
// literally. Ported from sightline's cleanProviderPrompt.
function cleanProviderPrompt(prompt: string): string {
  return stripHexCodes(prompt)
    .replace(/\b(no|without)\s+(?:text|letters|logos?|words?)(?:\s*,?\s*(?:or\s+)?(?:text|letters|logos?|words?))*\b/gi, "clean brand-safe scene")
    .replace(/\b(no|without)\s+(text|letters|logos?|words?)\b/gi, "clean brand-safe scene")
    .replace(/\b(where|space)\s+white\s+text\s+will\s+be\s+printed\b/gi, "reserved for later design overlay")
    .replace(/\bthe\s+ad\s+fails\b/gi, "the composition should stay clean")
    .replace(/\s+/g, " ")
    .trim();
}

const SIGHTLINE_IMAGE_CREATIVE_ANGLE =
  "direct-response billboard, clear commercial offer, high contrast focal product moment, strong urgency";

function addSightlineCreativeAngle(prompt: string): string {
  return cleanProviderPrompt(
    `${prompt} Creative strategy: ${SIGHTLINE_IMAGE_CREATIVE_ANGLE}. Make this concept visually distinct from other campaign variants.`
  );
}

/** Prompt for a 16:9 landscape billboard creative from a brief.
 *  Mirrors sightline's first image prompt: buildPrompt (image mode)
 *  plus the Conversion creative angle. */
export function buildCreativePrompt(brief: CompanyBrief): string {
  const color = brief.visualSystem.primaryColor
    ? hexToColorName(brief.visualSystem.primaryColor)
    : "brand color";
  const company = brief.identity.companyName;
  const desc = brief.identity.description || brief.identity.industry;
  const cta = brief.campaign.callToAction ? `. CTA: "${brief.campaign.callToAction}"` : "";
  const positioning = brief.strategy?.positioning ? ` Positioning: ${brief.strategy.positioning}.` : "";
  const promise = brief.strategy?.customerPromise ? ` Customer promise: ${brief.strategy.customerPromise}.` : "";
  const audience = brief.audience?.description ? ` Audience: ${brief.audience.description}.` : "";
  const proof = brief.strategy?.proofPoints?.length
    ? ` Proof cues: ${brief.strategy.proofPoints.slice(0, 3).join("; ")}.`
    : "";
  const mandatories = brief.strategy?.creativeMandatories?.length
    ? ` Creative mandatories: ${brief.strategy.creativeMandatories.slice(0, 3).join("; ")}.`
    : "";
  const tagline = brief.identity.tagline ? ` — "${brief.identity.tagline}"` : "";
  const avoid = brief.visualSystem.avoidList?.length
    ? ` Do not show: ${brief.visualSystem.avoidList.join(", ")}.`
    : "";

  return addSightlineCreativeAngle(cleanProviderPrompt(
    `Make a 16:9 ad for ${company}${tagline}, ${desc}.${positioning}${promise}${audience}${proof}${mandatories} Main color is ${color}${cta}.${avoid} No text in the image.`
  ));
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function readableOn(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0a0a0a" : "#ffffff";
}

function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(h.slice(0, 2), 16) * (1 + amt));
  const g = clamp(parseInt(h.slice(2, 4), 16) * (1 + amt));
  const b = clamp(parseInt(h.slice(4, 6), 16) * (1 + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Deterministic, brand-aware billboard creative as an SVG data URL.
 * Used as the instant placeholder and as the no-API-key fallback.
 * 16:9, designed to read at a glance like real OOH.
 */
export function billboardSvgDataUrl(brief: CompanyBrief): string {
  const W = 1280;
  const H = 720;
  const primary = validHex(brief.visualSystem.primaryColor) ?? "#F97316";
  const secondary = validHex(brief.visualSystem.secondaryColor);
  const accent = validHex(brief.visualSystem.accentColors?.[0]) ?? primary;
  const bg = secondary && readableOn(secondary) === "#ffffff" && readableOn(primary) === "#0a0a0a" ? secondary : primary;
  const fg = readableOn(bg);
  const sub = fg === "#ffffff" ? "rgba(255,255,255,0.78)" : "rgba(10,10,10,0.7)";
  const company = esc(brief.identity.companyName).toUpperCase();
  const headline = esc(brief.identity.tagline || brief.campaign.coreMessage || brief.identity.description).slice(0, 70);
  const cta = esc(brief.campaign.callToAction || "Learn more");
  const ctaBg = fg === "#ffffff" ? accent : "#0a0a0a";
  const ctaFg = readableOn(ctaBg);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${shade(bg, 0.18)}"/>
      <stop offset="1" stop-color="${shade(bg, -0.28)}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.22" r="0.9">
      <stop offset="0" stop-color="${shade(accent, 0.35)}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <circle cx="1040" cy="150" r="220" fill="${fg}" opacity="0.06"/>
  <g font-family="ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif">
    <text x="90" y="150" fill="${sub}" font-size="30" font-weight="600" letter-spacing="6">${company}</text>
    <text x="86" y="380" fill="${fg}" font-size="96" font-weight="800" letter-spacing="-2">
      ${wrapTspan(headline, 86, 380, 96, 18)}
    </text>
    <g transform="translate(90, 560)">
      <rect x="0" y="-44" rx="32" ry="32" width="${Math.min(560, 70 + cta.length * 26)}" height="64" fill="${ctaBg}"/>
      <text x="34" y="0" fill="${ctaFg}" font-size="34" font-weight="700">${cta} →</text>
    </g>
  </g>
</svg>`;

  const encoded = Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

/** Naive word-wrap into <tspan> lines so long headlines don't overflow. */
function wrapTspan(text: string, x: number, y: number, size: number, maxChars: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines
    .slice(0, 3)
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : size * 1.05}">${line}</tspan>`)
    .join("");
}
