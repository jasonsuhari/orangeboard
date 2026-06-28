# authTest

Test authentication and get information about the connected workspace.

```typescript
const result = await integrations.slack.authTest();

// Returns workspace and user info
console.log(result.team);     // "My Workspace"
console.log(result.user);     // "bot-user"
console.log(result.team_id);  // "T1234567890"
console.log(result.user_id);  // "U1234567890"
```

## Output

```typescript
{
  ok: boolean;
  url?: string;           // Workspace URL
  team?: string;          // Workspace name
  user?: string;          // Authenticated user name
  team_id?: string;       // Workspace ID
  user_id?: string;       // User ID
  bot_id?: string;        // Bot ID (if bot token)
  is_enterprise_install?: boolean;
}
```
