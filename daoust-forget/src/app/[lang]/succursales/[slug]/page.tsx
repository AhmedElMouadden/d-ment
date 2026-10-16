import { ArrowLeft, MapPin, Navigation, Phone, Truck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatAddress } from "@/components/branch-card";
import { JsonLd } from "@/components/json-ld";
import { OpenNow } from "@/components/open-now";
import { ReviewsSection } from "@/components/sections";
import { TrackedLink } from "@/components/tracked-link";
import { buttonClass, Card, Chip, Container } from "@/components/ui";
import { VerificationBadge } from "@/components/verification-badge";
import { branches } from "@/content/branches";
import { getService } from "@/content/services";
import { banners } from "@/content/site";
import { getDictionary } from "@/dictionaries";
import { directionsUrl } from "@/lib/branch-search";
import { findVisibleBranch } from "@/lib/data";
import { fmt } from "@/lib/fmt";
import { dayNames, formatTime } from "@/lib/hours";
import { hasLocale, locales } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { href } from "@/lib/routes";
import { branchLd, pageMetadata } from "@/lib/seo";
import { canShow } from "@/lib/verification";

export const dynamicParams = false;

export function generateStaticParams() {
  // In strict mode unverified branches get no page at all.
  return locales.flatMap((lang) => branches.filter((b) => canShow(b.verification)).map((b) => ({ lang, slug: b.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/succursales/[slug]">) {
  const { lang, slug } = await params;
  const b = findVisibleBranch(slug);
  if (!hasLocale(lang) || !b) return {};
  const dict = getDictionary(lang);
  const a = b.address;
  return pageMetadata({
    lang,
    route: "locations",
    sub: b.slug,
    title: `${dict.meta.siteName} ${b.name[lang]}`,
    description:
      lang === "fr"
        ? `Nettoyeur ${dict.meta.siteName} à ${a.city} : ${a.street}. Heures, téléphone, itinéraire et services de la succursale.`
        : `${dict.meta.siteName} cleaner in ${a.city}: ${a.street}. Branch hours, phone, directions and services.`,
    noindex: b.verification.status !== "verified",
  });
}

export default async function BranchPage({ params }: PageProps<"/[lang]/succursales/[slug]">) {
  const { lang, dict } = await resolveLang(params);
  const { slug } = await params;
  const b = findVisibleBranch(slug);
  if (!b) notFound();
  const d = dict.branch;
  const addr = formatAddress(b, lang);
  const banner = banners.find((x) => x.id === b.banner);
  const offered = (b.services ?? []).map(getService).filter((s) => s && canShow(s.verification));

  return (
    <>
      {/* Structured data only once the branch is verified. */}
      {b.verification.status === "verified" && <JsonLd data={branchLd(b, lang)} />}

      <div className="border-b border-line bg-linen">
        <Container className="py-10 sm:py-14">
          <nav aria-label={dict.a11y.breadcrumb}>
            <Link href={href(lang, "locations")} className="inline-flex min-h-11 items-center gap-2 font-medium text-forest hover:underline">
              <ArrowLeft aria-hidden className="size-4" />
              {d.back}
            </Link>
          </nav>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {banner && <Chip tone="forest">{banner.name}</Chip>}
            <VerificationBadge v={b.verification} dict={dict} />
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl">{b.name[lang]}</h1>
          <p className="mt-4 flex gap-2 text-lg">
            <MapPin aria-hidden className="mt-1.5 size-5 shrink-0 text-moss" />
            <span>
              {addr.line1}, {addr.line2}
            </span>
          </p>
          <div className="mt-2">
            <OpenNow hours={b.hours} lang={lang} dict={d} />
          </div>
          {/* Primary local actions: directions and click-to-call. */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <TrackedLink
              href={directionsUrl(b)}
              event="directions_click"
              params={{ branch_id: b.slug, placement: "branch_page" }}
              target="_blank"
              rel="noopener"
              className={buttonClass("primary", "lg")}
            >
              <Navigation aria-hidden className="size-5" />
              {d.directions}
              <span className="sr-only"> {dict.a11y.newTab}</span>
            </TrackedLink>
            {b.phone ? (
              <TrackedLink
                href={`tel:${b.phone.tel}`}
                event="phone_click"
                params={{ branch_id: b.slug, placement: "branch_page" }}
                className={buttonClass("secondary", "lg")}
              >
                <Phone aria-hidden className="size-5" />
                {d.call} {b.phone.display}
              </TrackedLink>
            ) : (
              <p className="self-center text-muted">{d.phoneUnknown}</p>
            )}
          </div>
        </Container>
      </div>

      <Container className="grid gap-6 py-10 sm:py-14 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="font-sans text-lg font-semibold">{d.hours}</h2>
          {b.hours ? (
            <table className="mt-3 w-full text-[0.9375rem]">
              <tbody>
                {b.hours.map((h, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <th scope="row" className="py-2 text-left font-medium">
                      {dayNames[lang][i]}
                    </th>
                    <td className="py-2 text-right text-muted">
                      {h === "unknown" ? d.unknownDay : h ? `${formatTime(h[0], lang)} – ${formatTime(h[1], lang)}` : d.closed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-3 text-muted">{d.hoursUnknown}</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-sans text-lg font-semibold">{d.services}</h2>
          {offered.length ? (
            <ul className="mt-3 space-y-2">
              {offered.map((s) => (
                <li key={s!.slug}>
                  <Link href={href(lang, "services", s!.slug)} className="font-medium text-forest hover:underline">
                    {s!.name[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">{d.servicesUnknown}</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-sans text-lg font-semibold">{d.pricing}</h2>
          <p className="mt-3 text-muted">{d.pricingBody}</p>
          <Link href={href(lang, "pricing")} className="mt-3 inline-flex min-h-11 items-center font-semibold text-forest hover:underline">
            {d.pricingLink}
          </Link>
          <h2 className="mt-6 flex items-center gap-2 font-sans text-lg font-semibold">
            <Truck aria-hidden className="size-5 text-moss" />
            {d.ordering}
          </h2>
          <p className="mt-2 text-muted">{d.orderingBody}</p>
          <Link href={href(lang, "order")} className="mt-3 inline-flex min-h-11 items-center font-semibold text-forest hover:underline">
            {dict.how.onlineCta}
          </Link>
        </Card>

        <Card className="p-6 lg:col-span-3">
          <h2 className="font-sans text-lg font-semibold">{d.reviews}</h2>
          {b.reviewsUrl ? (
            <a href={b.reviewsUrl} rel="noopener" className="mt-3 inline-flex min-h-11 items-center font-semibold text-forest hover:underline">
              {fmt(d.reviewsLink, { platform: "Google" })}
            </a>
          ) : (
            <p className="mt-3 text-muted">{d.reviewsNone}</p>
          )}
          {b.notes && <p className="mt-4">{b.notes[lang]}</p>}
        </Card>
      </Container>
      <ReviewsSection lang={lang} dict={dict} branchSlug={b.slug} />
    </>
  );
}
