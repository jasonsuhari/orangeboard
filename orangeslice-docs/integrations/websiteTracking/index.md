---
name: integrations/websiteTracking
description: Track website visitors (LinkedIn person identification). Use when a user asks to identify who is visiting their site, build website-intent lists, or trigger outreach from anonymous traffic.
---

# Website Visitor Identification

Identify the LinkedIn profile of US-based visitors to a customer's
website. The customer pastes a single `<script>` tag on their site;
every identified visit lands as a row on the spreadsheet that owns the
trigger.

- **Per-account tracking script** (`https://www.orangeslice.ai/wt.js?accountId=…`)
  is pasted on the customer's site. The `accountId` round-trips back to
  us as RB2B's `customer_id` on every ping, so even when multiple
  Orange Slice accounts have enrolled the same domain, the ping is
  routed only to the account that actually installed the script on
  that page. No per-customer external account, no logins, no separate
  billing. The script is provider-agnostic — if Orange Slice ever
  swaps the underlying identification provider, the customer's pasted
  snippet keeps working without any change.
- Every visitor ping fans out to a **master webhook** we own. The
  master webhook looks up `(captured domain, customer_id)`, charges the
  customer's Orange Slice credit balance ONCE, then forwards the
  visitor record to every trigger that this account enrolled for the
  domain (one ping → one charge → N sheet rows when the same account
  enrolled the domain on N spreadsheets).

## Pricing

**80 credits per non-repeat visitor.** Every distinct visit Orange
Slice's tracking partner reports is charged, including:

- Full identifications (LinkedIn URL + first name resolved), AND
- Company-only matches (the visiting company is resolved but no
  specific person).

Repeat visits from the same person/device are forwarded to the sheet
for context but NEVER charge credits.

Every row written to the sheet still includes whatever fields the
upstream resolved — column code can branch on `v.linkedinUrl !== null`
if the customer wants to filter out company-only rows downstream.

When the customer's balance hits zero, the master webhook automatically
pauses their domain so they stop incurring charges. **Resume is not
automatic** — after the customer tops up, the agent must explicitly call
`integrations.websiteTracking.resumeTracking()` to re-enable tracking.
The customer never has to re-paste the script.

If a customer mentions topping up credits or wanting their tracking
turned back on, check `listTrackedDomains()` — any mapping with
`status: "disabled_no_credits"` needs `resumeTracking()` to come back to
life.

## The Recipe (call once per domain)

```typescript
const { script, triggerId } = await integrations.websiteTracking.setupTracking({
   domain: "acme.com",
   sheetName: "Website Visitors" // optional, defaults to this
});

// Hand `script` to the user — they paste it on their site.
```

`setupTracking` does all of the following atomically:

1. Creates the destination sheet on the spreadsheet if it doesn't exist
   yet (matched case-insensitively by name).
2. Creates a sheet-aware trigger that ingests visitor payloads into that
   sheet (uses `addRows` with `createMissingColumns: true` so the user
   doesn't have to pre-create columns either).
3. Inserts the domain → trigger mapping into our master routing table.
4. Calls the upstream allow-list API to register the domain.
5. Returns the per-account
   `<script src="https://www.orangeslice.ai/wt.js?accountId=…">`
   wrapper for the user to paste on their site. The `accountId` query
   param is what scopes inbound pings to this account so a squatter
   who also enrolled the domain cannot steal traffic from pages that
   load this exact tag.

If the same (domain, spreadsheet) is re-enrolled it is idempotent —
the existing trigger and mapping are reused. If the user previously
deleted the sheet, the helper re-creates it.

## After setupTracking — what to tell the user

1. Paste the returned `script` into the `<head>` of their website.
2. Let them know identified visitors will appear in the chosen sheet
   within ~5 minutes of installing. Pricing: 80 credits per identified
   person.
3. If they want to enrich rows further, point out that the trigger only
   ingests — they should add **column code** (or just let the AI suggest
   columns) for tasks like "compute company size" or "draft an outreach
   email" so per-row work shows in the UI and is retryable.

## Multiple sites, multiple spreadsheets

A single account can track many domains, each with its own trigger and
sheet — call `setupTracking` once per domain.

A single account can ALSO track the same domain on multiple
spreadsheets (for example, sales-ops on one sheet and a marketing
analyst on another). Each `setupTracking` call on a different
spreadsheet creates its own trigger + mapping. When a visitor ping
arrives, **80 credits are charged once** and the visitor row is fanned
out to every matching trigger.

Multiple Orange Slice accounts can also enroll the same domain — there
is no cross-account block. Routing is disambiguated by the `accountId`
baked into the `<script>` tag (RB2B receives it as `customer_id` and
echoes it back on every ping), so pings only land on the account that
actually installed the pixel.

## Inspecting / removing

```typescript
// What's tracked on this spreadsheet? Returns active AND paused
// (`disabled_no_credits`) mappings — check the `status` field.
const mappings = await integrations.websiteTracking.listTrackedDomains();

// "Stop tracking on THIS sheet only" — keep the upstream allow-list
// up so other spreadsheets / accounts that enrolled the same domain
// keep receiving visitor rows. The destination sheet keeps the
// customer's existing visitor rows.
await integrations.websiteTracking.detachTracking("acme.com");

// "Stop tracking this domain on all my spreadsheets" — deletes every
// Website Visitors trigger + mapping for that domain across ALL of
// this account's spreadsheets. Other Orange Slice accounts that
// co-enrolled the same domain are unaffected. The upstream allow-list
// is only dropped if no other account still has the domain active.
await integrations.websiteTracking.removeTracking("acme.com");
```

### Picking between `detachTracking` and `removeTracking`

Both are scoped to the calling account — no caller can affect another
account's mappings, so picking the wrong one is recoverable.

- "Remove tracking from this sheet but keep my other sheet running" /
  "I don't want visitors landing here anymore" / "delete this sheet's
  Website Visitors trigger" → **`detachTracking(domain)`** (this
  spreadsheet only).
- "Turn off tracking for acme.com entirely" / "we sold this domain" /
  "stop all visitor identification for acme.com" →
  **`removeTracking(domain)`** (every spreadsheet under this account).
- If the user has the same domain on multiple of THEIR spreadsheets
  and the intent is ambiguous, ASK — `removeTracking` will tear down
  all of them, whereas `detachTracking` is per-sheet surgical.

## Resuming a paused domain (after a top-up)

```typescript
// Re-enable every paused mapping on this spreadsheet:
const result = await integrations.websiteTracking.resumeTracking();

// Or scope to one domain:
const result = await integrations.websiteTracking.resumeTracking("acme.com");

// result shape:
// {
//   resumed:       [{ domain, mappingId }],  // flipped back to active
//   alreadyActive: [{ domain, mappingId }],  // already running, no-op
//   failures:      [{ domain, mappingId, error }],  // upstream rejected
// }
```

Only mappings currently in `status: "disabled_no_credits"` get resumed.
Already-active mappings are reported in `alreadyActive` and not touched.
The upstream allow-list call is idempotent — calling resume on a domain
the provider already considers active is safe and ends up in
`alreadyActive` after the conditional DB update.

Tell the user how many domains came back online (`result.resumed.length`)
and surface any `result.failures[].error` messages — those usually mean
the upstream provider rejected the re-enrollment and need a human look.

See [setupTracking.md](./setupTracking.md) for the full input/output
contract.
