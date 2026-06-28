/** Credits: 1 (standard) */

/**
 * Parse an address to get the street number, route, city, state, postal code, and country
 */
type parseAddress = (params: {
   /** The address to parse */
   address: string;
}) => Promise<{
   streetNumber: string;
   route: string;
   city: string;
   state: string;
   postalCode: string;
   country: string;
   lat: number;
   lng: number;
}>;
