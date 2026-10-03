import { ArrowLeft, CheckCircle2, Circle, Eye, FileText, Mail, MailWarning, MousePointerClick, Send } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { InvoiceStatus } from "@/components/invoice-status";
import { getDictionary } from "@/i18n/server";
import { loadSnapshot } from "@/lib/data/load";
import { invoiceHistory } from "@/lib/data/metrics";
import { formatDate, formatMoney } from "@/lib/email/render";
import { requireSession } from "@/lib/session";

const ICONS = {
  issued: FileText, due: Circle, reminder: Send, paid: CheckCircle2,
  delivered: Mail, opened: Eye, clicked: MousePointerClick, bounced: MailWarning, complained: MailWarning, unsubscribed: MailWarning, failed: MailWarning, sent: Send,
} as const;

export default async function InvoicePage({ params }: PageProps<"/app/invoices/[id]">) {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const T = t.invoices;
  const { id } = await params;
  const snap = await loadSnapshot(session);
  const inv = snap.invoices.find((i) => i.id === id);
  if (!inv) notFound();
  const customer = snap.customers.find((c) => c.id === inv.customerId);
  const history = invoiceHistory(snap, inv.id);

  const label = (h: (typeof history)[number]) => {
    if (h.kind === "reminder") {
      const step = h.stepOffsetDays == null ? "" : t.sequences.dayLabel(h.stepOffsetDays);
      return `${T.events.reminder(step, t.sequences.tones[h.tone!])} (${T.reminderStatus[h.status as keyof typeof T.reminderStatus]})`;
    }
    if (h.kind === "event") return T.events[h.eventType as keyof typeof T.events] as string;
    return T.events[h.kind];
  };

  return (
    <div className="max-w-3xl">
      <Link href="/app/invoices" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {T.back}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{T.columns.number} {inv.docNumber}</h1>
        <InvoiceStatus invoice={inv} today={snap.today} t={T.status} />
      </div>
      <p className="mt-1 text-ink-muted">{customer?.displayName}</p>

      <Card className="mt-6 grid gap-4 p-6 sm:grid-cols-4">
        <Field label={T.issued} value={formatDate(inv.issueDate, locale)} />
        <Field label={T.columns.due} value={formatDate(inv.dueDate, locale)} />
        <Field label={T.total} value={formatMoney(inv.totalCents, locale)} />
        <Field label={T.columns.balance} value={formatMoney(inv.balanceCents, locale)} />
        {inv.invoiceLink && (
          <p className="text-sm sm:col-span-4">
            <a href={inv.invoiceLink} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline dark:text-brand-400">{T.paymentLink} ↗</a>
          </p>
        )}
      </Card>

      <h2 className="mt-8 font-semibold">{T.history}</h2>
      <ol className="mt-4 space-y-0">
        {history.map((h, i) => {
          const Icon = ICONS[(h.kind === "event" ? h.eventType : h.kind) as keyof typeof ICONS] ?? Circle;
          const strong = h.kind === "reminder" || h.kind === "paid";
          return (
            <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
              {i < history.length - 1 && <span className="absolute left-4 top-8 h-[calc(100%-1.5rem)] w-px bg-line" aria-hidden />}
              <span className={`grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-line ${h.kind === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : strong ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "bg-surface text-ink-subtle"}`}>
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="pt-1">
                <p className={`text-sm ${strong ? "font-medium" : "text-ink-muted"}`}>{label(h)}</p>
                <p className="text-xs text-ink-subtle">{formatDate(h.date, locale)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-subtle">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}
