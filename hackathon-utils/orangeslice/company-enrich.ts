import { getServices } from "./_client";

export interface EnrichOpts {
  /** Company LinkedIn URL */
  url?: string;
  /** LinkedIn slug e.g. "stripe" */
  slug?: string;
  /** Company domain e.g. "stripe.com" */
  domain?: string;
}

/** Fast company lookup (~300-500ms). Returns core identity fields. */
export async function enrichCompany(opts: EnrichOpts) {
  const s = getServices();
  return s.company.linkedin.enrich({
    url: opts.url,
    shorthand: opts.slug,
    domain: opts.domain,
  });
}

/** Extended lookup — includes funding rounds, YoY growth, office locations, LinkedIn posts. */
export async function enrichCompanyExtended(opts: EnrichOpts) {
  const s = getServices();
  return s.company.linkedin.enrich({
    url: opts.url,
    shorthand: opts.slug,
    domain: opts.domain,
    extended: true,
  });
}

/** Find the LinkedIn URL for a company by name (when you don't have the URL yet) */
export async function findCompanyLinkedIn(name: string): Promise<string | null> {
  const s = getServices();
  return s.company.linkedin.findUrl({ companyName: name });
}

/** Get a formatted funding summary string for pitch context */
export function formatFunding(funding: Array<{
  round_name: string | null;
  round_amount: number | null;
  round_date: string | null;
}> | null | undefined): string {
  if (!funding?.length) return "Funding unknown";
  const latest = funding[funding.length - 1];
  const amount = latest.round_amount
    ? `$${(latest.round_amount / 1_000_000).toFixed(1)}M`
    : "undisclosed";
  return `${latest.round_name ?? "Funded"} ${amount} (${latest.round_date?.slice(0, 4) ?? "recent"})`;
}
