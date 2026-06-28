# createRecords

Create multiple records in a single API call using the Composite API (up to 200 records).

```typescript
// Create multiple Contacts
const results = await integrations.salesforce.createRecords({
  records: [
    {
      attributes: { type: "Contact" },
      FirstName: "John",
      LastName: "Doe",
      Email: "john@example.com"
    },
    {
      attributes: { type: "Contact" },
      FirstName: "Jane",
      LastName: "Smith",
      Email: "jane@example.com"
    }
  ],
  allOrNone: false  // Allow partial success
});

// Check results
for (const result of results) {
  if (result.success) {
    console.log(`Created: ${result.id}`);
  } else {
    console.log(`Failed: ${result.errors.map(e => e.message).join(", ")}`);
  }
}

// Create mixed object types
const results = await integrations.salesforce.createRecords({
  records: [
    {
      attributes: { type: "Account" },
      Name: "Acme Corp"
    },
    {
      attributes: { type: "Lead" },
      FirstName: "Bob",
      LastName: "Wilson",
      Company: "TechCo"
    }
  ],
  allOrNone: true  // All must succeed or all fail
});
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `input` | `CollectionCreateInput` | Yes | The records to create |

### CollectionCreateInput

```typescript
{
  allOrNone?: boolean;  // If true, all records must succeed or all fail (default: false)
  records: Array<{
    attributes: { type: string };  // SObject type
    [fieldName: string]: unknown;  // Field values
  }>;
}
```

## Output

```typescript
Array<{
  id: string;       // ID of created record (empty if failed)
  success: boolean; // Whether this record was created
  errors: Array<{
    statusCode?: string;
    message?: string;
    fields?: string[];
  }>;
}>
```

## Notes

- Maximum 200 records per call
- Can create records of different SObject types in a single call
- Each record must include `attributes: { type: "ObjectName" }`
- With `allOrNone: true`, any failure rolls back all changes
- With `allOrNone: false`, successful records are created even if others fail
- Results array order matches input records order

