import { fiberPost } from "./_client";

export interface RevealedContact {
  emails: Array<{
    address: string;
    type: "work" | "personal" | "other" | "unknown" | "generic";
    validationStatus: "valid" | "risky" | "unknown" | "invalid";
  }>;
  phoneNumbers: Array<{
    number: string;
    type: "mobile" | "other" | "unknown";
  }>;
  status: string;
}

export interface RevealOptions {
  getWorkEmails?: boolean;
  getPersonalEmails?: boolean;
  getPhoneNumbers?: boolean;
  /** Bounce-validate emails — no extra cost */
  validateEmails?: boolean;
}

export async function revealContact(
  linkedinUrl: string,
  opts: RevealOptions = {}
): Promise<RevealedContact | null> {
  const data = await fiberPost<{ output?: { profile?: RevealedContact } }>(
    "/v1/sync-quick-contact-reveal",
    {
      linkedinUrl,
      enrichmentType: {
        getWorkEmails: opts.getWorkEmails ?? true,
        getPersonalEmails: opts.getPersonalEmails ?? true,
        getPhoneNumbers: opts.getPhoneNumbers ?? false,
      },
      validateEmails: opts.validateEmails ?? true,
    }
  );

  return data.output?.profile ?? null;
}

/** Get the best verified work email for a LinkedIn profile, or null */
export async function getBestEmail(linkedinUrl: string): Promise<string | null> {
  const contact = await revealContact(linkedinUrl, { getPhoneNumbers: false });
  if (!contact) return null;

  const valid = contact.emails.find(
    (e) => e.type === "work" && e.validationStatus === "valid"
  );
  const risky = contact.emails.find(
    (e) => e.type === "work" && e.validationStatus === "risky"
  );
  return valid?.address ?? risky?.address ?? contact.emails[0]?.address ?? null;
}
