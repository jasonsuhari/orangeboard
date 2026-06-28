# createFlow

Create a new workflow.

```typescript
const flow = await integrations.hubspot.createFlow({
   name: "New Customer Onboarding",
   description: "Workflow for onboarding new customers",
   type: "CONTACT_FLOW",
   objectTypeId: "0-1", // Contacts
   isEnabled: false
});

console.log(flow.id); // "12345678"
```

## Input

| Parameter                  | Type                                | Description                               |
| -------------------------- | ----------------------------------- | ----------------------------------------- |
| `input.name`               | `string`                            | Name of the workflow                      |
| `input.description`        | `string`                            | Description of the workflow               |
| `input.type`               | `"CONTACT_FLOW" \| "PLATFORM_FLOW"` | Type of workflow                          |
| `input.objectTypeId`       | `string`                            | Object type ID (e.g., "0-1" for contacts) |
| `input.isEnabled`          | `boolean`                           | Whether workflow is enabled               |
| `input.actions`            | `unknown[]`                         | Workflow actions                          |
| `input.enrollmentCriteria` | `unknown`                           | Enrollment criteria                       |

## Output

Returns the created workflow object.

```typescript
{
  id: string;
  name?: string;
  description?: string;
  uuid?: string;
  type: "CONTACT_FLOW" | "PLATFORM_FLOW";
  isEnabled: boolean;
  revisionId: string;
  objectTypeId: string;
  createdAt: string;
  updatedAt: string;
}
```
