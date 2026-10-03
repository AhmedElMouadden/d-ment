import { addDays, daysBetween } from "../engine/dates";
import { pairKey, planReminders, type Tone } from "../engine/engine";
import type { Snapshot, SnapInvoice } from "./snapshot";

export interface AgingBuckets { notDue: number; d0_30: number; d31_60: number; d61_90: number; d90plus: number }

export interface UpcomingReminder {
  date: string;
  customerId: string;
  customerName: string;
  tone: Tone;
  invoiceCount: number;
  amountCents: number;
  needsApproval: boolean;
}

export interface DashboardMetrics {
  receivableCents: number;
  overdueCents: number;
  openCount: number;
  aging: AgingBuckets;
  /** Délai moyen (jours) entre l'émission et le paiement, 90 derniers jours. */
  avgDaysToPay: number | null;
  /** Encaissé sur des factures relancées avant leur paiement, 90 derniers jours. */
  collectedAfterReminderCents: number;
  collectedAfterReminderCount: number;
  sentLast30: number;
  pendingApprovals: number;
  upcoming: UpcomingReminder[];
}

export const isOverdue = (i: SnapInvoice, today: string) => i.status === "open" && daysBetween(i.dueDate, today) > 0;

export function agingBuckets(invoices: SnapInvoice[], today: string): AgingBuckets {
  const b: AgingBuckets = { notDue: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 };
  for (const i of invoices) {
    if (i.status !== "open") continue;
    const d = daysBetween(i.dueDate, today);
    if (d <= 0) b.notDue += i.balanceCents;
    else if (d <= 30) b.d0_30 += i.balanceCents;
    else if (d <= 60) b.d31_60 += i.balanceCents;
    else if (d <= 90) b.d61_90 += i.balanceCents;
    else b.d90plus += i.balanceCents;
  }
  return b;
}

/** Projette les relances des `days` prochains jours avec le vrai moteur, sans rien écrire. */
export function projectUpcoming(s: Snapshot, days = 7): UpcomingReminder[] {
  const names = new Map(s.customers.map((c) => [c.id, c.displayName]));
  const out: UpcomingReminder[] = [];

  // Déjà planifiées (aujourd'hui) mais pas encore parties
  for (const r of s.reminders) {
    if (r.status !== "scheduled" && r.status !== "pending_approval") continue;
    const its = s.items.filter((i) => i.reminderId === r.id);
    out.push({
      date: r.scheduledFor, customerId: r.customerId, customerName: names.get(r.customerId) ?? "", tone: r.tone,
      invoiceCount: its.length, amountCents: its.reduce((t, i) => t + i.amountCents, 0), needsApproval: r.status === "pending_approval",
    });
  }

  const triggered = new Set(s.items.filter((i) => i.stepId).map((i) => pairKey(i.invoiceId, i.stepId!)));
  const sequences: Record<string, typeof s.steps> = {};
  for (const st of s.steps) (sequences[st.sequenceId] ??= []).push(st);

  for (let n = 1; n <= days; n++) {
    const day = addDays(s.today, n);
    const plan = planReminders({
      today: day, defaultLanguage: s.org.defaultLanguage, approvalFromDay: s.org.approvalFromDay,
      subscriptionActive: s.subscriptionActive, defaultSequenceId: s.defaultSequenceId, sequences,
      customers: s.customers, triggered,
      invoices: s.invoices.map((i) => ({ id: i.id, customerId: i.customerId, docNumber: i.docNumber, dueDate: i.dueDate, balanceCents: i.balanceCents, status: i.status })),
    });
    for (const r of plan.reminders) {
      for (const it of r.items) triggered.add(pairKey(it.invoiceId, it.stepId));
      out.push({
        date: day, customerId: r.customerId, customerName: names.get(r.customerId) ?? "", tone: r.tone,
        invoiceCount: r.items.length, amountCents: r.items.reduce((t, i) => t + i.amountCents, 0),
        needsApproval: r.status === "pending_approval",
      });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.customerName.localeCompare(b.customerName));
}

export function computeDashboard(s: Snapshot): DashboardMetrics {
  const open = s.invoices.filter((i) => i.status === "open");
  const since90 = addDays(s.today, -90);
  const paidRecent = s.invoices.filter((i) => i.status === "paid" && i.paidAt && i.paidAt >= since90);

  const firstSent = new Map<string, string>();
  const sentReminders = new Map(s.reminders.filter((r) => r.status === "sent").map((r) => [r.id, r.scheduledFor]));
  for (const it of s.items) {
    const d = sentReminders.get(it.reminderId);
    if (!d) continue;
    const prev = firstSent.get(it.invoiceId);
    if (!prev || d < prev) firstSent.set(it.invoiceId, d);
  }
  const afterReminder = paidRecent.filter((i) => {
    const sent = firstSent.get(i.id);
    return sent !== undefined && sent <= i.paidAt!;
  });

  const since30 = addDays(s.today, -30);
  return {
    receivableCents: open.reduce((t, i) => t + i.balanceCents, 0),
    overdueCents: open.filter((i) => isOverdue(i, s.today)).reduce((t, i) => t + i.balanceCents, 0),
    openCount: open.length,
    aging: agingBuckets(s.invoices, s.today),
    avgDaysToPay: paidRecent.length
      ? Math.round(paidRecent.reduce((t, i) => t + daysBetween(i.issueDate, i.paidAt!), 0) / paidRecent.length)
      : null,
    collectedAfterReminderCents: afterReminder.reduce((t, i) => t + i.totalCents, 0),
    collectedAfterReminderCount: afterReminder.length,
    sentLast30: s.reminders.filter((r) => r.status === "sent" && r.scheduledFor >= since30).length,
    pendingApprovals: s.reminders.filter((r) => r.status === "pending_approval").length,
    upcoming: projectUpcoming(s),
  };
}

export interface InvoiceHistoryEntry {
  date: string;
  kind: "issued" | "due" | "reminder" | "event" | "paid";
  tone?: Tone;
  status?: string;
  stepOffsetDays?: number | null;
  eventType?: string;
}

/** Chronologie d'une facture : émission, relances, événements de courriel, paiement. */
export function invoiceHistory(s: Snapshot, invoiceId: string): InvoiceHistoryEntry[] {
  const inv = s.invoices.find((i) => i.id === invoiceId);
  if (!inv) return [];
  const out: InvoiceHistoryEntry[] = [
    { date: inv.issueDate, kind: "issued" },
    { date: inv.dueDate, kind: "due" },
  ];
  for (const it of s.items.filter((i) => i.invoiceId === invoiceId)) {
    const r = s.reminders.find((x) => x.id === it.reminderId);
    if (!r) continue;
    // Ton de l'étape de CETTE facture (le courriel regroupé peut avoir un ton plus ferme)
    const stepTone = s.steps.find((st) => st.id === it.stepId)?.tone ?? r.tone;
    out.push({ date: r.sentAt?.slice(0, 10) ?? r.scheduledFor, kind: "reminder", tone: stepTone, status: r.status, stepOffsetDays: it.stepOffsetDays });
    for (const e of s.events.filter((x) => x.reminderId === r.id && x.type !== "sent")) {
      out.push({ date: e.occurredAt.slice(0, 10), kind: "event", eventType: e.type });
    }
  }
  if (inv.paidAt) out.push({ date: inv.paidAt, kind: "paid" });
  const rank = { issued: 0, due: 1, reminder: 2, event: 3, paid: 4 };
  return out.sort((a, b) => a.date.localeCompare(b.date) || rank[a.kind] - rank[b.kind]);
}
