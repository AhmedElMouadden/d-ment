import { CheckCircle2 } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { loadSnapshot } from "@/lib/data/load";
import { formatDate, formatMoney } from "@/lib/email/render";
import { requireSession } from "@/lib/session";
import { ApprovalButtons } from "./approval-buttons";

const TONE_BADGE = { courteous: "brand", firm: "warn", final: "danger" } as const;

export default async function ApprovalsPage() {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const T = t.approvals;
  const snap = await loadSnapshot(session);
  const pending = snap.reminders.filter((r) => r.status === "pending_approval");
  const invById = new Map(snap.invoices.map((i) => [i.id, i]));

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{T.title}</h1>
          <p className="mt-1 text-ink-muted">{T.subtitle}</p>
        </div>
        {pending.length > 1 && <ApprovalButtons ids={pending.map((p) => p.id)} approve={T.approveAll} all />}
      </div>

      {pending.length === 0 ? (
        <Card className="mt-8 flex items-center gap-3 p-8 text-ink-muted">
          <CheckCircle2 className="size-6 text-brand-600" aria-hidden /> {T.empty}
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {pending.map((r) => {
            const customer = snap.customers.find((c) => c.id === r.customerId);
            const its = snap.items.filter((i) => i.reminderId === r.id);
            const total = its.reduce((s, i) => s + i.amountCents, 0);
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold">{customer?.displayName}</h2>
                      <Badge tone={TONE_BADGE[r.tone]}>{t.sequences.tones[r.tone]}</Badge>
                      <Badge>{r.language.toUpperCase()}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{T.to} {r.toEmail}{customer?.ccEmail ? ` · cc ${customer.ccEmail}` : ""}</p>
                  </div>
                  <ApprovalButtons ids={[r.id]} approve={T.approve} reject={T.reject} />
                </div>
                <ul className="mt-4 divide-y divide-line rounded-xl ring-1 ring-line">
                  {its.map((it) => {
                    const inv = invById.get(it.invoiceId);
                    return (
                      <li key={it.invoiceId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="font-medium">{inv?.docNumber}</span>
                        <span className="text-ink-muted">{inv && formatDate(inv.dueDate, locale)} · {t.sequences.dayLabel(it.stepOffsetDays ?? it.daysOverdue)}</span>
                        <span className="font-semibold tabular-nums">{formatMoney(it.amountCents, locale)}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 text-right text-sm text-ink-muted">{T.total} <strong className="text-ink tabular-nums">{formatMoney(total, locale)}</strong></p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
