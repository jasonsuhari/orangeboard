export type Phase = "ask" | "scanning" | "review" | "zones" | "launching";

export const MASCOTS = {
  wave: "/characters/orange-character-01-wave.png",
  run: "/characters/orange-character-02-run.png",
  map: "/characters/orange-character-03-map.png",
  point: "/characters/orange-character-04-point.png",
  search: "/characters/orange-character-06-search.png",
  celebrate: "/characters/orange-character-08-celebrate.png",
} as const;

export const SCAN_LINES = [
  "Reading your homepage",
  "Profiling your buyers",
  "Writing your billboard message",
  "Painting your creative",
  "Scouting the city",
];

export const CAMPAIGN_BLOB_KEY = "orangeboard:campaign-blob";
export const CAMPAIGN_LAUNCH_KEY = "orangeboard:campaign-launch";

export type CreativeResult = { imageUrl: string; source: string };
