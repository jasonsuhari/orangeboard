# sendEmail

Send an email using Salesforce's emailSimple action. This supports sending emails as the current user, default workflow user, or from an org-wide email address.

```typescript
// Send a simple email
const result = await integrations.salesforce.sendEmail({
   emailAddresses: "recipient@example.com",
   emailSubject: "Hello from Salesforce",
   emailBody: "This is the email body content."
});

if (result.isSuccess) {
   console.log("Email sent successfully!");
} else {
   console.log("Failed to send email:", result.errors);
}

// Send to multiple recipients (comma-separated)
const result = await integrations.salesforce.sendEmail({
   emailAddresses: "user1@example.com, user2@example.com, user3@example.com",
   emailSubject: "Team Update",
   emailBody: "Here's the latest update for the team..."
});

// Send from an org-wide email address
const result = await integrations.salesforce.sendEmail({
   emailAddresses: "support@customer.com",
   emailSubject: "Support Ticket Update",
   emailBody: "Your ticket has been updated.",
   senderType: "OrgWideEmailAddress",
   orgWideEmailAddressId: "0D2xx0000000001AAA"
});

// Send as the org's default workflow user
const result = await integrations.salesforce.sendEmail({
   emailAddresses: "customer@example.com",
   emailSubject: "Order Confirmation",
   emailBody: "Thank you for your order!",
   senderType: "DefaultWorkflowUser"
});
```

## Parameters

| Parameter | Type             | Required | Description             |
| --------- | ---------------- | -------- | ----------------------- |
| `input`   | `SendEmailInput` | Yes      | The email configuration |

### SendEmailInput

| Field                   | Type     | Required | Description                                                                                             |
| ----------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `emailAddresses`        | `string` | Yes      | Recipient email address(es). Multiple addresses should be comma-separated.                              |
| `emailSubject`          | `string` | Yes      | The email subject line                                                                                  |
| `emailBody`             | `string` | Yes      | The plain text email body content                                                                       |
| `senderType`            | `string` | No       | Who to send as: `"CurrentUser"` (default), `"DefaultWorkflowUser"`, or `"OrgWideEmailAddress"`          |
| `orgWideEmailAddressId` | `string` | No       | Required when `senderType` is `"OrgWideEmailAddress"` - the Salesforce ID of the org-wide email address |
| `replyTo`               | `string` | No       | Reply-to email address                                                                                  |

## Output

```typescript
{
   isSuccess: boolean;  // Whether the email was sent successfully
   errors?: Array<{     // Present if the email failed
      statusCode?: string;
      message?: string;
   }>;
}
```

## How Org-Wide Email Addresses Work

When you specify `senderType: "OrgWideEmailAddress"` with an `orgWideEmailAddressId`:

1. The integration queries the `OrgWideEmailAddress` object to get the actual email address
2. That email address is passed to the emailSimple action as the sender
3. Emails will appear to come from that org-wide email address

To find your org-wide email address IDs, you can query them:

```typescript
const result = await integrations.salesforce.query("SELECT Id, Address, DisplayName FROM OrgWideEmailAddress");
console.log(result.records);
```

## Notes

- This uses Salesforce's emailSimple action (`/actions/standard/emailSimple`)
- By default, emails are sent as the authenticated user (`senderType: "CurrentUser"`)
- For org-wide email addresses, you need to first set them up in Salesforce Setup
- The email body is plain text only - HTML is not supported by the emailSimple action
- Salesforce may have daily email limits depending on your org's configuration
- Multiple recipients should be comma-separated in the `emailAddresses` field
