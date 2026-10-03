import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "../crypto";
import { QboProvider } from "./client";
import { qboConfig, type QboEnvironment } from "./config";
import { QboAuthError, refreshTokens, type QboTokens } from "./oauth";

/** Marge avant expiration : on rafraîchit 5 minutes à l'avance. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function encryptedTokenColumns(t: QboTokens) {
  return {
    access_token_encrypted: encryptSecret(t.accessToken),
    refresh_token_encrypted: encryptSecret(t.refreshToken),
    access_token_expires_at: t.accessTokenExpiresAt.toISOString(),
    refresh_token_expires_at: t.refreshTokenExpiresAt?.toISOString() ?? null,
  };
}

/**
 * Construit un QboProvider pour une organisation. Les jetons sont déchiffrés
 * en mémoire seulement, rafraîchis au besoin et réenregistrés chiffrés.
 * `db` : client service_role.
 */
export async function getQboProvider(db: SupabaseClient, orgId: string): Promise<QboProvider | null> {
  const { data: conn, error } = await db
    .from("qbo_connections")
    .select("id, realm_id, environment, access_token_encrypted, refresh_token_encrypted, access_token_expires_at, status")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) throw error;
  if (!conn || conn.status === "revoked" || conn.status === "expired") return null;

  const creds = qboConfig();
  let accessToken = decryptSecret(conn.access_token_encrypted);
  let refreshToken = decryptSecret(conn.refresh_token_encrypted);
  let expiresAt = Date.parse(conn.access_token_expires_at);

  const tokenSource = {
    async getAccessToken(force = false) {
      if (!force && expiresAt - Date.now() > REFRESH_MARGIN_MS) return accessToken;
      try {
        const fresh = await refreshTokens(creds, refreshToken);
        accessToken = fresh.accessToken;
        refreshToken = fresh.refreshToken;
        expiresAt = fresh.accessTokenExpiresAt.getTime();
        const { error: saveErr } = await db
          .from("qbo_connections")
          .update({ ...encryptedTokenColumns(fresh), status: "active" })
          .eq("id", conn.id);
        if (saveErr) throw saveErr;
        return accessToken;
      } catch (e) {
        if (e instanceof QboAuthError && e.needsReconnect) {
          await db.from("qbo_connections").update({ status: "expired", last_sync_error: "reconnect_required" }).eq("id", conn.id);
        }
        throw e;
      }
    },
  };

  return new QboProvider(conn.realm_id, conn.environment as QboEnvironment, tokenSource);
}
