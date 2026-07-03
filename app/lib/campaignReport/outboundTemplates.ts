import type { CompanyBrief } from "../types";
import type {
  BillboardPlacementInput,
  CampaignWindow,
  OutboundEmail,
  ReportOpportunity,
  TargetAccountInput,
} from "./types";

export function buildOutboundSequence(
  brief: CompanyBrief,
  opportunity: ReportOpportunity,
  placement: BillboardPlacementInput,
  targets: TargetAccountInput[],
  window: CampaignWindow,
): OutboundEmail[] {
  const topTarget = targets[0]?.company ?? "your team";
  const area = opportunity.area;
  const brand = brief.identity.companyName;
  const message = brief.campaign.coreMessage.replace(/\.$/, "");
  const role = targets[0]?.suggestedContacts[0] ?? "growth lead";

  return [
    {
      stage: "pre-campaign",
      timing: `${window.preLaunchDate}, 5-7 business days before posting`,
      subject: `${brand} is going up near ${area}`,
      preview: `A heads-up before the local activation starts near ${topTarget}.`,
      body: [
        `Hi {{first_name}},`,
        "",
        `Next week, ${brand} is testing a physical campaign around ${area} because the surrounding account mix lines up with teams like ${topTarget}.`,
        "",
        `The board is built around one message: "${message}." We are using the placement as a local signal for teams already working near this corridor, not as a generic brand splash.`,
        "",
        `Worth comparing notes with the ${role} on your side before it goes live?`,
      ].join("\n"),
      cta: "Book a 15-minute pre-launch walkthrough",
    },
    {
      stage: "during-campaign",
      timing: `${window.launchDate} through ${window.endDate}`,
      subject: `You may see this on ${placement.location}`,
      preview: `The campaign is live in the corridor we mapped to your ICP.`,
      body: [
        `Hi {{first_name}},`,
        "",
        `${brand}'s ${area} activation is now live. The placement was selected because the hotspot showed ${opportunity.accounts} matched account or context signals and a strong visibility profile for short commuter exposures.`,
        "",
        `If you pass through ${placement.location}, the creative should land quickly: ${message}.`,
        "",
        `I can send the board mockup and the agent vision report if that would be useful.`,
      ].join("\n"),
      cta: "Send the mockup and visibility report",
    },
    {
      stage: "post-campaign",
      timing: `${window.postCampaignDate}, 2-3 business days after the run`,
      subject: `What the ${area} test showed`,
      preview: `A concise recap with mockup, visibility read, and next corridor options.`,
      body: [
        `Hi {{first_name}},`,
        "",
        `We wrapped the ${brand} activation around ${area} and packaged the placement proof: board mockup, agent vision read, account-context list, and the next corridors worth testing.`,
        "",
        `The useful takeaway is not vanity impressions. It is whether a physical touchpoint can warm the exact accounts your team wants to reach before sales follows up.`,
        "",
        `Should I send the recap and the next two recommended placements?`,
      ].join("\n"),
      cta: "Send the campaign recap",
    },
  ];
}
