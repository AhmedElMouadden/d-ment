import { timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { QboProvider } from "@/lib/qbo/client";
import { QBO_STATE_COOKIE, qboConfig } from "@/lib/qbo/config";
import { encryptedTokenColumns } from "@/lib/qbo/connection";
import { exchangeCode } from "@/lib/qbo/oauth";
import { getSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runQboSync } from "@/lib/sync/service";

function sameState(a: string | undefined, b: string | null) {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Retour d'Intuit : échange le code, chiffre les jetons, lance la première synchro. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const back = (status: string) => {
    const res = NextResponse.redirect(new URL(`/app/settings?qbo=${status}`, request.url));
    res.cookies.delete({ name: QBO_STATE_COOKIE, path: "/api/qbo" });
    return res;
  };

  const session = await getSession();
  if (!session || session.mode !== "live") return NextResponse.redirect(new URL("/login", request.url));
  if (url.searchParams.get("error")) return back("denied");
  if (!sameState(request.cookies.get(QBO_STATE_COOKIE)?.value, url.searchParams.get("state"))) return back("invalid_state");

  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  if (!code || !realmId) return back("error");

  try {
    const creds = qboConfig();
    const tokens = await exchangeCode(creds, code);
    const provider = new QboProvider(realmId, creds.environment, { getAccessToken: async () => tokens.accessToken });
    const company = await provider.getCompanyInfo();

    const db = createSupabaseAdminClient();
    const { error } = await db.from("qbo_connections").upsert(
      {
        organization_id: session.organizationId,
        realm_id: realmId,
        company_name: company.name,
        environment: creds.environment,
        ...encryptedTokenColumns(tokens),
        status: "active",
        last_sync_at: null,
        last_sync_error: null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );
    if (error) throw error;

    // Nom d'expéditeur par défaut = nom de la compagnie QBO, s'il n'est pas déjà rempli
    await db.from("organizations").update({ sender_name: company.name }).eq("id", session.organizationId).is("sender_name", null);
    const orgId = session.organizationId;
    after(() => runQboSync(db, orgId, { full: true }).catch((e) => console.error("Première synchro QBO", e)));
    return back("connected");
  } catch (e) {
    console.error("Callback QBO", e);
    return back("error");
  }
}
