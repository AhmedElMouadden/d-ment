import { notFound } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "./i18n";

/** Resolve and validate the [lang] param for a page. */
export async function resolveLang(params: Promise<{ lang: string }>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return { lang, dict: getDictionary(lang) };
}
