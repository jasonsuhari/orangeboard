# getLeadsFromCampaign

Get leads from a campaign with their status and profile information.

```typescript
const { items, totalCount } = await integrations.heyreach.getLeadsFromCampaign({
  campaignId: 12345,
  limit: 50,
  offset: 0
});

for (const lead of items || []) {
  console.log(lead.linkedInUserProfile?.firstName, lead.leadCampaignStatus);
}
```

## Input

```typescript
{
  campaignId: number;                               // Campaign ID
  offset?: number;                                  // Pagination offset
  limit?: number;                                   // Max results per page (must be between 1 and 100)
  timeFrom?: string;                                // Filter by time (ISO date string)
  timeTo?: string;                                  // Filter by time (ISO date string)
  timeFilter?: "CreationTime" | "Everywhere";       // Which time field to filter on
}
```

## Output

```typescript
{
  totalCount?: number;
  items?: Array<{
    id?: number;
    linkedInUserProfileId?: string;
    linkedInUserProfile?: {
      linkedin_id?: string;
      profileUrl?: string;
      firstName?: string;
      lastName?: string;
      headline?: string;
      imageUrl?: string;
      location?: string;
      companyName?: string;
      companyUrl?: string | null;
      position?: string;
      about?: string | null;
      connections?: number;
      followers?: number;
      emailAddress?: string | null;
    };
    lastActionTime?: string;
    failedTime?: string | null;
    creationTime?: string;
    leadCampaignStatus?: "Pending" | "InSequence" | "Finished" | "Paused" | "Failed";
    leadConnectionStatus?: "None" | "ConnectionSent" | "ConnectionAccepted";
    leadMessageStatus?: "None" | "MessageSent" | "MessageReply";
    errorCode?: string | null;
    leadCampaignStatusMessage?: string | null;
    linkedInSenderId?: number;
    linkedInSenderFullName?: string;
  }>;
}
```

