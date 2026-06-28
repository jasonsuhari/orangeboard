---
description: Enrich person data from LinkedIn profile URL or username
---

# LinkedIn Person Enrich

Enrich a person from the B2B database. **Fast (~300-500ms).**

**Credits: 1/result (per-result)**

## When to Use

Use this to get profile information from a LinkedIn URL or username. Returns structured profile data from the B2B database.

## Input Parameters

Provide **at least one** of:

- `url`: LinkedIn profile URL (e.g., `"https://www.linkedin.com/in/satyanadella"`)
- `username`: LinkedIn profile slug/username (e.g., `"satyanadella"`)

**Optional:**

- `extended`: `boolean` (default: `false`) - Include experience, education, certifications, and more

## Return Types

### Default (`extended: false`) - `B2BPerson`

Basic profile info from the `linkedin_profile` table:

```typescript
interface B2BPerson {
   name: string | null; // Full name
   first_name: string | null; // First name
   last_name: string | null; // Last name
   slug: string | null; // LinkedIn profile slug
   url: string | null; // LinkedIn profile URL (alias of linkedin_url in some payloads)
   headline: string | null; // LinkedIn headline
   summary: string | null; // Profile summary/about
   title: string | null; // Current job title
   company_name: string | null; // Current company
   current_company_domain: string | null; // Current company website/domain
   current_company_linkedin_url: string | null; // Current company LinkedIn URL
   location: string | null; // Location string
   country_code: string | null; // Country code (e.g., "US")
   industry: string | null; // Industry name
   skills: string[] | null; // Skills array
   connections: number | null; // Connection count
   followers: number | null; // Follower count
   profile_pic: string | null; // Profile picture URL
   linkedin_url: string | null; // Full LinkedIn URL
   twitter_handle: string | null; // Twitter handle
   created_at: string | null; // Record created timestamp
   updated_at: string | null; // Record updated timestamp
}
```

### Extended (`extended: true`) - `B2BPersonExtended`

Full data from `lkd_profile` denormalized view. Includes everything from `B2BPerson` plus:

```typescript
interface B2BPersonExtended extends B2BPerson {
   // Career history
   experience: B2BPersonExperience[] | null;
   education: B2BPersonEducation[] | null;

   // Professional development
   certifications: B2BPersonCertification[] | null;
   courses: B2BPersonCourse[] | null;
   projects: B2BPersonProject[] | null;

   // Additional sections
   volunteering: B2BPersonVolunteering[] | null;
   patents: B2BPersonPatent[] | null;
   awards: B2BPersonAward[] | null;
   publications: B2BPersonPublication[] | null;
   recommendations: B2BPersonRecommendation[] | null;
   languages: B2BPersonLanguage[] | null;
   articles: B2BPersonArticle[] | null;

   // Metadata
   recommender_count: number | null; // Number of recommendations received
   jobs_count: number | null; // Total number of positions held
   is_influencer: boolean | null; // LinkedIn Top Voice / Influencer badge
}

// Experience entry from work history
interface B2BPersonExperience {
   id: number;
   linkedin_company_id: number | null;
   is_current: boolean;
   company_name: string;
   company_domain: string | null;
   company_linkedin_url: string | null;
   company_employee_count: number | null | undefined; // Employee count of the company; often absent for small firms without a LinkedIn company page, so prefer `== null` checks
   locality: string | null; // City/region of the job
   start_date: string | null; // "YYYY-MM-DD"
   start_date_year: number | null;
   start_date_month: number | null;
   end_date: string | null;
   end_date_year: number | null;
   end_date_month: number | null;
   summary: string | null;
   title: string;
   incomplete_experience: boolean | null;
   seniority: { id: number; seniority: string }[] | null; // e.g., "Entry level", "Manager", "Director"
   job_function: { id: number; job_function: string }[] | null; // e.g., "Engineering", "Sales", "Marketing"
   employment_type: { id: number; job_employment_type: string }[] | null; // e.g., "Full-time", "Part-time", "Internship"
   academic_qualification: { id: number; academic_qualification: string }[] | null;
   inferred_location: B2BPersonInferredLocation | null; // Usually null, when present may include geocoded details
}

// Education entry
interface B2BPersonEducation {
   school: {
      id: number | null;
      name: string;
      logo_url: string | null;
      created_at: string | null;
      updated_at: string | null;
   };
   field_of_study: { id: number | null; name: string | null };
   degree: string | null;
   grade: string | null;
   start_date: string | null; // "YYYY-MM-DD"
   end_date: string | null; // "YYYY-MM-DD"
   start_date_year: number | null;
   start_date_month: number | null;
   end_date_year: number | null;
   end_date_month: number | null;
   activities: string | null;
   notes: string | null;
   incomplete_education: boolean | null; // True if data is incomplete
}

// Certification entry
interface B2BPersonCertification {
   title: string;
   credential_id: string | null;
   verify_url: string | null;
   company_name: string | null;
   date_year: number | null;
   date_month: number | null;
   expire_date_year: number | null;
   expire_date_month: number | null;
}

// Course entry
interface B2BPersonCourse {
   title: string;
   course_number: string | null;
   association: string | null;
}

// Project entry
interface B2BPersonProject {
   project: { id: number; title: string; url: string | null; summary: string | null };
   is_current: boolean;
   start_date_year: number | null;
   end_date_year: number | null;
}

// Volunteering entry
interface B2BPersonVolunteering {
   role: string;
   is_current: boolean;
   cause: string | null;
   summary: string | null;
   company_name: string | null;
   start_date_year: number | null;
   end_date_year: number | null;
}

// Patent entry
interface B2BPersonPatent {
   id: number;
   title: string;
   country: string | null;
   number: string | null;
   description: string | null;
   url: string | null;
}

// Award entry
interface B2BPersonAward {
   title: string;
   summary: string | null;
   company_name: string | null;
   linkedin_company_id: number | null;
   date_day: number | null;
   date_month: number | null;
   date_year: number | null;
}

// Publication entry
interface B2BPersonPublication {
   publication: {
      id: number;
      title: string;
      publisher: string | null;
      summary: string | null;
      url: string | null;
      collaborators: { name: string; url: string | null }[] | null;
   };
}

// Recommendation entry
interface B2BPersonRecommendation {
   recommender_name: string;
   recommender_linkedin_profile_url: string;
   recommendation: string;
}

// Language entry
interface B2BPersonLanguage {
   id: number;
   name: string;
   proficiency: { id: number; name: string } | null;
}

// Article entry (LinkedIn articles written by the person)
interface B2BPersonArticle {
   id: number;
   title: string;
   date_published: string | null;
}

// Inferred location structure (often null in current payloads)
interface B2BPersonInferredLocation {
   latitude: number;
   longitude: number;
   formatted_address: string;
   name: string;
   country_iso: string;
   admin_district: string;
}
```

---

## Examples

### Basic Enrich by URL

```typescript
const profile = await services.person.linkedin.enrich({
   url: "https://www.linkedin.com/in/satyanadella"
});

return {
   name: profile?.name,
   title: profile?.title,
   company: profile?.company_name,
   location: profile?.location
};
```

### Basic Enrich by Username

```typescript
const profile = await services.person.linkedin.enrich({
   username: "satyanadella"
});

return profile?.headline; // "Chairman and CEO at Microsoft"
```

### Extended Enrich with Experience

```typescript
const profile = await services.person.linkedin.enrich({
   url: "https://www.linkedin.com/in/satyanadella",
   extended: true
});

return {
   name: profile?.name,
   title: profile?.title,
   company: profile?.company_name,
   experience: profile?.experience,
   education: profile?.education,
   skills: profile?.skills?.slice(0, 10)
};
```

---

## Common Patterns

### Find LinkedIn URL and Enrich

When you only have a person's name (not the LinkedIn URL), use `findUrl` first:

```typescript
// Find the LinkedIn URL from person's name and company
const linkedinUrl = await services.person.linkedin.findUrl({
   name: row.personName,
   company: row.companyName
});

if (linkedinUrl) {
   const profile = await services.person.linkedin.enrich({
      url: linkedinUrl,
      extended: true
   });
   return profile;
}
```

### Extract Key Metrics

```typescript
const profile = await services.person.linkedin.enrich({
   url: row.linkedinUrl,
   extended: true
});

if (!profile) return "Profile not found";

return {
   name: profile.name,
   currentRole: `${profile.title} at ${profile.company_name}`,
   location: profile.location,
   connections: profile.connections,
   experienceCount: profile.jobs_count
};
```

### Handle Missing Profiles

```typescript
const profile = await services.person.linkedin.enrich({
   username: row.linkedinUsername
});

if (!profile) {
   return "Profile not found in B2B database";
}

return profile.name;
```

---

## Performance

- **Fast**: ~300-500ms for indexed lookups
- **Default**: Use `extended: false` for quick lookups
- **Extended**: Use `extended: true` only when you need experience/education data
