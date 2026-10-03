import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, isDemoEnabled } from "@/lib/env";

/** Lien public « Voir la démo » : active le mode démo et ouvre l'application. */
export function GET(request: NextRequest) {
  if (!isDemoEnabled()) return NextResponse.redirect(new URL("/signup", request.url));
  const response = NextResponse.redirect(new URL("/app", request.url));
  response.cookies.set(DEMO_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
  return response;
}
