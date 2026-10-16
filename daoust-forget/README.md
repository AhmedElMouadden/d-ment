# Daoust/Forget — customer website

A bilingual (FR/EN), customer-first website for the Daoust/Forget garment-care
network: branch finder, services, pricing, ecological cleaning, and a clear
handover to the existing DaoustValet ordering platform.

> **Preview build.** The official site could not be reached from the build
> environment. All business data comes from public sources and is marked
> **"À vérifier"** until confirmed. See [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Run it

```bash
cd daoust-forget
npm install
npm run dev        # http://localhost:3000 -> /fr
npm test           # unit tests
npm run typecheck && npm run lint && npm run build
```

Copy `.env.example` to `.env.local` to enable integrations. Without any
variables the site runs fully, in preview mode, with no tracking.

## Where things are

| Path | What |
|---|---|
| `src/content/` | **All business data** (branches, services, pricing, eco claims, FAQ, reviews), each fact with its source and verification status |
| `src/dictionaries/` | Interface copy, `fr.ts` is the reference; `en.ts` is typed against it, so a missing key fails the build |
| `src/lib/` | Routing and slugs, branch search, hours, consent, analytics, SEO helpers |
| `src/components/` | Accessible UI components |
| `src/app/[lang]/` | Pages (French slugs; English slugs are rewrites) |
| `src/app/api/` | `contact` (webhook delivery) and `geocode` (server-side geocoding) |
| `docs/` | Deliverables listed below |

## Deliverables

1. [Audit of the current site](docs/AUDIT.md)
2. [Information architecture, journeys, design system and components](docs/ARCHITECTURE.md)
3. [Analytics event plan](docs/ANALYTICS.md)
4. [Business information and integrations to provide](docs/VERIFICATION.md)
5. [QA checklist](docs/QA.md)

## Going to production

1. Complete [docs/VERIFICATION.md](docs/VERIFICATION.md) and mark facts as verified.
2. Set `NEXT_PUBLIC_DATA_MODE=strict` and `NEXT_PUBLIC_SITE_URL`.
3. Configure `CONTACT_WEBHOOK_URL`, then optionally `MAPBOX_ACCESS_TOKEN` and `NEXT_PUBLIC_GA_ID`.
4. Run the manual checks in [docs/QA.md](docs/QA.md).
