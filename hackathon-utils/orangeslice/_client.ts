import { configure, services } from "orangeslice";

let configured = false;

export function getServices() {
  if (!configured) {
    const key = process.env.ORANGESLICE_API_KEY;
    if (!key) throw new Error("ORANGESLICE_API_KEY not set in environment");
    configure({ apiKey: key });
    configured = true;
  }
  return services;
}
