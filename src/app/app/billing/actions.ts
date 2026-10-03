"use server";
import { redirect } from "next/navigation";
import { priceIdFor, type PlanId } from "@/lib/billing/plans";
import { isStripeConfigured, stripe } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { requireSession } from "@/lib/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function stripeCustomerFor(orgId: string, email: string, name: string) {
  const db = createSupabaseAdminClient();
  const { data: sub } = await db.from("subscriptions").select("stripe_customer_id, trial_ends_at").eq("organization_id", orgId).single();
  if (sub?.stripe_customer_id) return { customerId: sub.stripe_customer_id as string, trialEndsAt: sub.trial_ends_at as string | null };
  const customer = await stripe().customers.create({ email, name, metadata: { organization_id: orgId } });
  await db.from("subscriptions").update({ stripe_customer_id: customer.id }).eq("organization_id", orgId);
  return { customerId: customer.id, trialEndsAt: sub?.trial_ends_at ?? null };
}

/** Ouvre Stripe Checkout. Le reste de l'essai est conservé : aucun prélèvement avant sa fin. */
export async function startCheckout(plan: PlanId) {
  const session = await requireSession();
  if (session.mode === "demo" || !isStripeConfigured()) redirect("/app/billing");

  const { customerId, trialEndsAt } = await stripeCustomerFor(session.organizationId, session.email, session.organizationName);
  // Stripe exige une fin d'essai au moins 48 h dans le futur
  const trialEnd = trialEndsAt ? Math.floor(Date.parse(trialEndsAt) / 1000) : 0;
  const keepTrial = trialEnd > Date.now() / 1000 + 48 * 3600;

  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdFor(plan), quantity: 1 }],
    automatic_tax: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    locale: "auto",
    allow_promotion_codes: true,
    client_reference_id: session.organizationId,
    subscription_data: {
      metadata: { organization_id: session.organizationId },
      ...(keepTrial ? { trial_end: trialEnd } : {}),
    },
    success_url: `${env.appUrl}/app/billing?status=success`,
    cancel_url: `${env.appUrl}/app/billing?status=cancelled`,
  });
  redirect(checkout.url!);
}

/** Portail client Stripe : carte, factures, changement de forfait, annulation. */
export async function openPortal() {
  const session = await requireSession();
  if (session.mode === "demo" || !isStripeConfigured()) redirect("/app/billing");
  const { customerId } = await stripeCustomerFor(session.organizationId, session.email, session.organizationName);
  const portal = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${env.appUrl}/app/billing` });
  redirect(portal.url);
}
