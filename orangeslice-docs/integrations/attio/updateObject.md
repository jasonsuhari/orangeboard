# updateObject

Update an object's metadata.

```typescript
const result = await integrations.attio.updateObject({
  object: "projects",
  data: {
    singular_noun: "Initiative",
    plural_noun: "Initiatives",
  },
});
```

## Input

```typescript
{
  object: string;
  data: {
    api_slug?: string;
    singular_noun?: string;
    plural_noun?: string;
  };
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
