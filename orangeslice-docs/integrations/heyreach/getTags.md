# getTags

Get all tags for a lead.

```typescript
const tags = await integrations.heyreach.getTags({
  profileUrl: "https://linkedin.com/in/johndoe"
});

console.log(tags);
```

## Input

```typescript
{
  profileUrl: string;  // LinkedIn profile URL
}
```

## Output

```typescript
any  // Array of tag data for the lead
```

