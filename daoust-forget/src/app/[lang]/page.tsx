import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchFinder } from "@/components/branch-finder";
import { HeroArt } from "@/components/hero-art";
import { pricingIcons } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import {
  EcoHomeSection,
  FaqSection,
  FinalCta,
  HowItWorks,
  ReviewsSection,
  ServicesByNeed,
  TimingSection,
  WhySection,
} from "@/components/sections";
import { buttonClass, Container, Section, SectionHeading } from "@/components/ui";
import { Fact } from "@/components/verification-badge";
import { billingModel, pricingCategories } from "@/content/pricing";
import { since } from "@/content/site";
import { getDictionary } from "@/dictionaries";
import { visibleBranches, visibleServices } from "@/lib/data";
import { fmt } from "@/lib/fmt";
import { hasLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { organizationLd, pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    route: "home",
    title: dict.meta.homeTitle,
    description: dict.meta.homeDescription,
  });
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const d = dict.hero;
  const finderDict = { branch: dict.branch, finder: dict.finder, preview: dict.preview, a11y: dict.a11y };

  return (
    <>
      <JsonLd data={organizationLd()} />

      {/* A. Hero: what we do, and the next step */}
      <section aria-labelledby="hero-title" className="overflow-hidden">
        <Container className="grid items-center gap-10 pt-10 pb-12 sm:pt-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-16">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-wide text-moss uppercase">{d.eyebrow}</p>
            <h1 id="hero-title" className="text-[2.5rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem]">
              {d.title}
            </h1>
            <p className="mt-5 max-w-xl text-xl text-ink">{d.lead}</p>
            <p className="mt-3 max-w-xl text-muted">{d.expertise}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={href(lang, "locations")} className={buttonClass("primary", "lg")}>
                {d.primary}
              </Link>
              <Link href={href(lang, "pricing")} className={buttonClass("secondary", "lg")}>
                {d.secondary}
              </Link>
            </div>
            <p className="mt-6 text-[0.9375rem] font-medium text-forest">
              <Fact fact={since} dict={dict}>
                {(year) => fmt(d.since, { year })}
              </Fact>
            </p>
          </div>
          <HeroArt className="mx-auto hidden w-full max-w-md sm:block" />
        </Container>
      </section>

      {/* C. Branch finder: the primary action, right under the hero */}
      <section id="trouver" aria-labelledby="finder-title" className="border-y border-line bg-linen py-12 sm:py-16">
        <Container>
          <div className="mb-6 max-w-2xl">
            <h2 id="finder-title" className="text-3xl sm:text-4xl">
              {dict.finder.title}
            </h2>
            <p className="mt-2 text-lg text-muted">{dict.finder.lead}</p>
          </div>
          <BranchFinder
            lang={lang}
            dict={finderDict}
            branches={visibleBranches()}
            geocoding={Boolean(process.env.MAPBOX_ACCESS_TOKEN)}
            placement="home"
          />
        </Container>
      </section>

      {/* D. Services by customer need */}
      <Section id="services" labelledBy="services-title">
        <SectionHeading id="services-title" title={dict.services.title} lead={dict.services.lead} />
        <ServicesByNeed lang={lang} dict={dict} services={visibleServices()} />
      </Section>

      {/* E. Pricing entry points */}
      <Section id="tarifs" tone="linen" labelledBy="pricing-title">
        <SectionHeading
          id="pricing-title"
          title={dict.pricing.title}
          lead={
            <Fact fact={billingModel} dict={dict} fallback={dict.pricing.varies}>
              {(v) => v[lang]}
            </Fact>
          }
        />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {pricingCategories.map((c) => {
            const Icon = pricingIcons[c.icon];
            return (
              <li key={c.id}>
                <Link
                  href={href(lang, "pricing", undefined, c.id)}
                  className="flex h-full min-h-28 flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-white p-4 font-medium hover:border-forest"
                >
                  <Icon aria-hidden className="size-6 text-moss" />
                  {c.name[lang]}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href={href(lang, "locations")} className={buttonClass("primary", "lg")}>
            {dict.pricing.findCta}
          </Link>
          <Link href={href(lang, "pricing")} className="inline-flex min-h-11 items-center gap-1 font-semibold text-forest hover:underline">
            {dict.hero.secondary} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </Section>

      {/* F. Turnaround and convenience */}
      <TimingSection lang={lang} dict={dict} />

      {/* G. Ecological cleaning */}
      <EcoHomeSection lang={lang} dict={dict} />

      {/* H. Differentiators */}
      <WhySection dict={dict} />

      {/* I. Reviews (genuine only) */}
      <ReviewsSection lang={lang} dict={dict} />

      {/* J. How it works */}
      <HowItWorks lang={lang} dict={dict} />

      {/* K. FAQ */}
      <FaqSection lang={lang} dict={dict} />

      {/* L. Final call to action */}
      <FinalCta lang={lang} dict={dict} />
    </>
  );
}
