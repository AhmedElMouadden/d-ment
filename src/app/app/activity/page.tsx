import { Badge, Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { loadSnapshot } from "@/lib/data/load";
import { requireSession } from "@/lib/session";

const TONE: Record<string, "neutral" | "brand" | "ok" | "warn" | "danger"> = {
  sent: "brand", delivered: "ok", opened: "ok", clicked: "ok", bounced: "danger", complained: "danger", unsubscribed: "warn", failed: "danger",
};

export default async function ActivityPage() {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const T = t.activity;
  const snap = await loadSnapshot(session);
  const names = new Map(snap.customers.map((c) => [c.id, c.displayName]));
  const events = [...snap.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 200);
  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: snap.org.timezone });
  const label = (type: string) => (type === "sent" ? (locale === "fr" ? "Envoyé" : "Sent") : (t.invoices.events[type as keyof typeof t.invoices.events] as string));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{T.title}</h1>
      <p className="mt-1 text-ink-muted">{T.subtitle}</p>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-subtle">
              <th className="px-5 py-3 font-medium">{T.columns.date}</th>
              <th className="px-5 py-3 font-medium">{T.columns.customer}</th>
              <th className="px-5 py-3 font-medium">{T.columns.recipient}</th>
              <th className="px-5 py-3 font-medium">{T.columns.event}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {events.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-5 py-3 text-ink-muted">{fmt.format(new Date(e.occurredAt))}</td>
                <td className="px-5 py-3 font-medium">{e.customerId ? names.get(e.customerId) : "—"}</td>
                <td className="px-5 py-3 text-ink-muted">{e.recipient ?? "—"}</td>
                <td className="px-5 py-3"><Badge tone={TONE[e.type] ?? "neutral"}>{label(e.type)}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {events.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-muted">{T.empty}</p>}
      </Card>
    </div>
  );
}
