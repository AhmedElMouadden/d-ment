import { ArrowLeft, Check, CircleAlert, Store, Truck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BranchCard } from "@/components/branch-card";
import { serviceIcons } from "@/components/icons";
import { TrackedLink } from "@/components/tracked-link";
import { buttonClass, Chip, Container } from "@/components/ui";
import { VerificationBadge } from "@/components/verification-badge";
import { pricingCategories } from "@/content/pricing";
import { getService, services } from "@/content/services";
import { branchesOffering } from "@/lib/data";
import { hasLocale, locales } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { href } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { canShow } from "@/lib/verification";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((lang) => services.filter((s) => canShow(s.verification)).map((s) => ({ lang, slug: s.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/services/[slug]">) {
  const { lang, slug } = await params;
  const s = getService(slug);
  if (!hasLocale(lang) || !s) return {};
  return pageMetadata({ lang, route: "services", sub: s.slug, title: s.name[lang], description: `${s.short[lang]} ${s.benefit[lang]}` });
}

export default async function ServicePage({ params }: PageProps<"/[lang]/services/[slug]">) {
  const { lang, dict } = await resolveLang(params);
  const { slug } = await params;
  const s = getService(slug);
  if (!s || !canShow(s.verification)) notFound();
  const Icon = serviceIcons[s.icon];
  const cats = pricingCategories.filter((c) => s.pricing.includes(c.id));
  const offering = branchesOffering(s.slug);

  return (
    <>
      <div className="border-b border-line bg-linen">
        <Container className="py-10 sm:py-14">
          <Link href={href(lang, "services")} className="inline-flex min-h-11 items-center gap-2 font-medium text-forest hover:underline">
            <ArrowLeft aria-hidden className="size-4" />
            {dict.services.allServices}
          </Link>
          <div className="mt-4 flex items-start gap-4">
            <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-forest sm:inline-flex">
              <Icon aria-hidden className="size-7" />
            </span>
            <div>
              <h1 className="text-4xl sm:text-5xl">{s.name[lang]}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {s.availability === "some" ? <Chip tone="clay">{dict.services.some}</Chip> : <Chip>{dict.services.all}</Chip>}
                <Chip tone="forest">
                  {s.remote ? <Truck aria-hidden className="size-3.5" /> : <Store aria-hidden className="size-3.5" />}
                  {s.remote ? dict.services.remote : dict.services.inStore}
                </Chip>
                <VerificationBadge v={s.verification} dict={dict} />
              </div>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-xl">{s.short[lang]}</p>
        </Container>
      </div>

      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5 text-lg">
          <p className="flex gap-3 font-medium">
            <Check aria-hidden className="mt-1.5 size-5 shrink-0 text-moss" />
            {s.benefit[lang]}
          </p>
          {s.details.map((p) => (
            <p key={p.fr} className="text-muted">
              {p[lang]}
            </p>
          ))}
          {s.availability === "some" && (
            <p className="flex gap-3 rounded-2xl border border-clay/30 bg-clay-soft/50 p-4 text-base">
              <CircleAlert aria-hidden className="mt-1 size-5 shrink-0 text-clay" />
              {dict.services.availabilityNote}
            </p>
          )}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Link href={href(lang, "locations")} className={buttonClass("primary", "lg")}>
              {dict.services.findOffering}
            </Link>
            {s.remote && (
              <Link href={href(lang, "order")} className={buttonClass("secondary", "lg")}>
                {dict.nav.order}
              </Link>
            )}
          </div>
        </div>

        {cats.length > 0 && (
          <aside aria-labelledby="related-title" className="rounded-[var(--radius-card)] border border-line bg-white p-6">
            <h2 id="related-title" className="font-sans text-lg font-semibold">
              {dict.services.related}
            </h2>
            <ul className="mt-3 space-y-1">
              {cats.map((c) => (
                <li key={c.id}>
                  <TrackedLink
                    href={href(lang, "pricing", undefined, c.id)}
                    event="service_pricing_click"
                    params={{ service: s.slug }}
                    className="inline-flex min-h-11 items-center font-medium text-forest hover:underline"
                  >
                    {c.name[lang]}
                  </TrackedLink>
                </li>
              ))}
            </ul>
            <Link href={href(lang, "pricing")} className={`${buttonClass("secondary")} mt-4`}>
              {dict.services.viewPricing}
            </Link>
          </aside>
        )}
      </Container>

      {offering.length > 0 && (
        <Container className="pb-16">
          <h2 className="text-2xl">{dict.services.findOffering}</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {offering.map((b) => (
              <li key={b.slug}>
                <BranchCard
                  branch={b}
                  lang={lang}
                  dict={{ branch: dict.branch, finder: dict.finder, preview: dict.preview, a11y: dict.a11y }}
                  placement={`service_${s.slug}`}
                />
              </li>
            ))}
          </ul>
        </Container>
      )}
    </>
  );
}
