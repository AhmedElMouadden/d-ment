import type { Locale } from "@/lib/i18n";
import { brand } from "@/content/site";

/**
 * Typeset placeholder for the brand name. It is NOT a logo: swap it for the
 * official logo files once supplied (see public/brand/README.md).
 */
export function Wordmark({ lang, tone = "dark" }: { lang: Locale; tone?: "dark" | "light" }) {
  return (
    <span className="flex flex-col leading-none">
      <span
        className={`font-display text-[1.375rem] font-semibold tracking-tight ${tone === "dark" ? "text-forest-deep" : "text-paper"}`}
      >
        {brand.name}
      </span>
      <span
        className={`mt-1 text-[0.6875rem] font-semibold tracking-[0.2em] uppercase ${tone === "dark" ? "text-moss" : "text-sand"}`}
      >
        {brand.tagline[lang]}
      </span>
    </span>
  );
}
