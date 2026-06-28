# listTasks

List tasks with optional filters.

```typescript
const result = await integrations.attio.listTasks({
  limit: 25,
  sort: "created_at:desc",
  linked_object: "companies",
  linked_record_id: "rec_01abc123def456",
  is_completed: false,
});
```

## Input

```typescript
{
  limit?: number;
  offset?: number;
  sort?: "created_at:asc" | "created_at:desc";
  linked_object?: string;
  linked_record_id?: string;
  assignee?: string | null;
  is_completed?: boolean;
}
```

## Output

```typescript
{
  data: Array<{
    id: { task_id: string };
    content_plaintext: string;
    is_completed: boolean;
    deadline_at: string | null;
    created_at: string;
    created_by_actor: { type: string; id: string | null };
    assignees: Array<{ type: string; id: string | null }>;
    linked_records: Array<{ target_object: string; target_record_id: string }>;
  }>;
  next_cursor?: string | null;
}
```
