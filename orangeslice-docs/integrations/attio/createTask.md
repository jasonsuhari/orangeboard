# createTask

Create a new task.

```typescript
const result = await integrations.attio.createTask({
  data: {
    content: "Send follow-up proposal to Acme Corp",
    format: "plaintext",
    deadline_at: "2026-03-21T17:00:00.000Z",
    is_completed: false,
    assignees: [
      { workspace_member_email_address: "sales@example.com" },
    ],
    linked_records: [
      { target_object: "companies", target_record_id: "rec_01abc123def456" },
    ],
  },
});
```

## Input

```typescript
{
  data: {
    content: string;
    format: "plaintext";
    deadline_at: string | null;
    is_completed: boolean;
    assignees: Array<
      | { referenced_actor_type: string; referenced_actor_id: string }
      | { workspace_member_email_address: string }
    >;
    linked_records: Array<{
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
