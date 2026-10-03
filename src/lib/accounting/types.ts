/**
 * Contrat commun aux sources comptables. QuickBooks Online (étape 2) et le
 * mode démo l'implémentent tous les deux : le reste de l'application
 * (synchro, moteur de relance, tableau de bord) ne sait pas lequel est actif.
 *
 * Les montants sont en cents (entiers) pour éviter les erreurs d'arrondi.
 * Les dates sont des chaînes ISO « AAAA-MM-JJ ».
 */
export type Language = "fr" | "en";

export interface ExternalCustomer {
  externalId: string;
  displayName: string;
  companyName: string | null;
  contactName: string | null;
  email: string | null;
  active: boolean;
}

export interface ExternalInvoice {
  externalId: string;
  customerExternalId: string;
  docNumber: string | null;
  issueDate: string;
  dueDate: string;
  totalCents: number;
  balanceCents: number;
  currency: string;
  voided: boolean;
  /** Date du paiement qui a soldé la facture, si elle est payée. */
  paidDate: string | null;
  /** Lien de paiement QuickBooks, s'il existe. */
  invoiceLink: string | null;
}

export interface CompanyInfo {
  externalId: string;
  name: string;
  email: string | null;
}

export interface AccountingProvider {
  readonly kind: "qbo" | "demo";
  getCompanyInfo(): Promise<CompanyInfo>;
  listCustomers(): Promise<ExternalCustomer[]>;
  /** Factures ouvertes + factures modifiées depuis `changedSince` (ou toutes). */
  listInvoices(opts?: { changedSince?: Date }): Promise<ExternalInvoice[]>;
  /** Relecture juste avant l'envoi : garantit qu'on ne relance pas une facture payée. */
  getInvoice(externalId: string): Promise<ExternalInvoice | null>;
}
