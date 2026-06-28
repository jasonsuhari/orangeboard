---
description: Slack messaging - channels, users, messages, reactions
---

# Slack Integration

Typed functions for Slack workspace operations.

## Auth

- `integrations.slack.authTest()` - Test authentication and get workspace info

## Chat (Messages)

- `integrations.slack.chatPostMessage(input)` - Send a message to a channel
- `integrations.slack.chatUpdate(input)` - Update an existing message
- `integrations.slack.chatDelete(input)` - Delete a message
- `integrations.slack.chatGetPermalink(channel, message_ts)` - Get permanent URL for a message
- `integrations.slack.chatPostEphemeral(input)` - Send ephemeral message visible only to one user
- `integrations.slack.chatScheduleMessage(input)` - Schedule a message for later
- `integrations.slack.chatDeleteScheduledMessage(channel, scheduled_message_id)` - Delete a scheduled message
- `integrations.slack.chatMeMessage(channel, text)` - Send a /me message

## Conversations (Channels)

- `integrations.slack.conversationsList(input?)` - List channels in workspace
- `integrations.slack.conversationsInfo(input)` - Get info about a channel
- `integrations.slack.conversationsHistory(input)` - Get message history from a channel
- `integrations.slack.conversationsMembers(input)` - List members in a channel
- `integrations.slack.conversationsReplies(input)` - Get thread replies
- `integrations.slack.conversationsCreate(input)` - Create a new channel
- `integrations.slack.conversationsInvite(input)` - Invite internal users to a channel

## Slack Connect (External Collaboration)

- `integrations.slack.conversationsInviteShared(input)` - Invite external users to a channel
- `integrations.slack.conversationsAcceptSharedInvite(input)` - Accept a Slack Connect invitation
- `integrations.slack.conversationsListConnectInvites(input?)` - List pending Slack Connect invites
- `integrations.slack.conversationsApproveSharedInvite(input)` - Approve a pending invite (admin)
- `integrations.slack.conversationsDeclineSharedInvite(input)` - Decline a pending invite

## Users

- `integrations.slack.usersList(input?)` - List users in workspace
- `integrations.slack.usersInfo(input)` - Get user info by ID
- `integrations.slack.usersConversations(input?)` - List conversations user is in
- `integrations.slack.usersProfileGet(input?)` - Get user profile
- `integrations.slack.usersLookupByEmail(input)` - Find user by email
- `integrations.slack.usersGetPresence(user)` - Get user's presence status
- `integrations.slack.usersSetPresence(presence)` - Set your presence

## Files

- `integrations.slack.filesList(input?)` - List files
- `integrations.slack.filesInfo(input)` - Get file info
- `integrations.slack.filesUpload(input)` - Upload a file
- `integrations.slack.filesDelete(file)` - Delete a file

## Reactions

- `integrations.slack.reactionsAdd(input)` - Add emoji reaction to a message
- `integrations.slack.reactionsRemove(input)` - Remove emoji reaction
- `integrations.slack.reactionsGet(input)` - Get reactions for an item
- `integrations.slack.reactionsList(input?)` - List items with reactions

## Pins

- `integrations.slack.pinsAdd(input)` - Pin a message to a channel
- `integrations.slack.pinsRemove(input)` - Unpin a message
- `integrations.slack.pinsList(input)` - List pinned items in a channel

## Reminders

- `integrations.slack.remindersAdd(input)` - Create a reminder
- `integrations.slack.remindersComplete(input)` - Mark reminder complete
- `integrations.slack.remindersDelete(input)` - Delete a reminder
- `integrations.slack.remindersInfo(input)` - Get reminder info
- `integrations.slack.remindersList()` - List all reminders

## Emoji

- `integrations.slack.emojiList()` - List custom emoji in workspace

## Team

- `integrations.slack.teamInfo(team?)` - Get workspace info
