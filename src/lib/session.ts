import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, isDemoEnabled, isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./supabase/server";

export interface AppSession {
  mode: "demo" | "live";
  userId: string;
  email: string;
  fullName: string | null;
  organizationId: string;
  organizationName: string;
  trialEndsAt: string | null;
  subscriptionStatus: string;
}

const DEMO_SESSION: AppSession = {
  mode: "demo",
  userId: "demo-user",
  email: "factures@studiodemo.example",
  fullName: "Camille Demers",
  organizationId: "demo-org",
  organizationName: "Studio Démo inc.",
  trialEndsAt: new Date(Date.now() + 9 * 86_400_000).toISOString(),
  subscriptionStatus: "trialing",
};

/** Session courante, ou null si personne n'est connecté. */
export async function getSession(): Promise<AppSession | null> {
  if (isDemoEnabled() && (await cookies()).get(DEMO_COOKIE)?.value === "1") return DEMO_SESSION;
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, organization_id, organizations(name)")
    .eq("id", auth.user.id)
    .single();
  if (!profile) return null;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at")
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  const org = profile.organizations as unknown as { name: string } | null;

  return {
    mode: "live",
    userId: auth.user.id,
    email: auth.user.email ?? "",
    fullName: profile.full_name,
    organizationId: profile.organization_id,
    organizationName: org?.name || auth.user.email || "",
    trialEndsAt: sub?.trial_ends_at ?? null,
    subscriptionStatus: sub?.status ?? "trialing",
  };
}

/** Pour les pages /app : redirige vers la connexion si besoin. */
export async function requireSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Jours restants à l'essai gratuit (null si pas d'essai). */
export function trialDaysLeft(session: AppSession, now = Date.now()): number | null {
  if (!session.trialEndsAt) return null;
  return Math.max(0, Math.ceil((Date.parse(session.trialEndsAt) - now) / 86_400_000));
}
