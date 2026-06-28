# updateWebhookFlow

Update the webhook action in an existing HubSpot workflow.

```typescript
const updated = await integrations.hubspot.updateWebhookFlow("12345678", {
   webhookUrl: "https://example.com/webhooks/hubspot/v2",
   isEnabled: true
});
```

## Input

```typescript
flowId: string

input: {
  name?: string;
  description?: string;
  isEnabled?: boolean;
  webhookUrl?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "CONNECT" | "TRACE";
  queryParams?: Array<{ name: string; value: any }>;
  headers?: Array<{ name: string; value: any }>;
  requestBody?: string;
  authSettings?: {
    type: "AUTH_KEY" | "SIGNATURE" | "OAUTH";
    [key: string]: any;
  };
  enrollmentCriteria?: any;
  enrollmentSchedule?: any;
  timeWindows?: any[];
  blockedDates?: any[];
  suppressionListIds?: string[];
  canEnrollFromSalesforce?: boolean;
  customProperties?: Record<string, string>;
}
```

## Output

```typescript
HubSpotFlow;
```

## Notes

This helper fetches the current workflow, preserves its existing revision and non-webhook settings, and updates the first webhook action it finds.

When working with HubSpot workflow webhooks, prefer preserving any existing top-level workflow fields such as `flowType`, `nextAvailableActionId`, and `crmObjectCreationStatus`. HubSpot's v4 workflow API is sensitive to omitted fields during updates.

This helper now preserves those top-level workflow fields automatically before sending the `updateFlow(...)` request.
