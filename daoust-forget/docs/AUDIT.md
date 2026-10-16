# 1. Audit of the current site (October 2026)

Reference page: <https://daousteco.com/accueil-daoust-forget/>

## Method and limits

- The official domains (`daousteco.com`, `daoustforget.com`, `daoustvalet.com`)
  **could not be fetched** from the build environment (network policy). The
  audit therefore relies on search-engine extracts of the official pages and
  on third-party sources (directories, franchise listings, press, a supplier
  case study).
- **Before launch, a person must walk through the live site** and complete the
  sections marked *To check on the live site* below.
- No text, layout, code or images were copied from the existing site.

## 2. Brand ecosystem (what a customer currently has to understand)

| Brand / property | Role | Source |
|---|---|---|
| **Daoust/Forget** (Nettoyeur Daoust/Forget) | Historic banner, born from the merger of Nettoyeur Daoust and Nettoyeur Michel Forget | daousteco.com/qui-sommes-nous (extract), daoustvalet.com history page |
| **Daoust Nettoyeurs Écoperformants** (`daousteco.com`) | Eco banner for branches using the water-based *Aquaperformance* process | LinkedIn, press, franchise listings |
| **DaoustValet** (`daoustvalet.com`, iOS app) | Pickup and delivery service, for individuals and businesses | App Store, DaoustValet pages, Facebook |
| `myaccount.daousteco.com` | Customer account portal (only its terms page was found) | search extract |
| `franchise.daousteco.com` | Franchise recruitment site | search extract |
| **Groupe Daoust Forget inc.** | Parent company | DaoustValet pages |

**Finding:** at least four domains and three banners. The reference page itself
lives on the *Écoperformants* domain while carrying the *Daoust/Forget* name.
A customer looking for "the nearest cleaner" has to work out which banner and
which site to use. The redesign puts **one customer journey first** (find a
branch, check services and prices, order) and explains the banners only in
the footer and on branch cards.

## 3. Facts found, and inconsistencies to resolve

| Topic | What the sources say | Conflict |
|---|---|---|
| Founding | "Founded in 1980" (franchise listing); Michel Forget banner founded 1983 (DaoustValet history); merger on **1 April 1992** (official site); merger in **1991** (La Presse) | Which date is the brand's "since"? |
| Years of experience | "35 years" and "45 years" in different listings; "30 years" in a directory | Outdated copies in circulation |
| Network size | **93**, **94** and **"more than 120"** locations; "about 80 franchisees" | Branches vs. franchisees vs. points of service? |
| Customers | "About 700,000 customers a year" (company materials) | Not substantiated |
| Ownership | Lionel Frérot bought the group in 2015 with a partner (La Presse); Hugo Cerqueira named CEO / North America president | Confirm current leadership before quoting anyone |
| Eco process | *Aquaperformance* (wet cleaning) created in 2015; described as "100 % écologique et complètement automatisée"; aims to phase out solvent dry cleaning gradually | Wording risk, see §5 |
| Dry cleaning | Some directory listings still advertise on-site dry cleaning for the Daoust/Forget banner | Which branches still dry clean? |
| Express | "3-hour service, even on Saturday"; "3 or 5 hours" | A listed branch (Saint-Jérôme) is closed on Saturday |
| Laundry | Only at some branches (LaSalle, Montréal, Côte-des-Neiges, Mont-Tremblant) | Current? |
| Winter care | Waterproofing, down, fur | Fur policy? |
| Pickup & delivery | Free pickup and delivery, **$30 minimum**, 20 % off first order, return in **48 h**; areas: Plateau, Outremont, Westmount, Laval, South Shore, Mascouche, Terrebonne | Pages look several years old |
| Pricing | Billing per item; **no published price list found** | Do branches share one price list? |
| Franchise terms | $30k entry fee / $100k contribution (L'Express) vs. €27k / €160–415k (Observatoire) vs. $40k / $300k (another L'Express sheet) | Three contradictory sets |
| Reviews | One directory: 3.8/5 from 55 reviews (a single branch) | Not displayable as a brand rating |

**Rule applied in the build:** none of these figures appears as a verified
fact. Each one sits in `src/content/*` with its source and what must be
confirmed, and shows only in preview mode with an "À vérifier" badge.

## 4. Strengths to keep

- A real, ownable differentiator: an in-house water-based process with a name
  (*Aquaperformance*) and a date (2015).
- Brand heritage (Michel Forget is a well-known name in Québec).
- A working remote channel (DaoustValet app and site), so ordering does not
  need to be rebuilt.
- A dense branch network, which makes local search the main acquisition lever.

## 5. Problems observed, and the redesign response

| Problem | Response in the new site |
|---|---|
| Brand and domain fragmentation | One customer IA; banners explained in the footer and as chips on branch cards |
| Inconsistent figures across pages | Single source of truth in `src/content/`, each fact sourced, preview/strict modes |
| Absolute environmental wording ("100 % écologique", "sans solvants chimiques") | Since the June 2024 Competition Act amendments (Bill C-59), environmental benefit claims must be substantiated. New copy states only what the process *is* (water, no dry-cleaning solvents) and *when it may not fit*. Claims listed separately, each with a source, pending written substantiation |
| No visible pricing | A pricing page that explains *how* each garment is priced, shows real prices only once verified, and says plainly when the price is confirmed at the counter |
| Express and turnaround promises without conditions | "Estimate" vs. "confirmed at drop-off" labels, express shown as "some branches" |
| Ordering on another domain with no transition | A dedicated `/commander` page, a "you will leave this site for daoustvalet.com" note on every outbound order button, and an explicit statement that only DaoustValet confirms orders |
| Franchise recruitment mixed with consumer content | Franchise and business pages moved to the secondary utility bar and footer |

## To check on the live site (not possible from here)

- [ ] Current navigation, page list and URL structure (for 301 redirects)
- [ ] The official branch locator: data source, count, fields, whether an API or export exists
- [ ] Whether the site has an English version, and how complete it is
- [ ] Analytics and tag manager currently installed; cookie banner behaviour
- [ ] Core Web Vitals of the current pages (baseline, see ANALYTICS.md)
- [ ] Any online price list or promotions currently shown
- [ ] Whether the order flow on DaoustValet can carry GA4 linker parameters
