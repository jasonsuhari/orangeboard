# searchContacts

Search for contacts using filters and full-text search.

```typescript
// Search by lifecycle stage
const results = await integrations.hubspot.searchContacts({
  filterGroups: [{
    filters: [{
      propertyName: "lifecyclestage",
      operator: "EQ",
      value: "customer"
    }]
  }],
  properties: ["email", "firstname", "lastname"],
  limit: 100
});

// Full-text search
const results = await integrations.hubspot.searchContacts({
  query: "john acme",
  properties: ["email", "firstname", "lastname", "company"]
});

// Multiple filters (AND within group, OR between groups)
const results = await integrations.hubspot.searchContacts({
  filterGroups: [
    {
      filters: [
        { propertyName: "lifecyclestage", operator: "EQ", value: "lead" },
        { propertyName: "hs_lead_status", operator: "EQ", value: "NEW" }
      ]
    }
  ],
  sorts: ["-createdate"], // descending by create date
  limit: 50
});
```

## Filter Operators

| Operator | Description |
|----------|-------------|
| `EQ` | Equal to |
| `NEQ` | Not equal to |
| `LT` | Less than |
| `LTE` | Less than or equal |
| `GT` | Greater than |
| `GTE` | Greater than or equal |
| `BETWEEN` | Between two values (use with `value` and `highValue`) |
| `IN` | In list (use with `values` array) |
| `NOT_IN` | Not in list |
| `HAS_PROPERTY` | Property exists |
| `NOT_HAS_PROPERTY` | Property doesn't exist |
| `CONTAINS_TOKEN` | Contains token |
| `NOT_CONTAINS_TOKEN` | Doesn't contain token |

## Input

```typescript
{
  query?: string;           // Full-text search (up to 3000 chars)
  limit?: number;           // Max 200
  after?: string;           // Paging cursor
  sorts?: string[];         // e.g., ["createdate", "-lastname"]
  properties?: string[];    // Properties to return
  filterGroups?: Array<{
    filters: Array<{
      propertyName: string;
      operator: FilterOperator;
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
  results: Array<{
    id: string;
    properties: Record<string, string | null>;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
  }>;
  paging?: { next?: { after: string } };
}
```

