# getObject

Get an object's metadata and schema.

```typescript
const result = await integrations.attio.getObject({
  object: "people",
});
```

## Input

```typescript
{
  object: string;
}
```

## Output

```typescript
{
  data: {
    id: { object_id: string };
    api_slug: string;
    singular_noun: string;
    plural_noun: string;
    created_at: string;
  };
}
```
