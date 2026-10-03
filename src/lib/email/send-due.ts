import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingProvider } from "../accounting/types";
import { daysBetween, localDate } from "../engine/dates";
import { revalidateBeforeSend, skipReason, type Lang, type Tone } from "../engine/engine";
import { isSubscriptionActive } from "../engine/plan-db";
import { invoiceStatus } from "../sync/rows";
import { renderEmail } from "./render";
import { formatFrom, type EmailSender } from "./sender";

const toCents = (v: string | number) => Math.round(Number(v) * 100);

export interface SendDeps {
  db: SupabaseClient;
  provider: AccountingProvider | null;
  sender: EmailSender;
  fromAddress: string;
  appUrl: string;
  now?: Date;
}

export interface SendResult { sent: number; cancelled: number; failed: number; deferred: number }

/** Envoie les relances planifiées d'une organisation dont la date est arrivée. */
export async function sendDueReminders(orgId: string, deps: SendDeps): Promise<SendResult> {
  const { db } = deps;
  const now = deps.now ?? new Date();
  const result: SendResult = { sent: 0, cancelled: 0, failed: 0, deferred: 0 };

  const { data: org, error: orgErr } = await db
    .from("organizations").select("name, sender_name, reply_to_email, timezone").eq("id", orgId).single();
  if (orgErr) throw orgErr;
  const today = localDate(org.timezone, now);

  const { data: due, error } = await db
    .from("reminders").select("id, customer_id, scheduled_for, tone, language")
    .eq("organization_id", orgId).eq("status", "scheduled");
  if (error) throw error;
  const ready = due.filter((r) => r.scheduled_for <= today);
  if (!ready.length) return result;

  const { data: sub } = await db.from("subscriptions").select("status, trial_ends_at").eq("organization_id", orgId).maybeSingle();
  const subscriptionActive = isSubscriptionActive(sub, now);

  for (const r of ready) {
    // Réservation atomique : une seule exécution peut passer « scheduled » → « sending »
    const { data: claimed } = await db
      .from("reminders").update({ status: "sending" }).eq("id", r.id).eq("status", "scheduled").select("id");
    if (!claimed?.length) continue;

    const cancel = async (reason: string) => {
      await db.from("reminders").update({ status: "cancelled", cancel_reason: reason }).eq("id", r.id);
      result.cancelled++;
    };

    try {
      const { data: customer } = await db
        .from("customers")
        .select("id, display_name, contact_name, email, cc_email, excluded, paused_until, paused_indefinitely, unsubscribed_at, unsubscribe_token")
        .eq("id", r.customer_id).single();
      if (!customer) { await cancel("customer_missing"); continue; }
      const reason = skipReason(
        {
          id: customer.id, email: customer.email, ccEmail: customer.cc_email, language: null, excluded: customer.excluded,
          pausedUntil: customer.paused_until, pausedIndefinitely: customer.paused_indefinitely,
          unsubscribedAt: customer.unsubscribed_at, sequenceId: null,
        },
        today,
        subscriptionActive,
      );
      if (reason) { await cancel(reason); continue; }

      // Sans accès à QuickBooks, impossible de garantir que la facture n'est pas payée : on reporte
      if (!deps.provider) {
        await db.from("reminders").update({ status: "scheduled", error: "accounting_unavailable" }).eq("id", r.id);
        result.deferred++;
        continue;
      }

      const { data: itemRows } = await db
        .from("reminder_items").select("invoice_id, sequence_step_id, step_offset_days").eq("reminder_id", r.id);
      const { data: invoiceRows } = await db
        .from("invoices").select("id, qbo_id, doc_number, due_date, balance, status, invoice_link")
        .eq("customer_id", r.customer_id).eq("status", "open");
      const items = itemRows ?? [];
      const invoices = invoiceRows ?? [];
      const invById = new Map(invoices.map((i) => [i.id, i]));

      // Relecture à la source, juste avant l'envoi
      const fresh = new Map<string, { balanceCents: number; status: "open" | "paid" | "voided" } | null>();
      for (const item of items) {
        const local = invById.get(item.invoice_id);
        const ext = local ? await deps.provider.getInvoice(local.qbo_id) : null;
        if (!ext) { fresh.set(item.invoice_id, null); continue; }
        const status = invoiceStatus(ext);
        fresh.set(item.invoice_id, { balanceCents: ext.balanceCents, status });
        if (status !== "open" || ext.balanceCents !== toCents(local!.balance)) {
          await db.from("invoices").update({
            status, balance: (Math.max(0, ext.balanceCents) / 100).toFixed(2),
            paid_at: status === "paid" && ext.paidDate ? `${ext.paidDate}T12:00:00Z` : null,
          }).eq("id", item.invoice_id);
          if (local) local.balance = (ext.balanceCents / 100).toFixed(2);
        }
      }
      const { keep, cancel: allPaid } = revalidateBeforeSend(
        items.map((i) => ({ ...i, invoiceId: i.invoice_id as string })),
        fresh,
      );
      if (allPaid) { await cancel("paid"); continue; }

      // Textes : ceux de l'étape la plus avancée couverte par ce courriel
      const lead = [...keep].sort((a, b) => (b.step_offset_days ?? 0) - (a.step_offset_days ?? 0))[0];
      const lang = r.language as Lang;
      const { data: step } = lead.sequence_step_id
        ? await db.from("sequence_steps").select("subject_fr, body_fr, subject_en, body_en").eq("id", lead.sequence_step_id).maybeSingle()
        : { data: null };
      const custom = step ? { subject: lang === "fr" ? step.subject_fr : step.subject_en, body: lang === "fr" ? step.body_fr : step.body_en } : null;

      // Le courriel liste les factures visées + les autres factures en retard du client
      const keptIds = new Set(keep.map((k) => k.invoice_id));
      const itemIds = new Set(items.map((i) => i.invoice_id));
      const listed = invoices
        .filter((i) => keptIds.has(i.id) || (!itemIds.has(i.id) && daysBetween(i.due_date, today) > 0))
        .map((i) => ({
          number: i.doc_number, amountCents: toCents(i.balance), dueDate: i.due_date,
          daysOverdue: daysBetween(i.due_date, today), paymentLink: i.invoice_link,
        }));

      const companyName = org.sender_name || org.name || "";
      const unsubscribeUrl = `${deps.appUrl}/u/${customer.unsubscribe_token}`;
      const email = renderEmail({
        language: lang, tone: r.tone as Tone, clientName: customer.contact_name || customer.display_name,
        companyName, invoices: listed, custom, unsubscribeUrl,
      });

      // Les factures retirées (payées entre-temps) ne figurent plus dans l'historique de cet envoi
      const droppedIds = items.filter((i) => !keptIds.has(i.invoice_id)).map((i) => i.invoice_id);
      if (droppedIds.length) await db.from("reminder_items").delete().eq("reminder_id", r.id).in("invoice_id", droppedIds);

      const { id: messageId } = await deps.sender.send({
        from: formatFrom(companyName, deps.fromAddress),
        replyTo: org.reply_to_email,
        to: customer.email,
        cc: customer.cc_email,
        subject: email.subject,
        html: email.html,
        text: email.text,
        idempotencyKey: `reminder-${r.id}`,
        unsubscribeUrl,
      });

      await db.from("reminders").update({
        status: "sent", sent_at: new Date().toISOString(), subject: email.subject, body_text: email.text,
        body_html: email.html, provider_message_id: messageId, to_email: customer.email, cc_email: customer.cc_email, error: null,
      }).eq("id", r.id);
      await db.from("email_events").insert({
        organization_id: orgId, reminder_id: r.id, customer_id: customer.id, type: "sent",
        provider: deps.sender.name, provider_message_id: messageId, recipient: customer.email,
      });
      result.sent++;
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 500) : String(e);
      await db.from("reminders").update({ status: "failed", error: message }).eq("id", r.id);
      await db.from("email_events").insert({
        organization_id: orgId, reminder_id: r.id, customer_id: r.customer_id, type: "failed",
        provider: deps.sender.name, payload: { error: message },
      });
      result.failed++;
    }
  }
  return result;
}
