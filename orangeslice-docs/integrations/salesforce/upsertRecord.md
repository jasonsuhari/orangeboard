# upsertRecord

Insert or update a record using an external ID field. If a record with the external ID exists, it's updated; otherwise, a new record is created.

```typescript
// Upsert a Contact using external ID
const result = await integrations.salesforce.upsertRecord(
  "Contact",
  "External_Id__c",        // External ID field name
  "EXT-12345",             // External ID value
  {
    FirstName: "John",
    LastName: "Doe",
    Email: "john.doe@example.com",
    Phone: "+1-555-123-4567"
  }
);

// Check if it was created or updated
if (result.success) {
  console.log(`Record ID: ${result.id}`);
}

// Upsert an Account
const result = await integrations.salesforce.upsertRecord(
  "Account",
  "ERP_Id__c",
  "ERP-ACC-001",
  {
    Name: "Acme Corporation",
    Industry: "Technology",
    Website: "https://acme.com"
  }
);
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sobject` | `string` | Yes | The SObject API name |
| `externalIdField` | `string` | Yes | The API name of the external ID field |
| `externalIdValue` | `string` | Yes | The external ID value to match |
| `data` | `Record<string, unknown>` | Yes | The field values |

## Output

```typescript
{
  id: string;       // The ID of the created or updated record
  success: boolean; // Whether the operation succeeded
  errors: Array<{
    statusCode?: string;
    message?: string;
    fields?: string[];
  }>;
}
```

## Notes

- The external ID field must be marked as "External ID" in Salesforce setup
- External ID fields are indexed and unique (or can allow duplicates based on config)
- Do not include the external ID field in the `data` object
- Useful for syncing data from external systems without tracking Salesforce IDs
- If the external ID is not found, a new record is created

