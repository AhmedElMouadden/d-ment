import { QBO_AUTHORIZE_URL, QBO_REVOKE_URL, QBO_SCOPE, QBO_TOKEN_URL } from "./config";

export interface QboTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date | null;
}

export class QboAuthError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
  }
  /** Jeton de rafraîchissement expiré ou révoqué : le client doit reconnecter QuickBooks. */
  get needsReconnect() {
    return this.code === "invalid_grant";
  }
}

interface Credentials { clientId: string; clientSecret: string; redirectUri: string }

export function buildAuthorizeUrl(creds: Credentials, state: string) {
  const url = new URL(QBO_AUTHORIZE_URL);
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", QBO_SCOPE);
  url.searchParams.set("redirect_uri", creds.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

function basicAuth(creds: Credentials) {
  return "Basic " + Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
}

export function parseTokenResponse(
  json: { access_token: string; refresh_token: string; expires_in: number; x_refresh_token_expires_in?: number },
  now = Date.now(),
): QboTokens {
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    accessTokenExpiresAt: new Date(now + json.expires_in * 1000),
    refreshTokenExpiresAt: json.x_refresh_token_expires_in ? new Date(now + json.x_refresh_token_expires_in * 1000) : null,
  };
}

async function tokenRequest(creds: Credentials, body: Record<string, string>, fetchImpl: typeof fetch) {
  const res = await fetchImpl(QBO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuth(creds),
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new QboAuthError(json.error_description ?? "Échec OAuth QuickBooks", json.error ?? "unknown", res.status);
  }
  return parseTokenResponse(json);
}

export function exchangeCode(creds: Credentials, code: string, fetchImpl: typeof fetch = fetch) {
  return tokenRequest(creds, { grant_type: "authorization_code", code, redirect_uri: creds.redirectUri }, fetchImpl);
}

/** Intuit fait tourner le jeton de rafraîchissement : toujours enregistrer le nouveau. */
export function refreshTokens(creds: Credentials, refreshToken: string, fetchImpl: typeof fetch = fetch) {
  return tokenRequest(creds, { grant_type: "refresh_token", refresh_token: refreshToken }, fetchImpl);
}

export async function revokeToken(creds: Credentials, token: string, fetchImpl: typeof fetch = fetch) {
  await fetchImpl(QBO_REVOKE_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(creds), Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}
