import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runQboSync } from "@/lib/sync/service";

export const maxDuration = 300;

/** Synchro quotidienne de toutes les organisations connectées (appelée par pg_cron). */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createSupabaseAdminClient();
  const { data: conns, error } = await db.from("qbo_connections").select("organization_id").eq("status", "active");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const { organization_id } of conns) {
    try {
      results.push({ organization_id, ok: true, ...(await runQboSync(db, organization_id)) });
    } catch (e) {
      results.push({ organization_id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ synced: results.length, results });
}
