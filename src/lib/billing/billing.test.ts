import type Stripe from "stripe";
import { afterEach, describe, expect, it } from "vitest";
import { exceedsPlan, recommendedPlan } from "./plans";
import { subscriptionRow } from "./stripe-sync";

describe("forfaits", () => {
  it("conseille Essentiel jusqu'à 50 factures actives, Croissance au-delà", () => {
    expect(recommendedPlan(50)).toBe("starter");
    expect(recommendedPlan(51)).toBe("pro");
    expect(exceedsPlan("starter", 51)).toBe(true);
    expect(exceedsPlan("pro", 5000)).toBe(false);
  });
});

describe("synchro des abonnements Stripe", () => {
  afterEach(() => { delete process.env.STRIPE_PRICE_PRO; });

  const sub = (o: Partial<Stripe.Subscription> = {}, price = "price_starter") => ({
    id: "sub_1", customer: "cus_1", status: "active", cancel_at_period_end: false, trial_end: null,
    items: { data: [{ price: { id: price }, current_period_end: 1_790_000_000 }] },
    ...o,
  }) as unknown as Stripe.Subscription;

  it("traduit un abonnement actif", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro";
    expect(subscriptionRow(sub({}, "price_pro"))).toMatchObject({
      stripe_subscription_id: "sub_1", stripe_customer_id: "cus_1", plan: "pro", status: "active",
      current_period_end: new Date(1_790_000_000_000).toISOString(),
    });
  });

  it("garde la fin d'essai et traduit les statuts Stripe inconnus de la base", () => {
    const row = subscriptionRow(sub({ status: "incomplete_expired", trial_end: 1_790_000_000 } as Partial<Stripe.Subscription>));
    expect(row.status).toBe("canceled");
    expect(row.trial_ends_at).toBe(new Date(1_790_000_000_000).toISOString());
    expect(row.plan).toBe("starter");
  });
});
