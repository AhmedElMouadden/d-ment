import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { localDate } from "./dates";
import {
  pairKey, planReminders,
  type EngineCustomer, type EngineInvoice, type EngineStep, type Lang, type PlannedReminder,
} from "./engine";

const toCents = (v: string | number) => Math.round(Number(v) * 100);

export function isSubscriptionActive(sub: { status: string; trial_ends_at: string | null } | null, now: Date): boolean {
  if (!sub) return false;
  if (sub.status === "active" || sub.status === "past_due") return true;
  return sub.status === "trialing" && !!sub.trial_ends_at && Date.parse(sub.trial_ends_at) > now.getTime();
}

/** Charge l'état d'une organisation et le traduit pour le moteur. `db` : service_role. */
export async function loadEngineInput(db: SupabaseClient, orgId: string, now: Date) {
  const [org, seqs, steps, customers, invoices, items, sub] = await Promise.all([
    db.from("organizations").select("timezone, default_language, approval_required_from_day").eq("id", orgId).single(),
    db.from("sequences").select("id, is_default").eq("organization_id", orgId),
    db.from("sequence_steps").select("id, sequence_id, offset_days, tone, is_active").eq("organization_id", orgId),
    db.from("customers")
      .select("id, email, cc_email, language, excluded, paused_until, paused_indefinitely, unsubscribed_at, sequence_id")
      .eq("organization_id", orgId),
    db.from("invoices").select("id, customer_id, doc_number, due_date, balance, status").eq("organization_id", orgId).eq("status", "open"),
    db.from("reminder_items").select("invoice_id, sequence_step_id").eq("organization_id", orgId),
    db.from("subscriptions").select("status, trial_ends_at").eq("organization_id", orgId).maybeSingle(),
  ]);
  for (const r of [org, seqs, steps, customers, invoices, items, sub]) if (r.error) throw r.error;

  const sequences: Record<string, EngineStep[]> = {};
  for (const s of steps.data!) {
    (sequences[s.sequence_id] ??= []).push({ id: s.id, offsetDays: s.offset_days, tone: s.tone, active: s.is_active });
  }
  const today = localDate(org.data!.timezone, now);
  return {
    today,
    defaultLanguage: org.data!.default_language as Lang,
    approvalFromDay: org.data!.approval_required_from_day as number | null,
    subscriptionActive: isSubscriptionActive(sub.data, now),
    defaultSequenceId: seqs.data!.find((s) => s.is_default)?.id ?? "",
    sequences,
    customers: customers.data!.map((c): EngineCustomer => ({
      id: c.id, email: c.email, ccEmail: c.cc_email, language: c.language, excluded: c.excluded,
      pausedUntil: c.paused_until, pausedIndefinitely: c.paused_indefinitely, unsubscribedAt: c.unsubscribed_at, sequenceId: c.sequence_id,
    })),
    invoices: invoices.data!.map((i): EngineInvoice => ({
      id: i.id, customerId: i.customer_id, docNumber: i.doc_number, dueDate: i.due_date, balanceCents: toCents(i.balance), status: i.status,
    })),
    triggered: new Set(items.data!.filter((i) => i.sequence_step_id).map((i) => pairKey(i.invoice_id, i.sequence_step_id))),
  };
}

/** Enregistre une relance planifiée. L'index unique (facture, étape) bloque tout doublon. */
async function saveReminder(db: SupabaseClient, orgId: string, today: string, r: PlannedReminder): Promise<boolean> {
  const { data: reminder, error } = await db
    .from("reminders")
    .insert({
      organization_id: orgId, customer_id: r.customerId, scheduled_for: today, tone: r.tone,
      language: r.language, status: r.status, to_email: r.toEmail, cc_email: r.ccEmail,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: itemsErr } = await db.from("reminder_items").insert(
    r.items.map((i) => ({
      organization_id: orgId, reminder_id: reminder!.id, invoice_id: i.invoiceId, sequence_step_id: i.stepId,
      step_offset_days: i.offsetDays, amount_due: (i.amountCents / 100).toFixed(2), days_overdue: i.daysOverdue,
    })),
  );
  if (itemsErr) {
    // Une autre exécution a déjà planifié cette étape : on retire notre relance vide
    await db.from("reminders").delete().eq("id", reminder!.id);
    if (itemsErr.code === "23505") return false;
    throw itemsErr;
  }
  return true;
}

/**
 * Annule les relances pas encore parties dont toutes les factures visées
 * sont payées ou annulées (arrêt immédiat, y compris pendant l'approbation).
 */
export async function cancelPaidReminders(db: SupabaseClient, orgId: string): Promise<number> {
  const { data: pending, error } = await db
    .from("reminders")
    .select("id, status")
    .eq("organization_id", orgId)
    .in("status", ["scheduled", "pending_approval"]);
  if (error) throw error;
  if (!pending.length) return 0;

  const ids = pending.map((p) => p.id);
  const { data: items } = await db.from("reminder_items").select("reminder_id, invoice_id").in("reminder_id", ids);
  const invoiceIds = [...new Set((items ?? []).map((i) => i.invoice_id))];
  const { data: openInv } = invoiceIds.length
    ? await db.from("invoices").select("id").in("id", invoiceIds).eq("status", "open")
    : { data: [] as { id: string }[] };
  const open = new Set((openInv ?? []).map((i) => i.id));

  const toCancel = ids.filter((id) => !(items ?? []).some((i) => i.reminder_id === id && open.has(i.invoice_id)));
  if (toCancel.length) {
    await db.from("reminders").update({ status: "cancelled", cancel_reason: "paid" }).in("id", toCancel);
  }
  return toCancel.length;
}

export async function planForOrganization(db: SupabaseClient, orgId: string, now = new Date()) {
  const cancelled = await cancelPaidReminders(db, orgId);
  const input = await loadEngineInput(db, orgId, now);
  const plan = planReminders(input);
  let created = 0;
  for (const r of plan.reminders) if (await saveReminder(db, orgId, input.today, r)) created++;
  return { today: input.today, created, cancelled, skipped: plan.skipped.length };
}
