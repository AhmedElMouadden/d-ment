import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { SupabaseClient } from "@supabase/supabase-js";
import { createFakeDb } from "../testing/fake-db";
import { isSubscriptionActive, planForOrganization } from "./plan-db";

const NOW = new Date("2026-10-08T14:00:00Z"); // 8 octobre, 10 h à Montréal

function seed() {
  const steps = [[-3, "courteous"], [1, "courteous"], [7, "courteous"], [15, "firm"], [30, "firm"], [45, "final"]].map(
    ([o, t], i) => ({ id: `st${o}`, organization_id: "org", sequence_id: "seq", position: i + 1, offset_days: o, tone: t, is_active: true }),
  );
  return createFakeDb(
    {
      organizations: [{ id: "org", timezone: "America/Toronto", default_language: "fr", approval_required_from_day: 30 }],
      sequences: [{ id: "seq", organization_id: "org", is_default: true }],
      sequence_steps: steps,
      customers: [{ id: "c1", organization_id: "org", email: "a@x.ca", cc_email: null, language: null, excluded: false, paused_until: null, paused_indefinitely: false, unsubscribed_at: null, sequence_id: null }],
      invoices: [{ id: "i1", organization_id: "org", customer_id: "c1", doc_number: "1001", due_date: "2026-10-01", balance: "1500.00", status: "open" }],
      reminder_items: [],
      reminders: [],
      subscriptions: [{ organization_id: "org", status: "trialing", trial_ends_at: "2026-10-15T00:00:00Z" }],
    },
    { reminder_items: [["invoice_id", "sequence_step_id"]] },
  );
}
const asDb = (f: ReturnType<typeof createFakeDb>) => f as unknown as SupabaseClient;

describe("planification en base", () => {
  it("crée la relance J+7 avec sa ligne de facture", async () => {
    const db = seed();
    const res = await planForOrganization(asDb(db), "org", NOW);
    expect(res).toMatchObject({ today: "2026-10-08", created: 1 });
    expect(db.tables.reminders[0]).toMatchObject({ customer_id: "c1", status: "scheduled", tone: "courteous", language: "fr" });
    expect(db.tables.reminder_items[0]).toMatchObject({ invoice_id: "i1", sequence_step_id: "st7", amount_due: "1500.00", days_overdue: 7 });
  });

  it("est idempotente : relancer le cron le même jour ne crée rien", async () => {
    const db = seed();
    await planForOrganization(asDb(db), "org", NOW);
    const again = await planForOrganization(asDb(db), "org", NOW);
    expect(again.created).toBe(0);
    expect(db.tables.reminders).toHaveLength(1);
  });

  it("annule une relance en attente d'approbation si la facture est payée entre-temps", async () => {
    const db = seed();
    db.tables.subscriptions[0].status = "active";
    await planForOrganization(asDb(db), "org", new Date("2026-10-31T14:00:00Z")); // J+30
    expect(db.tables.reminders[0].status).toBe("pending_approval");
    db.tables.invoices[0].status = "paid";
    const res = await planForOrganization(asDb(db), "org", new Date("2026-11-01T14:00:00Z"));
    expect(res.cancelled).toBe(1);
    expect(db.tables.reminders[0]).toMatchObject({ status: "cancelled", cancel_reason: "paid" });
  });

  it("n'envoie rien quand l'essai est terminé sans abonnement", async () => {
    const res = await planForOrganization(asDb(seed()), "org", new Date("2026-10-16T14:00:00Z"));
    expect(res).toMatchObject({ created: 0, skipped: 1 });
  });

  it("évalue l'état de l'abonnement", () => {
    expect(isSubscriptionActive({ status: "active", trial_ends_at: null }, NOW)).toBe(true);
    expect(isSubscriptionActive({ status: "canceled", trial_ends_at: null }, NOW)).toBe(false);
    expect(isSubscriptionActive(null, NOW)).toBe(false);
  });
});
