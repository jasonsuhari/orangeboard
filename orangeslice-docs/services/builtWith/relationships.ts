/** Credits: 75 (standard). */

/**
 * Find domains related to a given domain.
 * Discovers connections based on shared:
 * - Analytics IDs (same Google Analytics, etc.)
 * - Advertising accounts
 * - Tag managers
 * - Other tracking identifiers
 *
 * Useful for:
 * - Finding subsidiaries and acquired companies
 * - Discovering parent company relationships
 * - Account mapping for enterprise sales
 * - Finding related brands/properties
 */
type relationships = (params: {
   /** Domain to find relationships for */
   domain: string;
}) => Promise<{
   /** The queried domain */
   domain: string;
   /** Related domains found */
   relationships: Array<{
      /** Related domain */
      domain: string;
      /** How they're connected (e.g., "Google Analytics", "Facebook Pixel") */
      connectionType: string;
      /** The shared identifier value */
      identifier?: string;
   }>;
}>;
