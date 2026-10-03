import type { Lang, Tone } from "../engine/engine";

/**
 * Vue en mémoire des données d'une organisation. Le mode démo la fabrique,
 * le mode réel la charge depuis Supabase (sous RLS). Les écrans et les
 * indicateurs ne lisent que cette structure.
 */
export interface SnapCustomer {
  id: string;
  displayName: string;
  contactName: string | null;
  email: string | null;
  ccEmail: string | null;
  language: Lang | null;
  excluded: boolean;
  pausedUntil: string | null;
  pausedIndefinitely: boolean;
  unsubscribedAt: string | null;
  sequenceId: string | null;
}

export interface SnapInvoice {
  id: string;
  customerId: string;
  docNumber: string | null;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  balanceCents: number;
  status: "open" | "paid" | "voided";
  paidAt: string | null; // AAAA-MM-JJ
  invoiceLink: string | null;
}

export type ReminderStatus = "scheduled" | "pending_approval" | "sending" | "sent" | "cancelled" | "failed";

export interface SnapReminder {
  id: string;
  customerId: string;
  scheduledFor: string;
  tone: Tone;
  language: Lang;
  status: ReminderStatus;
  toEmail: string | null;
  subject: string | null;
  sentAt: string | null;
  cancelReason: string | null;
}

export interface SnapItem {
  reminderId: string;
  invoiceId: string;
  stepId: string | null;
  stepOffsetDays: number | null;
  amountCents: number;
  daysOverdue: number;
}

export interface SnapEvent {
  id: string;
  reminderId: string | null;
  customerId: string | null;
  type: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "unsubscribed" | "failed";
  recipient: string | null;
  occurredAt: string; // ISO
}

export interface SnapStep { id: string; sequenceId: string; offsetDays: number; tone: Tone; active: boolean }

export interface Snapshot {
  today: string;
  org: { name: string; defaultLanguage: Lang; approvalFromDay: number | null; timezone: string };
  subscriptionActive: boolean;
  defaultSequenceId: string;
  steps: SnapStep[];
  customers: SnapCustomer[];
  invoices: SnapInvoice[];
  reminders: SnapReminder[];
  items: SnapItem[];
  events: SnapEvent[];
}
