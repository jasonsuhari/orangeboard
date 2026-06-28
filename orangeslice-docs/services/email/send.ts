/** Credits: 0 (notification utility) */

/**
 * Send a transactional notification email.
 *
 * Uses Orange Slice's managed Resend sender identity.
 * `from` is intentionally not exposed in this API.
 */
type send = (params: {
   /** Recipient email address or addresses */
   to: string | string[];
   /** Subject line */
   subject: string;
   /** HTML body content */
   html: string;
}) => Promise<any>;
