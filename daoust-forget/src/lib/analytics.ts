/**
 * Analytics event plan (docs/ANALYTICS.md). Events go to GA4 via gtag only
 * after the visitor opts in. Parameters never contain personal data: no
 * search text, names, emails, phone numbers or coordinates.
 */
export type AnalyticsEvents = {
  branch_search: { query_type: "postal" | "fsa" | "text" | "geolocation"; results_count: number; placement: string };
  branch_search_no_results: { query_type: "postal" | "fsa" | "text" | "geolocation"; placement: string };
  geolocation_result: { outcome: "granted" | "denied" | "unavailable" | "error" };
  branch_select: { branch_id: string; placement: string };
  directions_click: { branch_id: string; placement: string };
  phone_click: { branch_id: string; placement: string };
  order_cta_click: { destination: string; placement: string };
  outbound_click: { destination: string; placement: string };
  pricing_category_select: { category: string };
  service_pricing_click: { service: string };
  faq_open: { question_id: string; placement: string };
  contact_submit: { topic: string; outcome: "success" | "error" | "not_configured" | "invalid" };
};

export type EventName = keyof AnalyticsEvents;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
    __dfAnalyticsConsent?: boolean;
  }
}

export function track<E extends EventName>(name: E, params: AnalyticsEvents[E]) {
  if (typeof window === "undefined") return false;
  if (!window.__dfAnalyticsConsent || typeof window.gtag !== "function") return false;
  window.gtag("event", name, params);
  return true;
}
