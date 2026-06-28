# listCampaigns

List all campaigns with optional filtering.

```typescript
// Basic list
const { items, totalCount } = await integrations.heyreach.listCampaigns();

// With filters
const { items, totalCount } = await integrations.heyreach.listCampaigns({
  keyword: "outreach",
  statuses: ["IN_PROGRESS", "PAUSED"],
  limit: 50,
  offset: 0
});
```

## Input

```typescript
{
  offset?: number;           // Pagination offset
  keyword?: string;          // Search by campaign name
  statuses?: string[];       // Filter by campaign statuses
  accountIds?: number[];     // Filter by LinkedIn account IDs
  limit?: number;            // Max results per page (must be between 1 and 100)
}
```

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

