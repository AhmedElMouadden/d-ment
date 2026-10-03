"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "./server";

export async function setLocale(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale === "en" ? "en" : "fr", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
