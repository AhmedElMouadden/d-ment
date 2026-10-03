/** Points d'accès Intuit (OAuth 2.0 + API Accounting v3). */
export const QBO_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
export const QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
export const QBO_SCOPE = "com.intuit.quickbooks.accounting";
export const QBO_MINOR_VERSION = "75";

export type QboEnvironment = "sandbox" | "production";

export function qboApiBase(environment: QboEnvironment) {
  return environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export function qboConfig() {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const redirectUri = process.env.QBO_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("QBO_CLIENT_ID, QBO_CLIENT_SECRET et QBO_REDIRECT_URI sont requis");
  }
  const environment: QboEnvironment = process.env.QBO_ENVIRONMENT === "production" ? "production" : "sandbox";
  return { clientId, clientSecret, redirectUri, environment };
}

export function isQboConfigured() {
  return Boolean(process.env.QBO_CLIENT_ID && process.env.QBO_CLIENT_SECRET && process.env.QBO_REDIRECT_URI);
}

/** Cookie anti-CSRF du flux OAuth (limité au chemin /api/qbo). */
export const QBO_STATE_COOKIE = "qbo_oauth_state";
