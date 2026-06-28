# usersLookupByEmail

Find a user by their email address.

```typescript
const result = await integrations.slack.usersLookupByEmail({
  email: "john@company.com"
});

if (result.user) {
  console.log(`Found user: ${result.user.id}`);
  console.log(`Name: ${result.user.real_name}`);
}
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | `string` | Yes | Email address to look up |

## Output

```typescript
{
  ok: boolean;
  user?: SlackUser;
}
```

## Notes

- Returns error if no user found with that email
- Only works for users in the workspace
