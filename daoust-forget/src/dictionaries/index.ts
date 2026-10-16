import type { Locale } from "@/lib/i18n";
import en from "./en";
import fr, { type Dict } from "./fr";

const dictionaries: Record<Locale, Dict> = { fr, en };

export const getDictionary = (lang: Locale): Dict => dictionaries[lang];

export { fmt } from "@/lib/fmt";

export type { Dict };
