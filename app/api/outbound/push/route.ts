import { NextRequest, NextResponse } from "next/server";
import { configure, integrations } from "orangeslice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type PushProvider = "hubspot" | "salesforce" | "instantly";
type OutboundStatus = "drafted" | "approved" | "sent" | "replied";

interface OutboundPushItem {
  id: string;
  account: string;
  domain?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  fundingSummary?: string;
  contactName?: string | null;
  contactTitle?: string | null;
  email?: string | null;
  hook: string;
  subject: string;
  pitch: string;
  status: OutboundStatus;
}

interface OutboundPushRequest {
  provider?: PushProvider;
  campaign?: {
    key?: string;
    name?: string;
    companyName?: string;
    opportunityTitle?: string;
    opportunityArea?: string;
    boardLocation?: string;
    boardAddress?: string;
  };
  instantly?: {
    targetType?: "campaign" | "list";
    targetId?: string;
  };
  items?: OutboundPushItem[];
}

interface PushResult {
  id: string;
  success: boolean;
  externalId?: string;
  error?: string;
}

interface HubSpotRecord {
  id?: string;
}

interface SalesforceCreateResult {
  id?: string;
  success?: boolean;
  errors?: Array<{ message?: string }>;
}

interface InstantlyBulkResult {
  total_sent?: number;
  leads_uploaded?: number;
  status?: string;
}

let configured = false;

function configureOrangeslice() {
  if (configured) return;
  const apiKey = process.env.ORANGESLICE_API_KEY;
  if (!apiKey) {
    throw new Error("ORANGESLICE_API_KEY is required before pushing outbound integrations.");
  }
  configure({ apiKey });
  configured = true;
}

export async function POST(req: NextRequest) {
  let body: OutboundPushRequest;
  try {
    body = (await req.json()) as OutboundPushRequest;
  } catch {
    return NextResponse.json({ configured: true, error: "Invalid request body" }, { status: 400 });
  }

  if (!body.provider || !["hubspot", "salesforce", "instantly"].includes(body.provider)) {
    return NextResponse.json({ configured: true, error: "Unsupported provider" }, { status: 400 });
  }

  const items = (body.items ?? []).filter((item) => item?.id && item.account && item.status === "approved");
  if (!items.length) {
    return NextResponse.json({ configured: true, error: "No approved outbound rows to push" }, { status: 400 });
  }

  try {
    configureOrangeslice();
  } catch (err) {
    return NextResponse.json(
      { configured: false, error: err instanceof Error ? err.message : "Orangeslice is not configured" },
      { status: 200 },
    );
  }

  try {
    const connected = await integrations.list({ provider: body.provider });
    if (!connected.integrations.some((integration) => integration.isActive)) {
      return NextResponse.json(
        {
          configured: true,
          error: `No active ${providerLabel(body.provider)} integration is connected in Orange Slice.`,
        },
        { status: 409 },
      );
    }

    if (body.provider === "hubspot") {
      const results = await pushHubSpot(items, body.campaign);
      return NextResponse.json({
        configured: true,
        provider: body.provider,
        pushed: results.filter((result) => result.success).length,
        results,
      });
    }

    if (body.provider === "salesforce") {
      const results = await pushSalesforce(items, body.campaign);
      return NextResponse.json({
        configured: true,
        provider: body.provider,
        pushed: results.filter((result) => result.success).length,
        results,
      });
    }

    const results = await pushInstantly(items, body.campaign, body.instantly);
    return NextResponse.json({
      configured: true,
      provider: body.provider,
      pushed: results.filter((result) => result.success).length,
      results,
    });
  } catch (err) {
    return NextResponse.json(
      {
        configured: true,
        error: err instanceof Error ? err.message : "Outbound push failed",
      },
      { status: 502 },
    );
  }
}

async function pushHubSpot(
  items: OutboundPushItem[],
  campaign: OutboundPushRequest["campaign"],
): Promise<PushResult[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        const name = splitName(item.contactName);
        const company = (await integrations.hubspot.createCompany({
          properties: {
            name: item.account,
            domain: cleanDomain(item.domain),
            website: websiteFromDomain(item.domain),
            industry: item.industry ?? undefined,
            numberofemployees:
              typeof item.employeeCount === "number" ? String(item.employeeCount) : undefined,
            lifecyclestage: "lead",
            description: [
              item.hook,
              campaign?.opportunityTitle ? `Opportunity: ${campaign.opportunityTitle}` : "",
              campaign?.boardLocation ? `Board: ${campaign.boardLocation}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        })) as HubSpotRecord;

        const contact = shouldCreateContact(item)
          ? ((await integrations.hubspot.createContact({
              properties: {
                email: item.email ?? undefined,
                firstname: name.first,
                lastname: name.last,
                company: item.account,
                website: websiteFromDomain(item.domain),
                jobtitle: item.contactTitle ?? undefined,
                lifecyclestage: "lead",
                hs_lead_status: "NEW",
              },
            })) as HubSpotRecord)
          : null;

        const noteTarget = contact?.id
          ? { id: contact.id, associationTypeId: 202 }
          : company.id
            ? { id: company.id, associationTypeId: 190 }
            : null;
        if (noteTarget) {
          try {
            await integrations.hubspot.createNote({
              properties: {
                hs_note_body: hubSpotNoteBody(item, campaign),
                hs_timestamp: new Date().toISOString(),
              },
              associations: [
                {
                  to: { id: noteTarget.id },
                  types: [
                    {
                      associationCategory: "HUBSPOT_DEFINED",
                      associationTypeId: noteTarget.associationTypeId,
                    },
                  ],
                },
              ],
            });
          } catch {
            // The company/contact push is still useful if note association fails.
          }
        }

        return {
          id: item.id,
          success: true,
          externalId: contact?.id ?? company.id,
        };
      } catch (err) {
        return {
          id: item.id,
          success: false,
          error: err instanceof Error ? err.message : "HubSpot push failed",
        };
      }
    }),
  );
}

async function pushSalesforce(
  items: OutboundPushItem[],
  campaign: OutboundPushRequest["campaign"],
): Promise<PushResult[]> {
  const records = items.map((item) => {
    const name = splitName(item.contactName);
    return {
      attributes: { type: "Lead" },
      FirstName: name.first,
      LastName: name.last ?? "Marketing",
      Company: item.account,
      Email: item.email ?? undefined,
      Title: item.contactTitle ?? undefined,
      Website: websiteFromDomain(item.domain),
      Industry: item.industry ?? undefined,
      Status: "Open - Not Contacted",
      LeadSource: "Orangeboard",
      Description: [
        item.hook,
        "",
        `Subject: ${item.subject}`,
        item.pitch,
        campaign?.boardLocation ? `Board: ${campaign.boardLocation}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  });

  const results = (await integrations.salesforce.createRecords({
    records,
    allOrNone: false,
  })) as SalesforceCreateResult[];

  return items.map((item, index) => {
    const result = results[index];
    return {
      id: item.id,
      success: Boolean(result?.success),
      externalId: result?.id,
      error: result?.success
        ? undefined
        : result?.errors?.map((error) => error.message).filter(Boolean).join("; ") || "Salesforce lead create failed",
    };
  });
}

async function pushInstantly(
  items: OutboundPushItem[],
  campaign: OutboundPushRequest["campaign"],
  instantly: OutboundPushRequest["instantly"],
): Promise<PushResult[]> {
  const targetId = instantly?.targetId?.trim();
  if (!targetId) {
    throw new Error("Instantly requires a campaign ID or list ID.");
  }

  const targetType = instantly?.targetType === "list" ? "list" : "campaign";
  const eligible = items.filter((item) =>
    targetType === "campaign"
      ? Boolean(item.email)
      : Boolean(item.email || item.contactName),
  );
  if (!eligible.length) {
    throw new Error("Instantly requires an email for campaign pushes, or a name/email for list pushes.");
  }

  const leads = eligible.map((item) => {
    const name = splitName(item.contactName);
    return {
      email: item.email ?? null,
      first_name: name.first ?? null,
      last_name: name.last ?? null,
      company_name: item.account,
      website: websiteFromDomain(item.domain) ?? null,
      personalization: item.pitch,
      custom_variables: {
        orangeboard_campaign: campaign?.name ?? "",
        orangeboard_company: campaign?.companyName ?? "",
        orangeboard_opportunity: campaign?.opportunityTitle ?? "",
        orangeboard_board: campaign?.boardLocation ?? "",
        orangeboard_subject: item.subject,
        orangeboard_hook: item.hook.slice(0, 500),
      },
      skip_if_in_workspace: true,
      verify_leads_on_import: true,
    };
  });

  const payload =
    targetType === "campaign"
      ? { campaign_id: targetId, leads, skip_if_in_workspace: true, verify_leads_on_import: true }
      : { list_id: targetId, leads, skip_if_in_workspace: true, verify_leads_on_import: true };

  const result = (await integrations.instantly.bulkAddLeads(payload)) as InstantlyBulkResult;
  const uploaded = result.leads_uploaded ?? eligible.length;
  const eligibleOrder = new Map(eligible.map((item, index) => [item.id, index]));

  return items.map((item) => {
    const eligibleIndex = eligibleOrder.get(item.id);
    return {
      id: item.id,
      success: eligibleIndex !== undefined && eligibleIndex < uploaded,
      error: eligibleIndex !== undefined ? undefined : "Skipped by Instantly eligibility rules",
    };
  });
}

function providerLabel(provider: PushProvider): string {
  if (provider === "hubspot") return "HubSpot";
  if (provider === "salesforce") return "Salesforce";
  return "Instantly";
}

function shouldCreateContact(item: OutboundPushItem): boolean {
  return Boolean(item.email || item.contactName || item.contactTitle);
}

function splitName(fullName?: string | null): { first?: string; last?: string } {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { last: parts[0] };
  return {
    first: parts.slice(0, -1).join(" "),
    last: parts[parts.length - 1],
  };
}

function cleanDomain(domain?: string | null): string | undefined {
  if (!domain) return undefined;
  try {
    const parsed = new URL(domain.includes("://") ? domain : `https://${domain}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || undefined;
  }
}

function websiteFromDomain(domain?: string | null): string | undefined {
  const cleaned = cleanDomain(domain);
  return cleaned ? `https://${cleaned}` : undefined;
}

function hubSpotNoteBody(
  item: OutboundPushItem,
  campaign: OutboundPushRequest["campaign"],
): string {
  return [
    `<strong>Orangeboard outbound pitch</strong>`,
    `Campaign: ${escapeHtml(campaign?.name ?? "")}`,
    `Board: ${escapeHtml(campaign?.boardLocation ?? "")}`,
    `Subject: ${escapeHtml(item.subject)}`,
    "",
    escapeHtml(item.pitch).replace(/\n/g, "<br />"),
  ]
    .filter(Boolean)
    .join("<br />");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
