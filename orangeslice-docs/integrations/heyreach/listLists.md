# listLists

List all lists with optional filtering.

```typescript
// Get all lists
const { items, totalCount } = await integrations.heyreach.listLists();

// Filter by type
const { items } = await integrations.heyreach.listLists({
   listType: "USER_LIST",
   limit: 50
});

// Search by keyword
const { items } = await integrations.heyreach.listLists({
   keyword: "prospects",
   campaignIds: [12345]
});

for (const list of items || []) {
   console.log(`${list.name}: ${list.totalItemsCount} items`);
}
```

## Input

```typescript
{
  offset?: number;                         // Pagination offset
  keyword?: string;                        // Search by list name
  listType?: "USER_LIST" | "COMPANY_LIST"; // Filter by list type
  campaignIds?: number[];                  // Filter by associated campaigns
  limit?: number;                          // Max results per page (must be between 1 and 100)
}
```

## Output

```typescript
{
  totalCount?: string;
  items?: Array<{
    id?: string;
    name?: string;
    totalItemsCount?: string;
    listType?: "USER_LIST" | "COMPANY_LIST" | null;
    creationTime?: string;
    campaignIds?: string[];
  }>;
}
```
