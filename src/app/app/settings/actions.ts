"use server";
import { revalidatePath } from "next/cache";
import { getDictionary } from "@/i18n/server";
import { decryptSecret } from "@/lib/crypto";
import { qboConfig } from "@/lib/qbo/config";
import { revokeToken } from "@/lib/qbo/oauth";
import { requireSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runQboSync } from "@/lib/sync/service";

export type SyncState = { ok?: string; error?: string } | undefined;

export async function syncNow(): Promise<SyncState> {
  const session = await requireSession();
  const { t } = await getDictionary();
  if (session.mode === "demo") return { ok: t.settings.qbo.status.demo };
  try {
    const result = await runQboSync(createSupabaseAdminClient(), session.organizationId);
    revalidatePath("/app", "layout");
    if (!result) return { error: t.settings.qbo.status.expired };
    return { ok: t.settings.qbo.syncDone(result.customers, result.invoices, result.newlyPaid) };
  } catch {
    revalidatePath("/app/settings");
    return { error: t.settings.qbo.status.sync_error };
  }
}

export async function disconnectQbo() {
  const session = await requireSession();
  if (session.mode === "demo") return;
  const db = createSupabaseAdminClient();
  const { data: conn } = await db
    .from("qbo_connections")
    .select("refresh_token_encrypted")
    .eq("organization_id", session.organizationId)
    .maybeSingle();
  if (conn) {
    // Révoque l'accès chez Intuit (au mieux), puis efface les jetons de notre base
    await revokeToken(qboConfig(), decryptSecret(conn.refresh_token_encrypted)).catch(() => undefined);
    await db.from("qbo_connections").delete().eq("organization_id", session.organizationId);
  }
  revalidatePath("/app", "layout");
}
