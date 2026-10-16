# 2. Information architecture, journeys and design system

## Site map (FR / EN)

```
/fr                          /en                        Home
├─ /succursales              /locations                 Branch finder (primary action)
│  └─ /succursales/[slug]    /locations/[slug]          Branch detail
├─ /services                 /services                  Services grouped by customer need
│  └─ /services/[slug]       /services/[slug]           Service detail
├─ /tarifs                   /pricing                   Pricing by garment type (#shirts, #coats…)
├─ /nettoyage-ecologique     /eco-cleaning              Aquaperformance explained
├─ /commander                /order                     Ordering options -> DaoustValet
├─ /faq                      /faq
├─ /contact                  /contact
├─ /entreprises              /business                  Secondary audience
├─ /franchise                /franchise                 Secondary audience
├─ /confidentialite          /privacy                   Includes #temoins (cookies)
└─ /conditions               /terms
```

- `/` negotiates the language from `Accept-Language` (French by default) in
  `src/proxy.ts`.
- English slugs are rewrites of the French filesystem routes
  (`src/lib/routes.ts` -> `next.config.ts`). Wrong-language slugs 308 to the
  right one (`/en/tarifs` -> `/en/pricing`).
- The language switcher keeps the current page and sub-path
  (`localizePath`).

## Navigation

- **Primary nav (customer tasks):** Services · Tarifs · Succursales ·
  Nettoyage écologique · Contact. The logo serves as Home.
- **Primary CTA:** "Trouver mon nettoyeur" (header, hero, final CTA).
- **Secondary CTA:** "Commander en ligne" (header from 1280 px, and in the
  mobile menu).
- **Utility bar:** Entreprises · Devenir franchisé · English.
- Footer: customers, company and banners, legal and cookie settings.

## Homepage order (brief §6)

| § | Section | Main action |
|---|---|---|
| A/B | Header, hero: what we do, expertise, trust indicator | Trouver mon nettoyeur / Consulter les tarifs |
| C | Branch finder, directly under the hero | Search -> branch card -> Directions / Call |
| D | Services grouped by need (everyday, delicate, winter, fit, convenience) | View pricing (per service) |
| E | Pricing entry points per garment type | Find a branch |
| F | Turnaround: regular / express / specialty / delivery, each labelled *estimate* or *confirmed at drop-off* | — |
| G | Eco cleaning in 4 steps, suitable vs. other treatment | Find a location offering this service |
| H | Why Daoust/Forget (4 differentiators, flagged for validation) | — |
| I | Reviews: **hidden until genuine reviews are added** | Read the original review |
| J | How it works: in branch vs. at home (DaoustValet) | Find my cleaner / Ordering options |
| K | FAQ (5 questions, link to all 11) | — |
| L | Final CTA | Trouver mon nettoyeur / Consulter les tarifs |
| M | Footer | — |

## Key journeys

1. **"Where is the nearest branch?"** Home -> finder (postal code, city,
   address or "use my location") -> result card (address, live open/closed
   state, Directions, Call) -> branch page. Shared searches persist in `?q=`.
2. **"Can you clean this, and how much?"** Services -> service page (what it
   is, availability, which garments) -> pricing tab for the garment
   (`/tarifs#coats`) -> find a branch.
3. **"Is eco cleaning right for my garment?"** Eco page -> steps, comparison,
   suitable / other treatment -> find a location offering the service.
4. **"I don't want to go out."** Order page -> conditions (areas, fee,
   minimum, timing) -> outbound button with a "you are leaving" note ->
   DaoustValet.
5. **Business / franchise** -> utility bar -> dedicated page with a
   pre-selected enquiry form.

## Branch finder behaviour

| Input | Without a geocoder (today) | With `MAPBOX_ACCESS_TOKEN` |
|---|---|---|
| Full postal code / FSA (`H2X 2Y2`, `H2X`) | Same FSA, then same 2-char postal area, labelled as such | Geocoded, sorted by distance |
| City / neighbourhood / street | Accent- and `St/Ste`-insensitive match; every word must match | Geocoded, sorted by distance |
| "Use my location" (on click only) | Distances in the browser, **only for branches with real coordinates** | Same |

Distances are never shown unless both points have real coordinates.
Branch coordinates are `null` until geocoded from the verified address.

## Data modes

`NEXT_PUBLIC_DATA_MODE=preview` (default): unverified facts are shown with an
"À vérifier" badge (source + what to confirm), a banner tops every page, and
the site is `noindex` with `robots.txt` disallowing all crawling.

`NEXT_PUBLIC_DATA_MODE=strict` (production): unverified facts, branches and
services are not rendered, branch pages for unverified branches return 404,
the sitemap lists only verified pages, and JSON-LD is emitted only for
verified branches.

## Design system

- **Tokens** (`src/app/globals.css`): warm white `paper` #fbf9f4, `linen`,
  `sand`, `line`; `ink` #1d2420; `muted` #505b55; primary `forest` #1f4d3a /
  `forest-deep` #143326; accents `moss` #4b6640 and `clay` #8a4c2b. Every text
  pair is ≥ 4.5:1 (checked with axe on 18 pages). These are proposals pending
  the official brand guide.
- **Type:** Fraunces (display, headings) + Inter (body), self-hosted via
  Fontsource (no third-party font requests). Body 17 px, restrained heading
  scale.
- **Shape and spacing:** 20 px card radius, pill buttons, 64–80 px section
  rhythm, 6xl (1152 px) max width.
- **Motion:** colour transitions and the FAQ chevron only; all disabled under
  `prefers-reduced-motion`.
- **Imagery:** an original line illustration stands in for photography.
  Authentic photos of branches, team and garments are required (see
  VERIFICATION.md §9). No stock or proprietary imagery is used.
- **Logo:** a typeset placeholder, explicitly *not* a logo
  (`public/brand/README.md`).

## Components (`src/components/`)

| Component | Notes |
|---|---|
| `Header` | Sticky; disclosure menu on mobile (`aria-expanded`, Escape closes and returns focus); `aria-current` on the active page |
| `BranchFinder` | `role="search"`, labelled input, inline error with `aria-invalid`/`describedby`, `aria-live` results, focus moves to the result heading; loading, empty, error, geolocation-denied and no-coordinates states |
| `BranchCard`, `OpenNow` | Open state computed after hydration in Québec time; unknown days stay "to confirm" |
| `PricingExplorer` | WAI-ARIA tabs (arrows, Home/End), deep-linkable by hash |
| `FaqList` | Native `<details>` |
| `ContactForm` | Client and server validation (zod), errors per field, focus moves to the first invalid field, honeypot, rate limit; **never reports success unless delivery succeeded** |
| `OutboundOrderLink` | Visible "you will leave this site for …" note, tracked as a click (not an order) |
| `ConsentManager` | Non-modal bottom bar, Accept and Decline with equal weight, reopenable from the footer; GA4 loads only after consent |
| `VerificationBadge` / `Fact` | Preview badge built with the native Popover API; `Fact` renders a fallback in strict mode |

## Stack

Next.js 16 (App Router, static generation for every page), TypeScript,
Tailwind CSS 4, zod, lucide icons. Two route handlers: `/api/contact` and
`/api/geocode`. Secrets are server-side only. No database: business data lives
in typed files until a branch database or API is connected.
