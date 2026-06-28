---
description: Connect, manage, and execute third-party integrations (HubSpot, Salesforce, Attio, Gmail, Slack, Instantly, HeyReach)
---

# integrations — Integration Management & Execution

Connect third-party services, manage integration records, and **execute integration methods** directly. Supports both OAuth providers (HubSpot, Salesforce, Attio, Gmail, Slack) and API-key providers (Instantly, HeyReach).

## Quick start

```typescript
import { integrations } from "orangeslice";

// Connect an OAuth provider (opens browser for authorization)
await integrations.connect("hubspot");

// Execute integration methods directly
const contact = await integrations.hubspot.createContact({
   properties: { email: "john@acme.com", firstname: "John" }
});

const campaigns = await integrations.instantly.listCampaigns();

await integrations.slack.chatPostMessage({
   channel: "#leads",
   text: "New lead: john@acme.com"
});

// List all connected integrations
const { integrations: list } = await integrations.list();
console.log(list.map((i) => `${i.provider}: ${i.displayName}`));
```

**Important**: Read the per-method docs at `./integrations/<provider>/<method>.md` for available methods, parameters, and response shapes. Do not invent methods.

## Methods

### `integrations.connect(provider, opts?)`

Opens the user's browser to complete OAuth authorization (or API key entry for Instantly/HeyReach). Polls until the user finishes, then returns the connected integration.

This is the recommended way to connect any integration from a script or agent.

**Parameters:**

- `provider` — One of: `"hubspot"`, `"salesforce"`, `"attio"`, `"gmail"`, `"slack"`, `"instantly"`, `"heyreach"`
- `opts.noBrowser` — If `true`, prints the URL instead of auto-opening the browser

**Returns:** `Integration` object

```typescript
const salesforce = await integrations.connect("salesforce");
// Browser opens -> user authorizes -> returns when complete
```

### `integrations.list(opts?)`

List connected integrations for the current account.

**Parameters:**

- `opts.spreadsheetId` — Filter to a specific spreadsheet's integrations
- `opts.provider` — Filter by provider name

**Returns:** `{ integrations: Integration[] }`

```typescript
const { integrations: all } = await integrations.list();
const { integrations: crms } = await integrations.list({ provider: "hubspot" });
```

### `integrations.get(id)`

Get a single integration by ID.

**Returns:** `Integration`

### `integrations.create(opts)`

Programmatically create an API-key integration without opening a browser. Only works for API-key providers (`instantly`, `heyreach`). For OAuth providers, use `connect()` instead.

**Parameters:**

- `opts.provider` — `"instantly"` or `"heyreach"`
- `opts.apiKey` — The provider API key
- `opts.displayName` — Optional display name
- `opts.config` — Optional key-value config
- `opts.spreadsheetId` — Optional, scope to a specific spreadsheet

**Returns:** `Integration`

### `integrations.update(id, fields)`

Update an existing integration.

**Parameters:**

- `fields.apiKey` — New API key
- `fields.displayName` — New display name
- `fields.isActive` — Enable/disable
- `fields.config` — New config object

**Returns:** `Integration`

### `integrations.delete(id)`

Delete an integration by ID.

**Returns:** `{ success: boolean }`

## Executing integration methods

Once an integration is connected, call its methods directly via `integrations.<provider>.<method>(args)`.

```typescript
// HubSpot
const contact = await integrations.hubspot.createContact({
   properties: { email: "jane@acme.com", firstname: "Jane" }
});
const companies = await integrations.hubspot.searchCompanies({
   filterGroups: [{ filters: [{ propertyName: "domain", operator: "EQ", value: "acme.com" }] }]
});

// Instantly
await integrations.instantly.addLeadsToCampaign({
   campaignId: "abc-123",
   leads: [{ email: "lead@company.com", firstName: "Lead" }]
});
const campaigns = await integrations.instantly.listCampaigns();

// Slack
await integrations.slack.chatPostMessage({ channel: "#sales", text: "New deal closed!" });
const channels = await integrations.slack.conversationsList();

// Gmail
await integrations.gmail.sendEmail({
   to: "prospect@company.com",
   subject: "Following up",
   body: "Hi, just wanted to check in..."
});

// Attio
await integrations.attio.createRecord({
   objectSlug: "companies",
   data: { values: { name: [{ value: "Acme Corp" }] } }
});

// Salesforce
await integrations.salesforce.createRecord({
   objectType: "Contact",
   fields: { Email: "new@example.com", LastName: "Smith" }
});

// HeyReach
await integrations.heyreach.addLeadsToList({
   listId: "list-123",
   leads: [{ linkedinUrl: "https://linkedin.com/in/johndoe" }]
});
```

### `integrations.execute(provider, method, ...args)`

Explicit dispatch for dynamic provider/method names:

```typescript
const provider = "hubspot";
const method = "searchContacts";
const result = await integrations.execute(provider, method, { query: "acme" });
```

### Per-method documentation

Every provider method is documented at `./integrations/<provider>/<method>.md`. **Always read the method docs before calling** to get the correct parameter shapes and response types.

## Integration object

```typescript
{
   id: string;
   provider: string; // "hubspot", "salesforce", etc.
   displayName: string; // "HubSpot portal acme.hubspot.com"
   isActive: boolean;
   hasApiKey: boolean; // true if API key is set (key itself is never returned)
   hasOauthToken: boolean; // true if OAuth token is set
   createdAt: string;
   updatedAt: string;
   scope: "account" | "spreadsheet";
   spreadsheetId: string | null;
}
```

## Supported providers

| Provider   | Auth Type | Connect method                          |
| ---------- | --------- | --------------------------------------- |
| HubSpot    | OAuth     | `connect("hubspot")`                    |
| Salesforce | OAuth     | `connect("salesforce")`                 |
| Attio      | OAuth     | `connect("attio")`                      |
| Gmail      | OAuth     | `connect("gmail")`                      |
| Slack      | OAuth     | `connect("slack")`                      |
| Instantly  | API Key   | `connect("instantly")` or `create(...)` |
| HeyReach   | API Key   | `connect("heyreach")` or `create(...)`  |
