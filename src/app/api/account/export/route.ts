import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Export de toutes les données de l'organisation (Loi 25), sous RLS. Les jetons QuickBooks ne sont jamais inclus. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.mode === "demo") return NextResponse.json({ demo: true, message: "Mode démo : aucune donnée réelle." });

  const db = await createSupabaseServerClient();
  const tables = ["organizations", "users", "customers", "invoices", "sequences", "sequence_steps", "reminders", "reminder_items", "email_events", "subscriptions"] as const;
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
  for (const table of tables) {
    const { data } = await db.from(table).select("*");
    out[table] = data ?? [];
  }
  const { data: qbo } = await db.from("qbo_connections").select("realm_id, company_name, environment, status, last_sync_at, connected_at");
  out.qbo_connections = qbo ?? [];

  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="dument-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
