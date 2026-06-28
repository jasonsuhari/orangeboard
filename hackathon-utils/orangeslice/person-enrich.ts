import { getServices } from "./_client";

/** Basic profile — name, title, company, location (~300ms) */
export async function enrichPerson(linkedinUrl: string) {
  const s = getServices();
  return s.person.linkedin.enrich({ url: linkedinUrl });
}

/** Extended profile — includes full career history, education, skills */
export async function enrichPersonExtended(linkedinUrl: string) {
  const s = getServices();
  return s.person.linkedin.enrich({ url: linkedinUrl, extended: true });
}

/** Find a person's LinkedIn URL from their name + company, then enrich them */
export async function findAndEnrichPerson(name: string, company: string) {
  const s = getServices();
  const url = await s.person.linkedin.findUrl({ name, company });
  if (!url) return null;
  const profile = await s.person.linkedin.enrich({ url });
  return profile ? { ...profile, linkedin_url: url } : null;
}
