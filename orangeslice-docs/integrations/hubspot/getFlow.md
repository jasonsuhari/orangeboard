# getFlow

Get a specific workflow by ID.

```typescript
const flow = await integrations.hubspot.getFlow("12345678");

console.log(flow.name);       // "My Workflow"
console.log(flow.isEnabled);  // true
console.log(flow.type);       // "CONTACT_FLOW"
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `flowId` | `string` | The ID of the workflow to retrieve |

## Output

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
  startActionId?: string;
  createdAt: string;
  updatedAt: string;
  actions?: unknown[];
  enrollmentCriteria?: unknown;
  enrollmentSchedule?: unknown;
}
```

