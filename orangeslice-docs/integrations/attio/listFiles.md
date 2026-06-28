# listFiles

List files and folders for a record. Both `object` and `record_id` are required.

```typescript
const result = await integrations.attio.listFiles({
  object: "companies",
  record_id: "rec_01abc123def456",
  limit: 20,
});

// List files in a specific folder
const nested = await integrations.attio.listFiles({
  object: "companies",
  record_id: "rec_01abc123def456",
  parent_folder_id: "fil_01xyz789ghi012",
});
```

## Input

```typescript
{
  object: string;
  record_id: string;
  parent_folder_id?: string;
  storage_provider?: string;
  limit?: number;
  cursor?: string;
}
```

## Output

```typescript
{
  data: Array<{
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
  }>;
  next_cursor?: string | null;
}
```
