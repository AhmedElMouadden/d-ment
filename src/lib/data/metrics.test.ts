import { describe, expect, it } from "vitest";
import { daysBetween } from "../engine/dates";
import { buildDemoSnapshot } from "./demo-snapshot";
import { agingBuckets, computeDashboard, invoiceHistory } from "./metrics";
import type { SnapInvoice } from "./snapshot";

const TODAY = "2026-10-03";
const inv = (o: Partial<SnapInvoice>): SnapInvoice => ({
  id: "i", customerId: "c", docNumber: "1", issueDate: "2026-08-01", dueDate: "2026-09-01",
  totalCents: 1000, balanceCents: 1000, status: "open", paidAt: null, invoiceLink: null, ...o,
});

describe("indicateurs du tableau de bord", () => {
  it("répartit la balance âgée aux bonnes bornes (30/31, 60/61, 90/91)", () => {
    const b = agingBuckets([
      inv({ dueDate: "2026-10-05" }),               // à échoir
      inv({ dueDate: "2026-09-03" }),               // 30 j
      inv({ dueDate: "2026-09-02" }),               // 31 j
      inv({ dueDate: "2026-08-04" }),               // 60 j
      inv({ dueDate: "2026-08-03" }),               // 61 j
      inv({ dueDate: "2026-07-05" }),               // 90 j
      inv({ dueDate: "2026-07-04" }),               // 91 j
      inv({ dueDate: "2026-01-01", status: "paid", balanceCents: 0 }),
    ], TODAY);
    expect(b).toEqual({ notDue: 1000, d0_30: 1000, d31_60: 2000, d61_90: 2000, d90plus: 1000 });
  });

  it("calcule les chiffres de la démo de façon cohérente avec les données", () => {
    const s = buildDemoSnapshot(TODAY);
    const m = computeDashboard(s);
    const open = s.invoices.filter((i) => i.status === "open");
    expect(m.receivableCents).toBe(open.reduce((t, i) => t + i.balanceCents, 0));
    const a = m.aging;
    expect(a.notDue + a.d0_30 + a.d31_60 + a.d61_90 + a.d90plus).toBe(m.receivableCents);
    expect(m.avgDaysToPay).toBeGreaterThan(10);
    expect(m.collectedAfterReminderCents).toBeGreaterThan(0);
    expect(m.sentLast30).toBeGreaterThan(0);
    expect(m.upcoming.length).toBeGreaterThan(0);
  });

  it("ne compte « encaissé après relance » que si la relance précède le paiement", () => {
    const s = buildDemoSnapshot(TODAY);
    const m = computeDashboard(s);
    // recalcul manuel indépendant
    let manual = 0;
    for (const i of s.invoices.filter((x) => x.paidAt && daysBetween(x.paidAt, TODAY) <= 90)) {
      const sentDays = s.items.filter((it) => it.invoiceId === i.id)
        .map((it) => s.reminders.find((r) => r.id === it.reminderId)!)
        .filter((r) => r.status === "sent").map((r) => r.scheduledFor);
      if (sentDays.some((d) => d <= i.paidAt!)) manual += i.totalCents;
    }
    expect(m.collectedAfterReminderCents).toBe(manual);
  });

  it("met en attente d'approbation les relances J+30 et plus du jour dans la démo", () => {
    const s = buildDemoSnapshot(TODAY);
    expect(s.reminders.some((r) => r.status === "pending_approval")).toBe(true);
    const id = s.reminders.find((r) => r.status === "pending_approval")!.id;
    const approved = buildDemoSnapshot(TODAY, { approvals: { [id]: "approved" } });
    expect(approved.reminders.find((r) => r.id === id)?.status).toBe("scheduled");
  });

  it("ne relance jamais le client exclu de la démo, ni la facture d'un client mis en pause aujourd'hui", () => {
    const s = buildDemoSnapshot(TODAY);
    const excluded = s.customers.find((c) => c.excluded)!;
    expect(s.reminders.some((r) => r.customerId === excluded.id)).toBe(false);
    const paused = s.customers.find((c) => c.pausedUntil)!;
    expect(s.reminders.some((r) => r.customerId === paused.id && r.scheduledFor === TODAY)).toBe(false);
  });

  it("produit une chronologie ordonnée pour une facture relancée", () => {
    const s = buildDemoSnapshot(TODAY);
    const target = s.items.find((i) => s.reminders.find((r) => r.id === i.reminderId)?.status === "sent")!;
    const h = invoiceHistory(s, target.invoiceId);
    expect(h[0].kind).toBe("issued");
    expect(h.some((e) => e.kind === "reminder")).toBe(true);
    expect([...h].map((e) => e.date)).toEqual([...h].map((e) => e.date).sort());
  });
});
