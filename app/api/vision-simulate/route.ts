import { NextRequest, NextResponse } from "next/server";
import type { CompanyBrief, Region, VlmPerception } from "../../lib/types";
import { heuristicPerception, heuristicStreetPerception } from "../../lib/attention";

export const maxDuration = 60;

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o";

const SYSTEM_CREATIVE = `You are a synthetic human viewer on a focus-group panel for out-of-home (billboard) testing. You are shown a billboard creative and you react the way a real person glancing at it would — fast, instinctive, honest.

Judge what an average viewer would actually take away in a few seconds, not what a designer intends. Be specific to THIS image; do not flatter it.

Return ONLY a JSON object (no markdown) with exactly these keys:
{
  "noticedFirst": "the first thing the eye lands on, in plain words",
  "message": "the single message a viewer walks away with",
  "fiveSecondMemory": "what they'd recall 5 seconds after it's gone",
  "brandRecall": 0-100 integer — how likely they remember the brand,
  "legibility": 0-100 integer — how readable it is at a glance / from distance,
  "shareability": 0-100 integer — how likely someone screenshots/shares it,
  "emotion": "the dominant feeling in 1-3 words",
  "critique": "one concrete sentence on how to make it land harder"
}`;

const SYSTEM_STREET = `You are analysing a real STREET PHOTO that contains a billboard, for out-of-home (OOH) attention testing. Imagine you are a person walking or driving past this exact scene. The billboard competes with everything else in the frame for your attention.

First, LOCATE the most prominent billboard / large advertising sign in the photo and give its bounding box as fractions of the image (0 = left/top edge, 1 = right/bottom edge). If there is genuinely no billboard, set "billboardFound" to false and box to the most ad-like sign you can find.

Then react as a passer-by would. Be specific to THIS scene; do not flatter it.

Return ONLY a JSON object (no markdown) with exactly these keys:
{
  "billboardFound": true or false,
  "billboardBox": { "x": 0-1, "y": 0-1, "w": 0-1, "h": 0-1 },
  "noticedFirst": "the first thing in the WHOLE scene the eye lands on",
  "message": "what the billboard communicates, if legible",
  "fiveSecondMemory": "what a passer-by remembers after the scene is gone",
  "brandRecall": 0-100 integer — likelihood they remember the advertiser,
  "legibility": 0-100 integer — how readable the board is in this scene,
  "shareability": 0-100 integer — how screenshot-worthy the scene is,
  "emotion": "the dominant feeling in 1-3 words",
  "critique": "one concrete sentence on how to make the board win attention HERE"
}`;

function clampInt(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function clamp01(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function parseBox(v: unknown): Region | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.x === undefined || o.y === undefined || o.w === undefined || o.h === undefined) return null;
  const x = clamp01(o.x);
  const y = clamp01(o.y);
  const w = Math.min(1 - x, clamp01(o.w));
  const h = Math.min(1 - y, clamp01(o.h));
  if (w < 0.02 || h < 0.02) return null;
  return { x, y, w, h };
}

async function perceiveWithOpenAI(
  imageUrl: string,
  brief: CompanyBrief | null | undefined,
  context: string,
  mode: "creative" | "street",
  apiKey: string,
): Promise<{ perception: VlmPerception; billboardBox: Region | null }> {
  const street = mode === "street";
  const ctx = street
    ? `Viewing context: ${context}`
    : [
        brief?.identity?.companyName ? `Brand: ${brief.identity.companyName}` : "",
        brief?.identity?.tagline ? `Their tagline: "${brief.identity.tagline}"` : "",
        brief?.audience?.description ? `Intended audience: ${brief.audience.description}` : "",
        `Viewing context: ${context}`,
      ]
        .filter(Boolean)
        .join("\n");

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: street ? SYSTEM_STREET : SYSTEM_CREATIVE },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: street ? `Analyse this street scene and react.\n${ctx}` : `Glance at this billboard and react.\n${ctx}`,
            },
            { type: "image_url", image_url: { url: imageUrl, detail: street ? "high" : "low" } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`OpenAI vision failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const p = JSON.parse(raw) as Record<string, unknown>;
  const fb = street ? heuristicStreetPerception() : heuristicPerception(brief);

  return {
    perception: {
      noticedFirst: str(p.noticedFirst, fb.noticedFirst),
      message: str(p.message, fb.message),
      fiveSecondMemory: str(p.fiveSecondMemory, fb.fiveSecondMemory),
      brandRecall: clampInt(p.brandRecall, fb.brandRecall),
      legibility: clampInt(p.legibility, fb.legibility),
      shareability: clampInt(p.shareability, fb.shareability),
      emotion: str(p.emotion, fb.emotion),
      critique: str(p.critique, fb.critique),
      source: "vlm",
    },
    billboardBox: street ? parseBox(p.billboardBox) : null,
  };
}

export async function POST(req: NextRequest) {
  let imageUrl: string | undefined;
  let brief: CompanyBrief | null | undefined;
  let mode: "creative" | "street" = "creative";
  let context = "a quick glance from the street";
  try {
    const body = (await req.json()) as {
      imageUrl?: string;
      brief?: CompanyBrief;
      context?: string;
      mode?: "creative" | "street";
    };
    imageUrl = body.imageUrl;
    brief = body.brief ?? null;
    if (body.mode === "street") mode = "street";
    if (body.context) context = body.context;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  // VLMs take raster images; an SVG/vector data URL can't be read, so fall back.
  const isRaster =
    !!imageUrl && (/^data:image\/(png|jpe?g|webp|gif)/i.test(imageUrl) || /^https?:\/\//i.test(imageUrl));

  if (apiKey && imageUrl && isRaster) {
    try {
      const { perception, billboardBox } = await perceiveWithOpenAI(imageUrl, brief, context, mode, apiKey);
      return NextResponse.json({ perception, billboardBox });
    } catch (err) {
      console.error("Vision simulate failed, falling back to heuristic:", err);
    }
  }

  return NextResponse.json({
    perception: mode === "street" ? heuristicStreetPerception() : heuristicPerception(brief),
    billboardBox: null,
  });
}
