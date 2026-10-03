import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { planForOrganization } from "@/lib/engine/plan-db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * Planification quotidienne des relances (après la synchro).
 * L'envoi des courriels planifiés arrive à l'étape 4 (modèles + Resend).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createSupabaseAdminClient();
  const { data: orgs, error } = await db.from("organizations").select("id").eq("is_demo", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const { id } of orgs) {
    try {
      results.push({ organization_id: id, ok: true, ...(await planForOrganization(db, id)) });
    } catch (e) {
      results.push({ organization_id: id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ organizations: results.length, results });
}
