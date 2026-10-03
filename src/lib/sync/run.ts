import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingProvider, ExternalInvoice } from "../accounting/types";
import { customerRow, invoiceRow, invoicesToRecheck } from "./rows";

export interface SyncResult {
  customers: number;
  invoices: number;
  newlyPaid: number;
}

/**
 * Synchronise une organisation depuis sa source comptable.
 * `db` doit être un client service_role : chaque requête filtre explicitement par org.
 */
export async function syncOrganization(
  db: SupabaseClient,
  orgId: string,
  provider: AccountingProvider,
  opts: { changedSince?: Date } = {},
): Promise<SyncResult> {
  const syncedAt = new Date().toISOString();

  // 1. Clients
  const customers = await provider.listCustomers();
  for (let i = 0; i < customers.length; i += 500) {
    const { error } = await db
      .from("customers")
      .upsert(customers.slice(i, i + 500).map((c) => customerRow(orgId, c, syncedAt)), { onConflict: "organization_id,qbo_id" });
    if (error) throw error;
  }
  const { data: customerIds, error: idErr } = await db.from("customers").select("id, qbo_id").eq("organization_id", orgId);
  if (idErr) throw idErr;
  const customerIdByQbo = new Map(customerIds.map((c) => [c.qbo_id as string, c.id as string]));

  // 2. Factures (ouvertes + modifiées), puis relecture de celles qui ont disparu
  const fetched = await provider.listInvoices(opts);
  const { data: openRows, error: openErr } = await db
    .from("invoices")
    .select("qbo_id")
    .eq("organization_id", orgId)
    .eq("status", "open");
  if (openErr) throw openErr;
  const openBefore = new Set(openRows.map((r) => r.qbo_id as string));

  const rechecked: ExternalInvoice[] = [];
  for (const id of invoicesToRecheck([...openBefore], fetched)) {
    const inv = await provider.getInvoice(id);
    // Supprimée dans QBO : traitée comme annulée pour arrêter les relances
    rechecked.push(inv ?? placeholderVoid(id));
  }

  const all = [...fetched, ...rechecked];
  const rows = all
    .filter((i) => customerIdByQbo.has(i.customerExternalId))
    .map((i) => invoiceRow(orgId, customerIdByQbo.get(i.customerExternalId)!, i, syncedAt));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("invoices").upsert(rows.slice(i, i + 500), { onConflict: "organization_id,qbo_id" });
    if (error) throw error;
  }

  // Factures supprimées dans QBO : marquées annulées sans connaître leur client
  const deleted = rechecked.filter((i) => i.customerExternalId === "").map((i) => i.externalId);
  if (deleted.length) {
    await db.from("invoices").update({ status: "voided", balance: 0 }).eq("organization_id", orgId).in("qbo_id", deleted);
  }

  const newlyPaid = rows.filter((r) => r.status !== "open" && openBefore.has(r.qbo_id)).length + deleted.length;
  return { customers: customers.length, invoices: rows.length, newlyPaid };
}

function placeholderVoid(externalId: string): ExternalInvoice {
  return {
    externalId, customerExternalId: "", docNumber: null, issueDate: "", dueDate: "",
    totalCents: 0, balanceCents: 0, currency: "CAD", voided: true, paidDate: null, invoiceLink: null,
  };
}
