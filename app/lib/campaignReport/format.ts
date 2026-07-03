import type { CompanyBrief } from "../types";
import { billboardSvgDataUrl } from "../creative";

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampOptionalScore(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? clampScore(value) : undefined;
}

export function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function stableId(parts: string[]): string {
  const input = parts.join("|").toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `obr-${(hash >>> 0).toString(36)}`;
}

export function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function stripFinalPunctuation(value: string): string {
  return value.trim().replace(/[.!?]+$/, "");
}

export function reportMockupUrl(brief: CompanyBrief): string {
  const url = brief.media?.imageUrl;
  if (url && (/^(data:|https?:)/i.test(url))) return url;
  return billboardSvgDataUrl(brief);
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value: string): string {
  return escapeHtml(value);
}
