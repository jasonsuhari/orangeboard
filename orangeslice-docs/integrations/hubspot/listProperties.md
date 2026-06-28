# listProperties

List all property definitions for a HubSpot CRM object type. Useful for discovering available fields on contacts, companies, deals, and other objects.

```typescript
// List all company properties
const { results } = await integrations.hubspot.listProperties("companies");

// List contact properties
const { results } = await integrations.hubspot.listProperties("contacts");

// List deal properties
const { results } = await integrations.hubspot.listProperties("deals");

// Get property names and types
const properties = await integrations.hubspot.listProperties("companies");
for (const prop of properties.results) {
   console.log(`${prop.name}: ${prop.type} (${prop.fieldType})`);
}
```

## Input

| Parameter                 | Type      | Description                                                                   |
| ------------------------- | --------- | ----------------------------------------------------------------------------- |
| `objectType`              | `string`  | Object type: `"contacts"`, `"companies"`, `"deals"`, `"notes"`, etc.          |
| `options.archived`        | `boolean` | Return only archived properties (default: `false`)                            |
| `options.dataSensitivity` | `string`  | Filter by sensitivity: `"non_sensitive"`, `"sensitive"`, `"highly_sensitive"` |

## Output

```typescript
{
   results: Array<{
      name: string; // Internal property name (e.g., "firstname")
      label: string; // Display label (e.g., "First Name")
      type: string; // Data type (e.g., "string", "number", "enumeration")
      fieldType: string; // Field type (e.g., "text", "select", "date")
      description?: string;
      groupName: string; // Property group
      options?: Array<{ label: string; value: string }>; // For enumeration types
      hubspotDefined?: boolean; // true if HubSpot default property
      calculated?: boolean; // true if computed property
   }>;
}
```
