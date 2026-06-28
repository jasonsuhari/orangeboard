# createWebhookFlow

Create a HubSpot workflow that sends a webhook from the user's HubSpot portal.

This helper is for OAuth-authorized workflow webhooks, not HubSpot's app-level Webhooks API.

```typescript
const flow = await integrations.hubspot.createWebhookFlow({
   name: "Orange Slice - Enrich Missing Contact Emails",
   description: "Enroll new lead contacts missing email and send to Orange Slice",
   objectTypeId: "0-1", // Contacts
   webhookUrl: "https://www.orangeslice.ai/api/triggers/<trigger-id>/webhook",
   method: "POST",
   enrollmentCriteria: {
      type: "EVENT_BASED",
      shouldReEnroll: false,
      eventFilterBranches: [
         {
            eventTypeId: "4-1463224", // CRM Object Created
            operator: "HAS_COMPLETED",
            filterBranchType: "UNIFIED_EVENTS",
            filterBranchOperator: "AND",
            filterBranches: [],
            filters: []
         }
      ],
      listMembershipFilterBranches: [],
      refinementCriteria: {
         filterBranchType: "AND",
         filterBranchOperator: "AND",
         filterBranches: [],
         filters: [
            {
               property: "lifecyclestage",
               filterType: "PROPERTY",
               operation: {
                  operationType: "ENUMERATION",
                  operator: "IS_ANY_OF",
                  includeObjectsWithNoValueSet: false,
                  values: ["lead"]
               }
            },
            {
               property: "email",
               filterType: "PROPERTY",
               operation: {
                  operationType: "MULTISTRING",
                  operator: "IS_EQUAL_TO",
                  includeObjectsWithNoValueSet: true,
                  values: []
               }
            }
         ]
      }
   }
});
```

## Input

```typescript
{
  name?: string;
  description?: string;
  type?: "CONTACT_FLOW" | "PLATFORM_FLOW";
  objectTypeId: string;
  isEnabled?: boolean;
  webhookActionId?: string;
  nextAvailableActionId?: string;
  webhookUrl: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "CONNECT" | "TRACE";
  queryParams?: Array<{ name: string; value: any }>;
  headers?: Array<{ name: string; value: any }>;
  requestBody?: string | { type: "STATIC"; value: string };
  authSettings?: {
    type: "NONE" | "AUTH_KEY" | "SIGNATURE" | "OAUTH";
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

This uses the HubSpot workflows API, not the app-level Webhooks API. The connected HubSpot user must authorize your app with the `automation` OAuth scope.

HubSpot's v4 workflow payload is stricter in practice than our local generated types suggest. The following details are important and were confirmed to work:

- Include top-level `flowType: "WORKFLOW"` when creating workflows via `createFlow(...)`.
- Use a webhook action with `type: "WEBHOOK"` rather than trying to guess an `actionTypeId`.
- If you pass `isEnabled: true`, this helper creates the workflow disabled first, then performs a second update call with the full workflow payload HubSpot expects for activation.
- HubSpot accepts a webhook action shape like:

```typescript
{
  type: "WEBHOOK",
  actionId: "1",
  method: "POST",
  webhookUrl: "https://example.com/webhook",
  requestBody: { type: "STATIC", value: "" },
  queryParams: [],
  headers: [],
  authSettings: { type: "NONE", value: null }
}
```

- For the contact lifecycle stage filter, use `operationType: "ENUMERATION"`.
- For "email is missing", HubSpot accepted:

```typescript
{
  property: "email",
  filterType: "PROPERTY",
  operation: {
    operationType: "MULTISTRING",
    operator: "IS_EQUAL_TO",
    includeObjectsWithNoValueSet: true,
    values: []
  }
}
```

- The CRM Object Created event trigger is `eventTypeId: "4-1463224"`.

If the helper fails, fall back to `integrations.hubspot.createFlow(...)` with the exact working payload shape above.
