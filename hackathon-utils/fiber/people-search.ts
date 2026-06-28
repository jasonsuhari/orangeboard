import { fiberPost, type FiberPersonResult } from "./_client";

export type SeniorityGroup =
  | "founder"
  | "c-suite"
  | "board-member"
  | "vp"
  | "director"
  | "management"
  | "entry-level";

export interface PeopleSearchFilters {
  /** Static role groups or exact title keywords */
  jobTitles?: {
    staticGroups?: SeniorityGroup[];
    keywords?: string[];
  };
  /** ISO alpha-3 country codes */
  countries?: string[];
  /** Minimum LinkedIn connection count */
  minConnections?: number;
  limit?: number;
}

export async function searchPeople(filters: PeopleSearchFilters): Promise<FiberPersonResult[]> {
  const searchParams: Record<string, unknown> = {};

  if (filters.jobTitles) {
    searchParams.jobTitleV2 = {
      staticGroups: filters.jobTitles.staticGroups,
      terms: filters.jobTitles.keywords?.map((k) => ({ value: k })),
    };
  }

  if (filters.countries?.length) {
    searchParams.country3LetterCode = filters.countries;
  }

  if (filters.minConnections) {
    searchParams.numConnections = { lowerBoundExclusive: filters.minConnections };
  }

  const data = await fiberPost<{ output?: { profiles?: FiberPersonResult[] } }>(
    "/v1/people-search",
    { searchParams, limit: filters.limit ?? 10 }
  );

  return data.output?.profiles ?? [];
}

/** Find CMOs, VPs of Marketing, and Growth leads in a given country */
export async function findMarketingLeaders(
  countries = ["USA"],
  limit = 20
): Promise<FiberPersonResult[]> {
  return searchPeople({
    jobTitles: {
      staticGroups: ["c-suite", "vp", "director"],
      keywords: ["marketing", "growth", "brand", "demand generation"],
    },
    countries,
    limit,
  });
}
