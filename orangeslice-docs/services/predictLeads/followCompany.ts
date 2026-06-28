/**
 * Follow the company
 * Follow the company.
 * HTTP POST /companies/{company_id_or_domain}/follow
 */
type followCompany = (params: {
  /** Company's ID or domain. */
  company_id_or_domain: string;
  /** Provide, if you want to use your custom company identifier. */
  custom_company_identifier?: string;
}) => Promise<{
  success: {
  type: "follow_successful";
  message: string;
};
}>;