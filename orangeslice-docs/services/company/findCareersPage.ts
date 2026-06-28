interface FindCareersPageResult {
  /** The original website or URL input */
  inputUrl: string;
  /** Canonical homepage/base URL used during discovery */
  normalizedWebsiteUrl: string;
  /** Best careers page URL found, or null when none was found */
  careerPageUrl: string | null;
  /** Whether the result points to an ATS board, an official careers page, or nothing */
  pageType: "ats" | "official" | "not_found";
  /** ATS provider when pageType is "ats" */
  atsProvider: string | null;
  /** How the page was discovered */
  detectionMethod:
    | "input-ats"
    | "homepage-ats-link"
    | "homepage-careers-link"
    | "deterministic-candidate"
    | "candidate-ats-link"
    | "embedded-ats"
    | "candidate-redirect"
    | "ats-unverified"
    | "not-found";
  /** URLs checked while searching */
  checkedUrls: string[];
}

/**
 * Find the best careers page for a company website.
 * Accepts a homepage URL/domain and returns either a canonical ATS board URL
 * or an official careers page on the company site.
 */
type findCareersPage = (params: {
    /** Company website or homepage URL */
    website?: string;
    /** Alias for website. Provide website or url. */
    url?: string;
  }) => Promise<FindCareersPageResult>;
