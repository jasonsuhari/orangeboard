# updateFlow

Update an existing workflow.

```typescript
const updatedFlow = await integrations.hubspot.updateFlow("12345678", {
   name: "Updated Workflow Name",
   isEnabled: true
});
```

## Input

| Parameter                  | Type        | Description                                                                        |
| -------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| `flowId`                   | `string`    | The ID of the workflow to update                                                   |
| `input.revisionId`         | `string`    | Optional current revision ID. If omitted, the helper fetches the latest flow first |
| `input.name`               | `string`    | Updated name                                                                       |
| `input.description`        | `string`    | Updated description                                                                |
| `input.isEnabled`          | `boolean`   | Enable/disable the workflow                                                        |
| `input.actions`            | `unknown[]` | Updated workflow actions                                                           |
| `input.enrollmentCriteria` | `unknown`   | Updated enrollment criteria                                                        |

## Output

Returns the updated workflow object.

```typescript
{
  id: string;
  name?: string;
  description?: string;
  type: "CONTACT_FLOW" | "PLATFORM_FLOW";
  isEnabled: boolean;
  revisionId: string;
  objectTypeId: string;
  createdAt: string;
  updatedAt: string;
}
```

## Notes

This helper now fetches the current workflow and preserves HubSpot-required top-level fields such as `type`, `objectTypeId`, `flowType`, `nextAvailableActionId`, and `crmObjectCreationStatus` before sending the update request.
