import { contactSchema, fieldErrors } from "@/lib/contact";
import { NextResponse } from "next/server";

/**
 * Contact enquiries. Delivery goes to CONTACT_WEBHOOK_URL (any HTTPS endpoint:
 * a CRM, a help-desk, an automation tool) with an optional bearer token.
 * Without it the route answers 503 "not_configured": it never pretends a
 * message was received.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", fields: fieldErrors(parsed.error) }, { status: 422 });
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { website: _honeypot, ...message } = parsed.data;
  void _honeypot;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.CONTACT_WEBHOOK_TOKEN ? { authorization: `Bearer ${process.env.CONTACT_WEBHOOK_TOKEN}` } : {}),
      },
      body: JSON.stringify({ ...message, receivedAt: new Date().toISOString(), source: "daoust-forget-site" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`webhook ${res.status}`);
  } catch (e) {
    console.error("contact delivery failed", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "delivery_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
