import type { AccountingProvider, CompanyInfo, ExternalInvoice } from "../accounting/types";
import { QBO_MINOR_VERSION, qboApiBase, type QboEnvironment } from "./config";
import { latestPaymentDates, mapCustomer, mapInvoice } from "./mapping";
import type { QboCompanyInfo, QboCustomer, QboInvoice, QboPayment } from "./types";

export interface TokenSource {
  /** Jeton d'accès valide (rafraîchi au besoin). `force` impose un rafraîchissement. */
  getAccessToken(force?: boolean): Promise<string>;
}

export class QboApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const PAGE_SIZE = 1000;

/** Format attendu par le langage de requête QBO : 2026-10-03T00:00:00-04:00 ou Z. */
function qboDateTime(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Source comptable QuickBooks Online, en lecture seule. */
export class QboProvider implements AccountingProvider {
  readonly kind = "qbo" as const;

  constructor(
    private readonly realmId: string,
    private readonly environment: QboEnvironment,
    private readonly tokens: TokenSource,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async get<T>(path: string, params: Record<string, string> = {}, retried = false): Promise<T> {
    const url = new URL(`${qboApiBase(this.environment)}/v3/company/${this.realmId}/${path}`);
    url.searchParams.set("minorversion", QBO_MINOR_VERSION);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${await this.tokens.getAccessToken(retried)}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 401 && !retried) return this.get<T>(path, params, true);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new QboApiError(`QuickBooks ${res.status} sur ${path}: ${text.slice(0, 300)}`, res.status);
    }
    return res.json() as Promise<T>;
  }

  /** Requête paginée dans le langage SQL-like de QBO. */
  private async query<T>(entity: string, where = "", extra: Record<string, string> = {}): Promise<T[]> {
    const rows: T[] = [];
    for (let start = 1; ; start += PAGE_SIZE) {
      const q = `select * from ${entity}${where ? ` where ${where}` : ""} startposition ${start} maxresults ${PAGE_SIZE}`;
      const json = await this.get<{ QueryResponse: Record<string, T[] | undefined> }>("query", { query: q, ...extra });
      const page = json.QueryResponse[entity] ?? [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  async getCompanyInfo(): Promise<CompanyInfo> {
    const json = await this.get<{ CompanyInfo: QboCompanyInfo }>(`companyinfo/${this.realmId}`);
    return { externalId: this.realmId, name: json.CompanyInfo.CompanyName, email: json.CompanyInfo.Email?.Address ?? null };
  }

  async listCustomers() {
    const rows = await this.query<QboCustomer>("Customer", "Active IN (true, false)");
    return rows.map(mapCustomer);
  }

  /**
   * Toutes les factures ouvertes, plus celles modifiées depuis `changedSince`
   * (pour détecter les paiements et annulations), avec la date de paiement.
   */
  async listInvoices(opts: { changedSince?: Date } = {}): Promise<ExternalInvoice[]> {
    const include = { include: "invoiceLink" };
    const open = await this.query<QboInvoice>("Invoice", "Balance > '0'", include);
    const changed = opts.changedSince
      ? await this.query<QboInvoice>("Invoice", `MetaData.LastUpdatedTime >= '${qboDateTime(opts.changedSince)}'`, include)
      : [];
    const byId = new Map<string, QboInvoice>();
    for (const inv of [...open, ...changed]) byId.set(inv.Id, inv);

    const since = opts.changedSince ?? new Date(Date.now() - 400 * 86_400_000);
    const payments = await this.query<QboPayment>("Payment", `MetaData.LastUpdatedTime >= '${qboDateTime(since)}'`);
    const paid = latestPaymentDates(payments);
    return [...byId.values()].map((inv) => mapInvoice(inv, paid));
  }

  async getInvoice(externalId: string): Promise<ExternalInvoice | null> {
    try {
      const json = await this.get<{ Invoice: QboInvoice }>(`invoice/${encodeURIComponent(externalId)}`, { include: "invoiceLink" });
      const inv = json.Invoice;
      let paidDates = new Map<string, string>();
      if (inv.Balance <= 0 && inv.TotalAmt > 0) {
        const payments = await this.query<QboPayment>("Payment", `CustomerRef = '${inv.CustomerRef.value.replace(/'/g, "")}'`);
        paidDates = latestPaymentDates(payments);
      }
      return mapInvoice(inv, paidDates);
    } catch (e) {
      if (e instanceof QboApiError && (e.status === 404 || e.status === 400)) return null;
      throw e;
    }
  }
}
