import type { MetadataRoute } from "next";
import { siteUrl } from "@/content/site";
import { isPreview } from "@/lib/verification";

export default function robots(): MetadataRoute.Robots {
  // A preview deployment must never be crawled.
  if (isPreview) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${siteUrl}/sitemap.xml` };
}
