# getList

Get a list by its ID.

```typescript
const list = await integrations.heyreach.getList("12345");

console.log(`${list.name} - ${list.totalItemsCount} items`);
console.log(`Type: ${list.listType}`);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `listId` | `string` | Yes | The list ID |

## Output

```typescript
{
  id?: string;
  name?: string;
  totalItemsCount?: string;
  listType?: "USER_LIST" | "COMPANY_LIST" | null;
  creationTime?: string;
  campaignIds?: string[];
}
```

