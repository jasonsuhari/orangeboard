# Scrape ATS Careers Page

Extract a standardized list of jobs from a supported **official ATS-hosted** careers page without using a browser when possible.

This is best when you already have an ATS careers page URL, or when you first resolved one with `services.company.findCareersPage` and now want the actual jobs.

## Input Parameters

Provide **one** of:

| Parameter        | Type     | Required | Description                                                                                     |
| ---------------- | -------- | -------- | ----------------------------------------------------------------------------------------------- |
| `careersPageUrl` | `string` | No       | Official ATS board URL or ATS job/detail URL, e.g. `https://job-boards.greenhouse.io/anthropic` |
| `url`            | `string` | No       | Alias for `careersPageUrl`                                                                      |

**Optional:**

| Parameter | Type     | Required | Description                          |
| --------- | -------- | -------- | ------------------------------------ |
| `timeout` | `string` | No       | Batch timeout override, e.g. `"30m"` |

## Output

```typescript
{
   status: "success" | "unsupported_url" | "unsupported_provider";
   inputUrl: string;
   normalizedBoardUrl: string | null;
   atsProvider: string | null;
   companyName: string | null;
   source: "api" | "html" | null;
   totalJobs: number;
   jobs: Array<{
      id: string;
      title: string;
      url: string;
      applyUrl: string | null;
      location: string | null;
      locations: string[];
      department: string | null;
      team: string | null;
      employmentType: string | null;
      workplaceType: string | null;
      postedAt: string | null;
      postedText: string | null;
      requisitionId: string | null;
   }>;
   checkedUrls: string[];
   supportedProviders: string[];
   message: string | null;
}
```

## Examples

### Scrape Jobs From a Known ATS Board

```typescript
const result = await services.company.scrapeCareersPage({
   careersPageUrl: "https://job-boards.greenhouse.io/anthropic"
});

return result.jobs;
```

### Resolve Then Scrape

```typescript
const careers = await services.company.findCareersPage({
   website: row.website
});

if (!careers.careerPageUrl || careers.pageType !== "ats") {
   return [];
}

const jobs = await services.company.scrapeCareersPage({
   careersPageUrl: careers.careerPageUrl
});

return jobs.jobs;
```

### Return Lightweight Job Summaries

```typescript
const result = await services.company.scrapeCareersPage({
   careersPageUrl: row.careers_page
});

return result.jobs.map((job) => ({
   title: job.title,
   location: job.location,
   department: job.department,
   url: job.url
}));
```

### Handle Unsupported Providers Gracefully

```typescript
const result = await services.company.scrapeCareersPage({
   careersPageUrl: row.careers_page
});

if (result.status !== "success") {
   return {
      status: result.status,
      provider: result.atsProvider,
      message: result.message
   };
}

return result.totalJobs;
```

### Pass a Job Detail URL

```typescript
const result = await services.company.scrapeCareersPage({
   careersPageUrl: "https://jobs.lever.co/mistral/2a357282-9d44-4b41-a249-c75ffe878ce2"
});

return {
   board: result.normalizedBoardUrl,
   jobs: result.totalJobs
};
```

## Supported Providers

Current browser-free implementations:

- `ashby`
- `breezy`
- `greenhouse`
- `lever`
- `recruitee`
- `rippling`
- `smartrecruiters`
- `workable`
- `workday`

## Key Rules

1. **Use this for official ATS pages** - this endpoint is not meant for generic `company.com/careers` pages unless they are clearly hosted by a supported ATS.
2. **Prefer resolving first when starting from a company website** - use `services.company.findCareersPage` to find the canonical ATS URL, then pass that into this scraper.
3. **Job/detail URLs are okay** - supported ATS detail URLs are normalized back to the board before scraping.
4. **Treat `unsupported_provider` as expected** - it means the input was a recognized ATS, but this scraper does not implement that provider yet.
5. **Use `checkedUrls` for debugging** - when counts or mappings look off, inspect the URLs that were actually queried.
