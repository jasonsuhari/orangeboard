# createObject

Create a new custom object.

```typescript
const result = await integrations.attio.createObject({
  data: {
    api_slug: "projects",
    singular_noun: "Project",
    plural_noun: "Projects",
  },
});
```

## Input

```typescript
{
  data: {
    api_slug: string;
    singular_noun: string;
    plural_noun: string;
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
