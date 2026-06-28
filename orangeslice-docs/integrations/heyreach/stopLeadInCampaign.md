# stopLeadInCampaign

Stop a lead in a campaign. Use either `leadMemberId` or `leadUrl` to identify the lead.

```typescript
// Stop by LinkedIn member ID
await integrations.heyreach.stopLeadInCampaign({
  campaignId: 12345,
  leadMemberId: "ACoAABxxxxxx"
});

// Or stop by profile URL
await integrations.heyreach.stopLeadInCampaign({
  campaignId: 12345,
  leadUrl: "https://linkedin.com/in/johndoe"
});
```

## Input

```typescript
{
  campaignId: number;      // Campaign ID
  leadMemberId?: string;   // LinkedIn member ID (use this OR leadUrl)
  leadUrl?: string;        // LinkedIn profile URL (use this OR leadMemberId)
}
```

## Output

```typescript
void  // Returns nothing on success
```

