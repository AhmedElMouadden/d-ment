import { generateDemoDataset } from "../demo/generate";
import { addDays } from "../engine/dates";
import { pairKey, planReminders, type EngineInput } from "../engine/engine";
import { DEFAULT_STEPS } from "../sequences/validate";
import type { Snapshot, SnapCustomer, SnapEvent, SnapInvoice, SnapItem, SnapReminder } from "./snapshot";

const SEQ = "demo-seq";

/** Réglages modifiés par le visiteur de la démo (gardés dans un cookie). */
export interface DemoOverrides {
  customers?: Record<string, Partial<Pick<SnapCustomer, "language" | "excluded" | "pausedUntil" | "pausedIndefinitely" | "ccEmail">>>;
  approvals?: Record<string, "approved" | "rejected">;
}

/**
 * Fabrique une organisation de démo réaliste en rejouant le vrai moteur de
 * relance sur les 240 derniers jours : l'historique, les montants encaissés
 * après relance et les relances à venir sont donc cohérents.
 */
export function buildDemoSnapshot(today: string, overrides: DemoOverrides = {}): Snapshot {
  const data = generateDemoDataset(today);
  const custId = (ext: string) => `cust-${ext}`;

  const customers: SnapCustomer[] = data.customers.map((c) => ({
    id: custId(c.externalId),
    displayName: c.displayName,
    contactName: c.contactName,
    email: c.email,
    ccEmail: c.ccEmail,
    language: c.language,
    excluded: c.excluded,
    pausedUntil: c.pausedUntil,
    pausedIndefinitely: false,
    unsubscribedAt: null,
    sequenceId: null,
    ...overrides.customers?.[custId(c.externalId)],
  }));

  const invoices: SnapInvoice[] = data.invoices.map((i) => ({
    id: `inv-${i.externalId}`,
    customerId: custId(i.customerExternalId),
    docNumber: i.docNumber,
    issueDate: i.issueDate,
    dueDate: i.dueDate,
    totalCents: i.totalCents,
    balanceCents: i.balanceCents,
    status: i.balanceCents > 0 ? "open" : "paid",
    paidAt: i.paidDate,
    invoiceLink: i.invoiceLink,
  }));

  const steps = DEFAULT_STEPS.map((s) => ({ id: s.id!, sequenceId: SEQ, offsetDays: s.offsetDays, tone: s.tone, active: true }));
  const reminders: SnapReminder[] = [];
  const items: SnapItem[] = [];
  const events: SnapEvent[] = [];
  const triggered = new Set<string>();
  const org = { name: data.company.name, defaultLanguage: "fr" as const, approvalFromDay: 30, timezone: "America/Toronto" };

  // Rejoue chaque journée : une facture est « ouverte » jusqu'à sa date de paiement
  const start = addDays(today, -240); // avant la plus ancienne facture : aucune étape « rattrapée »
  for (let day = start; day <= today; day = addDays(day, 1)) {
    const isToday = day === today;
    const input: EngineInput = {
      today: day,
      defaultLanguage: "fr",
      // Dans le passé, on considère les approbations données (historique réaliste)
      approvalFromDay: isToday ? org.approvalFromDay : null,
      subscriptionActive: true,
      defaultSequenceId: SEQ,
      sequences: { [SEQ]: steps },
      // Historique : réglages d'origine ; aujourd'hui : réglages du visiteur
      customers: (isToday ? customers : customers.map((c) => ({ ...c, pausedUntil: null }))).map((c) => ({ ...c })),
      invoices: invoices
        .filter((i) => i.issueDate <= day)
        .map((i) => ({
          id: i.id, customerId: i.customerId, docNumber: i.docNumber, dueDate: i.dueDate,
          balanceCents: i.totalCents, status: i.paidAt && i.paidAt <= day ? "paid" : "open",
        })),
      triggered,
    };
    for (const r of planReminders(input).reminders) {
      const id = `rem-${reminders.length + 1}`;
      const decision = overrides.approvals?.[id];
      const status: SnapReminder["status"] = !isToday
        ? "sent"
        : r.status === "pending_approval"
          ? decision === "approved" ? "scheduled" : decision === "rejected" ? "cancelled" : "pending_approval"
          : "scheduled";
      reminders.push({
        id, customerId: r.customerId, scheduledFor: day, tone: r.tone, language: r.language, status,
        toEmail: r.toEmail, subject: null, sentAt: status === "sent" ? `${day}T13:00:00Z` : null,
        cancelReason: status === "cancelled" ? "rejected" : null,
      });
      for (const it of r.items) {
        triggered.add(pairKey(it.invoiceId, it.stepId));
        items.push({ reminderId: id, invoiceId: it.invoiceId, stepId: it.stepId, stepOffsetDays: it.offsetDays, amountCents: it.amountCents, daysOverdue: it.daysOverdue });
      }
      if (status === "sent") {
        const n = reminders.length;
        events.push({ id: `ev-${events.length + 1}`, reminderId: id, customerId: r.customerId, type: "sent", recipient: r.toEmail, occurredAt: `${day}T13:00:00Z` });
        events.push({ id: `ev-${events.length + 1}`, reminderId: id, customerId: r.customerId, type: "delivered", recipient: r.toEmail, occurredAt: `${day}T13:00:04Z` });
        if (n % 3 !== 0) events.push({ id: `ev-${events.length + 1}`, reminderId: id, customerId: r.customerId, type: "opened", recipient: r.toEmail, occurredAt: `${day}T15:${String(10 + (n % 40)).padStart(2, "0")}:00Z` });
      }
    }
  }

  return {
    today, org, subscriptionActive: true, defaultSequenceId: SEQ, steps,
    customers, invoices, reminders, items, events,
  };
}
