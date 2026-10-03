import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getQboProvider } from "../qbo/connection";
import { syncOrganization, type SyncResult } from "./run";

/** Synchro QuickBooks d'une organisation, avec suivi d'état dans qbo_connections. */
export async function runQboSync(db: SupabaseClient, orgId: string, opts: { full?: boolean } = {}): Promise<SyncResult | null> {
  const provider = await getQboProvider(db, orgId);
  if (!provider) return null;

  const { data: conn } = await db.from("qbo_connections").select("last_sync_at").eq("organization_id", orgId).single();
  // Fenêtre d'un jour de recouvrement : aucun paiement manqué entre deux synchros
  const changedSince = !opts.full && conn?.last_sync_at ? new Date(Date.parse(conn.last_sync_at) - 86_400_000) : undefined;

  try {
    const result = await syncOrganization(db, orgId, provider, { changedSince });
    await db.from("qbo_connections").update({ last_sync_at: new Date().toISOString(), last_sync_error: null }).eq("organization_id", orgId);
    return result;
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : "unknown";
    await db.from("qbo_connections").update({ last_sync_error: message }).eq("organization_id", orgId);
    throw e;
  }
}
