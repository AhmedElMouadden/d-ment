// Accessibility (axe, WCAG 2.2 AA) and customer-journey checks against a running
// preview build: npm run build && npm start, then npm run test:e2e.
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "e2e/screenshots";
import { mkdirSync } from "node:fs";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const log = (...a) => console.log(...a);
let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; log("FAIL", msg); } else log("ok  ", msg); };

// 1. Axe on every page, FR + EN
const pages = ["/fr", "/en", "/fr/succursales", "/fr/succursales/l-assomption", "/en/locations/brossard-taschereau", "/fr/services", "/fr/services/nettoyage-ecoperformant", "/fr/tarifs", "/en/pricing", "/fr/nettoyage-ecologique", "/fr/commander", "/fr/entreprises", "/fr/franchise", "/fr/contact", "/fr/faq", "/fr/confidentialite", "/fr/conditions", "/fr/nope"];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
for (const p of pages) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()));
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  const v = r.violations.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes[0].target} — ${x.nodes[0].failureSummary?.split("\n")[1] ?? ""}`);
  check(v.length === 0, `axe ${p} ${v.join(" | ")}`);
  check(errors.length === 0, `console ${p} ${errors.join(" | ")}`);
  const h1 = await page.locator("h1").count();
  check(h1 === 1, `single h1 on ${p} (${h1})`);
  await page.close();
}

// 2. Mobile journey: home -> search -> branch -> call/directions present
const m = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, locale: "fr-CA" });
const pg = await m.newPage();
await pg.goto(BASE + "/fr", { waitUntil: "networkidle" });
await pg.screenshot({ path: `${out}/mobile-home.png`, fullPage: false });
const sw = await pg.evaluate(() => document.documentElement.scrollWidth);
check(sw <= 375, `no horizontal scroll on mobile home (${sw})`);
// consent banner shows (preview), non-modal
check(await pg.getByRole("region", { name: "Mesure d'audience" }).isVisible(), "consent banner visible");
await pg.getByRole("button", { name: "Refuser" }).click();
check(!(await pg.getByRole("region", { name: "Mesure d'audience" }).isVisible().catch(() => false)), "consent banner closes on decline");
// empty search error
await pg.getByRole("button", { name: "Rechercher" }).click();
check(await pg.getByRole("alert").first().isVisible(), "empty search shows error");
await pg.getByLabel("Code postal, ville ou adresse").fill("st-jérôme");
await pg.getByRole("button", { name: "Rechercher" }).click();
check(await pg.getByText("Aucune succursale ne correspond").isVisible(), "no-results state");
await pg.getByLabel("Code postal, ville ou adresse").fill("Brossard");
await pg.getByRole("button", { name: "Rechercher" }).click();
check(await pg.getByText("1 succursale trouvée").isVisible(), "city search result");
await pg.screenshot({ path: `${out}/mobile-search.png` });
await pg.getByRole("link", { name: "Brossard — boulevard Taschereau" }).first().click();
await pg.waitForURL("**/succursales/brossard-taschereau");
check(await pg.locator('a[href="tel:+14504653009"]').first().isVisible(), "click-to-call on branch page");
check(await pg.locator('a[href^="https://www.google.com/maps/dir/"]').first().isVisible(), "directions link");
await pg.screenshot({ path: `${out}/mobile-branch.png`, fullPage: true });
// postal search
await pg.goto(BASE + "/fr/succursales?q=H2X%201A1", { waitUntil: "networkidle" });
check(await pg.getByText("Même secteur postal").first().isVisible(), "FSA search via shared URL");
// menu
await pg.getByRole("button", { name: "Ouvrir le menu" }).click();
check(await pg.getByRole("link", { name: "Tarifs" }).first().isVisible(), "mobile menu opens");
await pg.keyboard.press("Escape");
check(await pg.getByRole("button", { name: "Ouvrir le menu" }).isVisible(), "menu closes on Escape");
// geolocation denied path
const g = await browser.newContext({ viewport: { width: 375, height: 812 }, permissions: [] });
const gp = await g.newPage();
await gp.goto(BASE + "/fr/succursales", { waitUntil: "networkidle" });
await gp.getByRole("button", { name: "Utiliser ma position" }).click();
await gp.waitForTimeout(800);
log("     geo message:", await gp.getByRole("alert").first().textContent().catch(() => "none"));
// granted geolocation -> no coordinates message
const g2 = await browser.newContext({ permissions: ["geolocation"], geolocation: { latitude: 45.5, longitude: -73.56 } });
const gp2 = await g2.newPage();
await gp2.goto(BASE + "/fr/succursales", { waitUntil: "networkidle" });
await gp2.getByRole("button", { name: "Utiliser ma position" }).click();
await gp2.waitForTimeout(500);
check((await gp2.getByRole("alert").first().textContent()).includes("géocodées"), "geolocation honest about missing coordinates");

// 3. Pricing tabs keyboard + deep link
const d = await ctx.newPage();
await d.goto(BASE + "/fr/tarifs#coats", { waitUntil: "networkidle" });
check((await d.getByRole("tab", { selected: true }).textContent()).includes("Manteaux"), "pricing deep link selects coats");
await d.getByRole("tab", { selected: true }).focus();
await d.keyboard.press("ArrowDown");
check((await d.getByRole("tab", { selected: true }).textContent()).includes("Robes"), "arrow key moves tab");
check(await d.getByText("Prix confirmé en succursale").isVisible(), "no fabricated price");
await d.screenshot({ path: `${out}/desktop-pricing.png`, fullPage: true });

// 4. Contact form validation + not-configured
await d.goto(BASE + "/fr/contact", { waitUntil: "networkidle" });
await d.getByRole("button", { name: "Envoyer" }).click();
check(await d.getByText("Entrez votre nom.").isVisible(), "inline validation");
const focusedId = await d.evaluate(() => document.activeElement?.getAttribute("name"));
check(focusedId === "name", `focus moves to first invalid field (${focusedId})`);
await d.getByLabel(/^Nom/).fill("Ana Test");
await d.getByLabel(/^Courriel/).fill("ana@example.com");
await d.getByLabel(/^Message/).fill("Bonjour, une question sur un manteau.");
await d.getByLabel(/J'accepte/).check();
await d.getByRole("button", { name: "Envoyer" }).click();
await d.waitForTimeout(600);
check(await d.getByText("n'a pas été envoyé").isVisible(), "not-configured state, no false success");

// 5. Language switch keeps page
await d.goto(BASE + "/fr/succursales/l-assomption", { waitUntil: "networkidle" });
await d.getByRole("link", { name: "Read this page in English" }).click();
await d.waitForURL("**/en/locations/l-assomption");
check(await d.locator("html").getAttribute("lang") === "en-CA", "html lang en-CA after switch");
check(await d.locator("td", { hasText: "To confirm" }).isVisible(), "unknown Sunday shown as To confirm");

// 6. Desktop screenshots
for (const [p, n] of [["/fr", "desktop-home"], ["/fr/nettoyage-ecologique", "desktop-eco"], ["/en/order", "desktop-order"], ["/fr/services/nettoyage-ecoperformant", "desktop-service"]]) {
  await d.goto(BASE + p, { waitUntil: "networkidle" });
  await d.screenshot({ path: `${out}/${n}.png`, fullPage: true });
}
// 7. Metadata
await d.goto(BASE + "/en/pricing");
log("     canonical:", await d.locator('link[rel=canonical]').getAttribute("href"), "| hreflang:", await d.locator('link[rel=alternate][hreflang]').evaluateAll((l) => l.map((x) => x.hreflang + "=" + x.getAttribute("href")).join(", ")), "| robots:", await d.locator('meta[name=robots]').getAttribute("content"));
await browser.close();
log(failures ? `\n${failures} FAILURES` : "\nALL PASSED");
process.exitCode = failures ? 1 : 0;
