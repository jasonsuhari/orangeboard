# createRecord

Create a new record for any Salesforce SObject.

```typescript
// Create an Account
const result = await integrations.salesforce.createRecord("Account", {
   Name: "Acme Corporation",
   Industry: "Technology",
   Website: "https://acme.com",
   Phone: "+1-555-123-4567"
});
console.log(`Created Account: ${result.id}`);

// Create a Contact
const result = await integrations.salesforce.createRecord("Contact", {
   FirstName: "John",
   LastName: "Doe",
   Email: "john.doe@example.com",
   AccountId: "001xx000003DGbYAAW",
   Title: "VP of Engineering"
});

// Create a Lead
const result = await integrations.salesforce.createRecord("Lead", {
   FirstName: "Jane",
   LastName: "Smith",
   Company: "TechStartup Inc",
   Email: "jane@techstartup.com",
   Status: "Open - Not Contacted",
   LeadSource: "Web"
});

// Create an Opportunity
const result = await integrations.salesforce.createRecord("Opportunity", {
   Name: "Acme - Enterprise Deal",
   AccountId: "001xx000003DGbYAAW",
   StageName: "Prospecting",
   CloseDate: "2024-03-31",
   Amount: 50000
});
```

## Parameters

| Parameter | Type                      | Required | Description                                               |
| --------- | ------------------------- | -------- | --------------------------------------------------------- |
| `sobject` | `string`                  | Yes      | The SObject API name (e.g., "Account", "Contact", "Lead") |
| `data`    | `Record<string, unknown>` | Yes      | The field values for the new record                       |

## Output

```typescript
{
   id: string; // The ID of the created record
   success: boolean; // Whether the operation succeeded
   errors: Array<{
      statusCode?: string;
      message?: string;
      fields?: string[];
   }>;
}
```

## Notes

- Required fields vary by SObject type - use `describeSObject` to check
- The record ID is a 15 or 18 character Salesforce ID
- Reference fields (lookups) expect the related record's ID
- Date fields should be formatted as "YYYY-MM-DD"
- DateTime fields should be ISO 8601 format
