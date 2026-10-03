import { AlertTriangle, CheckCircle2, Link2 } from "lucide-react";
import { Badge, buttonClass, Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { requireSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { disconnectQbo } from "./actions";
import { SyncButton } from "./qbo-card";

type QboStatusKey = "connected" | "denied" | "invalid_state" | "error" | "not_configured";

export default async function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const q = t.settings.qbo;
  const flash = (await searchParams).qbo as QboStatusKey | undefined;

  let conn: { company_name: string | null; environment: string; status: string; last_sync_at: string | null; last_sync_error: string | null } | null = null;
  if (session.mode === "demo") {
    conn = { company_name: q.demoCompany, environment: "sandbox", status: "active", last_sync_at: new Date().toISOString(), last_sync_error: null };
  } else {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("qbo_connections")
      .select("company_name, environment, status, last_sync_at, last_sync_error")
      .maybeSingle();
    conn = data;
  }

  const fmt = new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Toronto" });
  const expired = conn?.status === "expired" || conn?.status === "revoked";

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">{t.settings.title}</h1>

      {flash && q.status[flash] && (
        <p role="status" className={`mt-6 rounded-xl px-4 py-3 text-sm ${flash === "connected" ? "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200" : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>
          {q.status[flash]}
        </p>
      )}

      <Card className="mt-6 p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#2CA01C] text-lg font-bold text-white" aria-hidden>qb</span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{q.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">{q.description}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-6">
          {conn ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {expired ? <AlertTriangle className="size-5 text-amber-600" aria-hidden /> : <CheckCircle2 className="size-5 text-brand-600" aria-hidden />}
                <span className="text-sm">{q.connectedTo} <strong>{conn.company_name ?? "QuickBooks"}</strong></span>
                {conn.environment === "sandbox" && <Badge tone="warn">{q.sandbox}</Badge>}
              </div>
              <p className="text-sm text-ink-muted">
                {q.lastSync} : {conn.last_sync_at ? fmt.format(new Date(conn.last_sync_at)) : q.never}. {q.autoSync}
              </p>
              {expired && <p className="text-sm text-amber-700 dark:text-amber-300">{q.status.expired}</p>}
              {!expired && conn.last_sync_error && <p className="text-sm text-rose-700 dark:text-rose-300">{q.status.sync_error}</p>}
              <div className="flex flex-wrap items-start gap-3">
                {expired ? (
                  <a href="/api/qbo/connect" className={buttonClass("primary")}><Link2 className="size-4" aria-hidden /> {q.reconnect}</a>
                ) : (
                  <SyncButton label={q.syncNow} pendingLabel={q.syncing} />
                )}
                {session.mode === "live" && (
                  <form action={disconnectQbo}>
                    <button type="submit" className={buttonClass("ghost")} title={q.disconnectConfirm}>{q.disconnect}</button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-ink-muted">{q.notConnected}</p>
              <a href="/api/qbo/connect" className={buttonClass("primary")}><Link2 className="size-4" aria-hidden /> {q.connect}</a>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
