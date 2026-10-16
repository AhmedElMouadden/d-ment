import { defaultLocale, hasLocale, locales, type Locale } from "./i18n";

/**
 * Every public page, with its localized first path segment. The filesystem
 * (src/app/[lang]/...) uses the French segment; English URLs are rewritten to
 * it in next.config.ts, so /en/pricing serves app/[lang]/tarifs.
 */
export const routes = {
  home: { fr: "", en: "" },
  services: { fr: "services", en: "services" },
  pricing: { fr: "tarifs", en: "pricing" },
  locations: { fr: "succursales", en: "locations" },
  eco: { fr: "nettoyage-ecologique", en: "eco-cleaning" },
  order: { fr: "commander", en: "order" },
  business: { fr: "entreprises", en: "business" },
  franchise: { fr: "franchise", en: "franchise" },
  contact: { fr: "contact", en: "contact" },
  faq: { fr: "faq", en: "faq" },
  privacy: { fr: "confidentialite", en: "privacy" },
  terms: { fr: "conditions", en: "terms" },
} as const satisfies Record<string, Record<Locale, string>>;

export type RouteKey = keyof typeof routes;

/** Localized URL for a page, optionally with a sub-path (e.g. a branch slug). */
export function href(lang: Locale, key: RouteKey, sub?: string, hash?: string) {
  const segment = routes[key][lang];
  let path = `/${lang}${segment ? `/${segment}` : ""}`;
  if (sub) path += `/${sub}`;
  if (hash) path += `#${hash}`;
  return path;
}

/**
 * Translate a visible pathname into the other language, keeping the
 * sub-path. Unknown paths fall back to the target language's home page.
 */
export function localizePath(pathname: string, to: Locale): string {
  const [, maybeLang = "", segment = "", ...rest] = pathname.split("/");
  if (!hasLocale(maybeLang)) return href(to, "home");
  if (!segment) return href(to, "home");
  for (const key of Object.keys(routes) as RouteKey[]) {
    if (locales.some((l) => routes[key][l] === segment)) {
      return href(to, key, rest.filter(Boolean).join("/") || undefined);
    }
  }
  return href(to, "home");
}

/** English-slug -> French-filesystem rewrites, plus wrong-language redirects. */
export function localizedRewrites() {
  return (Object.keys(routes) as RouteKey[])
    .filter((k) => routes[k].en && routes[k].en !== routes[k].fr)
    .flatMap((k) => [
      { source: `/en/${routes[k].en}`, destination: `/en/${routes[k].fr}` },
      { source: `/en/${routes[k].en}/:path*`, destination: `/en/${routes[k].fr}/:path*` },
    ]);
}

export function localizedRedirects() {
  return (Object.keys(routes) as RouteKey[])
    .filter((k) => routes[k].en && routes[k].en !== routes[k].fr)
    .flatMap((k) => [
      { source: `/en/${routes[k].fr}`, destination: `/en/${routes[k].en}`, permanent: true },
      { source: `/en/${routes[k].fr}/:path*`, destination: `/en/${routes[k].en}/:path*`, permanent: true },
      { source: `/fr/${routes[k].en}`, destination: `/fr/${routes[k].fr}`, permanent: true },
      { source: `/fr/${routes[k].en}/:path*`, destination: `/fr/${routes[k].fr}/:path*`, permanent: true },
    ]);
}

export { defaultLocale };
