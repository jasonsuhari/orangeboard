/\*_ Credits: 2 for the search path, or 50 when reverse-email lookup is used. Charged only if a valid URL is returned. _/

/\*\*

- Find a LinkedIn profile URL
  _/
  type findUrl = (params: {
  /\*\* Full name _/
  name?: string;
  /** Job title \*/
  title?: string;
  /** Company name _/
  company?: string;
  /\*\* Additional keyword, industry, etc. Any more data to specify the person _/
  keyword?: string;
  /\*_ Location string (e.g., city, state, country) to narrow search results _/
  location?: string;
  /\*_ Email address. For work emails, the service may infer the name from the email, try search with that + the email domain, validate the result against B2B current-company domain data, then fall back to reverse-email lookup. _/
  email?: string;
  }) => Promise<string | undefined>;
