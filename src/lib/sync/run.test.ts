import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingProvider, ExternalInvoice } from "../accounting/types";
import { DemoProvider } from "../demo/provider";
import { createFakeDb } from "../testing/fake-db";
import { syncOrganization } from "./run";

const TODAY = "2026-10-03";
const asDb = (f: ReturnType<typeof createFakeDb>) => f as unknown as SupabaseClient;

describe("synchronisation", () => {
  it("importe les clients et factures de la démo", async () => {
    const fake = createFakeDb();
    const provider = new DemoProvider(TODAY);
    const res = await syncOrganization(asDb(fake), "org1", provider);
    expect(res.customers).toBe(12);
    expect(fake.tables.invoices.length).toBe((await provider.listInvoices()).length);
    expect(fake.tables.invoices.every((i) => i.organization_id === "org1")).toBe(true);
  });

  it("garde les réglages du client d'une synchro à l'autre", async () => {
    const fake = createFakeDb();
    const provider = new DemoProvider(TODAY);
    await syncOrganization(asDb(fake), "org1", provider);
    fake.tables.customers[0].excluded = true;
    fake.tables.customers[0].language = "en";
    await syncOrganization(asDb(fake), "org1", provider);
    expect(fake.tables.customers[0]).toMatchObject({ excluded: true, language: "en" });
    expect(fake.tables.customers.length).toBe(12); // aucun doublon
  });

  it("marque payée une facture ouverte qui a disparu de la liste des factures ouvertes", async () => {
    const fake = createFakeDb();
    const demo = new DemoProvider(TODAY);
    await syncOrganization(asDb(fake), "org1", demo);
    const target = fake.tables.invoices.find((i) => i.status === "open")!;

    const all = await demo.listInvoices();
    const paidVersion: ExternalInvoice = { ...all.find((i) => i.externalId === target.qbo_id)!, balanceCents: 0, paidDate: TODAY };
    const provider: AccountingProvider = {
      kind: "qbo",
      getCompanyInfo: () => demo.getCompanyInfo(),
      listCustomers: () => demo.listCustomers(),
      // la synchro incrémentale ne renvoie plus la facture (déjà payée, hors fenêtre)
      listInvoices: async () => all.filter((i) => i.externalId !== target.qbo_id),
      getInvoice: async (id) => (id === target.qbo_id ? paidVersion : null),
    };
    const res = await syncOrganization(asDb(fake), "org1", provider);
    const after = fake.tables.invoices.find((i) => i.qbo_id === target.qbo_id)!;
    expect(after).toMatchObject({ status: "paid", balance: "0.00" });
    expect(res.newlyPaid).toBe(1);
  });

  it("annule une facture supprimée dans QuickBooks", async () => {
    const fake = createFakeDb();
    const demo = new DemoProvider(TODAY);
    await syncOrganization(asDb(fake), "org1", demo);
    const target = fake.tables.invoices.find((i) => i.status === "open")!;
    const provider: AccountingProvider = {
      ...demo, kind: "qbo",
      getCompanyInfo: () => demo.getCompanyInfo(),
      listCustomers: () => demo.listCustomers(),
      listInvoices: async () => (await demo.listInvoices()).filter((i) => i.externalId !== target.qbo_id),
      getInvoice: async () => null,
    };
    await syncOrganization(asDb(fake), "org1", provider);
    expect(fake.tables.invoices.find((i) => i.qbo_id === target.qbo_id)?.status).toBe("voided");
  });
});
