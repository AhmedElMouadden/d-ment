import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/billing/stripe";
import { subscriptionRow } from "@/lib/billing/stripe-sync";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Webhook Stripe : tient la table subscriptions à jour (statut, forfait, fin de période). */
export async function POST(request: NextRequest) {
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const db = createSupabaseAdminClient();
  const save = async (sub: Stripe.Subscription) => {
    const row = subscriptionRow(sub);
    const orgId = sub.metadata?.organization_id;
    const query = db.from("subscriptions").update(row);
    // Organisation retrouvée par métadonnée, sinon par client Stripe
    const { error } = orgId ? await query.eq("organization_id", orgId) : await query.eq("stripe_customer_id", row.stripe_customer_id);
    if (error) throw error;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (s.mode === "subscription" && typeof s.subscription === "string") {
        await save(await stripe().subscriptions.retrieve(s.subscription));
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await save(event.data.object);
      break;
  }
  return NextResponse.json({ received: true });
}
