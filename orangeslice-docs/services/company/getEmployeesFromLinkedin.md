# Get Employees from LinkedIn

Find employees at a company using database search (default) or web search.

**Credits: 1/result (per-result). Reserves up to `limit` (default 25, max 100).**

## Strategy Selection

| Strategy               | Best For                                       | Speed     |
| ---------------------- | ---------------------------------------------- | --------- |
| `"database"` (default) | IC roles AND VP/Director/Head level leadership | 200-400ms |
| `"web"`                | C-Suite only (CEO, CTO, CFO) and Founders      | 2-5s      |

### When to Use Database (Default)

**Use database for almost everything.** It achieves **97-100% precision** for:

- **IC roles**: Software Engineer, Product Manager, Data Scientist, Designer, Recruiter, Account Executive, Customer Success
- **VP/Director/Head level**: VP of Marketing, Director of Operations, Head of Sales, etc. (use `titleSqlFilter`)

**Important:** VP, Director, and Head-level roles are NOT C-Suite. These have standardized titles and work great with database + `titleSqlFilter`.

### When to Use Web Strategy

**Web is ONLY for top executive roles** where the same position has many different titles:

| Role                | Why Web?                                                       |
| ------------------- | -------------------------------------------------------------- |
| **C-Suite**         | CEO, CTO, CFO, COO, CMO — titles vary widely across companies  |
| **Founders**        | "Co-Founder", "Founder & CEO", "Cofounder", "Founding Partner" |
| **President**       | Database returns noise like "Regional VP", "SVP"               |
| **General Counsel** | "GC", "General Counsel", "Chief Legal Officer"                 |

**Do NOT use web for:** VP of Marketing, Director of Engineering, Head of Sales — these are standardized titles that database handles perfectly.

**Web strategy limitation:** Maximum of **3 title variations**. Additional variations will be ignored.

---

## Input Parameters

| Parameter                 | Type                    | Required | Description                                                                                                                            |
| ------------------------- | ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `companySlug`             | `string`                | One of   | LinkedIn universal_name (e.g., "stripe")                                                                                               |
| `linkedinUrl`             | `string`                | One of   | Full LinkedIn URL                                                                                                                      |
| `searchStrategy`          | `"database"` \| `"web"` | No       | Default: "database"                                                                                                                    |
| `titleVariations`         | `string[]`              | For web  | Title keywords. **Required for web strategy. Max 3 variations.**                                                                       |
| `titleSqlFilter`          | `string`                | No       | Raw SQL for precise matching (database only)                                                                                           |
| `limit`                   | `number`                | No       | Max results (default: 25, max: 100)                                                                                                    |
| `usOnly`                  | `boolean`               | No       | US-based only (default: true)                                                                                                          |
| `minConnections`          | `number`                | No       | Min connections filter (default: 20)                                                                                                   |
| `offset`                  | `number`                | No       | Pagination offset (database only)                                                                                                      |
| `requireVerifiedPosition` | `boolean`               | No       | Web only. When true (default), only returns employees with a verified B2B database position. Set false to include unverified profiles. |

**Critical:** Provide `companySlug` OR `linkedinUrl`, not both. Website/domain input is NOT supported.

---

## Examples

### Standard IC Roles (Database)

```typescript
// Database works great for standardized titles
const { employees } = await services.company.getEmployeesFromLinkedin({
   linkedinUrl: row.linkedinCompanyUrl,
   titleVariations: ["software engineer"], // or "product manager", "data scientist", etc.
   limit: 50
});
```

### Functional Leadership (Database + titleSqlFilter)

Use word boundaries (`\m...\M`) with AND for high precision:

```typescript
// VP/Director/Head of Engineering - 100% precision
const { employees } = await services.company.getEmployeesFromLinkedin({
   linkedinUrl: row.linkedinCompanyUrl,
   titleSqlFilter: "pos.title ~* '\\m(VP|Director|Head)\\M' AND pos.title ~* '\\mEngineering\\M'",
   limit: 25
});
```

Pattern for other functions: replace `Engineering` with `Sales`, `Marketing`, `Product`, etc.

### C-Suite / Founders (Web Strategy)

```typescript
// Web strategy for C-Suite only (max 3 variations!)
// By default, only returns employees with a verified B2B database position
const { employees } = await services.company.getEmployeesFromLinkedin({
   linkedinUrl: row.linkedinCompanyUrl,
   searchStrategy: "web",
   titleVariations: ["CEO", "founder", "co-founder"], // Max 3 variations
   limit: 10
});
```

To include unverified profiles (found via Google but not confirmed in B2B database):

```typescript
const { employees } = await services.company.getEmployeesFromLinkedin({
   linkedinUrl: row.linkedinCompanyUrl,
   searchStrategy: "web",
   titleVariations: ["CEO", "founder", "co-founder"],
   requireVerifiedPosition: false, // Allow unverified profiles
   limit: 10
});
```

**Note:** Web strategy accepts a maximum of 3 title variations. Keep them focused on the core title variants. When `requireVerifiedPosition` is true (default), the company must exist in the B2B database or an error is thrown.

---

## titleSqlFilter Patterns

For leadership roles, use word boundaries + AND (not fuzzy patterns):

| Pattern                              | Precision | Notes                          |
| ------------------------------------ | --------- | ------------------------------ |
| `~* '\\mVP\\M' AND ~* '\\mSales\\M'` | 99-100%   | **Recommended**                |
| `~* 'VP.{0,10}Sales'`                | 99-100%   | Can timeout on large companies |
| `ILIKE '%VP%Sales%'`                 | 85-95%    | More false positives           |

Word boundaries explained:

- `\mVP\M` matches "VP" but NOT "MVP", "SVP", "EVP"
- `\mCTO\M` matches "CTO" but NOT "SCTO"

**Don't use titleSqlFilter for C-Suite** - low coverage due to title variations. Use web strategy instead.

---

## Output

```typescript
{
  employees: B2BEmployee[];    // Array of employee objects
  nextPage: number | null;     // Pagination offset (database only)
  totalResults: number | null; // Estimated total
}
```

Employee fields: `lp_first_name`, `lp_last_name`, `lp_formatted_name`, `lp_headline`, `lp_location_name`, `lp_public_profile_url`, `lp_title`, `lp_company_name`, `lp_connections`

---

## Pagination (Database Only)

Use `nextPage` from results for pagination:

```typescript
let offset: number | null = 0;
while (offset !== null) {
   const result = await services.company.getEmployeesFromLinkedin({
      linkedinUrl: companyUrl,
      titleVariations: ["engineer"],
      limit: 100,
      offset
   });
   // process result.employees
   offset = result.nextPage;
}
```

Web strategy does not support pagination.

---

## Key Rules

1. **No website/domain input** - resolve to LinkedIn URL first using `services.company.linkedin.findUrl()`
2. **Database for IC + VP/Director/Head roles** - Engineers, PMs, VP of Sales, Director of Ops all use database
3. **Web ONLY for C-Suite/Founders** - CEO, CTO, CFO, Founders have variable titles; VP/Director do NOT
4. **Web has max 3 variations** - additional `titleVariations` beyond 3 will be ignored
5. **Use word boundary + AND** for leadership searches - not fuzzy `.{0,n}` patterns
6. **"Product" is broad** - Product Leadership searches may include Product Marketing, Product Design
7. **US-only by default** - set `usOnly: false` for worldwide
8. **Web requires titleVariations** - will throw error if missing

---

## Verifying Stale Data

B2B data can be stale (~65% of records). To verify current employment, do a pure HTTP fetch to `https://www.linkedin.com/in/{slug}`. Parse current employer from headline or Experience section.
