# updateRecords

Update multiple records in a single API call using the Composite API (up to 200 records).

```typescript
// Update multiple Contacts
const results = await integrations.salesforce.updateRecords({
   records: [
      {
         Id: "003xx000004TmiQAAS",
         attributes: { type: "Contact" },
         Title: "Senior Engineer"
      },
      {
         Id: "003xx000004TmiRAAS",
         attributes: { type: "Contact" },
         Title: "VP of Sales"
      }
   ],
   allOrNone: false
});

// Check results
for (const result of results) {
   if (result.success) {
      console.log(`Updated: ${result.id}`);
   } else {
      console.log(`Failed: ${result.errors.map((e) => e.message).join(", ")}`);
   }
}

// Update mixed object types
const results = await integrations.salesforce.updateRecords({
   records: [
      {
         Id: "001xx000003DGbYAAW",
         attributes: { type: "Account" },
         Website: "https://new-site.com"
      },
      {
         Id: "003xx000004TmiQAAS",
         attributes: { type: "Contact" },
         Phone: "+1-555-999-8888"
      }
   ],
   allOrNone: true
});
```

## Parameters

| Parameter | Type                    | Required | Description           |
| --------- | ----------------------- | -------- | --------------------- |
| `input`   | `CollectionUpdateInput` | Yes      | The records to update |

### CollectionUpdateInput

```typescript
{
  allOrNone?: boolean;  // If true, all must succeed or all fail (default: false)
  records: Array<{
    Id: string;                    // Required: record ID
    attributes: { type: string };  // Required: SObject type
    [fieldName: string]: unknown;  // Fields to update
  }>;
}
```

## Output

```typescript
Array<{
   id: string; // ID of updated record
   success: boolean; // Whether this record was updated
   errors: Array<{
      statusCode?: string;
      message?: string;
      fields?: string[];
   }>;
}>;
```

## Notes

- Maximum 200 records per call
- Each record must include `Id` and `attributes.type`
- Can update records of different SObject types in a single call
- Only include fields you want to update (partial update)
- With `allOrNone: true`, any failure rolls back all changes
- Results array order matches input records order
