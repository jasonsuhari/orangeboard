/** Credits: up to 275 (custom). Email+Phone=275, Phone=250, Email=25. 0 if not found. */

interface ContactInfoResponse {
   /** The work emails of the person. All emails are pre-filtered for deliverability — only verified deliverable addresses are returned. */
   work_emails: string[];
   /** The work phone numbers of the person */
   work_phones: string[];
   /** The personal emails of the person. All emails are pre-filtered for deliverability — only verified deliverable addresses are returned. */
   personal_emails: string[];
   /** The personal phone numbers of the person */
   personal_phones: string[];
   /** The unknown type phone numbers of the person. These aren't necessarily bad, we just don't know if they are personal or work */
   unknown_phones: string[];
}

/**
 * Get contact info (email, phone) for a person via LinkedIn URL or name+company.
 * This takes up to 10min. Returns work/personal/unknown variants prioritized in that order.
 * If this is in a column, you should run it last as it takes a while.
 * CRITICAL: Never duplicate calls with identical params across columns.
 */
type get = (params: {
   /** The first name of the person */
   firstName?: string;
   /** The last name of the person */
   lastName?: string;
   /** The company of the person */
   company?: string;
   /** The linkedin url to get the email and phone number from */
   linkedinUrl?: string;
   /** The required contact info */
   required: Array<"email" | "phone" | "work_email">;
   /** The domain of the work email you'd like to grab */
   domain?: string;
}) => Promise<ContactInfoResponse>;
