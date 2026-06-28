# updateNote

Update an existing note.

```typescript
const updated = await integrations.hubspot.updateNote("123456", {
  properties: {
    hs_note_body: "Updated note content with more details."
  }
});
```

## Input

| Parameter | Type | Description |
|-----------|------|-------------|
| `noteId` | `string` | Note ID to update |
| `input.properties` | `object` | Properties to update |
| `idProperty` | `string` | Optional unique property name |

## Output

```typescript
{
  id: string;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
}
```

