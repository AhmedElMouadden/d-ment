import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { ConsentManager } from "@/components/consent";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PreviewBanner } from "@/components/sections";
import { siteUrl } from "@/content/site";
import { getDictionary } from "@/dictionaries";
import { hasLocale, localeTag, locales } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { isPreview } from "@/lib/verification";
import "../globals.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: dict.meta.homeTitle, template: `%s | ${dict.meta.siteName}` },
    description: dict.meta.homeDescription,
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#143326",
  width: "device-width",
  initialScale: 1,
};

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = getDictionary(lang);
  const showConsent = Boolean(process.env.NEXT_PUBLIC_GA_ID) || isPreview;

  return (
    <html lang={localeTag[lang]}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-forest px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {dict.a11y.skip}
        </a>
        <PreviewBanner dict={dict} />
        <Header lang={lang} dict={{ nav: dict.nav, a11y: dict.a11y, meta: dict.meta }} />
        <main id="main" tabIndex={-1} className="grow focus:outline-none">
          {children}
        </main>
        <Footer lang={lang} dict={dict} />
        <ConsentManager dict={dict.consent} privacyHref={href(lang, "privacy", undefined, "temoins")} show={showConsent} />
      </body>
    </html>
  );
}
