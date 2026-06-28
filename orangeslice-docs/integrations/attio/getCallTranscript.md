# getCallTranscript

Get the transcript for a call recording.

```typescript
const result = await integrations.attio.getCallTranscript({
  meeting_id: "mtg_01abc123def456",
  call_recording_id: "cr_01xyz789ghi012",
});
```

## Input

```typescript
{
  meeting_id: string;
  call_recording_id: string;
  cursor?: string;
}
```

## Output

```typescript
{
  data: {
    id: { workspace_id: string; meeting_id: string; call_recording_id: string };
    transcript: Array<{
      speech: string;
      start_time: number;
      end_time: number;
      speaker: { name: string };
    }>;
    raw_transcript: string;
    web_url: string;
  };
}
```
