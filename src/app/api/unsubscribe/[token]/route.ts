import { NextResponse, type NextRequest } from "next/server";
import { unsubscribe } from "@/lib/unsubscribe";

/** Désinscription en un clic (en-tête List-Unsubscribe-Post, RFC 8058). */
export async function POST(_request: NextRequest, { params }: RouteContext<"/api/unsubscribe/[token]">) {
  const { token } = await params;
  const ok = await unsubscribe(token);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
