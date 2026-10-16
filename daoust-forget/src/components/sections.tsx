import { ArrowRight, Check, CircleAlert, Clock, Droplets, Store, Timer, Truck } from "lucide-react";
import Link from "next/link";
import { faq } from "@/content/faq";
import { ecoClaims, ecoComparison, ecoOther, ecoProcessVerification, ecoSteps, ecoSuitable } from "@/content/eco";
import { needs, type Service } from "@/content/services";
import { reviews } from "@/content/reviews";
import { pickupDelivery } from "@/content/site";
import type { Dict } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { canShow, isPreview, unverified } from "@/lib/verification";
import { sources } from "@/content/sources";
import { FaqList } from "./faq-list";
import { serviceIcons } from "./icons";
import { TrackedLink } from "./tracked-link";
import { buttonClass, Card, Chip, Section, SectionHeading } from "./ui";
import { Fact, VerificationBadge } from "./verification-badge";

type P = { lang: Locale; dict: Dict };

export function ServiceCard({ service, lang, dict, headingLevel = 3 }: P & { service: Service; headingLevel?: 2 | 3 }) {
  const Icon = serviceIcons[service.icon];
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <Card className="flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-forest-soft text-forest">
          <Icon aria-hidden className="size-6" />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {service.availability === "some" ? <Chip tone="clay">{dict.services.some}</Chip> : <Chip>{dict.services.all}</Chip>}
          {service.remote && <Chip tone="forest">{dict.services.remote}</Chip>}
        </div>
      </div>
      <H className="mt-5 text-xl">
        <Link href={href(lang, "services", service.slug)} className="hover:text-forest hover:underline">
          {service.name[lang]}
        </Link>{" "}
        <VerificationBadge v={service.verification} dict={dict} />
      </H>
      <p className="mt-2 text-muted">{service.short[lang]}</p>
      <p className="mt-3 flex gap-2 text-[0.9375rem]">
        <Check aria-hidden className="mt-1 size-4 shrink-0 text-moss" />
        {service.benefit[lang]}
      </p>
      <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-5">
        {service.pricing.length > 0 && (
          <TrackedLink
            href={href(lang, "pricing", undefined, service.pricing[0])}
            event="service_pricing_click"
            params={{ service: service.slug }}
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-forest hover:underline"
          >
            {dict.services.viewPricing}
            <span className="sr-only"> : {service.name[lang]}</span>
            <ArrowRight aria-hidden className="size-4" />
          </TrackedLink>
        )}
        <Link href={href(lang, "services", service.slug)} className="inline-flex min-h-11 items-center text-muted hover:text-forest hover:underline">
          {dict.services.details}
          <span className="sr-only"> : {service.name[lang]}</span>
        </Link>
      </div>
    </Card>
  );
}

export function ServicesByNeed({ lang, dict, services, headingLevel = 3 }: P & { services: Service[]; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="space-y-12">
      {needs.map((need) => {
        const list = services.filter((s) => s.need === need.id);
        if (!list.length) return null;
        return (
          <div key={need.id}>
            <H className="mb-5 font-sans text-sm font-semibold tracking-wide text-muted uppercase">{need.label[lang]}</H>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <li key={s.slug}>
                  <ServiceCard service={s} lang={lang} dict={dict} headingLevel={headingLevel === 2 ? 3 : 2} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function TimingSection({ lang, dict, tone = "paper" }: P & { tone?: "paper" | "linen" }) {
  const d = dict.timing;
  const delivery = canShow(pickupDelivery.turnaround.verification) ? pickupDelivery.turnaround : null;
  const items = [
    { icon: Clock, title: d.standard, body: d.standardBody, tag: d.confirmed },
    { icon: Timer, title: d.express, body: d.expressBody, tag: d.varies },
    { icon: CircleAlert, title: d.specialty, body: d.specialtyBody, tag: d.confirmed },
  ];
  return (
    <Section id="delais" tone={tone} labelledBy="timing-title">
      <SectionHeading id="timing-title" title={d.title} lead={d.lead} />
      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <li key={it.title}>
            <Card className="h-full p-6">
              <it.icon aria-hidden className="size-6 text-moss" />
              <h3 className="mt-4 font-sans text-lg font-semibold">{it.title}</h3>
              <p className="mt-2 text-[0.9375rem] text-muted">{it.body}</p>
              <p className="mt-4">
                <Chip>{it.tag}</Chip>
              </p>
            </Card>
          </li>
        ))}
        {delivery && (
          <li>
            <Card className="h-full p-6">
              <Truck aria-hidden className="size-6 text-moss" />
              <h3 className="mt-4 font-sans text-lg font-semibold">{d.delivery}</h3>
              <p className="mt-2 text-[0.9375rem] text-muted">
                {delivery.value[lang]} <VerificationBadge v={delivery.verification} dict={dict} />
              </p>
              <p className="mt-4">
                <Chip>{d.estimate}</Chip>
              </p>
            </Card>
          </li>
        )}
      </ul>
    </Section>
  );
}

export function EcoSteps({ lang, dict }: P) {
  return (
    <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {ecoSteps.map((s, i) => (
        <li key={s.title.fr} className="relative rounded-[var(--radius-card)] border border-line bg-white p-6">
          <span className="font-display text-4xl text-moss" aria-hidden>
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-3 font-sans text-lg font-semibold">
            <span className="sr-only">{i + 1}. </span>
            {s.title[lang]}
          </h3>
          <p className="mt-2 text-[0.9375rem] text-muted">{s.body[lang]}</p>
        </li>
      ))}
      {isPreview && (
        <li className="sm:col-span-2 lg:col-span-4">
          <VerificationBadge v={ecoProcessVerification} dict={dict} />
        </li>
      )}
    </ol>
  );
}

export function EcoSuitability({ lang, dict }: P) {
  const d = dict.eco;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card className="p-6">
        <h3 className="font-sans text-lg font-semibold">{d.suitableTitle}</h3>
        <ul className="mt-3 space-y-2">
          {ecoSuitable.map((x) => (
            <li key={x.fr} className="flex gap-2">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-moss" />
              {x[lang]}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-6">
        <h3 className="font-sans text-lg font-semibold">{d.otherTitle}</h3>
        <ul className="mt-3 space-y-2">
          {ecoOther.map((x) => (
            <li key={x.fr} className="flex gap-2">
              <CircleAlert aria-hidden className="mt-1 size-4 shrink-0 text-clay" />
              {x[lang]}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[0.9375rem] text-muted">{d.otherBody}</p>
      </Card>
    </div>
  );
}

export function EcoComparison({ lang, dict }: P) {
  const d = dict.eco;
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
      <table className="w-full min-w-[34rem] text-left text-[0.9375rem]">
        <caption className="sr-only">{d.compareTitle}</caption>
        <thead className="bg-linen">
          <tr>
            <td className="p-4" />
            <th scope="col" className="p-4 font-semibold text-forest">
              {d.compareWater}
            </th>
            <th scope="col" className="p-4 font-semibold">
              {d.compareDry}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {ecoComparison.map((row) => (
            <tr key={row.label.fr}>
              <th scope="row" className="p-4 font-semibold">
                {row.label[lang]}
              </th>
              <td className="p-4">{row.water[lang]}</td>
              <td className="p-4 text-muted">{row.dry[lang]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EcoClaims({ lang, dict }: P) {
  const shownClaims = ecoClaims.filter((c) => canShow(c.verification));
  if (!shownClaims.length) return null;
  return (
    <div>
      <ul className="space-y-3">
        {shownClaims.map((c) => (
          <li key={c.value.fr} className="flex gap-3">
            <Droplets aria-hidden className="mt-1 size-5 shrink-0 text-moss" />
            <span>
              {c.value[lang]} <VerificationBadge v={c.verification} dict={dict} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted">{dict.eco.claimsNote}</p>
    </div>
  );
}

export function EcoHomeSection({ lang, dict }: P) {
  const d = dict.eco;
  return (
    <Section id="ecologique" tone="linen" labelledBy="eco-title">
      <SectionHeading id="eco-title" eyebrow={d.eyebrow} title={d.title} lead={d.lead} />
      <EcoSteps lang={lang} dict={dict} />
      <div className="mt-10">
        <EcoSuitability lang={lang} dict={dict} />
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href={href(lang, "locations")} className={buttonClass("primary", "lg")}>
          {d.cta}
        </Link>
        <Link href={href(lang, "eco")} className="inline-flex min-h-11 items-center gap-1 font-semibold text-forest hover:underline">
          {d.more} <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </Section>
  );
}

const whyVerification = unverified(
  `${sources.officialAbout} ; ${sources.daoustValetHistory}`,
  "Chaque différenciateur reprend une affirmation de l'entreprise (historique, procédé, réseau). Faire valider la formulation.",
);

export function WhySection({ dict }: Pick<P, "dict">) {
  if (!canShow(whyVerification)) return null;
  return (
    <Section id="pourquoi" labelledBy="why-title">
      <SectionHeading id="why-title" title={<>{dict.why.title} <VerificationBadge v={whyVerification} dict={dict} /></>} />
      <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {dict.why.items.map((it) => (
          <li key={it.title} className="border-t-2 border-moss pt-5">
            <h3 className="font-sans text-lg font-semibold">{it.title}</h3>
            <p className="mt-2 text-[0.9375rem] text-muted">{it.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** Genuine reviews only. Hidden entirely until verified reviews exist. */
export function ReviewsSection({ lang, dict, branchSlug }: P & { branchSlug?: string }) {
  const list = reviews.filter((r) => canShow(r.verification) && (!branchSlug || r.branchSlug === branchSlug));
  if (!list.length) {
    return isPreview && !branchSlug ? (
      <Section labelledBy="reviews-title" className="py-8!">
        <h2 id="reviews-title" className="sr-only">
          {dict.reviews.title}
        </h2>
        <p className="rounded-2xl border border-dashed border-clay/40 bg-clay-soft/40 p-4 text-sm text-clay">{dict.preview.reviewsEmpty}</p>
      </Section>
    ) : null;
  }
  return (
    <Section id="avis" labelledBy="reviews-title">
      <SectionHeading id="reviews-title" title={dict.reviews.title} />
      <ul className="grid gap-5 md:grid-cols-3">
        {list.slice(0, 6).map((r) => (
          <li key={r.id}>
            <Card className="h-full p-6">
              <blockquote lang={r.lang}>
                <p>« {r.text} »</p>
              </blockquote>
              <p className="mt-4 text-sm text-muted">
                — {r.author}, {new Date(r.date).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { year: "numeric", month: "long" })}{" "}
                {dict.reviews.on.replace("{platform}", r.platform)}
              </p>
              <a href={r.url} rel="noopener" className="mt-3 inline-block text-sm font-semibold text-forest underline">
                {dict.reviews.read}
              </a>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function HowItWorks({ lang, dict }: P) {
  const d = dict.how;
  const Col = ({ icon: Icon, title, steps, cta, to, primary }: { icon: typeof Store; title: string; steps: string[]; cta: string; to: string; primary?: boolean }) => (
    <Card className="flex flex-col p-6 sm:p-8">
      <Icon aria-hidden className="size-7 text-moss" />
      <h3 className="mt-4 text-2xl">{title}</h3>
      <ol className="mt-5 space-y-4">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-4">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-forest-soft text-sm font-bold text-forest" aria-hidden>
              {i + 1}
            </span>
            <span className="pt-1">
              <span className="sr-only">{i + 1}. </span>
              {s}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-auto pt-6">
        <Link href={to} className={buttonClass(primary ? "primary" : "secondary")}>
          {cta}
        </Link>
      </div>
    </Card>
  );
  return (
    <Section id="fonctionnement" tone="linen" labelledBy="how-title">
      <SectionHeading id="how-title" title={d.title} />
      <div className="grid gap-5 lg:grid-cols-2">
        {Col({ icon: Store, title: d.storeTitle, steps: d.storeSteps, cta: d.storeCta, to: href(lang, "locations"), primary: true })}
        {Col({ icon: Truck, title: d.onlineTitle, steps: d.onlineSteps, cta: d.onlineCta, to: href(lang, "order") })}
      </div>
      <p className="mt-6 flex gap-2 text-[0.9375rem] text-muted">
        <CircleAlert aria-hidden className="mt-1 size-4 shrink-0 text-clay" />
        {d.note}
      </p>
    </Section>
  );
}

export function faqEntries(lang: Locale, filter?: (id: string, home?: boolean) => boolean) {
  return faq
    .filter((f) => (filter ? filter(f.id, f.home) : true))
    .map((f) => ({
      id: f.id,
      q: f.q[lang],
      a: f.a[lang],
      link: f.link ? { href: href(lang, f.link.route), label: f.link.label[lang] } : undefined,
    }));
}

export function FaqSection({ lang, dict }: P) {
  return (
    <Section id="faq" labelledBy="faq-title">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 id="faq-title" className="text-3xl sm:text-4xl">
            {dict.faq.title}
          </h2>
          <Link href={href(lang, "faq")} className="mt-4 inline-flex min-h-11 items-center gap-1 font-semibold text-forest hover:underline">
            {dict.faq.all} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <FaqList items={faqEntries(lang, (_, home) => Boolean(home))} placement="home" />
      </div>
    </Section>
  );
}

export function FinalCta({ lang, dict }: P) {
  const d = dict.finalCta;
  return (
    <Section tone="forest" labelledBy="final-title">
      <div className="max-w-2xl">
        <h2 id="final-title" className="text-3xl text-white sm:text-4xl">
          {d.title}
        </h2>
        <p className="mt-4 text-lg text-sand">{d.body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={href(lang, "locations")} className={buttonClass("light", "lg")}>
            {d.primary}
          </Link>
          <Link href={href(lang, "pricing")} className="inline-flex min-h-12 items-center rounded-full px-6 font-semibold text-white ring-1 ring-white/40 hover:bg-white/10">
            {d.secondary}
          </Link>
        </div>
      </div>
    </Section>
  );
}

export function PreviewBanner({ dict }: { dict: Dict }) {
  if (!isPreview) return null;
  return (
    <div className="bg-clay-soft text-clay">
      <p className="mx-auto max-w-6xl px-4 py-2 text-sm sm:px-6 lg:px-8">{dict.preview.banner}</p>
    </div>
  );
}

export { Fact };
