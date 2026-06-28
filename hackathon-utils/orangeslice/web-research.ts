import { getServices } from "./_client";

export interface BrandIntel {
  recentNews: string[];
  adCampaigns: string[];
  techStack: string[];
  linkedinAboutSnippet: string | null;
}

/** Batch web search for brand intel — recent news, campaigns, tech stack */
export async function researchBrand(domain: string): Promise<BrandIntel> {
  const s = getServices();

  const queries = [
    { query: `"${domain}" marketing campaign 2025 OR 2026` },
    { query: `"${domain}" out-of-home billboard advertising` },
    { query: `"${domain}" brand awareness campaign` },
    { query: `"${domain}" funding OR expansion 2025 OR 2026` },
  ];

  const results = await s.web.batchSearch({ queries });

  const snippets = results.flatMap((r) =>
    r.results.map((x) => x.snippet).filter(Boolean)
  ) as string[];

  return {
    recentNews: snippets.slice(0, 3),
    adCampaigns: snippets.filter((s) =>
      /campaign|billboard|out-of-home|OOH|brand awareness/i.test(s)
    ).slice(0, 2),
    techStack: [],
    linkedinAboutSnippet: null,
  };
}

/** Scrape a brand's website and return markdown content for AI analysis */
export async function scrapeBrandWebsite(url: string): Promise<string> {
  const s = getServices();
  const { markdown } = await s.scrape.website({ url });
  return markdown ?? "";
}
