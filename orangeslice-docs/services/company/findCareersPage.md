# Find Company Careers Page

Resolve a company's official careers page and, when possible, return the underlying ATS jobs page instead.

This is best when you have a company website or a specific company page and want the canonical place to browse jobs.

## Input Parameters

Provide **one** of:

| Parameter | Type     | Required | Description                                                        |
| --------- | -------- | -------- | ------------------------------------------------------------------ |
| `website` | `string` | No       | Company website or page URL, e.g. `stripe.com` or `https://ro.co/` |
| `url`     | `string` | No       | Alias for `website`                                                |

**Optional:**

| Parameter | Type     | Required | Description                          |
| --------- | -------- | -------- | ------------------------------------ |
| `timeout` | `string` | No       | Batch timeout override, e.g. `"30m"` |

## Output

```typescript
{
   inputUrl: string;
   normalizedWebsiteUrl: string;
   careerPageUrl: string | null;
   pageType: "ats" | "official" | "not_found";
   atsProvider: string | null;
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
   checkedUrls: string[];
}
```

## Examples

### Basic Careers Lookup

```typescript
const result = await services.company.findCareersPage({
   website: row.website
});

return result.careerPageUrl;
```

### Prefer ATS When Available

```typescript
const result = await services.company.findCareersPage({
   website: "https://plaid.com"
});

return {
   url: result.careerPageUrl,
   type: result.pageType,
   ats: result.atsProvider
};
```

### Handle Not Found

```typescript
const result = await services.company.findCareersPage({
   website: row.website
});

if (result.pageType === "not_found") {
   return null;
}

return result.careerPageUrl;
```

### Debug Why a Result Was Chosen

```typescript
const result = await services.company.findCareersPage({
   website: row.website
});

return {
   careerPageUrl: result.careerPageUrl,
   pageType: result.pageType,
   atsProvider: result.atsProvider,
   detectionMethod: result.detectionMethod,
   checkedUrls: result.checkedUrls
};
```

## What It Detects

- Official careers pages like `https://company.com/careers`
- Careers subdomains like `https://careers.company.com/`
- ATS boards when discoverable from the company site
- Embedded/wrapped ATS pages when the company site hosts the jobs UI directly

Common ATS providers currently recognized include:

- `ashby`
- `greenhouse`
- `lever`
- `workday`
- `icims`
- `gem`
- `kula`
- `breezy`
- `bamboohr`
- `rippling`
- `personio`
- `phenom`
- `smartrecruiters`
- `successfactors`
- `jobvite`
- `recruitee`
- `teamtailor`
- `indeed`
- `bestjobs`
- `ejobs`

## Key Rules

1. **Pass the company website when possible** - homepage/company URLs usually produce the best canonical result.
2. **ATS is preferred over generic careers pages** - if the company site clearly points to an ATS board, that board is returned.
3. **Deep location/provider pages can still work** - the resolver attempts to collapse some subdomains and detail pages back to the parent organization's careers site.
4. **`pageType: "official"` is still a success** - many enterprises host jobs on branded careers portals instead of a third-party ATS URL.
5. **Use `checkedUrls` for debugging** - when a result looks wrong or missing, inspect the visited candidates.
