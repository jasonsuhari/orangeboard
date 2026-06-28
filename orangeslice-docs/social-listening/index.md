---
description: Monitor social posts and brand mentions across LinkedIn, Twitter, Reddit
---

# Social Listening

Find posts that mention specific topics, brands, or keywords. Set up workflows to track mentions over time.

---

## Finding Posts: Use Dorking

**[Google Dorking](../google-serp-dorking.md) is the easiest way** to find posts on Twitter, LinkedIn, and Reddit. Super cheap, fast, and effective.

```
# LinkedIn posts mentioning topic
"AI sales tools" site:linkedin.com/posts

# Twitter/X posts
"competitor name" site:x.com inurl:status

# Reddit discussions
"product name" site:reddit.com
```

### Exception: Finding a Specific Person's LinkedIn Posts

**Dorking does NOT work** for finding all posts by a specific LinkedIn user given their handle/profile URL. Google doesn't index LinkedIn posts by author reliably.

For this use case, you **must use an Apify actor** to scrape the person's activity feed directly:

- Use [Apify actors](../services/apify/runActor.md) to fetch posts from a specific LinkedIn profile

---

## Verification Required

Dorking returns keyword matches — not confirmed relevance.

### Common Problem: Sellers vs. Complainers

Users often want to find people **complaining about** tools so they can sell a solution. But keyword searches return mostly **people selling** the same tools.

Example: Searching `"Salesforce" "frustrating"` returns:

- ❌ SDRs selling Salesforce alternatives (competitors)
- ❌ Consultants promoting their Salesforce services
- ✅ Actual users complaining (the real target)

**Filter these out** with classification columns:

- "Is Author Selling?" — check if profile/bio indicates sales role or competitor
- "Is This a Complaint?" — check post sentiment and context

### Verification Sources

| Source                                        | Use For                                                                                |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| [LinkedIn data](../prospecting/linkedin_data) | Enrich author profile, company, role (**lookup only** — enrich by slug/ID, not search) |
| [Apify actors](../services/apify/runActor.md) | Scrape full post content from Twitter, Reddit                                          |

> **LinkedIn DB is a lookup tool, not a search engine.** Use it to enrich profile/company data when you already have a LinkedIn URL or company ID. Do NOT use it to search for posts or content — use web dorking instead.

Add AI classification: "Is this person complaining about [tool] as a user, or selling something?"

---

## Workflow Pattern

1. Dork for posts → add to sheet
2. Add "Author" column → enrich via LinkedIn or scrape
3. Add "Relevance" column → AI classifies if post matches intent
4. Filter to relevant posts
5. (Optional) Set up recurring runs to track new mentions
