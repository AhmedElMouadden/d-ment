import "server-only";
import { cookies } from "next/headers";
import { en } from "./en";
import { fr, type Dictionary } from "./fr";

export type Locale = "fr" | "en";
export const LOCALE_COOKIE = "lang";
const dictionaries: Record<Locale, Dictionary> = { fr, en };

/** Langue : cookie choisi par l'utilisateur, sinon français (langue par défaut). */
export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  return cookie === "en" ? "en" : "fr";
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
