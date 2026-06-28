# addLeadsToCampaign

Add leads to a campaign. Returns the number of leads added.

> **Important:** You cannot add leads to a draft campaign. The campaign must be active (started) before leads can be added. Attempting to add leads to a draft campaign will result in a 400 error.

```typescript
const addedCount = await integrations.heyreach.addLeadsToCampaign({
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
    }
  ]
});

console.log(`Added ${addedCount} leads`);
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
number  // Number of leads successfully added
```

