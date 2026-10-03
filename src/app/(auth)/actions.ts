"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDictionary } from "@/i18n/server";
import { DEMO_COOKIE, env, isDemoEnabled, isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string } | undefined;

const email = z.string().trim().toLowerCase().email();

async function origin() {
  const h = await headers();
  return h.get("origin") ?? env.appUrl;
}

/** Évite les redirections ouvertes : seulement des chemins internes. */
function safeNext(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/app";
}

export async function signInWithPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const { t } = await getDictionary();
  if (!isSupabaseConfigured()) return { error: t.auth.errors.notConfigured };
  const parsed = z.object({ email, password: z.string().min(1) }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: t.auth.errors.invalid };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: t.auth.errors.invalid };
  (await cookies()).delete(DEMO_COOKIE);
  redirect(safeNext(form.get("next")));
}

export async function sendMagicLink(_: AuthState, form: FormData): Promise<AuthState> {
  const { t, locale } = await getDictionary();
  if (!isSupabaseConfigured()) return { error: t.auth.errors.notConfigured };
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: t.auth.errors.emailInvalid };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}`,
      // Crée le compte au besoin (essai gratuit) avec la langue choisie
      data: { language: locale },
    },
  });
  if (error) return { error: t.auth.errors.generic };
  return { info: t.auth.magicLinkSent };
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const { t, locale } = await getDictionary();
  if (!isSupabaseConfigured()) return { error: t.auth.errors.notConfigured };
  const parsed = z
    .object({
      email,
      password: z.string().min(8),
      companyName: z.string().trim().max(120),
      fullName: z.string().trim().max(120),
    })
    .safeParse({
      email: form.get("email"),
      password: form.get("password"),
      companyName: form.get("companyName") ?? "",
      fullName: form.get("fullName") ?? "",
    });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "password" ? t.auth.errors.passwordTooShort : t.auth.errors.emailInvalid };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/app`,
      data: { company_name: parsed.data.companyName, full_name: parsed.data.fullName, language: locale },
    },
  });
  if (error) return { error: t.auth.errors.generic };
  if (data.session) redirect("/app"); // confirmation de courriel désactivée
  return { info: t.auth.signupSent };
}

export async function signOut() {
  (await cookies()).delete(DEMO_COOKIE);
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function startDemo() {
  if (!isDemoEnabled()) redirect("/signup");
  (await cookies()).set(DEMO_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
  redirect("/app");
}
