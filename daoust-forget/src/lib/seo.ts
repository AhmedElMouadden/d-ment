import type { Metadata } from "next";
import type { Branch } from "@/content/branches";
import { brand, siteUrl } from "@/content/site";
import { openingHoursSpec } from "./hours";
import { localeTag, locales, type Locale } from "./i18n";
import { href, type RouteKey } from "./routes";
import { isPreview } from "./verification";

/** Title, description, canonical and hreflang alternates for one page. */
export function pageMetadata({
  lang,
  route,
  sub,
  title,
  description,
  noindex,
}: {
  lang: Locale;
  route: RouteKey;
  sub?: string;
  title: string;
  description: string;
  noindex?: boolean;
}): Metadata {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[localeTag[l]] = href(l, route, sub);
  languages["x-default"] = href("fr", route, sub);
  return {
    title,
    description,
    alternates: { canonical: href(lang, route, sub), languages },
    openGraph: {
      title,
      description,
      url: href(lang, route, sub),
      siteName: brand.name,
      locale: localeTag[lang].replace("-", "_"),
      type: "website",
    },
    // The preview build must never be indexed; neither should unverified pages.
    robots: isPreview || noindex ? { index: false, follow: false } : undefined,
  };
}

/** Serialize JSON-LD safely for a <script> tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    legalName: brand.legalName,
    url: siteUrl,
  };
}

/**
 * DryCleaningOrLaundry for one branch. Only call for verified branches:
 * structured data must reflect accurate business details.
 */
export function branchLd(b: Branch, lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "DryCleaningOrLaundry",
    name: `${brand.name} — ${b.name[lang]}`,
    url: `${siteUrl}${href(lang, "locations", b.slug)}`,
    ...(b.phone ? { telephone: b.phone.tel } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: b.address.unit ? `${b.address.street}, ${b.address.unit}` : b.address.street,
      addressLocality: b.address.city,
      addressRegion: b.address.province,
      postalCode: b.address.postalCode,
      addressCountry: "CA",
    },
    ...(b.coordinates ? { geo: { "@type": "GeoCoordinates", latitude: b.coordinates.lat, longitude: b.coordinates.lng } } : {}),
    ...(b.hours ? { openingHoursSpecification: openingHoursSpec(b.hours) } : {}),
    parentOrganization: { "@type": "Organization", name: brand.legalName },
  };
}
