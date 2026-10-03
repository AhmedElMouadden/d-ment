import type { AccountingProvider, ExternalInvoice } from "../accounting/types";
import { generateDemoDataset, type DemoDataset } from "./generate";
import { toIsoDate } from "./random";

/** Source comptable fictive : remplace QuickBooks en mode démo. */
export class DemoProvider implements AccountingProvider {
  readonly kind = "demo" as const;
  private readonly data: DemoDataset;

  constructor(today: string = toIsoDate(new Date()), seed?: number) {
    this.data = generateDemoDataset(today, seed);
  }

  async getCompanyInfo() {
    return this.data.company;
  }

  async listCustomers() {
    return this.data.customers.map(({ language: _l, ccEmail: _c, excluded: _e, pausedUntil: _p, ...c }) => c);
  }

  async listInvoices(): Promise<ExternalInvoice[]> {
    return this.data.invoices;
  }

  async getInvoice(externalId: string) {
    return this.data.invoices.find((i) => i.externalId === externalId) ?? null;
  }

  /** Réglages de relance par client à appliquer au chargement de la démo. */
  get customerSettings() {
    return this.data.customers.map(({ externalId, language, ccEmail, excluded, pausedUntil }) => ({
      externalId, language, ccEmail, excluded, pausedUntil,
    }));
  }
}
