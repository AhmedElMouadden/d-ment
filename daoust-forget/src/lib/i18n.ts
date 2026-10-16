export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export const hasLocale = (value: string): value is Locale =>
  (locales as readonly string[]).includes(value);

/** BCP 47 tags used for <html lang>, hreflang and Intl formatting. */
export const localeTag: Record<Locale, string> = { fr: "fr-CA", en: "en-CA" };

/** A string that exists in both official site languages. */
export type L = Record<Locale, string>;

export const t = (value: L, lang: Locale) => value[lang];
