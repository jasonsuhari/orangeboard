# upsertRecords

Insert or update multiple records using an external ID field (up to 200 records).

```typescript
// Upsert Contacts using external ID
const results = await integrations.salesforce.upsertRecords({
   sobject: "Contact",
   externalIdField: "External_Id__c",
   records: [
      {
         External_Id__c: "EXT-001",
         FirstName: "John",
         LastName: "Doe",
         Email: "john@example.com"
      },
      {
         External_Id__c: "EXT-002",
         FirstName: "Jane",
         LastName: "Smith",
         Email: "jane@example.com"
      }
   ],
   allOrNone: false
});

// Check results
for (const result of results) {
   if (result.success) {
      console.log(`${result.created ? "Created" : "Updated"}: ${result.id}`);
   } else {
      console.log(`Failed: ${result.errors.map((e) => e.message).join(", ")}`);
   }
}

// Upsert Accounts from external system
const results = await integrations.salesforce.upsertRecords({
   sobject: "Account",
   externalIdField: "ERP_Account_Id__c",
   records: [
      {
         ERP_Account_Id__c: "ERP-ACC-001",
         Name: "Acme Corporation",
         Industry: "Technology"
      },
      {
         ERP_Account_Id__c: "ERP-ACC-002",
         Name: "TechCo Industries",
         Industry: "Manufacturing"
      }
   ],
   allOrNone: true
});
```

## Parameters

| Parameter | Type                    | Required | Description           |
| --------- | ----------------------- | -------- | --------------------- |
| `input`   | `CollectionUpsertInput` | Yes      | The upsert parameters |

### CollectionUpsertInput

```typescript
{
  sobject: string;           // The SObject API name
  externalIdField: string;   // The external ID field API name
  records: Array<{
    [fieldName: string]: unknown;  // Must include the external ID field
  }>;
  allOrNone?: boolean;       // If true, all must succeed or all fail (default: false)
}
```

## Output

```typescript
Array<{
   id: string; // ID of the record
   success: boolean; // Whether the operation succeeded
   created?: boolean; // True if created, false if updated
   errors: Array<{
      statusCode?: string;
      message?: string;
      fields?: string[];
   }>;
}>;
```

## Notes

- Maximum 200 records per call
- All records must be the same SObject type
- The external ID field must be marked as "External ID" in Salesforce
- Each record must include the external ID field value
- The `created` field in results indicates whether record was inserted or updated
- Useful for syncing data from external systems
- With `allOrNone: true`, any failure rolls back all changes
