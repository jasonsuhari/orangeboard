# searchNotes

Search for notes using filters.

```typescript
// Find notes by owner
const results = await integrations.hubspot.searchNotes({
  filterGroups: [{
    filters: [{
      propertyName: "hubspot_owner_id",
      operator: "EQ",
      value: "12345"
    }]
  }],
  properties: ["hs_note_body", "hs_timestamp"],
  limit: 100
});

// Find notes created in the last 7 days
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const results = await integrations.hubspot.searchNotes({
  filterGroups: [{
    filters: [{
      propertyName: "hs_timestamp",
      operator: "GTE",
      value: sevenDaysAgo
    }]
  }],
  properties: ["hs_note_body", "hs_timestamp", "hubspot_owner_id"],
  sorts: ["-hs_timestamp"]
});

// Search notes containing specific text
const results = await integrations.hubspot.searchNotes({
  query: "follow up",
  properties: ["hs_note_body", "hs_timestamp"]
});
```

## Input

```typescript
{
  query?: string;
  limit?: number;
  after?: string;
  sorts?: string[];
  properties?: string[];
  filterGroups?: Array<{
    filters: Array<{
      propertyName: string;
      operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE" | "BETWEEN" | "IN" | "NOT_IN" | ...;
      value?: string;
      values?: string[];
      highValue?: string;
    }>;
  }>;
}
```

## Output

```typescript
{
  total: number;
  results: Array<{ id, properties, createdAt, updatedAt, archived }>;
  paging?: { next?: { after: string } };
}
```

