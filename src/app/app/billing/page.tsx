import { Check, ExternalLink } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { exceedsPlan, PLANS, recommendedPlan, type PlanId } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { loadSnapshot } from "@/lib/data/load";
import { formatDate } from "@/lib/email/render";
import { requireSession, trialDaysLeft } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { openPortal, startCheckout } from "./actions";

export default async function BillingPage({ searchParams }: PageProps<"/app/billing">) {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const T = t.billing;
  const flash = (await searchParams).status;
  const snap = await loadSnapshot(session);
  const active = snap.invoices.filter((i) => i.status === "open").length;
  const recommended = recommendedPlan(active);

  let sub: { plan: PlanId; status: string; current_period_end: string | null; cancel_at_period_end: boolean; stripe_subscription_id: string | null } | null = null;
  if (session.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("subscriptions").select("plan, status, current_period_end, cancel_at_period_end, stripe_subscription_id").maybeSingle();
    sub = data;
  }
  const paying = !!sub?.stripe_subscription_id && sub.status !== "canceled";
  const days = trialDaysLeft(session);
  const canPay = session.mode === "live" && isStripeConfigured();

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{T.title}</h1>

      {flash === "success" && <Note tone="ok">{T.success}</Note>}
      {flash === "cancelled" && <Note>{T.cancelled}</Note>}
      {session.mode === "demo" && <Note>{T.demo}</Note>}
      {session.mode === "live" && !isStripeConfigured() && <Note>{T.notConfigured}</Note>}

      {paying ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="text-sm text-ink-muted">{T.current}</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
              {T.plans[sub!.plan].name} <Badge tone={sub!.status === "active" || sub!.status === "trialing" ? "ok" : "warn"}>{T.status[sub!.status as keyof typeof T.status]}</Badge>
            </p>
            {sub!.current_period_end && (
              <p className="mt-1 text-sm text-ink-muted">
                {(sub!.cancel_at_period_end ? T.cancels : T.renews)(formatDate(sub!.current_period_end.slice(0, 10), locale))}
              </p>
            )}
          </div>
          <form action={openPortal}>
            <Button type="submit" variant="secondary"><ExternalLink className="size-4" aria-hidden /> {T.manage}</Button>
          </form>
        </Card>
      ) : (
        <Note tone={days ? "brand" : "warn"}>{days ? T.trial(days) : T.trialEnded}</Note>
      )}

      {paying && exceedsPlan(sub!.plan, active) && <Note tone="warn">{T.overLimit}</Note>}

      {!paying && (
        <>
          <p className="text-sm text-ink-muted">{T.activeInvoices(active)}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["starter", "pro"] as const).map((plan) => (
              <Card key={plan} className={`flex flex-col p-6 ${plan === recommended ? "ring-2 ring-brand-600" : ""}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{T.plans[plan].name}</h2>
                  {plan === recommended && <Badge tone="brand">{T.recommended}</Badge>}
                </div>
                <p className="mt-4">
                  <span className="text-4xl font-semibold tracking-tight">{locale === "fr" ? `${PLANS[plan].priceCad} $` : `$${PLANS[plan].priceCad}`}</span>
                  <span className="text-ink-muted">{T.perMonth}</span>
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted"><Check className="size-4 text-brand-600" aria-hidden /> {T.plans[plan].limit}</p>
                <form action={startCheckout.bind(null, plan)} className="mt-6">
                  <Button type="submit" variant={plan === recommended ? "primary" : "secondary"} className="w-full" disabled={!canPay}>{T.choose}</Button>
                </form>
              </Card>
            ))}
          </div>
          <p className="text-sm text-ink-subtle">{T.taxes}</p>
        </>
      )}
    </div>
  );
}

function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "brand" }) {
  const cls = {
    neutral: "bg-surface-muted text-ink-muted",
    ok: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    warn: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    brand: "bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-200",
  }[tone];
  return <p role="status" className={`rounded-xl px-4 py-3 text-sm ${cls}`}>{children}</p>;
}
