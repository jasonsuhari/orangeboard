# getLeadsFromList

Get leads from a list with optional filtering.

```typescript
// Get all leads from list
const { items, totalCount } = await integrations.heyreach.getLeadsFromList({
  listId: 12345
});

// With pagination and filters
const { items } = await integrations.heyreach.getLeadsFromList({
  listId: 12345,
  keyword: "CEO",
  limit: 100,
  offset: 0,
  createdFrom: "2024-01-01",
  createdTo: "2024-12-31"
});

for (const lead of items || []) {
  console.log(`${lead.firstName} ${lead.lastName} - ${lead.companyName}`);
}
```

## Input

```typescript
{
  listId: number;            // List ID (required)
  offset?: number;           // Pagination offset
  keyword?: string;          // Search in leads
  leadProfileUrl?: string;   // Filter by specific profile URL
  leadLinkedInId?: string;   // Filter by LinkedIn ID
  limit?: number;            // Max results per page (must be between 1 and 100)
  createdFrom?: string;      // Filter by creation date (ISO date)
  createdTo?: string;        // Filter by creation date (ISO date)
}
```

## Output

```typescript
{
  totalCount?: string;
  items?: Array<{
    profileUrl?: string;
    firstName?: string;
    lastName?: string;
    headline?: string;
    imageUrl?: string;
    location?: string;
    companyName?: string;
    companyUrl?: string;
    position?: string;
    about?: string;
    connections?: string;
    followers?: string;
    tags?: string[];
    emailAddress?: string;
    customFields?: Array<{
      name?: string;
      value?: string;
    }>;
  }>;
}
```

