/** Sous-ensemble des objets JSON de l'API QuickBooks Online utilisés par Dûment. */
export interface QboRef { value: string; name?: string }

export interface QboCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address?: string };
  Active?: boolean;
  MetaData?: { LastUpdatedTime?: string };
}

export interface QboInvoice {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate?: string;
  TotalAmt: number;
  Balance: number;
  CurrencyRef?: QboRef;
  CustomerRef: QboRef;
  InvoiceLink?: string;
  PrivateNote?: string;
  MetaData?: { LastUpdatedTime?: string };
}

export interface QboPayment {
  Id: string;
  TxnDate: string;
  Line?: Array<{ Amount?: number; LinkedTxn?: Array<{ TxnId: string; TxnType: string }> }>;
}

export interface QboCompanyInfo {
  Id?: string;
  CompanyName: string;
  Email?: { Address?: string };
}
