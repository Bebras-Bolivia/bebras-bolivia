import registro from "@/data/registro.json";
import { isSafeHref } from "@/lib/safe-url";

/** Con enlace, las inscripciones están abiertas; sin él, el desafío está en espera. */
export function registrationHref(): string | null {
  const registration = (registro as { registration?: { openHref?: string } }).registration;
  const href = registration?.openHref?.trim();
  return href && isSafeHref(href) ? href : null;
}
