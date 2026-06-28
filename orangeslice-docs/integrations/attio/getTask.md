# getTask

Get a task by ID.

```typescript
const result = await integrations.attio.getTask({
  task_id: "task_01abc123def456",
});
```

## Input

```typescript
{
  task_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { task_id: string };
    content_plaintext: string;
    is_completed: boolean;
    deadline_at: string | null;
    created_at: string;
    created_by_actor: { type: string; id: string | null };
    assignees: Array<{ type: string; id: string | null }>;
    linked_records: Array<{ target_object: string; target_record_id: string }>;
  };
}
```
