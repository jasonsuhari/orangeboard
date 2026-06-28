# listObjects

List all objects in the workspace (people, companies, deals, custom objects).

```typescript
const result = await integrations.attio.listObjects();
```

## Input

No input parameters.

## Output

```typescript
{
  data: Array<{
    id: { object_id: string };
    api_slug: string;
    singular_noun: string;
    plural_noun: string;
    created_at: string;
  }>;
  next_cursor?: string | null;
}
```
