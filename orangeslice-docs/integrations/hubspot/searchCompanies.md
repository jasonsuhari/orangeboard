# searchCompanies

Search for companies using filters.

```typescript
// Find tech companies
const results = await integrations.hubspot.searchCompanies({
   filterGroups: [
      {
         filters: [
            {
               propertyName: "industry",
               operator: "EQ",
               value: "Technology"
            }
         ]
      }
   ],
   properties: ["name", "domain", "numberofemployees"]
});

// Find large companies
const results = await integrations.hubspot.searchCompanies({
   filterGroups: [
      {
         filters: [
            {
               propertyName: "numberofemployees",
               operator: "GTE",
               value: "100"
            }
         ]
      }
   ],
   sorts: ["-annualrevenue"],
   limit: 50
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
      operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE" | "IN" | "NOT_IN" | "HAS_PROPERTY" | "NOT_HAS_PROPERTY" | ...;
      value?: string;
      values?: string[];
    }>;
  }>;
}
```

## Output

```typescript
{
  total: number;
  results: Array<{ id, properties: {...properties, hs_object_id}, createdAt, updatedAt, archived }>;
  paging?: { next?: { after: string } };
}
```
