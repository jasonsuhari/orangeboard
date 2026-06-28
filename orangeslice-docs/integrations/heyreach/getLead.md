# getLead

Get a lead by their LinkedIn profile URL.

```typescript
const lead = await integrations.heyreach.getLead({
  profileUrl: "https://linkedin.com/in/johndoe"
});

console.log(lead);
```

## Input

```typescript
{
  profileUrl: string;  // LinkedIn profile URL
}
```

## Output

```typescript
any  // Lead data
```

