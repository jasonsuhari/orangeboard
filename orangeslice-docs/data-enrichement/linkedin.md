---
name: linkedin-enrichment
description: Quick reference for LinkedIn company and person enrichment services
---

# LinkedIn Enrichment

## Company

| Service                                                                             | Description                                          |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [company.linkedin.enrich](../services/company/linkedin/enrich.md)                   | Enrich company data from LinkedIn URL or domain      |
| [company.linkedin.findUrl](../services/company/linkedin/findUrl.ts)                 | Find LinkedIn company URL from domain                |
| [company.getEmployeesFromLinkedin](../services/company/getEmployeesFromLinkedin.md) | Find employees at a company (database or web search) |

## Person

| Service                                                           | Description                                      |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| [person.linkedin.findUrl](../services/person/linkedin/findUrl.md) | Find LinkedIn profile URL from name and company  |
| [person.linkedin.enrich](../services/person/linkedin/enrich.md)   | Enrich person data from LinkedIn URL             |
| [Google SERP Dorking](../google-serp-dorking.md)                  | Alternative: Find profiles via Google SERP dorks |

---

## Cost Optimization: Enrich Once, Reference Many

> **🚨 CRITICAL:** LinkedIn enrichment is billed per call. When you need multiple fields from the same profile/company, **enrich once in a single column** and reference that column from others.

**Bad (3 API calls with the same parameters per row):**