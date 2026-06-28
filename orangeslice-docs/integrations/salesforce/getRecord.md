# getRecord

Retrieve a single record by its Salesforce ID.

```typescript
// Get all fields (returns standard fields)
const account = await integrations.salesforce.getRecord("Account", "001xx000003DGbYAAW");
console.log(account.Name);

// Get specific fields only
const contact = await integrations.salesforce.getRecord(
  "Contact",
  "003xx000004TmiQAAS",
  { fields: ["Id", "Name", "Email", "Phone", "AccountId"] }
);

// With type parameter for typed results
interface MyLead {
  Id: string;
  Name: string;
  Email: string;
  Company: string;
  Status: string;
}
const lead = await integrations.salesforce.getRecord<MyLead>(
  "Lead",
  "00Qxx000001abcDEAY",
  { fields: ["Id", "Name", "Email", "Company", "Status"] }
);
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sobject` | `string` | Yes | The SObject API name |
| `id` | `string` | Yes | The Salesforce record ID (15 or 18 characters) |
| `options` | `GetRecordOptions` | No | Options for the request |

### GetRecordOptions

```typescript
{
  fields?: string[];  // Specific fields to retrieve
}
```

## Output

Returns the record with requested fields:

```typescript
{
  Id: string;
  attributes?: {
    type: string;   // SObject type
    url: string;    // API URL
  };
  [fieldName: string]: unknown;  // Field values
}
```

## Notes

- Without `fields` option, returns a default set of fields
- Specify `fields` to control exactly which fields are returned
- Throws an error if the record is not found (404)
- Use `describeSObject` to discover available fields

