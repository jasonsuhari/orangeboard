# resumeCampaign

Resume a paused campaign.

```typescript
const result = await integrations.heyreach.resumeCampaign("12345");
console.log(result.items?.[0]?.status); // "IN_PROGRESS"
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | `string` | Yes | The campaign ID to resume |

## Output

```typescript
{
  totalCount?: string;
  items?: Array<{
    id?: string;
    name?: string;
    creationTime?: string;
    linkedInUserListName?: string;
    linkedInUserListId?: string;
    campaignAccountIds?: string[];
    status?: "DRAFT" | "IN_PROGRESS" | "PAUSED" | "FINISHED" | "CANCELED" | "FAILED" | "STARTING" | null;
    progressStats?: {
      totalUsers?: string;
      totalUsersInProgress?: string;
      totalUsersPending?: string;
      totalUsersFinished?: string;
      totalUsersFailed?: string;
    };
    excludeAlreadyMessagedGlobal?: string;
    excludeAlreadyMessagedCampaignAccounts?: string;
    excludeFirstConnectionCampaignAccounts?: string;
    excludeFirstConnectionGlobal?: string;
    excludeNoProfilePicture?: string;
    excludeListId?: string;
  }>;
}
```

