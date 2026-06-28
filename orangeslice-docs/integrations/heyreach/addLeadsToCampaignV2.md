# addLeadsToCampaignV2

Add leads to a campaign with detailed response about added, updated, and failed leads.

> **Important:** You cannot add leads to a draft campaign. The campaign must be active (started) before leads can be added. Attempting to add leads to a draft campaign will result in a 400 error.

```typescript
const result = await integrations.heyreach.addLeadsToCampaignV2({
  campaignId: 12345,
  accountLeadPairs: [
    {
      linkedInAccountId: 67890,
      lead: {
        firstName: "John",
        lastName: "Doe",
        profileUrl: "https://linkedin.com/in/johndoe",
        companyName: "Acme Inc",
        position: "CEO",
        emailAddress: "john@acme.com"
      }
    },
    {
      linkedInAccountId: 67890,
      lead: {
        firstName: "Jane",
        lastName: "Smith",
        profileUrl: "https://linkedin.com/in/janesmith"
      }
    }
  ]
});

console.log(`Added: ${result.addedLeadsCount}, Updated: ${result.updatedLeadsCount}, Failed: ${result.failedLeadsCount}`);
```

## Input

```typescript
{
  campaignId: number;  // Campaign ID to add leads to
  accountLeadPairs: Array<{
    linkedInAccountId?: number;  // LinkedIn account to use for outreach
    lead: {
      firstName?: string;
      lastName?: string;
      location?: string;
      summary?: string;
      companyName?: string;
      position?: string;
      about?: string;
      emailAddress?: string;
      customUserFields?: Array<{ name: string; value: string }>;
      profileUrl?: string;  // LinkedIn profile URL
    };
  }>;
}
```

## Output

```typescript
{
  addedLeadsCount?: number;    // Number of new leads added
  updatedLeadsCount?: number;  // Number of existing leads updated
  failedLeadsCount?: number;   // Number of leads that failed
}
```

