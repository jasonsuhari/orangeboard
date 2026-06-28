# searchDeals

Search for deals using filters.

```typescript
// Find closed-won deals
const results = await integrations.hubspot.searchDeals({
  filterGroups: [{
    filters: [{
      propertyName: "dealstage",
      operator: "EQ",
      value: "closedwon"
    }]
  }],
  properties: ["dealname", "amount", "closedate"],
  sorts: ["-amount"],
  limit: 100
});

// Find deals closing this month
const results = await integrations.hubspot.searchDeals({
  filterGroups: [{
    filters: [
      { propertyName: "closedate", operator: "GTE", value: "2024-01-01" },
      { propertyName: "closedate", operator: "LTE", value: "2024-01-31" }
    ]
  }],
  properties: ["dealname", "amount", "dealstage"]
});

// Find high-value open deals
const results = await integrations.hubspot.searchDeals({
  filterGroups: [{
    filters: [
      { propertyName: "amount", operator: "GTE", value: "10000" },
      { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
      { propertyName: "dealstage", operator: "NEQ", value: "closedlost" }
    ]
  }]
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

