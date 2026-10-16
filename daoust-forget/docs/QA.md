# 16. QA checklist

Status as of this build. **Automated** = run in this repository; **Manual** =
must be done by a person before launch.

## Automated, passing

| Check | How |
|---|---|
| Unit tests (branch search, hours in Québec time, routes, consent, contact validation, data integrity) | `npm test` (25 tests) |
| Types, lint | `npm run typecheck`, `npm run lint` |
| Production build, every page statically generated | `npm run build` |
| axe-core WCAG 2.0/2.1/2.2 A and AA on 18 pages (FR and EN), no console or hydration errors, one `<h1>` per page | `npm run test:e2e` |
| Mobile 375 px: no horizontal scroll, menu open and close (Escape), consent decline, empty-search error, no-results state, city search, branch page with click-to-call and directions, shared `?q=` FSA search | Playwright |
| Geolocation denied, and granted with no branch coordinates (honest message, no fake distances) | Playwright |
| Pricing: deep link `#coats`, arrow-key tabs, no fabricated price | Playwright |
| Contact: inline errors, focus on the first invalid field, "not configured" message instead of a false success | Playwright |
| Language switch keeps the page (`/fr/succursales/x` -> `/en/locations/x`), `html lang` updates | Playwright |
| Routing: `/` -> language, `/en/tarifs` -> 308 `/en/pricing`, unknown URL -> 404 with `lang` | curl |
| Strict mode: no unverified fact rendered, unverified branch page -> 404, sitemap and robots for production | strict build + curl |
| APIs answer 503 / 501 when not configured | curl |

Browser checks: `npm run build && npm start`, then `npm run test:e2e`
(`BASE_URL` and `CHROMIUM_PATH` are optional). Screenshots go to
`e2e/screenshots/`.

## Manual, before launch

### Content and data
- [ ] Every item in VERIFICATION.md resolved, and `NEXT_PUBLIC_DATA_MODE=strict` set
- [ ] French copy proofread by a native Québec French editor; English reviewed
- [ ] Prices, hours and services checked branch by branch
- [ ] No fictional review, guarantee, price or environmental claim (search the build for "À vérifier": none should be visible)

### Functionality
- [ ] Each CTA does what it says, on a real phone (iOS Safari, Android Chrome)
- [ ] Ordering links land on the right DaoustValet page, in the right language
- [ ] Contact form delivers to the real inbox; the error path when the webhook fails
- [ ] Geocoding (if enabled) returns the right nearest branch for 10 sample postal codes
- [ ] Holiday hours shown correctly

### Accessibility
- [ ] Keyboard-only walk-through of the 5 journeys in ARCHITECTURE.md
- [ ] Screen reader: VoiceOver (iOS) and NVDA (Windows) on home, finder, pricing tabs, contact form
- [ ] 200 % zoom and 320 px width
- [ ] Preview badges removed in strict mode (they are popovers, not needed in production)

### Performance
- [ ] Lighthouse mobile ≥ 90 on home, finder, branch page, pricing
- [ ] LCP < 2.5 s, INP < 200 ms, CLS < 0.1 in field data (CrUX) after launch
- [ ] Real photos served through `next/image`, AVIF/WebP, correct `sizes`

### SEO
- [ ] `NEXT_PUBLIC_SITE_URL` set; canonical, hreflang (fr-CA, en-CA, x-default) correct
- [ ] Sitemap submitted in Search Console; robots allows crawling in production
- [ ] JSON-LD validated (Rich Results Test) on verified branch pages
- [ ] 301 redirects from every old URL
- [ ] Google Business Profiles consistent with branch pages (name, address, phone, hours)

### Privacy and analytics
- [ ] No GA request before consent (check the Network tab)
- [ ] Declining removes `_ga` cookies; footer link reopens the choice
- [ ] Events appear in GA4 DebugView with the expected parameters, without personal data
- [ ] Clicks and completed orders reported separately
- [ ] Privacy policy completed and approved
- [ ] No secret in client bundles (`MAPBOX_ACCESS_TOKEN`, `CONTACT_WEBHOOK_*` are server-only)
