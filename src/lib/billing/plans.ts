/** Forfaits Dûment (prix en dollars canadiens, taxes en sus via Stripe Tax). */
export type PlanId = "starter" | "pro";

export const PLANS: Record<PlanId, { priceCad: number; maxActiveInvoices: number | null; envPrice: string }> = {
  starter: { priceCad: 39, maxActiveInvoices: 50, envPrice: "STRIPE_PRICE_STARTER" },
  pro: { priceCad: 79, maxActiveInvoices: null, envPrice: "STRIPE_PRICE_PRO" },
};

export function priceIdFor(plan: PlanId): string {
  const id = process.env[PLANS[plan].envPrice];
  if (!id) throw new Error(`${PLANS[plan].envPrice} manquant`);
  return id;
}

export function planForPriceId(priceId: string | undefined): PlanId {
  return priceId && priceId === process.env.STRIPE_PRICE_PRO ? "pro" : "starter";
}

/** Forfait conseillé selon le nombre de factures actives (ouvertes). */
export function recommendedPlan(activeInvoices: number): PlanId {
  return activeInvoices > PLANS.starter.maxActiveInvoices! ? "pro" : "starter";
}

export function exceedsPlan(plan: PlanId, activeInvoices: number): boolean {
  const max = PLANS[plan].maxActiveInvoices;
  return max !== null && activeInvoices > max;
}
