# assertRecord

Create or update a record by matching attribute (upsert). If a record with the same value for matching_attribute exists, it is updated. Otherwise a new record is created.

```typescript
const result = await integrations.attio.assertRecord({
   object: "people",
   matching_attribute: "email_addresses",
   data: {
      values: {
         email_addresses: [{ email_address: "jane@acme.com" }],
         name: [{ first_name: "Jane", last_name: "Smith", full_name: "Jane Smith" }],
         job_title: "CTO"
      }
   }
});
```

## Input

```typescript
{
   object: string;
   matching_attribute: string;
   data: {
      values: Record<string, any>;
   }
}
```

`object` is a path parameter. `matching_attribute` is sent as a query parameter. The `data` wrapper is sent as the request body.

## Output

```typescript
{
   data: {
      id: {
         workspace_id: string;
         object_id: string;
         record_id: string;
      }
      created_at: string;
      web_url: string;
      values: Record<
         string,
         Array<{ active_from?: string; active_until?: string | null; attribute_type?: string; [key: string]: any }>
      >;
   }
}
```
