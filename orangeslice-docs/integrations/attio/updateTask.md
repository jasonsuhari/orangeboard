# updateTask

Update a task.

```typescript
const result = await integrations.attio.updateTask({
  task_id: "task_01abc123def456",
  data: {
    is_completed: true,
    deadline_at: "2026-03-28T17:00:00.000Z",
    assignees: [
      { workspace_member_email_address: "manager@example.com" },
    ],
    linked_records: [
      { target_object: "companies", target_record_id: "rec_01abc123def456" },
      { target_object: "people", target_record_id: "rec_02xyz789ghi012" },
    ],
  },
});
```

## Input

```typescript
{
  task_id: string;
  data: {
    deadline_at?: string | null;
    is_completed?: boolean;
    assignees?: Array<
      | { referenced_actor_type: string; referenced_actor_id: string }
      | { workspace_member_email_address: string }
    >;
    linked_records?: Array<{
      target_object: string;
      target_record_id: string;
    }>;
  };
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
