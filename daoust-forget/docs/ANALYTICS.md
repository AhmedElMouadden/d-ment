# 13. Analytics event plan (GA4)

Implementation: `src/lib/analytics.ts` (typed events) and
`src/components/consent.tsx` (loader). GA4 loads **only after opt-in**;
`window.__dfAnalyticsConsent` gates every `track()` call. Event parameters
never contain personal data: no search text, names, emails, phone numbers or
coordinates.

## Configuration

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GA_ID` | GA4 measurement ID. Unset = no tag, no tracking |
| `NEXT_PUBLIC_GA_LINKER_DOMAINS` | Cross-domain linker (e.g. `daoustvalet.com,myaccount.daousteco.com`) |

Consent Mode v2: `analytics_storage` granted only after opt-in;
`ad_storage`, `ad_user_data` and `ad_personalization` are always denied.
Declining removes existing `_ga` cookies.

## Events

| Event | Fires when | Parameters | Mark as key event? |
|---|---|---|---|
| `page_view` | GA4 enhanced measurement (history changes) | default | — |
| `branch_search` | A search returns ≥ 1 branch | `query_type` (postal, fsa, text, geolocation), `results_count`, `placement` | — |
| `branch_search_no_results` | A search returns 0 | `query_type`, `placement` | — |
| `geolocation_result` | After "Use my location" | `outcome` (granted, denied, unavailable, error) | — |
| `branch_select` | Click on a branch name | `branch_id`, `placement` | — |
| `directions_click` | Click on Directions | `branch_id`, `placement` | **Yes** |
| `phone_click` | Click on a `tel:` link | `branch_id` or `customer_service`, `placement` | **Yes** |
| `order_cta_click` | Click on an outbound order button | `destination` (channel id), `placement` | **Yes** (intent only) |
| `pricing_category_select` | Garment tab change | `category` | — |
| `service_pricing_click` | "View pricing" from a service | `service` | — |
| `faq_open` | An FAQ item opens | `question_id`, `placement` | — |
| `contact_submit` | Form submitted | `topic`, `outcome` (success, error, not_configured, invalid) | **Yes**, when `outcome = success` |
| `outbound_click` | Reserved for links to other Daoust properties | `destination`, `placement` | — |

### Clicks versus completed orders

`order_cta_click` measures **intent**. A completed order happens on
DaoustValet, so it can only be measured there:

1. Install the same GA4 property (or a linked one) on the DaoustValet order
   confirmation step and send a `purchase` event with `transaction_id` and
   value. This needs DaoustValet's cooperation, and consent must be collected
   on that domain too.
2. Enable the cross-domain linker (`NEXT_PUBLIC_GA_LINKER_DOMAINS`) so
   sessions continue across domains.
3. Alternatively, have DaoustValet send server-side conversions (Measurement
   Protocol) keyed by the order, with no personal data.

Until one of these is in place, **report no "completed orders" figure**.

## Core metrics

| Metric | Definition |
|---|---|
| Branch search success rate | `branch_search` / (`branch_search` + `branch_search_no_results`) |
| Branch-to-contact rate | sessions with `directions_click` or `phone_click` / sessions with `branch_select` or a branch page view |
| Service-to-pricing progression | sessions with a service page view and then a pricing view / sessions with a service page view |
| Outbound order click rate | sessions with `order_cta_click` / sessions |
| Completed online order rate | `purchase` (DaoustValet) / sessions with `order_cta_click`, *once integrated* |
| Qualified enquiry rate | `contact_submit` (`success`, topic ≠ other) / contact page sessions |
| Mobile conversion rate | each key event, split by `device_category = mobile` |

Watch `branch_search_no_results` by `query_type`: it shows which areas or
spellings the branch data does not cover.

## Baseline before claiming improvement

1. Before the switch, record 4 weeks of the current site: sessions, calls and
   direction clicks (also from the Google Business Profile *Insights*), and
   DaoustValet orders as reported by the business.
2. After launch, compare equivalent weeks (seasonality is strong: coats in
   spring, events in June).
3. Test copy and layout changes with A/B tests (Proxy rewrites are an option)
   rather than assuming the redesign alone explains the results.
4. Note that consent rates limit GA4 coverage: compare trends, not raw
   counts, and use Google Business Profile call data as an independent check.
