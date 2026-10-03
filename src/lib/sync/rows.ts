import type { ExternalCustomer, ExternalInvoice } from "../accounting/types";

/** Conversion pure : données comptables → lignes Postgres (colonnes synchronisées seulement). */

export function customerRow(orgId: string, c: ExternalCustomer, syncedAt: string) {
  // On n'écrit jamais les réglages de relance (langue, exclusion, pause, copie) :
  // ils appartiennent à l'utilisateur et survivent à chaque synchro.
  return {
    organization_id: orgId,
    qbo_id: c.externalId,
    display_name: c.displayName,
    company_name: c.companyName,
    contact_name: c.contactName,
    email: c.email,
    active_in_qbo: c.active,
    last_synced_at: syncedAt,
  };
}

export function invoiceStatus(i: ExternalInvoice): "open" | "paid" | "voided" {
  if (i.voided) return "voided";
  return i.balanceCents > 0 ? "open" : "paid";
}

const money = (cents: number) => (cents / 100).toFixed(2);

export function invoiceRow(orgId: string, customerId: string, i: ExternalInvoice, syncedAt: string) {
  const status = invoiceStatus(i);
  return {
    organization_id: orgId,
    customer_id: customerId,
    qbo_id: i.externalId,
    doc_number: i.docNumber,
    issue_date: i.issueDate,
    due_date: i.dueDate,
    total_amount: money(i.totalCents),
    balance: money(Math.max(0, i.balanceCents)),
    currency: i.currency,
    status,
    paid_at: status === "paid" && i.paidDate ? `${i.paidDate}T12:00:00Z` : null,
    invoice_link: i.invoiceLink,
    last_synced_at: syncedAt,
  };
}

/** Factures ouvertes en base que la source n'a pas renvoyées : à relire une par une. */
export function invoicesToRecheck(openInDb: string[], fetched: ExternalInvoice[]): string[] {
  const seen = new Set(fetched.map((i) => i.externalId));
  return openInDb.filter((id) => !seen.has(id));
}
