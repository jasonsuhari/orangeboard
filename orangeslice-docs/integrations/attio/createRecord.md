# createRecord

Create a new record.

```typescript
const result = await integrations.attio.createRecord({
   object: "people",
   data: {
      values: {
         email_addresses: [{ email_address: "jane@acme.com" }],
         name: [{ first_name: "Jane", last_name: "Smith", full_name: "Jane Smith" }],
         job_title: "VP of Engineering"
      }
   }
});
```

## Input

```typescript
{
   object: string;
   data: {
      values: Record<string, any>;
   }
}
```

`object` is a path parameter (e.g. `"people"`, `"companies"`, or a custom object slug). The `data` wrapper is sent as the request body.

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
