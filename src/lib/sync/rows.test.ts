import { describe, expect, it } from "vitest";
import type { ExternalInvoice } from "../accounting/types";
import { customerRow, invoiceRow, invoicesToRecheck } from "./rows";

const inv = (o: Partial<ExternalInvoice>): ExternalInvoice => ({
  externalId: "1", customerExternalId: "c", docNumber: "1001", issueDate: "2026-09-01", dueDate: "2026-09-30",
  totalCents: 125010, balanceCents: 125010, currency: "CAD", voided: false, paidDate: null, invoiceLink: null, ...o,
});

describe("lignes de synchro", () => {
  it("n'écrase jamais les réglages de relance du client", () => {
    const row = customerRow("org", { externalId: "1", displayName: "A", companyName: null, contactName: null, email: "a@x.ca", active: true }, "t");
    for (const k of ["language", "excluded", "paused_until", "cc_email", "unsubscribed_at", "sequence_id"]) expect(row).not.toHaveProperty(k);
  });

  it("calcule le statut et les montants", () => {
    expect(invoiceRow("o", "c", inv({}), "t")).toMatchObject({ status: "open", total_amount: "1250.10", balance: "1250.10", paid_at: null });
    expect(invoiceRow("o", "c", inv({ balanceCents: 0, paidDate: "2026-10-01" }), "t")).toMatchObject({ status: "paid", paid_at: "2026-10-01T12:00:00Z" });
    expect(invoiceRow("o", "c", inv({ voided: true, totalCents: 0, balanceCents: 0 }), "t").status).toBe("voided");
  });

  it("repère les factures ouvertes disparues de la synchro", () => {
    expect(invoicesToRecheck(["1", "2", "3"], [inv({ externalId: "2" })])).toEqual(["1", "3"]);
  });
});
