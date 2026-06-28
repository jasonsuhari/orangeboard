# updateRecord

Update an existing record's field values.

```typescript
// Update an Account
await integrations.salesforce.updateRecord("Account", "001xx000003DGbYAAW", {
  Website: "https://new-website.com",
  Phone: "+1-555-987-6543",
  Description: "Updated company description"
});

// Update a Contact
await integrations.salesforce.updateRecord("Contact", "003xx000004TmiQAAS", {
  Title: "Senior VP of Engineering",
  Phone: "+1-555-111-2222"
});

// Update an Opportunity stage
await integrations.salesforce.updateRecord("Opportunity", "006xx000001abcDEFG", {
  StageName: "Closed Won",
  Amount: 75000,
  CloseDate: "2024-02-15"
});

// Update a Lead status
await integrations.salesforce.updateRecord("Lead", "00Qxx000001abcDEAY", {
  Status: "Working - Contacted",
  Rating: "Hot"
});
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sobject` | `string` | Yes | The SObject API name |
| `id` | `string` | Yes | The Salesforce record ID |
| `data` | `Record<string, unknown>` | Yes | The fields to update |

## Output

Returns `void` on success. Throws an error if the update fails.

## Notes

- Only include fields you want to update (partial update)
- Cannot update read-only or formula fields
- Cannot update the `Id` field
- Throws an error if the record doesn't exist
- Null values will clear the field
- For relationship fields, provide the related record's ID

