/** Credits: 2 (standard). Charged only if a valid URL is returned. */

/**
 * Find a LinkedIn company URL
 */
type findUrl = (params: {
   /** Company name */
   companyName?: string;
   /** Company website */
   website?: string;
   /** Location */
   location?: string;
}) => Promise<string | null>;
