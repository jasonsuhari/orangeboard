/**
 * Unfollow the company
 * Unfollow the company.
 * HTTP POST /companies/{company_id_or_domain}/unfollow
 */
type unfollowCompany = (params: {
  /** Company's ID or domain. */
  company_id_or_domain: string;
}) => Promise<{
  success: {
  type: "unfollow_successful";
  message: string;
};
}>;