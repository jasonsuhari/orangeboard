# listLabels

List Gmail system labels and custom labels.

```typescript
const labels = await integrations.gmail.listLabels();

for (const label of labels.data?.labels || []) {
   console.log(label.id, label.name);
}
```

## Input

| Parameter | Type     | Required | Description                         |
| --------- | -------- | -------- | ----------------------------------- |
| `user_id` | `string` | No       | Gmail user id (`\"me\"` by default) |

## Output

```typescript
{
  successful: boolean;
  data?: {
    labels?: GmailLabel[];
  };
  error?: string;
}
```

## Notes

- Use this before any label-based workflow so you work with Gmail label IDs rather than display names
- System labels and custom labels can both appear in the response
