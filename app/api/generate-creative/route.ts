import { NextRequest, NextResponse } from "next/server";
import type { CompanyBrief } from "../../lib/types";
import { billboardSvgDataUrl, buildCreativePrompt } from "../../lib/creative";

export const maxDuration = 300;

const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations";
// Live path favours speed: a fast model at low quality. The high-quality
// gpt-image-2 path is reserved for the precomputed cache (see scripts/build-brief-cache.mjs).
const LIVE_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL_LIVE ?? process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
const LIVE_IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY_LIVE ?? "low";

/** Call OpenAI image generation and return a data URL (b64), so the browser
 *  can use it as a WebGL texture without any CORS hassle. */
async function generateWithOpenAI(brief: CompanyBrief, apiKey: string): Promise<string> {
  const prompt = buildCreativePrompt(brief);
  const res = await fetch(OPENAI_IMAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: LIVE_IMAGE_MODEL,
      prompt,
      n: 1,
      size: "1536x1024", // landscape, billboard-like
      quality: LIVE_IMAGE_QUALITY,
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`OpenAI image failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: { b64_json?: string; url?: string }[] };
  const item = json.data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url;
  throw new Error("OpenAI image response had no image");
}

export async function POST(req: NextRequest) {
  let brief: CompanyBrief;
  try {
    const body = (await req.json()) as { brief?: CompanyBrief };
    if (!body.brief || !body.brief.identity) {
      return NextResponse.json({ error: 'Missing "brief" field' }, { status: 400 });
    }
    brief = body.brief;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // A precomputed (cached) brief already carries its high-quality creative —
  // serve it straight back instead of regenerating.
  if (brief.media?.imageUrl) {
    return NextResponse.json({
      imageUrl: brief.media.imageUrl,
      prompt: brief.media.prompt,
      source: brief.media.source,
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const prompt = buildCreativePrompt(brief);

  if (apiKey) {
    try {
      const imageUrl = await generateWithOpenAI(brief, apiKey);
      return NextResponse.json({ imageUrl, prompt, source: "openai", model: LIVE_IMAGE_MODEL });
    } catch (err) {
      console.error("OpenAI image failed, falling back to SVG:", err);
    }
  }

  // Deterministic, brand-aware fallback — always works, no keys required.
  return NextResponse.json({
    imageUrl: billboardSvgDataUrl(brief),
    prompt,
    source: "svg",
  });
}
