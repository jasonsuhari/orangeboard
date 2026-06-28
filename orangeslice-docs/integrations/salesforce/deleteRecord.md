# deleteRecord

Delete a record from Salesforce.

```typescript
// Delete a Contact
await integrations.salesforce.deleteRecord("Contact", "003xx000004TmiQAAS");

// Delete a Lead
await integrations.salesforce.deleteRecord("Lead", "00Qxx000001abcDEAY");

// Delete an Account (will fail if there are related records with restrict-delete)
await integrations.salesforce.deleteRecord("Account", "001xx000003DGbYAAW");
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sobject` | `string` | Yes | The SObject API name |
| `id` | `string` | Yes | The Salesforce record ID |

## Output

Returns `void` on success. Throws an error if the deletion fails.

## Notes

- Deleted records go to the Recycle Bin for 15 days
- Use `query` with `includeDeleted: true` to find deleted records
- Cascade delete behavior depends on the relationship configuration
- Some records cannot be deleted if they have restrict-delete relationships
- Throws an error if the record doesn't exist
- Permanent deletion requires emptying the Recycle Bin (not available via API)

