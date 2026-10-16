# 15. Business information and integrations to provide

Everything below is currently **unverified** in the code. To verify a fact,
change its `verification` to
`{ status: "verified", source: "…", checkedOn: "2026-…" }`
in the file listed. Then switch production to `NEXT_PUBLIC_DATA_MODE=strict`.

## 1. Identity and brand
- [ ] Official logo files (SVG) and brand guidelines -> `public/brand/`, `src/components/wordmark.tsx`
- [ ] Brand colours (current palette is a proposal) -> `src/app/globals.css`
- [ ] Which name to lead with: "Daoust/Forget", "Daoust Nettoyeurs Écoperformants", or both -> `src/content/site.ts` (`brand`, `banners`)
- [ ] "Since" date and wording (1980 / 1983 / 1992?) -> `site.ts` (`since`)
- [ ] Relationship between banners, to explain in one sentence each -> `site.ts` (`banners`)

## 2. Branches (highest priority)
- [ ] Source of truth: a database, a spreadsheet, or the current locator's API? Provide an export.
- [ ] Current count, and what it counts (branches, franchisees, drop-off points)
- [ ] For each branch: name, banner, address, unit, postal code, phone, weekly hours, holiday hours, services offered, express conditions, Google Business Profile URL
- [ ] Geocoded coordinates from the verified address -> `coordinates`
- [ ] Seed branches to confirm or remove: Montréal Complexe Desjardins (postal code looks inconsistent), Brossard 8200 Taschereau, L'Assomption 788 montée de Saint-Sulpice -> `src/content/branches.ts`

## 3. Services
- [ ] Final list, and for each one: all branches or some (which) -> `src/content/services.ts`
- [ ] Is dry cleaning still offered? Where?
- [ ] Laundry: which branches
- [ ] Winter care: down, waterproofing, fur and leather policy
- [ ] Alterations: branches and types of work
- [ ] Express: branches, cut-off times, days, surcharge
- [ ] Business offer and contact person

## 4. Pricing
- [ ] Is there a network-wide price list, or per branch?
- [ ] Prices per garment category (and scope) -> `src/content/pricing.ts` (`price`)
- [ ] Taxes, minimums, surcharges (express, specialty)
- [ ] How a personalized quote is given

## 5. Turnaround
- [ ] Standard turnaround per category; express timing; specialty timing
- [ ] Which ones are commitments and which are estimates

## 6. Pickup, delivery and online ordering
- [ ] Current DaoustValet order URL (FR and EN), app links (iOS, Android?) -> `site.ts` (`ordering`)
- [ ] Role of `myaccount.daousteco.com`
- [ ] Service areas (map or postal-code list), fees, minimum order, timing -> `site.ts` (`pickupDelivery`)
- [ ] Order tracking: where customers find it
- [ ] Can DaoustValet report completed orders (GA4 tag, linker, or server-side)? See ANALYTICS.md

## 7. Environmental claims (legal review required)
- [ ] Written description of Aquaperformance (equipment, detergents, steps) -> `src/content/eco.ts`
- [ ] Confirmation that no dry-cleaning solvent is used in eco branches
- [ ] Any measured data (water, energy, emissions) with methodology; otherwise no quantified claim
- [ ] Review of all eco wording against the Competition Act (as amended in 2024) and Québec's Consumer Protection Act
- [ ] Which garments are excluded or need another treatment

## 8. Policies
- [ ] Garment acceptance and assessment policy (FAQ answers) -> `src/content/faq.ts`
- [ ] Satisfaction, liability and claims policy -> `conditions` page
- [ ] Privacy policy: person in charge of personal information protection, retention periods, privacy impact assessment for GA4 transfers -> `confidentialite` page

## 9. Content and media
- [ ] Authentic photos: storefronts, counters, team, equipment, garments (with consent of the people shown)
- [ ] Genuine reviews, with permission, author identifier, date and link -> `src/content/reviews.ts`
- [ ] Verified social media accounts -> `site.ts` (`social`)
- [ ] Customer service phone and email (the current values are DaoustValet's) -> `site.ts` (`customerService`)
- [ ] Franchise: current terms, contact, regions available -> `franchise` page and `site.ts` (`franchiseSite`)

## Integrations

| Integration | Status | How to enable |
|---|---|---|
| Branch data | Typed seed file, 3 branches | Replace `branches.ts` with an export or a fetch from the branch database |
| Geocoding (address search) | Built, off | `MAPBOX_ACCESS_TOKEN` (server-side). Another provider: edit `src/app/api/geocode/route.ts` |
| Contact form delivery | Built, off (answers "not configured") | `CONTACT_WEBHOOK_URL` (+ `CONTACT_WEBHOOK_TOKEN`) to a CRM, help desk or automation |
| Analytics | Built, consent-gated, off | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GA_LINKER_DOMAINS` |
| Ordering | Linked (DaoustValet), not rebuilt | Confirm URLs |
| Order completion tracking | Not possible from this site | Needs DaoustValet (see ANALYTICS.md) |
| Reviews | Manual, empty | Add verified entries, or connect a reviews API with display rights |
| Redirects from the old site | Not done | Map old URLs in `next.config.ts` `redirects()` once the live site is crawled |
