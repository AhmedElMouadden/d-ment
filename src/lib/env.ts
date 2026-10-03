/** Lecture centralisée de la configuration. */
export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** La démo publique est active sauf si DEMO_MODE=false. */
export function isDemoEnabled() {
  return process.env.DEMO_MODE !== "false";
}

export const DEMO_COOKIE = "demo";
