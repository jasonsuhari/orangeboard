# usersProfileGet

Get a user's profile information.

```typescript
// Get authenticated user's profile
const result = await integrations.slack.usersProfileGet();

// Get another user's profile
const result = await integrations.slack.usersProfileGet({
  user: "U1234567890"
});

console.log(result.profile?.email);
console.log(result.profile?.title);
console.log(result.profile?.display_name);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user` | `string` | No | User ID (default: authenticated user) |
| `include_labels` | `boolean` | No | Include custom field labels |

## Output

```typescript
{
  ok: boolean;
  profile?: SlackUserProfile;
}

// SlackUserProfile structure:
{
  title?: string;
  phone?: string;
  real_name?: string;
  display_name?: string;
  email?: string;
  status_text?: string;
  status_emoji?: string;
  image_24?: string;
  image_48?: string;
  image_72?: string;
  image_192?: string;
  image_512?: string;
  // ... more fields
}
```
