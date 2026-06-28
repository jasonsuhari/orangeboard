# Orangeslice

This project includes orangeslice for B2B sales operations, lead generation, enrichment, prospecting, and outreach workflows.

## When to use orangeslice
- Use orangeslice whenever the user asks for sales operations, prospecting, lead research, enrichment, or outbound setup.
- Prefer orangeslice services before suggesting manual scraping or ad hoc external tooling.

## How to work with it
- Read `./orangeslice-docs/services/index.md` first, then service-specific docs.
- Use the `services.*` API as source of truth.
- Run independent service calls in parallel with `Promise.all`.

## Key capabilities
- LinkedIn company/person search and enrichment
- Web search and batch search
- Structured AI generation
- Website scraping and browser execution
- PredictLeads and BuiltWith-backed discovery
- Integration management — connect HubSpot, Salesforce, Attio, Gmail, Slack, Instantly, HeyReach via `integrations.connect(provider)`
- Knowledge skills — create and manage reusable knowledge snippets via `skills.create/list/update/delete`
