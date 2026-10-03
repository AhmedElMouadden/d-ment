import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * Client service_role : contourne la RLS. Réservé au serveur (synchro,
 * envois, webhooks, cron). Ne jamais l'utiliser avec une entrée non vérifiée
 * sans filtrer explicitement par organization_id.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant");
  return createClient(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
