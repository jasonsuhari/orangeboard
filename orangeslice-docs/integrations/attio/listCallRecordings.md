# listCallRecordings

List call recordings for a meeting.

```typescript
const result = await integrations.attio.listCallRecordings({
  meeting_id: "mtg_01abc123def456",
  limit: 10,
});
```

## Input

```typescript
{
  meeting_id: string;
  limit?: number;
  cursor?: string;
}
```

## Output

```typescript
{
  data: Array<{
    id: { workspace_id: string; meeting_id: string; call_recording_id: string };
    status: "processing" | "completed" | "failed";
    web_url: string;
    created_by_actor: { type: string; id: string | null };
    created_at: string;
  }>;
  next_cursor?: string | null;
}
```
