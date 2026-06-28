# usersInfo

Get detailed information about a user.

```typescript
const result = await integrations.slack.usersInfo({
  user: "U1234567890"
});

const user = result.user;
console.log(user?.real_name);
console.log(user?.profile?.email);
console.log(user?.profile?.title);
console.log(user?.is_admin);
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user` | `string` | Yes | User ID |
| `include_locale` | `boolean` | No | Include locale info |

## Output

```typescript
{
  ok: boolean;
  user?: SlackUser;
}

// SlackUser structure:
{
  id: string;
  name?: string;
  real_name?: string;
  deleted?: boolean;
  is_admin?: boolean;
  is_owner?: boolean;
  is_bot?: boolean;
  tz?: string;
  profile?: {
    email?: string;
    title?: string;
    phone?: string;
    display_name?: string;
    real_name?: string;
    image_72?: string;
    // ... more image sizes
  };
}
```
