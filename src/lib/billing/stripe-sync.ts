import type Stripe from "stripe";
import { planForPriceId } from "./plans";

const STATUS: Record<string, string> = {
  trialing: "trialing", active: "active", past_due: "past_due", canceled: "canceled",
  incomplete: "incomplete", incomplete_expired: "canceled", unpaid: "unpaid", paused: "unpaid",
};

const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);

/** Abonnement Stripe → colonnes de la table subscriptions (fonction pure, testée). */
export function subscriptionRow(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    plan: planForPriceId(item?.price.id),
    status: STATUS[sub.status] ?? "incomplete",
    current_period_end: iso(item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    ...(sub.trial_end ? { trial_ends_at: iso(sub.trial_end) } : {}),
  };
}
