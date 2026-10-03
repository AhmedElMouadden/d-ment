import type { ExternalCustomer, ExternalInvoice } from "../accounting/types";
import type { QboCustomer, QboInvoice, QboPayment } from "./types";

/** Montant décimal QBO → cents entiers, sans erreur d'arrondi flottant. */
export function toCents(amount: number | undefined): number {
  return Math.round((amount ?? 0) * 100);
}

export function mapCustomer(c: QboCustomer): ExternalCustomer {
  const contact = [c.GivenName, c.FamilyName].filter(Boolean).join(" ").trim();
  return {
    externalId: c.Id,
    displayName: c.DisplayName,
    companyName: c.CompanyName?.trim() || null,
    contactName: contact || null,
    // QBO accepte plusieurs adresses séparées par des virgules : on garde la première
    email: c.PrimaryEmailAddr?.Address?.split(/[,;]/)[0]?.trim() || null,
    active: c.Active !== false,
  };
}

/** Date du paiement le plus récent appliqué à chaque facture. */
export function latestPaymentDates(payments: QboPayment[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of payments) {
    for (const line of p.Line ?? []) {
      for (const linked of line.LinkedTxn ?? []) {
        if (linked.TxnType !== "Invoice") continue;
        const prev = map.get(linked.TxnId);
        if (!prev || p.TxnDate > prev) map.set(linked.TxnId, p.TxnDate);
      }
    }
  }
  return map;
}

export function mapInvoice(inv: QboInvoice, paymentDates: Map<string, string> = new Map()): ExternalInvoice {
  const totalCents = toCents(inv.TotalAmt);
  const balanceCents = toCents(inv.Balance);
  // Une facture annulée dans QBO garde ses lignes à 0 $ avec la note « Voided »
  const voided = totalCents === 0 && balanceCents === 0 && /void/i.test(inv.PrivateNote ?? "");
  const paid = !voided && balanceCents <= 0 && totalCents > 0;
  return {
    externalId: inv.Id,
    customerExternalId: inv.CustomerRef.value,
    docNumber: inv.DocNumber ?? null,
    issueDate: inv.TxnDate,
    dueDate: inv.DueDate ?? inv.TxnDate,
    totalCents,
    balanceCents,
    currency: inv.CurrencyRef?.value ?? "CAD",
    voided,
    paidDate: paid ? (paymentDates.get(inv.Id) ?? inv.MetaData?.LastUpdatedTime?.slice(0, 10) ?? null) : null,
    invoiceLink: inv.InvoiceLink || null,
  };
}
