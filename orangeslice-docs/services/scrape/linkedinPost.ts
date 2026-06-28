/** Credits: 1 (standard). Charged only if a valid LinkedIn post result is returned. */

/**
 * Scrape a linkedin post
 */
type linkedinPost = (params: {
   /** The url of the linkedin post to scrape */
   url: string;
}) => Promise<{
   content: string;
   date?: Date;
   relativeTime?: string;
   url: string;
}>;
