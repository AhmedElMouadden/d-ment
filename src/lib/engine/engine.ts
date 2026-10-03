/**
 * Moteur de relance : fonctions pures, sans base ni réseau.
 *
 * Règles (voir PLAN.md §4) :
 *  - jours de retard r = aujourd'hui − échéance ;
 *  - étape due = la plus avancée des étapes actives avec offset ≤ r, si elle
 *    n'a jamais été déclenchée pour cette facture (aucun rattrapage des
 *    étapes plus anciennes, aucun doublon) ;
 *  - rien pour une facture payée/annulée, ni pour un client exclu, en pause,
 *    désinscrit ou sans courriel, ni si l'abonnement est inactif ;
 *  - un seul courriel par client et par jour, au ton le plus sévère ;
 *  - approbation requise si une étape couverte a offset ≥ seuil.
 */
import { daysBetween } from "./dates";

export type Tone = "courteous" | "firm" | "final";
export type Lang = "fr" | "en";

export interface EngineStep { id: string; offsetDays: number; tone: Tone; active: boolean }

export interface EngineCustomer {
  id: string;
  email: string | null;
  ccEmail: string | null;
  language: Lang | null;
  excluded: boolean;
  pausedUntil: string | null;
  pausedIndefinitely: boolean;
  unsubscribedAt: string | null;
  sequenceId: string | null;
}

export interface EngineInvoice {
  id: string;
  customerId: string;
  docNumber: string | null;
  dueDate: string;
  balanceCents: number;
  status: "open" | "paid" | "voided";
}

export interface EngineInput {
  today: string;
  defaultLanguage: Lang;
  /** null = approbation désactivée */
  approvalFromDay: number | null;
  subscriptionActive: boolean;
  defaultSequenceId: string;
  sequences: Record<string, EngineStep[]>;
  customers: EngineCustomer[];
  invoices: EngineInvoice[];
  /** Paires déjà déclenchées « factureId:étapeId » (tous statuts confondus). */
  triggered: Set<string>;
}

export interface PlannedItem {
  invoiceId: string;
  stepId: string;
  offsetDays: number;
  daysOverdue: number;
  amountCents: number;
}

export interface PlannedReminder {
  customerId: string;
  tone: Tone;
  language: Lang;
  status: "scheduled" | "pending_approval";
  toEmail: string;
  ccEmail: string | null;
  /** Factures dont une étape tombe aujourd'hui. */
  items: PlannedItem[];
  /** Autres factures en retard du client, listées dans le même courriel. */
  alsoOverdue: Array<{ invoiceId: string; daysOverdue: number; amountCents: number }>;
}

export type SkipReason = "excluded" | "paused" | "unsubscribed" | "no_email" | "subscription_inactive";

export interface EnginePlan {
  reminders: PlannedReminder[];
  skipped: Array<{ customerId: string; reason: SkipReason }>;
}

const TONE_RANK: Record<Tone, number> = { courteous: 0, firm: 1, final: 2 };

export const pairKey = (invoiceId: string, stepId: string) => `${invoiceId}:${stepId}`;

export function isOpen(inv: EngineInvoice) {
  return inv.status === "open" && inv.balanceCents > 0;
}

/** Étape qui s'applique aujourd'hui à une facture, ou null. */
export function dueStep(steps: EngineStep[], daysOverdue: number, invoiceId: string, triggered: Set<string>): EngineStep | null {
  let best: EngineStep | null = null;
  for (const s of steps) {
    if (!s.active || s.offsetDays > daysOverdue) continue;
    if (!best || s.offsetDays > best.offsetDays) best = s;
  }
  if (!best || triggered.has(pairKey(invoiceId, best.id))) return null;
  return best;
}

export function skipReason(c: EngineCustomer, today: string, subscriptionActive: boolean): SkipReason | null {
  if (!subscriptionActive) return "subscription_inactive";
  if (c.excluded) return "excluded";
  if (c.unsubscribedAt) return "unsubscribed";
  if (c.pausedIndefinitely || (c.pausedUntil !== null && c.pausedUntil >= today)) return "paused";
  if (!c.email) return "no_email";
  return null;
}

export function planReminders(input: EngineInput): EnginePlan {
  const byCustomer = new Map<string, EngineInvoice[]>();
  for (const inv of input.invoices) {
    if (!isOpen(inv)) continue;
    const list = byCustomer.get(inv.customerId) ?? [];
    list.push(inv);
    byCustomer.set(inv.customerId, list);
  }

  const plan: EnginePlan = { reminders: [], skipped: [] };
  const customers = [...input.customers].sort((a, b) => a.id.localeCompare(b.id));

  for (const customer of customers) {
    const invoices = byCustomer.get(customer.id);
    if (!invoices?.length) continue;
    const steps = input.sequences[customer.sequenceId ?? ""] ?? input.sequences[input.defaultSequenceId] ?? [];

    const items: PlannedItem[] = [];
    const alsoOverdue: PlannedReminder["alsoOverdue"] = [];
    for (const inv of [...invoices].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))) {
      const daysOverdue = daysBetween(inv.dueDate, input.today);
      const step = dueStep(steps, daysOverdue, inv.id, input.triggered);
      if (step) {
        items.push({ invoiceId: inv.id, stepId: step.id, offsetDays: step.offsetDays, daysOverdue, amountCents: inv.balanceCents });
      } else if (daysOverdue > 0) {
        alsoOverdue.push({ invoiceId: inv.id, daysOverdue, amountCents: inv.balanceCents });
      }
    }
    if (!items.length) continue;

    const reason = skipReason(customer, input.today, input.subscriptionActive);
    if (reason) {
      plan.skipped.push({ customerId: customer.id, reason });
      continue;
    }

    const tone = items.reduce<Tone>((t, i) => {
      const stepTone = steps.find((s) => s.id === i.stepId)!.tone;
      return TONE_RANK[stepTone] > TONE_RANK[t] ? stepTone : t;
    }, "courteous");
    const needsApproval = input.approvalFromDay !== null && items.some((i) => i.offsetDays >= input.approvalFromDay!);

    plan.reminders.push({
      customerId: customer.id,
      tone,
      language: customer.language ?? input.defaultLanguage,
      status: needsApproval ? "pending_approval" : "scheduled",
      toEmail: customer.email!,
      ccEmail: customer.ccEmail,
      items,
      alsoOverdue,
    });
  }
  return plan;
}

/**
 * Juste avant l'envoi : on relit chaque facture à la source. On retire celles
 * qui sont payées ou annulées ; s'il ne reste aucune facture visée par une
 * étape, la relance est annulée (« arrêt au paiement »).
 */
export function revalidateBeforeSend<T extends { invoiceId: string }>(
  items: T[],
  fresh: Map<string, { balanceCents: number; status: EngineInvoice["status"] } | null>,
): { keep: T[]; dropped: T[]; cancel: boolean } {
  const keep: T[] = [];
  const dropped: T[] = [];
  for (const item of items) {
    const f = fresh.get(item.invoiceId);
    if (f && f.status === "open" && f.balanceCents > 0) keep.push(item);
    else dropped.push(item);
  }
  return { keep, dropped, cancel: keep.length === 0 };
}
