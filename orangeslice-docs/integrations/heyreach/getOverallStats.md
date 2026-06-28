# getOverallStats

Get overall statistics for campaigns and accounts.

```typescript
// Get stats for specific campaigns
const stats = await integrations.heyreach.getOverallStats({
  campaignIds: [12345, 67890],
  startDate: "2024-01-01",
  endDate: "2024-03-31"
});

// Get stats for specific LinkedIn accounts
const stats = await integrations.heyreach.getOverallStats({
  accountIds: [111, 222],
  startDate: "2024-01-01",
  endDate: "2024-12-31"
});
```

## Input

```typescript
{
  accountIds?: number[];   // Filter by LinkedIn account IDs
  campaignIds?: number[];  // Filter by campaign IDs
  startDate?: string;      // Start date for stats (ISO date)
  endDate?: string;        // End date for stats (ISO date)
}
```

## Output

```typescript
any  // Statistics data
```

