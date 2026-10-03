import "server-only";
import { cookies } from "next/headers";
import { localDate } from "../engine/dates";
import { isSubscriptionActive } from "../engine/plan-db";
import type { AppSession } from "../session";
import { createSupabaseServerClient } from "../supabase/server";
import { buildDemoSnapshot, type DemoOverrides } from "./demo-snapshot";
import type { Snapshot } from "./snapshot";

export const DEMO_STATE_COOKIE = "demo_state";
const cents = (v: string | number | null) => Math.round(Number(v ?? 0) * 100);

export async function readDemoOverrides(): Promise<DemoOverrides> {
  try {
    return JSON.parse((await cookies()).get(DEMO_STATE_COOKIE)?.value ?? "{}") as DemoOverrides;
  } catch {
    return {};
  }
}

export async function writeDemoOverrides(next: DemoOverrides) {
  (await cookies()).set(DEMO_STATE_COOKIE, JSON.stringify(next), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
}

/** Données de l'organisation courante (démo ou réelle, sous RLS). */
export async function loadSnapshot(session: AppSession): Promise<Snapshot> {
  if (session.mode === "demo") return buildDemoSnapshot(localDate("America/Toronto"), await readDemoOverrides());

  const db = await createSupabaseServerClient();
  const since = new Date(Date.now() - 400 * 86_400_000).toISOString().slice(0, 10);
  const [org, seq, steps, customers, invoices, reminders, items, events, sub] = await Promise.all([
    db.from("organizations").select("name, sender_name, default_language, approval_required_from_day, timezone").single(),
    db.from("sequences").select("id").eq("is_default", true).maybeSingle(),
    db.from("sequence_steps").select("id, sequence_id, offset_days, tone, is_active"),
    db.from("customers").select("id, display_name, contact_name, email, cc_email, language, excluded, paused_until, paused_indefinitely, unsubscribed_at, sequence_id"),
    // Factures ouvertes + factures payées récentes (statistiques)
    db.from("invoices").select("id, customer_id, doc_number, issue_date, due_date, total_amount, balance, status, paid_at, invoice_link")
      .or(`status.eq.open,issue_date.gte.${since}`),
    db.from("reminders").select("id, customer_id, scheduled_for, tone, language, status, to_email, subject, sent_at, cancel_reason")
      .gte("scheduled_for", since),
    db.from("reminder_items").select("reminder_id, invoice_id, sequence_step_id, step_offset_days, amount_due, days_overdue"),
    db.from("email_events").select("id, reminder_id, customer_id, type, recipient, occurred_at")
      .gte("occurred_at", since).order("occurred_at", { ascending: false }).limit(2000),
    db.from("subscriptions").select("status, trial_ends_at").maybeSingle(),
  ]);
  const o = org.data!;
  const tz = o.timezone ?? "America/Toronto";

  return {
    today: localDate(tz),
    org: { name: o.sender_name || o.name, defaultLanguage: o.default_language, approvalFromDay: o.approval_required_from_day, timezone: tz },
    subscriptionActive: isSubscriptionActive(sub.data, new Date()),
    defaultSequenceId: seq.data?.id ?? "",
    steps: (steps.data ?? []).map((s) => ({ id: s.id, sequenceId: s.sequence_id, offsetDays: s.offset_days, tone: s.tone, active: s.is_active })),
    customers: (customers.data ?? []).map((c) => ({
      id: c.id, displayName: c.display_name, contactName: c.contact_name, email: c.email, ccEmail: c.cc_email,
      language: c.language, excluded: c.excluded, pausedUntil: c.paused_until, pausedIndefinitely: c.paused_indefinitely,
      unsubscribedAt: c.unsubscribed_at, sequenceId: c.sequence_id,
    })),
    invoices: (invoices.data ?? []).map((i) => ({
      id: i.id, customerId: i.customer_id, docNumber: i.doc_number, issueDate: i.issue_date, dueDate: i.due_date,
      totalCents: cents(i.total_amount), balanceCents: cents(i.balance), status: i.status,
      paidAt: i.paid_at ? String(i.paid_at).slice(0, 10) : null, invoiceLink: i.invoice_link,
    })),
    reminders: (reminders.data ?? []).map((r) => ({
      id: r.id, customerId: r.customer_id, scheduledFor: r.scheduled_for, tone: r.tone, language: r.language,
      status: r.status, toEmail: r.to_email, subject: r.subject, sentAt: r.sent_at, cancelReason: r.cancel_reason,
    })),
    items: (items.data ?? []).map((i) => ({
      reminderId: i.reminder_id, invoiceId: i.invoice_id, stepId: i.sequence_step_id, stepOffsetDays: i.step_offset_days,
      amountCents: cents(i.amount_due), daysOverdue: i.days_overdue,
    })),
    events: (events.data ?? []).map((e) => ({
      id: e.id, reminderId: e.reminder_id, customerId: e.customer_id, type: e.type, recipient: e.recipient, occurredAt: e.occurred_at,
    })),
  };
}
