import { NextRequest, NextResponse } from "next/server";
import type { AttentionSimResult, VlmPerception } from "../../lib/types";
import type { CampaignPedestrianContext, PedestrianProfile } from "../../lib/pedestrianIcp";
import type { PedestrianBillboardCapture } from "../../simulation/pedestrianVision";

export const maxDuration = 60;

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const AGENT_MODEL = process.env.OPENAI_PED_AGENT_MODEL ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

type PedestrianAgentLog = {
  agentId: string;
  displayName: string;
  profileSummary: string;
  chatMessage: string;
  remembered: string;
  motivation: string;
  objection: string;
  nextQuestion: string;
  score: number;
  source: "openai" | "fallback";
  model?: string;
};

type AgentRequestBody = {
  agentId?: string;
  profile?: PedestrianProfile;
  capture?: PedestrianBillboardCapture;
  perception?: VlmPerception;
  result?: AttentionSimResult;
  campaignContext?: CampaignPedestrianContext | null;
};

const SYSTEM = `You are one simulated pedestrian chat agent for an out-of-home billboard test.

Stay inside the provided pedestrian profile and sighting log. Speak in first person as that pedestrian. Do not invent private facts, demographics, exact employer details, or purchase authority beyond the profile. Be concise, practical, and specific about the billboard exposure.

Return ONLY a JSON object with exactly these keys:
{
  "displayName": "short name for this pedestrian agent",
  "profileSummary": "one sentence describing the agent profile",
  "chatMessage": "first-person reaction, 1-2 short sentences",
  "remembered": "what this agent remembers",
  "motivation": "why this message might matter to them",
  "objection": "what would stop them from caring",
  "nextQuestion": "what they would ask next if they engaged",
  "score": 0-100 integer for profile-message fit
}`;

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clampInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function profileName(profile: PedestrianProfile): string {
  return profile.label || profile.role || "Pedestrian";
}

function fallbackAgent({
  agentId,
  profile,
  capture,
  perception,
  result,
}: {
  agentId: string;
  profile: PedestrianProfile;
  capture: PedestrianBillboardCapture;
  perception: VlmPerception;
  result: AttentionSimResult;
}): PedestrianAgentLog {
  const displayName = profileName(profile);
  const remembered = perception.fiveSecondMemory || perception.message || result.verdict;
  const motivation = profile.reason
    ? `It connects because ${profile.reason}`
    : profile.isIcp
      ? "It may connect because this profile resembles the target audience."
      : "It is a light ambient impression rather than a high-fit buyer signal.";

  return {
    agentId,
    displayName,
    profileSummary: `${profile.role} (${profile.source}, fit ${profile.fitScore}/100).`,
    chatMessage: `I noticed the board from about ${Math.round(capture.distanceM)}m away. ${remembered}`,
    remembered,
    motivation,
    objection: perception.critique || "The message needs to land faster from the sidewalk.",
    nextQuestion: profile.isIcp ? "What is the offer and why should I act now?" : "Why is this relevant to me?",
    score: clampInt(profile.fitScore, result.scores.recall),
    source: "fallback",
  };
}

function parseAgent(raw: unknown, fallback: PedestrianAgentLog, model: string): PedestrianAgentLog {
  const value = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  return {
    agentId: fallback.agentId,
    displayName: str(value.displayName, fallback.displayName),
    profileSummary: str(value.profileSummary, fallback.profileSummary),
    chatMessage: str(value.chatMessage, fallback.chatMessage),
    remembered: str(value.remembered, fallback.remembered),
    motivation: str(value.motivation, fallback.motivation),
    objection: str(value.objection, fallback.objection),
    nextQuestion: str(value.nextQuestion, fallback.nextQuestion),
    score: clampInt(value.score, fallback.score),
    source: "openai",
    model,
  };
}

async function generateAgent({
  agentId,
  profile,
  capture,
  perception,
  result,
  campaignContext,
  apiKey,
}: {
  agentId: string;
  profile: PedestrianProfile;
  capture: PedestrianBillboardCapture;
  perception: VlmPerception;
  result: AttentionSimResult;
  campaignContext: CampaignPedestrianContext | null;
  apiKey: string;
}): Promise<PedestrianAgentLog> {
  const fallback = fallbackAgent({ agentId, profile, capture, perception, result });
  const prompt = {
    agentId,
    profile,
    campaign: {
      companyName: campaignContext?.companyName,
      icp: campaignContext?.icp,
      opportunity: campaignContext?.title,
      area: campaignContext?.area,
      matchReasons: campaignContext?.matchReasons,
    },
    sighting: {
      billboard: capture.billboard.label ?? "Billboard",
      address: capture.billboard.address,
      distanceM: Math.round(capture.distanceM),
      angleOffCenterDeg: Math.round(capture.angleOffCenterDeg),
      score: Math.round(capture.score * 100),
    },
    perception,
    attention: {
      verdict: result.verdict,
      scores: result.scores,
      street: result.street,
    },
  };

  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: AGENT_MODEL,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(prompt) },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`OpenAI pedestrian agent failed: ${res.status} ${await res.text()}`);

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  return parseAgent(JSON.parse(content), fallback, AGENT_MODEL);
}

export async function POST(req: NextRequest) {
  let body: AgentRequestBody;
  try {
    body = await req.json() as AgentRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.profile || !body.capture || !body.perception || !body.result) {
    return NextResponse.json({ error: "Missing profile, capture, perception, or result." }, { status: 400 });
  }

  const agentId = body.agentId || body.capture.pedestrianId;
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const agent = await generateAgent({
        agentId,
        profile: body.profile,
        capture: body.capture,
        perception: body.perception,
        result: body.result,
        campaignContext: body.campaignContext ?? null,
        apiKey,
      });
      return NextResponse.json({ agent });
    } catch (err) {
      console.error("Pedestrian agent failed, falling back:", err);
    }
  }

  return NextResponse.json({
    agent: fallbackAgent({
      agentId,
      profile: body.profile,
      capture: body.capture,
      perception: body.perception,
      result: body.result,
    }),
  });
}
