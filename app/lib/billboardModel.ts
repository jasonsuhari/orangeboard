export type Billboard = {
  id: string;
  lng: number;
  lat: number;
  name: string;
  address: string;
  status: string;
  seller: string;
  format: string;
  dimensions: string;
  facing: string;
  rateCard: string;
  estimatedCpm: string;
  availability: string;
  lighting: string;
  mediaType: string;
  restrictions: string;
  bookingContact: string;
  purchaseUrl: string;
};

export type CampaignLaunch = {
  mode?: "preview" | "simulation";
  creativeUrl?: string;
  opportunity?: {
    id?: string;
    title?: string;
    area?: string;
  };
  board?: {
    id?: string;
    name?: string;
    address?: string;
    status?: string;
    lng?: number;
    lat?: number;
    seller?: string;
    format?: string;
    dimensions?: string;
    facing?: string;
    rateCard?: string;
    estimatedCpm?: string;
    availability?: string;
    lighting?: string;
    mediaType?: string;
    restrictions?: string;
    bookingContact?: string;
    purchaseUrl?: string;
  };
};

export function propString(props: GeoJSON.GeoJsonProperties, key: string, fallback: string): string {
  const value = props?.[key];
  if (value == null) return fallback;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

export function billboardFromLaunch(launch: CampaignLaunch | null): Billboard | null {
  const board = launch?.board;
  if (!board || typeof board.lng !== "number" || typeof board.lat !== "number") return null;
  return {
    id: board.id ?? `campaign:${board.lng.toFixed(6)},${board.lat.toFixed(6)}`,
    lng: board.lng,
    lat: board.lat,
    name: board.name ?? "Selected billboard",
    address: board.address ?? "",
    status: board.status ?? "Selected",
    seller: board.seller ?? "Media owner confirmation required",
    format: board.format ?? "General Advertising Sign",
    dimensions: board.dimensions ?? "Seller-provided",
    facing: board.facing ?? "Field verification required",
    rateCard: board.rateCard ?? "Rate card seller-confirmed",
    estimatedCpm: board.estimatedCpm ?? "Estimated CPM seller-confirmed",
    availability: board.availability ?? "Availability seller-confirmed",
    lighting: board.lighting ?? "Lighting seller-confirmed",
    mediaType: board.mediaType ?? "Static",
    restrictions: board.restrictions ?? "Restrictions seller-confirmed",
    bookingContact: board.bookingContact ?? "Booking contact seller-confirmed",
    purchaseUrl: board.purchaseUrl ?? "",
  };
}

export function sameBillboardLocation(a: { lng: number; lat: number }, b: { lng: number; lat: number }): boolean {
  return Math.abs(a.lng - b.lng) < 0.00002 && Math.abs(a.lat - b.lat) < 0.00002;
}

// True when the user arrived by deliberately launching a campaign — Build
// Campaign (?campaign=1) or the landing preview (?mode=...).
export function isCampaignLaunch(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get("campaign") === "1" || params.has("mode");
}
