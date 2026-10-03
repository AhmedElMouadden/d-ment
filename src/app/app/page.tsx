import { AlertTriangle, ArrowRight, CalendarClock, Clock, HandCoins, Link2, Wallet } from "lucide-react";
import Link from "next/link";
import { Badge, buttonClass, Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { loadSnapshot } from "@/lib/data/load";
import { computeDashboard, type AgingBuckets } from "@/lib/data/metrics";
import { formatDate, formatMoney } from "@/lib/email/render";
import { addDays } from "@/lib/engine/dates";
import { requireSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TONE_BADGE = { courteous: "brand", firm: "warn", final: "danger" } as const;

export default async function DashboardPage() {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const d = t.dashboard;
  const snap = await loadSnapshot(session);
  const m = computeDashboard(snap);
  const money = (c: number) => formatMoney(c, locale);

  let connected = true;
  if (session.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("qbo_connections").select("status").maybeSingle();
    connected = !!data && data.status === "active";
  }
  const firstName = session.fullName?.split(" ")[0];
  const overduePct = m.receivableCents ? Math.round((m.overdueCents / m.receivableCents) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.app.welcome}{firstName ? `, ${firstName}` : ""}</h1>
        <p className="mt-1 text-ink-muted">{d.sent30(m.sentLast30)}</p>
      </div>

      {!connected && (
        <Banner icon={<Link2 className="size-5" />} text={d.connectBanner} href="/api/qbo/connect" cta={d.connect} external />
      )}
      {!snap.subscriptionActive && (
        <Banner icon={<AlertTriangle className="size-5" />} text={d.subscriptionInactive} href="/app/billing" cta={d.choosePlan} tone="warn" />
      )}
      {m.pendingApprovals > 0 && (
        <Banner icon={<CalendarClock className="size-5" />} text={d.approvalsBanner(m.pendingApprovals)} href="/app/approvals" cta={d.review} tone="warn" />
      )}

      {/* Indicateurs clés */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Wallet />} label={d.receivable} value={money(m.receivableCents)} note={d.openInvoices(m.openCount)} />
        <Stat icon={<AlertTriangle />} label={d.overdue} value={money(m.overdueCents)} note={d.ofReceivable(overduePct)} />
        <Stat icon={<Clock />} label={d.avgDaysToPay} value={m.avgDaysToPay === null ? "—" : d.days(m.avgDaysToPay)} note={d.last90} />
        <Stat icon={<HandCoins />} label={d.collected} value={money(m.collectedAfterReminderCents)} note={d.collectedCount(m.collectedAfterReminderCount)} highlight />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
        <AgingChart aging={m.aging} labels={d.agingLabels} title={d.aging} money={money} />

        <Card className="p-6">
          <h2 className="font-semibold">{d.upcoming}</h2>
          {m.upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-ink-muted">{d.upcomingEmpty}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {m.upcoming.slice(0, 8).map((u, i) => (
                <li key={`${u.date}-${u.customerId}-${i}`} className="flex items-center gap-3 py-3">
                  <span className="w-24 shrink-0 text-sm text-ink-muted">
                    {u.date === snap.today ? d.today : u.date === addDays(snap.today, 1) ? d.tomorrow : formatDate(u.date, locale).replace(/ \d{4}$/, "").replace(/, \d{4}$/, "")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.customerName}</p>
                    <p className="text-xs text-ink-subtle">{d.invoicesCount(u.invoiceCount)} · {money(u.amountCents)}</p>
                  </div>
                  {u.needsApproval ? <Badge tone="warn">{d.needsApproval}</Badge> : <Badge tone={TONE_BADGE[u.tone]}>{t.sequences.tones[u.tone]}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, note, highlight }: { icon: React.ReactNode; label: string; value: string; note: string; highlight?: boolean }) {
  return (
    <Card className={`p-5 ${highlight ? "bg-brand-50 ring-brand-100 dark:bg-brand-950 dark:ring-brand-900" : ""}`}>
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="text-brand-600 [&>svg]:size-4" aria-hidden>{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-ink-subtle">{note}</p>
    </Card>
  );
}

/** Barres horizontales, une seule teinte : la longueur porte le montant, l'ordre porte l'âge. */
function AgingChart({ aging, labels, title, money }: { aging: AgingBuckets; labels: Record<keyof AgingBuckets, string>; title: string; money: (c: number) => string }) {
  const keys = ["notDue", "d0_30", "d31_60", "d61_90", "d90plus"] as const;
  const max = Math.max(1, ...keys.map((k) => aging[k]));
  return (
    <Card className="p-6">
      <h2 className="font-semibold">{title}</h2>
      <dl className="mt-5 space-y-3">
        {keys.map((k) => (
          <div key={k} className="group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3" title={`${labels[k]} : ${money(aging[k])}`}>
            <dt className="text-sm text-ink-muted">{labels[k]}</dt>
            <div className="h-6 rounded-r bg-surface-muted/60">
              <div
                className={`h-full rounded-r transition-opacity group-hover:opacity-80 ${k === "notDue" ? "bg-brand-300 dark:bg-brand-700" : "bg-brand-600 dark:bg-brand-400"}`}
                style={{ width: `${aging[k] ? Math.max(2, (aging[k] / max) * 100) : 0}%` }}
              />
            </div>
            <dd className="min-w-24 text-right text-sm font-medium tabular-nums">{money(aging[k])}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Banner({ icon, text, href, cta, tone = "brand", external }: { icon: React.ReactNode; text: string; href: string; cta: string; tone?: "brand" | "warn"; external?: boolean }) {
  const cls = tone === "warn"
    ? "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900"
    : "bg-brand-50 text-brand-900 ring-brand-100 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-900";
  const link = <>{cta} <ArrowRight className="size-4" aria-hidden /></>;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 ring-1 ${cls}`}>
      <p className="flex items-center gap-3 text-sm font-medium"><span aria-hidden>{icon}</span>{text}</p>
      {external ? <a href={href} className={buttonClass("secondary", "sm")}>{link}</a> : <Link href={href} className={buttonClass("secondary", "sm")}>{link}</Link>}
    </div>
  );
}
