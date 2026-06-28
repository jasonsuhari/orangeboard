import { fiberGet } from "./_client";

export interface OrgCredits {
  credits: number;
  creditsUsed: number;
  creditsRemaining: number;
}

export async function getCredits(): Promise<OrgCredits> {
  return fiberGet<OrgCredits>("/v1/get-org-credits");
}
