"use server";
import { revalidatePath } from "next/cache";
import { readDemoOverrides, writeDemoOverrides } from "@/lib/data/load";
import { addDays, localDate } from "@/lib/engine/dates";
import { requireSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CustomerPatch = {
  language?: "fr" | "en" | null;
  excluded?: boolean;
  pausedUntil?: string | null;
  pausedIndefinitely?: boolean;
  ccEmail?: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Réglages de relance d'un client (langue, exclusion, pause, copie). */
export async function updateCustomer(customerId: string, patch: CustomerPatch) {
  const session = await requireSession();
  if (patch.ccEmail !== undefined && patch.ccEmail !== null) {
    patch.ccEmail = patch.ccEmail.trim() || null;
    if (patch.ccEmail && !EMAIL.test(patch.ccEmail)) return { ok: false as const };
  }

  if (session.mode === "demo") {
    const o = await readDemoOverrides();
    o.customers = { ...o.customers, [customerId]: { ...o.customers?.[customerId], ...patch } };
    await writeDemoOverrides(o);
  } else {
    const supabase = await createSupabaseServerClient();
    const row: Record<string, unknown> = {};
    if (patch.language !== undefined) row.language = patch.language;
    if (patch.excluded !== undefined) row.excluded = patch.excluded;
    if (patch.pausedUntil !== undefined) row.paused_until = patch.pausedUntil;
    if (patch.pausedIndefinitely !== undefined) row.paused_indefinitely = patch.pausedIndefinitely;
    if (patch.ccEmail !== undefined) row.cc_email = patch.ccEmail;
    // RLS : seul un client de sa propre organisation peut être modifié
    const { error } = await supabase.from("customers").update(row).eq("id", customerId);
    if (error) return { ok: false as const };
  }
  revalidatePath("/app", "layout");
  return { ok: true as const };
}

export async function pauseCustomer30(customerId: string) {
  return updateCustomer(customerId, { pausedUntil: addDays(localDate("America/Toronto"), 30), pausedIndefinitely: false });
}

export async function resumeCustomer(customerId: string) {
  return updateCustomer(customerId, { pausedUntil: null, pausedIndefinitely: false });
}

/** Approuve ou refuse des relances en attente (J+30 et plus). */
export async function decideReminders(ids: string[], decision: "approved" | "rejected") {
  const session = await requireSession();
  if (!ids.length) return;
  if (session.mode === "demo") {
    const o = await readDemoOverrides();
    o.approvals = { ...o.approvals, ...Object.fromEntries(ids.map((id) => [id, decision])) };
    await writeDemoOverrides(o);
  } else {
    const db = createSupabaseAdminClient();
    const values = decision === "approved"
      ? { status: "scheduled", approved_at: new Date().toISOString(), approved_by: session.userId }
      : { status: "cancelled", cancel_reason: "rejected" };
    // Filtre explicite par organisation : le client service_role contourne la RLS
    await db.from("reminders").update(values)
      .eq("organization_id", session.organizationId).eq("status", "pending_approval").in("id", ids);
  }
  revalidatePath("/app", "layout");
}
