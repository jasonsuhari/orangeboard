// ─── Colour helpers ──────────────────────────────────────────────────────────

export function validHex(h?: string): string | undefined {
  return h && /^#[0-9a-fA-F]{6}$/i.test(h) ? h.toUpperCase() : undefined;
}

export function readableOnHex(hex: string): "#ffffff" | "#0a0a0a" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.58 ? "#0a0a0a" : "#ffffff";
}

export function shadeHex(hex: string, amt: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(parseInt(hex.slice(1, 3), 16) * (1 + amt));
  const g = clamp(parseInt(hex.slice(3, 5), 16) * (1 + amt));
  const b = clamp(parseInt(hex.slice(5, 7), 16) * (1 + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function tintHex(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const m = (c: number) => Math.round(c + (255 - c) * t);
  return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
