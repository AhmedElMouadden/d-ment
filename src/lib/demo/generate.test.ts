import { describe, expect, it } from "vitest";
import { generateDemoDataset } from "./generate";
import { addDays } from "./random";
import { DemoProvider } from "./provider";

const TODAY = "2026-10-03";
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

describe("jeu de données démo", () => {
  const data = generateDemoDataset(TODAY);
  const open = data.invoices.filter((i) => i.balanceCents > 0);
  const paid = data.invoices.filter((i) => i.paidDate);

  it("est déterministe pour une même date et une même graine", () => {
    expect(generateDemoDataset(TODAY)).toEqual(data);
  });

  it("couvre chaque tranche de la balance âgée", () => {
    const overdue = open.map((i) => daysBetween(i.dueDate, TODAY));
    expect(overdue.some((d) => d < 0)).toBe(true); // pas encore échues
    expect(overdue.some((d) => d >= 1 && d <= 30)).toBe(true);
    expect(overdue.some((d) => d >= 31 && d <= 60)).toBe(true);
    expect(overdue.some((d) => d >= 61 && d <= 90)).toBe(true);
    expect(overdue.some((d) => d > 90)).toBe(true);
  });

  it("tombe pile sur les étapes de la séquence par défaut", () => {
    const overdue = new Set(open.map((i) => daysBetween(i.dueDate, TODAY)));
    for (const step of [-3, 1, 7, 15, 30, 45]) expect(overdue.has(step)).toBe(true);
  });

  it("produit des factures cohérentes", () => {
    for (const inv of data.invoices) {
      expect(inv.totalCents).toBeGreaterThan(0);
      expect(inv.issueDate <= inv.dueDate).toBe(true);
      expect(inv.balanceCents === 0).toBe(inv.paidDate !== null);
      if (inv.paidDate) expect(inv.paidDate < TODAY).toBe(true);
      expect(data.customers.some((c) => c.externalId === inv.customerExternalId)).toBe(true);
    }
    expect(new Set(data.invoices.map((i) => i.externalId)).size).toBe(data.invoices.length);
    expect(paid.length).toBeGreaterThan(15);
  });

  it("inclut les cas particuliers : client exclu, en pause, en copie, anglais, sans courriel, plusieurs factures", () => {
    expect(data.customers.some((c) => c.excluded)).toBe(true);
    expect(data.customers.some((c) => c.pausedUntil === addDays(TODAY, 14))).toBe(true);
    expect(data.customers.some((c) => c.ccEmail)).toBe(true);
    expect(data.customers.some((c) => c.language === "en")).toBe(true);
    expect(data.customers.some((c) => c.email === null)).toBe(true);
    const perCustomer = new Map<string, number>();
    for (const i of open) perCustomer.set(i.customerExternalId, (perCustomer.get(i.customerExternalId) ?? 0) + 1);
    expect(Math.max(...perCustomer.values())).toBeGreaterThan(1);
  });

  it("le fournisseur démo expose le même contrat que QuickBooks", async () => {
    const p = new DemoProvider(TODAY);
    expect(p.kind).toBe("demo");
    expect((await p.listCustomers())[0]).not.toHaveProperty("excluded");
    const first = (await p.listInvoices())[0];
    expect(await p.getInvoice(first.externalId)).toEqual(first);
    expect(await p.getInvoice("inexistant")).toBeNull();
  });
});
