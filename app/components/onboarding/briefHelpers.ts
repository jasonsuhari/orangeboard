import type { CompanyBrief } from "../../lib/types";

export function extractDomain(url: string): string {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function persistCreative(brief: CompanyBrief, imageUrl: string, source: string) {
  try {
    localStorage.setItem("vs:creative", JSON.stringify({
      imageUrl,
      company: brief.identity.companyName,
      source,
    }));
    localStorage.setItem("vs:brief", JSON.stringify(brief));
  } catch { /* ignore storage failures */ }
}

export function listToTextarea(items?: string[]): string {
  return (items ?? []).join("\n");
}

export function textareaToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function buildFallbackBrief(url: string): CompanyBrief {
  const clean = url
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(".")[0]
    .replace(/[-_]/g, " ");
  const companyName = clean
    ? clean.split(" ").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
    : "Your Company";

  return {
    url,
    identity: {
      companyName,
      industry: "B2B software",
      description: "A B2B company that needs a concise outdoor message and a focused account-based campaign.",
      brandAdjectives: ["direct", "credible", "modern"],
      tagline: "Built for teams ready to scale",
    },
    visualSystem: {
      primaryColor: "#C2410C",
      styleReference: "Clean enterprise campaign with strong contrast and minimal copy.",
    },
    campaign: {
      coreMessage: `${companyName} helps growing teams move faster with less operational drag.`,
      offerOrHook: "Local campaign for high-intent accounts clustered nearby.",
      callToAction: "Book a demo",
      campaignObjective: "awareness",
    },
    audience: {
      description: "Growth, finance, operations, and executive buyers at scaling B2B companies.",
      tone: "sharp and practical",
      contextWhenSeen: "mixed",
    },
    strategy: {
      positioning: `${companyName} is positioned as a practical B2B solution for teams trying to scale without extra operational drag.`,
      customerProblem: "Growing teams are losing momentum to manual workflows, unclear ownership, and scattered campaign execution.",
      customerPromise: "Help teams move faster with a campaign message that feels specific, credible, and easy to act on.",
      differentiators: [
        "Focused on high-intent local account clusters",
        "Connects billboard creative to measurable campaign follow-up",
        "Simple enough to understand from a glance",
      ],
      proofPoints: [
        "Website scan was unavailable, so this is a conservative fallback brief.",
        "Campaign zones are matched to nearby account and foot-traffic signals.",
      ],
      messageHierarchy: [
        `${companyName} helps growing teams move faster.`,
        "Less operational drag.",
        "One direct CTA.",
      ],
      creativeMandatories: [
        "Use high contrast and minimal copy",
        "Make the buyer outcome obvious",
        "Avoid generic startup abstractions",
      ],
    },
    sourceContext: {
      sourceSummary: "Fallback brief generated because the website scan did not return in time.",
      observedClaims: [],
      observedCtas: [],
      evidenceSnippets: [],
    },
    heuristic: true,
  };
}
