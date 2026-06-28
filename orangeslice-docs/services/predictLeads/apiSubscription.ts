/**
 * Retrieve API subscription information
 * Returns the current subscription status along with monthly credit limits and usage details.
 * HTTP GET /api_subscription
 */
type apiSubscription = (params: {}) => Promise<{
  data: Array<{
  id: string;
  type: "api_subscription";
  attributes: {
  status: "disabled" | "active" | "disabled_due_to_error";
  monthly_credits_quota: number;
  monthly_credits_used: number;
};
}>;
  meta?: {
  schema_version: string;
};
}>;