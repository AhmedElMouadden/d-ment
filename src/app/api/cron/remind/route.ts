import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { sendDueReminders } from "@/lib/email/send-due";
import { createSender } from "@/lib/email/sender";
import { planForOrganization } from "@/lib/engine/plan-db";
import { env } from "@/lib/env";
import { getQboProvider } from "@/lib/qbo/connection";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/** Chaque jour, après la synchro : planifie les relances puis envoie celles qui sont prêtes. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  if (!fromAddress) return NextResponse.json({ error: "EMAIL_FROM_ADDRESS manquant" }, { status: 500 });

  const db = createSupabaseAdminClient();
  const sender = createSender();
  const { data: orgs, error } = await db.from("organizations").select("id").eq("is_demo", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const { id } of orgs) {
    try {
      const planned = await planForOrganization(db, id);
      const provider = await getQboProvider(db, id).catch(() => null);
      const sent = await sendDueReminders(id, { db, provider, sender, fromAddress, appUrl: env.appUrl });
      results.push({ organization_id: id, ok: true, planned, sent });
    } catch (e) {
      results.push({ organization_id: id, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ organizations: results.length, results });
}
