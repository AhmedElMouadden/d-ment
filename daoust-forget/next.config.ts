import type { NextConfig } from "next";
import { localizedRedirects, localizedRewrites } from "./src/lib/routes";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Geolocation only for this origin, and only when the visitor asks.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The root layout is under app/[lang], so unmatched URLs need their own 404 document.
  experimental: { globalNotFound: true },
  async rewrites() {
    return localizedRewrites();
  },
  async redirects() {
    return localizedRedirects();
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
