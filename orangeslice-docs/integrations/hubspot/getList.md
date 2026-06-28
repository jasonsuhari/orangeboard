# getList

Get a specific HubSpot list by ID.

```typescript
// Fetch a list by ID
const list = await integrations.hubspot.getList("123456");

// Include the filter definition in the response
const detailedList = await integrations.hubspot.getList("123456", {
   includeFilters: true
});

console.log(list.name); // "Target Accounts"
console.log(list.processingType); // "DYNAMIC"
```

## Input

| Parameter                | Type      | Description                                                           |
| ------------------------ | --------- | --------------------------------------------------------------------- |
| `listId`                 | `string`  | The HubSpot list ID to retrieve                                       |
| `options.includeFilters` | `boolean` | Include the list's filter definition in the response (default: false) |

## Output

```typescript
{
  listId: string;
  listVersion: number;
  name: string;
  objectTypeId: string;
  processingStatus: string;
  processingType: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  createdById?: string;
  updatedById?: string;
  filtersUpdatedAt?: string;
  size?: number;
  membershipSettings?: Record<string, unknown>;
  listPermissions?: Record<string, unknown>;
  filterBranch?: Record<string, unknown>;
}
```

## Notes

- Set `includeFilters: true` when you need the list's filter definition
- `objectTypeId` identifies the CRM object type the list contains, such as contacts or companies
- `processingType` commonly indicates whether the list is dynamic, manual, or snapshot-based
