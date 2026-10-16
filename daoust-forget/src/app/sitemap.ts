import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
import { visibleBranches, visibleServices } from "@/lib/data";
import { localeTag, locales } from "@/lib/i18n";
import { href, routes, type RouteKey } from "@/lib/routes";
import { isPreview } from "@/lib/verification";

/** Only verified, indexable pages, with hreflang alternates. */
export default function sitemap(): MetadataRoute.Sitemap {
  if (isPreview) return [];
  const entry = (route: RouteKey, sub?: string) =>
    locales.map((lang) => ({
      url: `${siteUrl}${href(lang, route, sub)}`,
      alternates: { languages: Object.fromEntries(locales.map((l) => [localeTag[l], `${siteUrl}${href(l, route, sub)}`])) },
    }));
  return [
    ...(Object.keys(routes) as RouteKey[]).flatMap((k) => entry(k)),
    ...visibleServices().flatMap((s) => entry("services", s.slug)),
    ...visibleBranches().filter((b) => b.verification.status === "verified").flatMap((b) => entry("locations", b.slug)),
  ];
}
