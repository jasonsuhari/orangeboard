const result = await integrations.salesforce.request({
path: "/services/data/v62.0/actions/standard",
});

const compositeResult = await integrations.salesforce.request({
method: "POST",
path: "/services/data/v62.0/composite/",
body: {
allOrNone: true,
compositeRequest: [
{
method: "GET",
url: "/services/data/v62.0/sobjects/Lead/00Qxx000001abcDEAY",
referenceId: "lead"
}

    ]

}
});

const apexResult = await integrations.salesforce.request({
method: "POST",
path: "/services/apexrest/leadconvert/00Qxx000001abcDEAY",
body: {
doNotCreateOpportunity: true
}
});

Use `request()` when Salesforce has an endpoint that Orange Slice does not expose as a first-class helper.

## Input

| Field     | Type                                                               | Required | Description                                              |
| --------- | ------------------------------------------------------------------ | -------- | -------------------------------------------------------- |
| `path`    | `string`                                                           | Yes      | Absolute URL or instance-relative path starting with `/` |
| `method`  | `"GET" \| "POST" \| "PUT" \| "PATCH" \| "DELETE"`                  | No       | HTTP method. Defaults to `GET`                           |
| `query`   | `Record<string, string \| number \| boolean \| null \| undefined>` | No       | Query params appended to the URL                         |
| `headers` | `Record<string, string>`                                           | No       | Additional request headers                               |
| `body`    | `unknown`                                                          | No       | Request body. Objects are JSON-stringified automatically |

## Response

Returns:

```ts
{
   status: number;
   headers: Record<string, string>;
   data: unknown;
}
```

## Notes

- OAuth and the Salesforce instance URL are handled automatically.
- `path` must be a full URL or start with `/`.
- This is the escape hatch for non-CRUD Salesforce APIs such as Apex REST, composite APIs, quick actions, and other special endpoints.
