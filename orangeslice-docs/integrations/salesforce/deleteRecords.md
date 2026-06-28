# deleteRecords

Delete multiple records in a single API call.

```typescript
// Delete multiple Contacts
const results = await integrations.salesforce.deleteRecords({
  ids: [
    "003xx000004TmiQAAS",
    "003xx000004TmiRAAS",
    "003xx000004TmiSAAS"
  ],
  allOrNone: false  // Allow partial success
});

// Check results
for (const result of results) {
  if (result.success) {
    console.log(`Deleted: ${result.id}`);
  } else {
    console.log(`Failed to delete ${result.id}: ${result.errors.map(e => e.message).join(", ")}`);
  }
}

// Delete with all-or-none
const results = await integrations.salesforce.deleteRecords({
  ids: ["001xx000003DGbYAAW", "001xx000003DGbZAAW"],
  allOrNone: true  // All must succeed or all fail
});
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `CollectionDeleteInput` | Yes | The IDs to delete |

### CollectionDeleteInput

```typescript
{
  ids: string[];        // Record IDs to delete
  allOrNone?: boolean;  // If true, all must succeed or all fail (default: false)
}
```

## Output

```typescript
Array<{
  id: string;       // ID of the record
  success: boolean; // Whether this record was deleted
  errors: Array<{
    statusCode?: string;
    message?: string;
    fields?: string[];
  }>;
}>
```

## Notes

- Maximum 200 IDs per call
- IDs can be for different SObject types
- Deleted records go to the Recycle Bin
- With `allOrNone: true`, any failure rolls back all deletions
- Results array order matches input IDs order
- Some deletions may fail due to validation rules or relationship constraints

