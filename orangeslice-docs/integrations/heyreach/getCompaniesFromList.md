# getCompaniesFromList

Get companies from a company list.

```typescript
const { items, totalCount } = await integrations.heyreach.getCompaniesFromList({
  listId: 12345
});

// With filtering
const { items } = await integrations.heyreach.getCompaniesFromList({
  listId: 12345,
  keyword: "tech",
  limit: 50
});

for (const company of items || []) {
  console.log(`${company.name} - ${company.industry} - ${company.employeesOnLinkedIn} employees`);
}
```

## Input

```typescript
{
  listId: number;    // List ID (must be a COMPANY_LIST)
  offset?: number;   // Pagination offset
  keyword?: string;  // Search by company name
  limit?: number;    // Max results per page (must be between 1 and 100)
}
```

## Output

```typescript
{
  totalCount?: string;
  items?: Array<{
    name?: string;
    description?: string;
    industry?: string;
    imageUrl?: string;
    companySize?: string;
    employeesOnLinkedIn?: string;
    location?: string;
    specialities?: string;
    website?: string;
  }>;
}
```

