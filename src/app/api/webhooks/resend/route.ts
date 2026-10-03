import { NextResponse, type NextRequest } from "next/server";
import { mapResendEvent, verifyResendWebhook } from "@/lib/email/webhook";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Événements Resend (livré, ouvert, rebond, plainte…) → journal email_events. */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const ok = verifyResendWebhook(
    body,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    process.env.RESEND_WEBHOOK_SECRET ?? "",
  );
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const event = JSON.parse(body) as { type: string; created_at?: string; data?: { email_id?: string; to?: string[] } };
  const type = mapResendEvent(event.type);
  const messageId = event.data?.email_id;
  if (!type || !messageId) return NextResponse.json({ ignored: true });

  const db = createSupabaseAdminClient();
  const { data: reminder } = await db
    .from("reminders").select("id, organization_id, customer_id").eq("provider_message_id", messageId).maybeSingle();
  if (!reminder) return NextResponse.json({ ignored: true });

  await db.from("email_events").insert({
    organization_id: reminder.organization_id,
    reminder_id: reminder.id,
    customer_id: reminder.customer_id,
    type,
    provider: "resend",
    provider_message_id: messageId,
    recipient: event.data?.to?.[0] ?? null,
    payload: event,
    occurred_at: event.created_at ?? new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
