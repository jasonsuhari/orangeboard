# getCallRecording

Get a call recording by ID.

```typescript
const result = await integrations.attio.getCallRecording({
  meeting_id: "mtg_01abc123def456",
  call_recording_id: "cr_01xyz789ghi012",
});
```

## Input

```typescript
{
  meeting_id: string;
  call_recording_id: string;
}
```

## Output

```typescript
{
  data: {
    id: { workspace_id: string; meeting_id: string; call_recording_id: string };
    status: "processing" | "completed" | "failed";
    web_url: string;
    created_by_actor: { type: string; id: string | null };
    created_at: string;
  };
}
```
