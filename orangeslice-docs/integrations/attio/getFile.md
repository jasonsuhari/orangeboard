# getFile

Get a file by ID.

```typescript
const result = await integrations.attio.getFile({
  file_id: "fil_01abc123def456",
});
```

## Input

```typescript
{
  file_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { file_id: string };
    name: string;
    type: "file" | "folder";
    mime_type: string | null;
    size: number | null;
    parent_folder_id: string | null;
    record_id: string;
    object_id: string;
    storage_provider: string;
    created_at: string;
  };
}
```
