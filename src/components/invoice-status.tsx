import { Badge } from "@/components/ui";
import type { Dictionary } from "@/i18n/fr";
import type { SnapInvoice } from "@/lib/data/snapshot";
import { daysBetween } from "@/lib/engine/dates";

export function InvoiceStatus({ invoice, today, t }: { invoice: SnapInvoice; today: string; t: Dictionary["invoices"]["status"] }) {
  if (invoice.status === "paid") return <Badge tone="ok">{t.paid}</Badge>;
  if (invoice.status === "voided") return <Badge>{t.voided}</Badge>;
  const d = daysBetween(invoice.dueDate, today);
  if (d > 0) return <Badge tone={d > 30 ? "danger" : "warn"}>{t.overdue(d)}</Badge>;
  return <Badge tone="brand">{t.notDue(-d)}</Badge>;
}
