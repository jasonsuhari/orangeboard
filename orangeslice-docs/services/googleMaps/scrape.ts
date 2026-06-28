/** Credits: 10/result (per-result). Reserves up to `limit` or `maxCrawledPlacesPerSearch` (default 100). Settles actual count. */

interface GoogleMapsScraperInput {
   /** Array of search terms to find places (e.g., ['grocery store', 'pizza restaurant']) */
   searchStringsArray: string[];
   /** City name to search in */
   city?: string;
   /** State or province to search in */
   state?: string;
   /** Two-letter country code (e.g., 'us', 'uk', 'ca') */
   countryCode?: string;
   /** Latitude coordinate for geolocation search */
   lat?: string;
   /** Longitude coordinate for geolocation search */
   lng?: string;
   /** Zoom level affecting search radius (1-21, higher = smaller area) */
   zoom?: number;
   /** Maximum number of places to return per search term */
   maxCrawledPlacesPerSearch?: number;
   /** Minimum star rating filter (1-5) */
   minStarRating?: number;
   /** Filter places by website presence */
   website?: "withWebsite" | "withoutWebsite" | "allPlaces";
   /** Skip closed places */
   skipClosedPlaces?: boolean;
   /** Language code for results (e.g., 'en', 'es') */
   language?: string;
   /** Result pagination options */
   datasetListParams?: { limit?: number; offset?: number };
}

interface GoogleMapsPlace {
   /** The name of the place */
   title: string;
   /** Google Maps place ID */
   placeId?: string;
   /** Google Maps URL for the place */
   url?: string;
   /** Full formatted address */
   address?: string;
   /** City name */
   city?: string;
   /** State or province */
   state?: string;
   /** Postal/ZIP code */
   postalCode?: string;
   /** Two-letter country code */
   countryCode?: string;
   /** Geographic coordinates */
   location?: { lat: number; lng: number };
   /** Primary category */
   categoryName?: string;
   /** All categories for this place */
   categories?: string[];
   /** Phone number */
   phone?: string;
   /** Website URL */
   website?: string;
   /** Average star rating (1-5) */
   rating?: number;
   /** Total number of reviews */
   reviewsCount?: number;
   /** Total review score */
   totalScore?: number;
   /** Opening hours by day */
   openingHours?: Array<{ day?: string; hours?: string }>;
   /** Whether permanently closed */
   permanentlyClosed?: boolean;
   /** Whether temporarily closed */
   temporarilyClosed?: boolean;
   /** Price level indicator */
   priceLevel?: string;
   /** Main image URL */
   imageUrl?: string;
   /** Total number of images */
   imagesCount?: number;
   /** Contact email addresses if scrapeContacts enabled */
   contactEmails?: string[];
   /** Contact phone numbers if scrapeContacts enabled */
   contactPhones?: string[];
   /** Table reservation provider links */
   reservationLinks?: Array<{ source?: string; link?: string }>;
}

/**
 * Scrape Google Maps for places matching search criteria.
 * Returns detailed information about businesses, locations, and points of interest including contact info, and more.
 */
type scrape = (params: GoogleMapsScraperInput) => Promise<GoogleMapsPlace[]>;
