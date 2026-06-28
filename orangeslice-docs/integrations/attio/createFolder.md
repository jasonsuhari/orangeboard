# createFolder

Create a folder on a record.

```typescript
const result = await integrations.attio.createFolder({
  data: {
    object: "companies",
    record_id: "rec_01abc123def456",
    file_type: "folder",
    name: "Contracts",
  },
});

// Create a nested folder
const nested = await integrations.attio.createFolder({
  data: {
    object: "companies",
    record_id: "rec_01abc123def456",
    file_type: "folder",
    name: "2025 Renewals",
    parent_folder_id: "fil_01xyz789ghi012",
  },
});
```

## Input

```typescript
{
  data: {
    object: string;
    record_id: string;
    file_type: "folder";
    name: string;
    parent_folder_id?: string;
  };
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
