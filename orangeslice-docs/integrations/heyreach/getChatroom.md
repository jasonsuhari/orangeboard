# getChatroom

Get full chatroom details including all messages.

```typescript
const chatroom = await integrations.heyreach.getChatroom("67890", "conv-123");

console.log(chatroom.correspondentProfile?.firstName);
console.log(chatroom.messages?.length);

for (const msg of chatroom.messages || []) {
  console.log(`${msg.sender || "Me"}: ${msg.body}`);
}
```

## Input

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `accountId` | `string` | Yes | LinkedIn account ID |
| `conversationId` | `string` | Yes | Conversation ID |

## Output

```typescript
{
  id?: string;
  read?: string;
  groupChat?: string;
  blockedByMe?: string;
  blockedByParticipant?: string;
  lastMessageAt?: string;
  lastMessageText?: string;
  lastMessageSender?: string | null;
  totalMessages?: string;
  campaignId?: string;
  linkedInAccountId?: string;
  correspondentProfile?: {
    profileUrl?: string;
    firstName?: string;
    lastName?: string;
    headline?: string;
    imageUrl?: string;
    location?: string;
    companyName?: string;
    companyUrl?: string;
    position?: string;
    about?: string;
    connections?: string;
    followers?: string;
    tags?: string[];
    emailAddress?: string;
    customFields?: Array<{ name?: string; value?: string }>;
  };
  linkedInAccount?: {
    id?: string;
    emailAddress?: string;
    firstName?: string;
    lastName?: string;
    isActive?: string;
    activeCampaigns?: string;
    authIsValid?: string;
    isValidNavigator?: string;
    isValidRecruiter?: string;
  };
  messages?: Array<{
    createdAt?: string;
    body?: string;
    subject?: string;
    postLink?: string;
    isInMail?: string;
    sender?: string | null;  // null = sent by you
  }>;
}
```

