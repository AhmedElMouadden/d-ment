import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isQboConfigured, QBO_STATE_COOKIE, qboConfig } from "@/lib/qbo/config";
import { buildAuthorizeUrl } from "@/lib/qbo/oauth";
import { getSession } from "@/lib/session";


/** Démarre la connexion QuickBooks : redirige vers Intuit avec un « state » anti-CSRF. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.mode !== "live") return NextResponse.redirect(new URL("/login", request.url));
  if (!isQboConfigured()) return NextResponse.redirect(new URL("/app/settings?qbo=not_configured", request.url));

  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildAuthorizeUrl(qboConfig(), state));
  response.cookies.set(QBO_STATE_COOKIE, state, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/qbo", maxAge: 600,
  });
  return response;
}
