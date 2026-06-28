# describeGlobal

Get a list of all available SObjects in the Salesforce org.

```typescript
const describe = await integrations.salesforce.describeGlobal();

// List all queryable objects
const queryableObjects = describe.sobjects.filter(obj => obj.queryable);
console.log(`Found ${queryableObjects.length} queryable objects`);

// Find custom objects
const customObjects = describe.sobjects.filter(obj => obj.custom);
for (const obj of customObjects) {
  console.log(`${obj.name} - ${obj.label}`);
}

// Check if an object exists and is accessible
const hasAccount = describe.sobjects.some(obj => obj.name === "Account");

// Get all objects that support CRUD
const crudObjects = describe.sobjects.filter(
  obj => obj.createable && obj.updateable && obj.deletable
);
```

## Parameters

None.

## Output

```typescript
{
  encoding: string;      // Character encoding
  maxBatchSize: number;  // Max records per batch operation
  sobjects: Array<{
    name: string;        // API name (e.g., "Account", "Custom_Object__c")
    label: string;       // Display label
    labelPlural: string; // Plural display label
    keyPrefix: string;   // ID prefix (e.g., "001" for Account)
    custom: boolean;     // Whether it's a custom object
    createable: boolean; // Whether records can be created
    updateable: boolean; // Whether records can be updated
    deletable: boolean;  // Whether records can be deleted
    queryable: boolean;  // Whether it can be queried
    searchable: boolean; // Whether it supports SOSL search
    triggerable: boolean; // Whether triggers can be defined
    urls: Record<string, string>; // API endpoint URLs
  }>;
}
```

## Notes

- Results are cached by the API for performance
- Use this to discover what objects are available in the org
- The `keyPrefix` helps identify record types from their IDs
- Use `describeSObject` to get detailed field information for a specific object

