# Integrations

Access external APIs through `integrations.<provider>.<function>()`.

## Available Providers

### HubSpot

CRM operations plus workflows.

```typescript
// Create a contact
const result = await integrations.hubspot.createContact({
   properties: { email: "john@example.com", firstname: "John" }
});

// Search for deals
const deals = await integrations.hubspot.searchDeals({
   filterGroups: [
      {
         filters: [{ propertyName: "dealstage", operator: "EQ", value: "closedwon" }]
      }
   ]
});

// Create a workflow that sends a webhook from the user's HubSpot portal
await integrations.hubspot.createWebhookFlow({
   name: "Orange Slice - Enrich Missing Contact Emails",
   objectTypeId: "0-1",
   webhookUrl: "https://www.orangeslice.ai/api/triggers/<trigger-id>/webhook",
   enrollmentCriteria: {
      type: "EVENT_BASED",
      shouldReEnroll: false,
      eventFilterBranches: [
         {
            eventTypeId: "4-1463224",
            operator: "HAS_COMPLETED",
            filterBranchType: "UNIFIED_EVENTS",
            filterBranchOperator: "AND",
            filterBranches: [],
            filters: []
         }
      ],
      listMembershipFilterBranches: [],
      refinementCriteria: {
         filterBranchType: "AND",
         filterBranchOperator: "AND",
         filterBranches: [],
         filters: [
            {
               property: "lifecyclestage",
               filterType: "PROPERTY",
               operation: {
                  operationType: "ENUMERATION",
                  operator: "IS_ANY_OF",
                  includeObjectsWithNoValueSet: false,
                  values: ["lead"]
               }
            },
            {
               property: "email",
               filterType: "PROPERTY",
               operation: {
                  operationType: "MULTISTRING",
                  operator: "IS_EQUAL_TO",
                  includeObjectsWithNoValueSet: true,
                  values: []
               }
            }
         ]
      }
   }
});
```

See [hubspot/](./hubspot/) for all available functions.

### Instantly

Cold email outreach and campaign management.

```typescript
// Add a lead to a campaign
const lead = await integrations.instantly.createLead({
   email: "john@example.com",
   first_name: "John",
   company_name: "Acme Inc",
   campaign: "campaign-uuid"
});

// Bulk add leads
await integrations.instantly.bulkAddLeads({
   campaign_id: "campaign-uuid",
   leads: [
      { email: "john@example.com", first_name: "John" },
      { email: "jane@example.com", first_name: "Jane" }
   ]
});

// Get campaign analytics
const analytics = await integrations.instantly.getCampaignAnalytics("campaign-uuid");
console.log(analytics.open_rate, analytics.reply_rate);
```

See [instantly/](./instantly/) for all available functions.

### HeyReach

LinkedIn automation and outreach management.

```typescript
// Add leads to a campaign
const result = await integrations.heyreach.addLeadsToCampaignV2({
   campaignId: 12345,
   accountLeadPairs: [
      {
         linkedInAccountId: 67890,
         lead: {
            firstName: "John",
            lastName: "Doe",
            profileUrl: "https://linkedin.com/in/johndoe",
            companyName: "Acme Inc"
         }
      }
   ]
});
console.log(`Added: ${result.addedLeadsCount}`);

// Get leads from a campaign
const { items } = await integrations.heyreach.getLeadsFromCampaign({
   campaignId: 12345,
   limit: 100
});

// Send a message
await integrations.heyreach.sendMessage({
   conversationId: "conv-123",
   linkedInAccountId: 67890,
   message: "Thanks for connecting!"
});
```

See [heyreach/](./heyreach/) for all available functions.

### Salesforce

CRM operations using SOQL queries and the Salesforce REST API.

```typescript
// Query records
const result = await integrations.salesforce.query(
   "SELECT Id, Name, Email FROM Contact WHERE AccountId = '001xx000003DGbYAAW'"
);

// Create a record
const contact = await integrations.salesforce.createRecord("Contact", {
   FirstName: "John",
   LastName: "Doe",
   Email: "john@example.com"
});

// Update a record
await integrations.salesforce.updateRecord("Contact", contact.id, {
   Phone: "+1234567890"
});
```

See [salesforce/](./salesforce/) for all available functions.

### Slack

Workspace messaging, channels, users, and Slack Connect.

```typescript
// Send a message
const result = await integrations.slack.chatPostMessage({
   channel: "C1234567890",
   text: "Hello from Orange Slice!",
   blocks: [{ type: "section", text: { type: "mrkdwn", text: "*Bold* message" } }]
});

// List channels
const channels = await integrations.slack.conversationsList({
   types: "public_channel,private_channel"
});

// Find user by email
const user = await integrations.slack.usersLookupByEmail({
   email: "john@company.com"
});

// Send Slack Connect invite
const invite = await integrations.slack.conversationsInviteShared({
   channel: "C1234567890",
   emails: ["partner@external.com"]
});
```

See [slack/](./slack/) for all available functions.

### Attio

CRM operations for records, lists, notes, tasks, and more.

```typescript
// List people with a filter
const people = await integrations.attio.listRecords({
   object: "people",
   filter: { email_addresses: { email_address: "jane@acme.com" } }
});

// Upsert a company by domain
const company = await integrations.attio.assertRecord({
   object: "companies",
   matching_attribute: "domains",
   data: { values: { name: [{ value: "Acme Inc" }], domains: [{ domain: "acme.com" }] } }
});

// Add a record to a list
await integrations.attio.createEntry({
   list_id: "sales_pipeline",
   data: {
      parent_record_id: company.data.id.record_id,
      parent_object: "companies",
      entry_values: { stage: "New Lead" }
   }
});

// Create a note on a record
await integrations.attio.createNote({
   data: {
      parent_object: "people",
      parent_record_id: "rec_abc123",
      title: "Call notes",
      format: "plaintext",
      content: "Discussed Q3 roadmap."
   }
});
```

See [attio/](./attio/) for all available functions.

### Website tracking

LinkedIn-person identification for US-based website visitors. Customers
paste a single `<script>` tag on their site; each identified visit lands
as a row on the spreadsheet that owns the trigger.

```typescript
// Enroll a single domain — creates the trigger + sheet ingester, registers
// the domain in our master webhook routing table, adds it to the upstream
// allow-list, and returns the <script> the user pastes on their site.
const { script } = await integrations.websiteTracking.setupTracking({
   domain: "acme.com",
   sheetName: "Website Visitors"
});

// Inspect later
const tracked = await integrations.websiteTracking.listTrackedDomains();

// "Stop on THIS sheet only" — keeps the upstream allow-list up and
// any other Orange Slice spreadsheets that enrolled the same domain
// keep receiving visitor rows.
await integrations.websiteTracking.detachTracking("acme.com");

// "Stop tracking this domain on all my spreadsheets" — deletes every
// Website Visitors trigger + mapping for the domain across all of
// this account's spreadsheets. Other accounts that enrolled the same
// domain are unaffected; the upstream allow-list is only dropped when
// no other account still needs it.
await integrations.websiteTracking.removeTracking("acme.com");

// After a customer tops up, re-enable any paused mappings:
const { resumed, alreadyActive, failures } =
   await integrations.websiteTracking.resumeTracking();
```

Pricing: **80 credits per identified visitor** (charged at the master
webhook). Charging happens ONCE per ping even when the same account
enrolled the domain on multiple spreadsheets — the row fans out to
every matching trigger under a single credit reservation. Repeat
visits and company-only pings are forwarded to the sheet but don't
cost credits. When the account runs out of credits the domain is
automatically paused. **Resume is not automatic** — call
`resumeTracking()` (optionally scoped to one domain) once the customer
has topped up, otherwise the next top-up won't bring tracking back online.

See [websiteTracking/](./websiteTracking/) for the full recipe,
canonical visitor shape, and trigger code template.

### Gmail

Read and write emails from connected Google Gmail accounts.

```typescript
// Send a plain text email
const result = await integrations.gmail.sendEmail({
   recipient_email: "john@example.com",
   subject: "Quick update",
   body: "Hey John - sharing a quick status update."
});

// Send HTML with CC recipients
await integrations.gmail.sendEmail({
   recipient_email: "team@example.com",
   cc: ["manager@example.com"],
   subject: "Weekly summary",
   body: "<h2>Weekly Summary</h2><p>All systems operational.</p>",
   is_html: true
});

// Read the current inbox
const inbox = await integrations.gmail.fetchEmails({
   query: "in:inbox",
   max_results: 10
});

// Create a draft without sending it
await integrations.gmail.createDraft({
   recipient_email: "john@example.com",
   subject: "Draft follow-up",
   body: "This is saved as a draft."
});
```

See [gmail/](./gmail/) for available functions.
