import { Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { loadSnapshot } from "@/lib/data/load";
import { formatMoney } from "@/lib/email/render";
import { requireSession } from "@/lib/session";
import { CustomerRow } from "./customer-row";

export default async function CustomersPage() {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const T = t.customers;
  const snap = await loadSnapshot(session);
  const owed = new Map<string, number>();
  for (const i of snap.invoices) if (i.status === "open") owed.set(i.customerId, (owed.get(i.customerId) ?? 0) + i.balanceCents);
  const customers = [...snap.customers].sort((a, b) => (owed.get(b.id) ?? 0) - (owed.get(a.id) ?? 0) || a.displayName.localeCompare(b.displayName));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{T.title}</h1>
      <p className="mt-1 text-ink-muted">{T.subtitle}</p>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-subtle">
              <th className="px-5 py-3 font-medium">{T.columns.name}</th>
              <th className="px-5 py-3 text-right font-medium">{T.columns.owed}</th>
              <th className="px-5 py-3 font-medium">{T.columns.language}</th>
              <th className="px-5 py-3 font-medium">{T.cc}</th>
              <th className="px-5 py-3 font-medium">{T.columns.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.map((c) => (
              <CustomerRow key={c.id} c={c} owed={formatMoney(owed.get(c.id) ?? 0, locale)} uiLang={locale} today={snap.today} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
