import type { AttentionSimResult, Region, SceneElement } from "../../lib/types";
import type { PedestrianProfile } from "../../lib/pedestrianIcp";
import type { PedestrianBillboardCapture } from "../../simulation/pedestrianVision";

export type JournalPageStatus = "rendering" | "analyzing" | "done" | "error";
export type JournalAgentStatus = "thinking" | "done" | "error";

export type PedestrianAgentLog = {
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

export type JournalPage = {
  id: string;
  capture: PedestrianBillboardCapture;
  profileId: string;
  profile: PedestrianProfile;
  createdAt: number;
  status: JournalPageStatus;
  agentStatus?: JournalAgentStatus;
  agent?: PedestrianAgentLog;
  agentError?: string;
  imageUrl?: string;
  cleanImageUrl?: string;
  heatmapImageUrl?: string;
  eyeScanImageUrl?: string;
  region?: Region;
  result?: AttentionSimResult;
  elements?: SceneElement[];
  error?: string;
};
