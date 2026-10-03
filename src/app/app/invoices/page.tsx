import clsx from "clsx";
import { Search } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { InvoiceStatus } from "@/components/invoice-status";
import { getDictionary } from "@/i18n/server";
import { loadSnapshot } from "@/lib/data/load";
import { isOverdue } from "@/lib/data/metrics";
import { formatDate, formatMoney } from "@/lib/email/render";
import { requireSession } from "@/lib/session";

const FILTERS = ["open", "overdue", "paid", "all"] as const;
type Filter = (typeof FILTERS)[number];

export default async function InvoicesPage({ searchParams }: PageProps<"/app/invoices">) {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const T = t.invoices;
  const sp = await searchParams;
  const filter: Filter = FILTERS.includes(sp.f as Filter) ? (sp.f as Filter) : "open";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const snap = await loadSnapshot(session);
  const names = new Map(snap.customers.map((c) => [c.id, c.displayName]));
  const reminderCount = new Map<string, number>();
  const sent = new Set(snap.reminders.filter((r) => r.status === "sent").map((r) => r.id));
  for (const it of snap.items) if (sent.has(it.reminderId)) reminderCount.set(it.invoiceId, (reminderCount.get(it.invoiceId) ?? 0) + 1);

  const rows = snap.invoices
    .filter((i) =>
      filter === "all" ? true : filter === "open" ? i.status === "open" : filter === "paid" ? i.status === "paid" : isOverdue(i, snap.today),
    )
    .filter((i) => !q || (i.docNumber ?? "").toLowerCase().includes(q) || (names.get(i.customerId) ?? "").toLowerCase().includes(q))
    .sort((a, b) => (filter === "paid" ? (b.paidAt ?? "").localeCompare(a.paidAt ?? "") : a.dueDate.localeCompare(b.dueDate)));

  const counts = Object.fromEntries(FILTERS.map((f) => [f, snap.invoices.filter((i) =>
    f === "all" ? true : f === "open" ? i.status === "open" : f === "paid" ? i.status === "paid" : isOverdue(i, snap.today)).length]));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{T.title}</h1>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-xl bg-surface-muted p-1 text-sm">
          {FILTERS.map((f) => (
            <Link key={f} href={{ pathname: "/app/invoices", query: { f, ...(q ? { q } : {}) } }}
              className={clsx("rounded-lg px-3 py-1.5 font-medium", f === filter ? "bg-surface shadow-sm" : "text-ink-muted hover:text-ink")}>
              {T.filters[f]} <span className="text-ink-subtle tabular-nums">{counts[f]}</span>
            </Link>
          ))}
        </nav>
        <form className="relative w-full sm:w-72">
          <input type="hidden" name="f" value={filter} />
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input name="q" defaultValue={q} placeholder={T.search} aria-label={T.search}
            className="block w-full rounded-xl border-0 bg-surface py-2 pl-9 pr-3 text-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand-600" />
        </form>
      </div>

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-subtle">
              <th className="px-5 py-3 font-medium">{T.columns.number}</th>
              <th className="px-5 py-3 font-medium">{T.columns.customer}</th>
              <th className="px-5 py-3 font-medium">{T.columns.due}</th>
              <th className="px-5 py-3 font-medium">{T.columns.status}</th>
              <th className="px-5 py-3 text-center font-medium">{T.columns.reminders}</th>
              <th className="px-5 py-3 text-right font-medium">{T.columns.balance}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((i) => (
              <tr key={i.id} className="group hover:bg-surface-muted/50">
                <td className="px-5 py-3 font-medium">
                  <Link href={`/app/invoices/${i.id}`} className="after:absolute relative hover:text-brand-700 dark:hover:text-brand-400">{i.docNumber ?? "—"}</Link>
                </td>
                <td className="px-5 py-3"><Link href={`/app/invoices/${i.id}`}>{names.get(i.customerId)}</Link></td>
                <td className="px-5 py-3 text-ink-muted">{formatDate(i.dueDate, locale)}</td>
                <td className="px-5 py-3"><InvoiceStatus invoice={i} today={snap.today} t={T.status} /></td>
                <td className="px-5 py-3 text-center tabular-nums text-ink-muted">{reminderCount.get(i.id) ?? 0}</td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{formatMoney(i.status === "paid" ? i.totalCents : i.balanceCents, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-muted">{T.empty}</p>}
      </Card>
    </div>
  );
}
