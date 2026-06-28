# createEmptyList

Create a new empty list.

```typescript
// Create a user list
const list = await integrations.heyreach.createEmptyList({
  name: "Q1 2024 Prospects"
});

console.log(`Created list: ${list.name} (ID: ${list.id})`);

// Create a company list
const companyList = await integrations.heyreach.createEmptyList({
  name: "Target Companies",
  type: "COMPANY_LIST"
});
```

## Input

```typescript
{
  name: string;                             // Name for the new list
  type?: "USER_LIST" | "COMPANY_LIST";      // List type (default: USER_LIST)
}
```

## Output

```typescript
{
  id?: number;
  name?: string;
  count?: number;
  listType?: string;
  creationTime?: string;
  isDeleted?: boolean;
  campaigns?: string[] | null;
  search?: string | null;
  status?: string;
}
```

