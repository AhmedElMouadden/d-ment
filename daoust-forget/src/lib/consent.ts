/**
 * Consent for audience measurement (Québec Law 25: tracking technologies
 * are off by default and require an informed opt-in). Only the visitor's
 * choice is stored, in a first-party cookie.
 */
export type ConsentChoice = "granted" | "denied";

export const CONSENT_COOKIE = "df_consent";
export const CONSENT_VERSION = 1;
const MAX_AGE = 60 * 60 * 24 * 180; // 6 months, then we ask again.

export function parseConsent(cookieHeader: string | undefined | null): ConsentChoice | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  const [version, choice] = decodeURIComponent(match.slice(CONSENT_COOKIE.length + 1)).split(":");
  if (Number(version) !== CONSENT_VERSION) return null;
  return choice === "granted" || choice === "denied" ? choice : null;
}

export function serializeConsent(choice: ConsentChoice, secure: boolean) {
  return [
    `${CONSENT_COOKIE}=${encodeURIComponent(`${CONSENT_VERSION}:${choice}`)}`,
    "Path=/",
    `Max-Age=${MAX_AGE}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export const CONSENT_EVENT = "df:consent";
export const OPEN_CONSENT_EVENT = "df:open-consent";
