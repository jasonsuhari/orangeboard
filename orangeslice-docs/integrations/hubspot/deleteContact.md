# deleteContact

Archive (soft delete) a contact. Archived contacts can be restored within 90 days.

```typescript
await integrations.hubspot.deleteContact("123456");
```

## Input

| Parameter   | Type     | Description               |
| ----------- | -------- | ------------------------- |
| `contactId` | `string` | The contact ID to archive |

## Output

`void` - No return value on success.
