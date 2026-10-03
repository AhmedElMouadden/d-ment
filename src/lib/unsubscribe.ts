import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Client correspondant à un jeton de désinscription (page publique). */
export async function findByUnsubscribeToken(token: string) {
  if (!UUID.test(token)) return null;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("customers")
    .select("id, organization_id, email, language, unsubscribed_at, organizations(name, sender_name, default_language)")
    .eq("unsubscribe_token", token)
    .maybeSingle();
  return data;
}

/** Désinscrit le destinataire : plus aucune relance, et l'événement est journalisé. */
export async function unsubscribe(token: string): Promise<boolean> {
  const customer = await findByUnsubscribeToken(token);
  if (!customer) return false;
  if (customer.unsubscribed_at) return true;
  const db = createSupabaseAdminClient();
  await db.from("customers").update({ unsubscribed_at: new Date().toISOString() }).eq("id", customer.id);
  await db
    .from("reminders")
    .update({ status: "cancelled", cancel_reason: "unsubscribed" })
    .eq("customer_id", customer.id)
    .in("status", ["scheduled", "pending_approval"]);
  await db.from("email_events").insert({
    organization_id: customer.organization_id, customer_id: customer.id, type: "unsubscribed",
    provider: "dument", recipient: customer.email,
  });
  return true;
}
