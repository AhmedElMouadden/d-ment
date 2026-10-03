import Link from "next/link";
import { ArrowRight, BellRing, CheckCircle2, Languages, Layers, MailCheck, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { buttonClass, Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";

const featureIcons = [CheckCircle2, Layers, Languages, SlidersHorizontal, MailCheck, ShieldCheck];

export default async function LandingPage() {
  const { t, locale } = await getDictionary();
  const L = t.landing;

  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo name={t.common.appName} />
        <nav className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher locale={locale} label={t.common.switchTo} />
          <Link href="/login" className={`${buttonClass("ghost", "sm")} whitespace-nowrap`}>{t.common.signIn}</Link>
          <span className="hidden sm:block">
            <Link href="/signup" className={buttonClass("primary", "sm")}>{t.common.signUp}</Link>
          </span>
        </nav>
      </header>

      <main className="flex-1">
        {/* Héros */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800 ring-1 ring-brand-100 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-900">
              <BellRing className="size-4" aria-hidden /> {L.eyebrow}
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">{L.title}</h1>
            <p className="mt-6 max-w-xl text-lg text-ink-muted text-pretty">{L.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup" className={buttonClass("primary", "lg")}>
                {L.ctaPrimary} <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/demo" className={buttonClass("secondary", "lg")}>{L.ctaSecondary}</Link>
            </div>
            <p className="mt-4 text-sm text-ink-subtle">{L.noCard}</p>
          </div>
          <HeroPreview locale={locale} />
        </section>

        {/* Étapes */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{L.stepsTitle}</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3">
              {L.steps.map((step, i) => (
                <li key={step.title}>
                  <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Fonctionnalités */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{L.featuresTitle}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {L.features.map((f, i) => {
              const Icon = featureIcons[i];
              return (
                <Card key={f.title} className="p-6">
                  <Icon className="size-6 text-brand-600" aria-hidden />
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{f.body}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Prix */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{L.pricingTitle}</h2>
          <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            {L.plans.map((p, i) => (
              <Card key={p.name} className={i === 1 ? "p-6 ring-2 ring-brand-600" : "p-6"}>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-4">
                  <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
                  <span className="text-ink-muted">{p.period}</span>
                </p>
                <p className="mt-2 text-sm text-ink-muted">{p.limit}</p>
                <Link href="/signup" className={`${buttonClass(i === 1 ? "primary" : "secondary")} mt-6 w-full`}>{L.ctaPrimary}</Link>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-subtle">{L.pricingNote}</p>
          <p className="mt-10 flex max-w-3xl items-start gap-3 rounded-2xl bg-surface-muted p-5 text-sm text-ink-muted">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden /> {L.trust}
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-ink-subtle sm:px-6">
          <span>© {new Date().getFullYear()} {t.common.appName}</span>
          <Link href="/privacy" className="hover:text-ink">{L.footerPrivacy}</Link>
        </div>
      </footer>
    </div>
  );
}

/** Aperçu décoratif d'un courriel de relance regroupé. */
function HeroPreview({ locale }: { locale: "fr" | "en" }) {
  const fr = locale === "fr";
  const rows = fr
    ? [["Facture 1048", "1 250,00 $", "15 jours"], ["Facture 1053", "640,00 $", "7 jours"]]
    : [["Invoice 1048", "$1,250.00", "15 days"], ["Invoice 1053", "$640.00", "7 days"]];
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-100 via-transparent to-amber-100 blur-2xl dark:from-brand-950 dark:to-amber-950/40" />
      <Card className="p-6">
        <div className="flex items-center justify-between text-xs text-ink-subtle">
          <span>{fr ? "De : Studio Bleu inc." : "From: Studio Bleu inc."}</span>
          <span>{fr ? "J+15 · ton ferme" : "Day 15 · firm tone"}</span>
        </div>
        <p className="mt-3 font-semibold">{fr ? "Rappel : 2 factures en souffrance" : "Reminder: 2 overdue invoices"}</p>
        <p className="mt-3 text-sm text-ink-muted">
          {fr
            ? "Bonjour Marie-Ève, sauf erreur de notre part, les factures suivantes demeurent impayées :"
            : "Hi Sarah, according to our records, the following invoices remain unpaid:"}
        </p>
        <ul className="mt-4 divide-y divide-line rounded-xl ring-1 ring-line">
          {rows.map(([a, b, c]) => (
            <li key={a} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium">{a}</span>
              <span className="text-ink-muted">{c}</span>
              <span className="font-semibold tabular-nums">{b}</span>
            </li>
          ))}
        </ul>
        <div className={`${buttonClass("primary", "sm")} mt-5 w-full`}>{fr ? "Payer en ligne" : "Pay online"}</div>
      </Card>
      <Card className="absolute -top-8 -left-6 hidden items-center gap-3 px-4 py-3 sm:flex">
        <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div className="text-sm">
          <p className="font-medium">{fr ? "Facture 1048 payée" : "Invoice 1048 paid"}</p>
          <p className="text-ink-subtle">{fr ? "Relances arrêtées automatiquement" : "Reminders stopped automatically"}</p>
        </div>
      </Card>
    </div>
  );
}
