"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { decryptSecret } from "@/lib/crypto";
import { isStripeConfigured, stripe } from "@/lib/billing/stripe";
import { qboConfig } from "@/lib/qbo/config";
import { revokeToken } from "@/lib/qbo/oauth";
import { requireSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export type OrgFormState = { ok?: boolean; error?: "invalidEmail" | "generic" } | undefined;

/** Nom d'expéditeur, adresse de réponse, langue par défaut, approbation J+30. */
export async function saveOrgSettings(_: OrgFormState, form: FormData): Promise<OrgFormState> {
  const session = await requireSession();
  const replyTo = String(form.get("replyTo") ?? "").trim();
  if (replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo)) return { error: "invalidEmail" };
  if (session.mode === "demo") return { ok: true };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      sender_name: String(form.get("senderName") ?? "").trim().slice(0, 120) || null,
      reply_to_email: replyTo || null,
      default_language: form.get("defaultLanguage") === "en" ? "en" : "fr",
      approval_required_from_day: form.get("approval") === "on" ? 30 : null,
    })
    .eq("id", session.organizationId);
  if (error) return { error: "generic" };
  revalidatePath("/app", "layout");
  return { ok: true };
}

/** Suppression définitive (Loi 25) : QuickBooks révoqué, données effacées, compte supprimé. */
export async function deleteAccount(_: unknown, form: FormData) {
  const session = await requireSession();
  const word = String(form.get("confirm") ?? "").trim().toUpperCase();
  if (word !== "SUPPRIMER" && word !== "DELETE") return { error: true };
  if (session.mode === "demo") redirect("/");

  const db = createSupabaseAdminClient();
  // Annuler l'abonnement d'abord : si Stripe échoue, on ne supprime rien,
  // sinon le client continuerait d'être facturé sans compte.
  const { data: sub } = await db
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("organization_id", session.organizationId)
    .maybeSingle();
  if (sub?.stripe_subscription_id && sub.status !== "canceled" && isStripeConfigured()) {
    try {
      await stripe().subscriptions.cancel(sub.stripe_subscription_id);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "resource_missing") return { error: true, billing: true };
    }
  }

  await disconnectQbo().catch(() => undefined);
  await db.rpc("delete_organization_data", { p_org: session.organizationId });
  await db.auth.admin.deleteUser(session.userId);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut().catch(() => undefined);
  redirect("/?deleted=1");
}
