# getCampaign

Get a campaign by its ID.

```typescript
const campaign = await integrations.heyreach.getCampaign("12345");
console.log(campaign.items?.[0]?.name);
```

## Input

| Parameter    | Type     | Required | Description     |
| ------------ | -------- | -------- | --------------- |
| `campaignId` | `string` | Yes      | The campaign ID |

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
