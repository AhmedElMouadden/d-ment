import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingProvider, ExternalInvoice } from "../accounting/types";
import { planForOrganization } from "../engine/plan-db";
import { createFakeDb } from "../testing/fake-db";
import { sendDueReminders } from "./send-due";
import { MemorySender } from "./sender";

const NOW = new Date("2026-10-08T14:00:00Z"); // J+7 pour i1

function seed() {
  const steps = [[-3, "courteous"], [1, "courteous"], [7, "courteous"], [15, "firm"], [30, "firm"], [45, "final"]].map(
    ([o, t], i) => ({ id: `st${o}`, organization_id: "org", sequence_id: "seq", position: i + 1, offset_days: o, tone: t, is_active: true, subject_fr: null, body_fr: null, subject_en: null, body_en: null }),
  );
  return createFakeDb(
    {
      organizations: [{ id: "org", name: "Studio Bleu", sender_name: "Studio Bleu inc.", reply_to_email: "compta@studiobleu.ca", timezone: "America/Toronto", default_language: "fr", approval_required_from_day: 30 }],
      sequences: [{ id: "seq", organization_id: "org", is_default: true }],
      sequence_steps: steps,
      customers: [{ id: "c1", organization_id: "org", display_name: "Boulangerie", contact_name: "Marie-Ève", email: "a@x.ca", cc_email: "cfo@x.ca", language: null, excluded: false, paused_until: null, paused_indefinitely: false, unsubscribed_at: null, sequence_id: null, unsubscribe_token: "tok-1" }],
      invoices: [
        { id: "i1", organization_id: "org", customer_id: "c1", qbo_id: "q1", doc_number: "1001", due_date: "2026-10-01", balance: "1500.00", status: "open", invoice_link: "https://pay/1001" },
        { id: "i2", organization_id: "org", customer_id: "c1", qbo_id: "q2", doc_number: "1002", due_date: "2026-09-29", balance: "300.00", status: "open", invoice_link: null },
      ],
      reminder_items: [{ invoice_id: "i2", sequence_step_id: "st7", organization_id: "org" }], // i2 déjà relancée à J+7
      reminders: [],
      email_events: [],
      subscriptions: [{ organization_id: "org", status: "active", trial_ends_at: null }],
    },
    { reminder_items: [["invoice_id", "sequence_step_id"]] },
  );
}

const ext = (id: string, balanceCents: number): ExternalInvoice => ({
  externalId: id, customerExternalId: "x", docNumber: null, issueDate: "2026-09-01", dueDate: "2026-10-01",
  totalCents: 150_000, balanceCents, currency: "CAD", voided: false, paidDate: balanceCents ? null : "2026-10-07", invoiceLink: null,
});
const provider = (balances: Record<string, number>): AccountingProvider => ({
  kind: "qbo",
  getCompanyInfo: async () => ({ externalId: "r", name: "x", email: null }),
  listCustomers: async () => [],
  listInvoices: async () => [],
  getInvoice: async (id) => (id in balances ? ext(id, balances[id]) : null),
});
const asDb = (f: ReturnType<typeof createFakeDb>) => f as unknown as SupabaseClient;
const deps = (db: ReturnType<typeof createFakeDb>, p: AccountingProvider | null, sender = new MemorySender()) => ({
  db: asDb(db), provider: p, sender, fromAddress: "relances@dument.ca", appUrl: "https://app.dument.ca", now: NOW,
});

describe("envoi des relances", () => {
  it("envoie un seul courriel regroupé, au nom de l'entreprise, avec reply-to, copie et désinscription", async () => {
    const db = seed();
    await planForOrganization(asDb(db), "org", NOW);
    const sender = new MemorySender();
    const res = await sendDueReminders("org", deps(db, provider({ q1: 150_000, q2: 30_000 }), sender));
    expect(res).toMatchObject({ sent: 1, cancelled: 0, failed: 0 });
    const mail = sender.outbox[0];
    expect(mail).toMatchObject({ from: '"Studio Bleu inc." <relances@dument.ca>', replyTo: "compta@studiobleu.ca", to: "a@x.ca", cc: "cfo@x.ca" });
    expect(mail.text).toContain("1001");
    expect(mail.text).toContain("1002"); // autre facture en retard listée
    expect(mail.text).toContain("https://app.dument.ca/u/tok-1");
    expect(db.tables.reminders[0]).toMatchObject({ status: "sent", provider_message_id: "mem_1" });
    expect(db.tables.email_events).toHaveLength(1);
  });

  it("annule si la facture a été payée dans QuickBooks après la planification", async () => {
    const db = seed();
    await planForOrganization(asDb(db), "org", NOW);
    const sender = new MemorySender();
    const res = await sendDueReminders("org", deps(db, provider({ q1: 0, q2: 30_000 }), sender));
    expect(res.cancelled).toBe(1);
    expect(sender.outbox).toHaveLength(0);
    expect(db.tables.reminders[0]).toMatchObject({ status: "cancelled", cancel_reason: "paid" });
    expect(db.tables.invoices.find((i) => i.id === "i1")?.status).toBe("paid");
  });

  it("n'envoie jamais deux fois, même si l'envoi est relancé", async () => {
    const db = seed();
    await planForOrganization(asDb(db), "org", NOW);
    const sender = new MemorySender();
    await sendDueReminders("org", deps(db, provider({ q1: 150_000, q2: 30_000 }), sender));
    await sendDueReminders("org", deps(db, provider({ q1: 150_000, q2: 30_000 }), sender));
    expect(sender.outbox).toHaveLength(1);
  });

  it("annule si le client a été mis en pause entre la planification et l'envoi", async () => {
    const db = seed();
    await planForOrganization(asDb(db), "org", NOW);
    db.tables.customers[0].paused_indefinitely = true;
    const res = await sendDueReminders("org", deps(db, provider({ q1: 150_000 })));
    expect(res.cancelled).toBe(1);
    expect(db.tables.reminders[0].cancel_reason).toBe("paused");
  });

  it("reporte l'envoi si QuickBooks est inaccessible (aucun risque de relancer une facture payée)", async () => {
    const db = seed();
    await planForOrganization(asDb(db), "org", NOW);
    const res = await sendDueReminders("org", deps(db, null));
    expect(res.deferred).toBe(1);
    expect(db.tables.reminders[0].status).toBe("scheduled");
  });

  it("n'envoie pas une relance en attente d'approbation", async () => {
    const db = seed();
    await planForOrganization(asDb(db), "org", new Date("2026-10-31T14:00:00Z")); // J+30
    const sender = new MemorySender();
    await sendDueReminders("org", { ...deps(db, provider({ q1: 150_000, q2: 30_000 }), sender), now: new Date("2026-10-31T14:00:00Z") });
    expect(sender.outbox).toHaveLength(0);
    expect(db.tables.reminders[0].status).toBe("pending_approval");
  });

  it("marque l'envoi en échec et le journalise si le fournisseur refuse", async () => {
    const db = seed();
    await planForOrganization(asDb(db), "org", NOW);
    const failing = { name: "resend", send: async () => { throw new Error("Resend 422: invalid"); } };
    const res = await sendDueReminders("org", { ...deps(db, provider({ q1: 150_000, q2: 30_000 })), sender: failing });
    expect(res.failed).toBe(1);
    expect(db.tables.reminders[0]).toMatchObject({ status: "failed" });
    expect(db.tables.email_events[0]).toMatchObject({ type: "failed" });
  });
});
