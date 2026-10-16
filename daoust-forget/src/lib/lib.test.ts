import { describe, expect, it } from "vitest";
import type { Branch } from "@/content/branches";
import { branches } from "@/content/branches";
import { services } from "@/content/services";
import { pricingCategories } from "@/content/pricing";
import { faq } from "@/content/faq";
import { classifyQuery, haversineKm, nearestBranches, normalize, searchBranches } from "./branch-search";
import { formatTime, localNow, openState } from "./hours";
import { localizePath, href, localizedRewrites, routes } from "./routes";
import { canShow, shown, unverified } from "./verification";
import { parseConsent, serializeConsent } from "./consent";
import { contactSchema, fieldErrors } from "./contact";
import { track } from "./analytics";

const make = (over: Partial<Branch>): Branch => ({
  slug: "x",
  name: { fr: "X", en: "X" },
  banner: "daoust-eco",
  address: { street: "1 rue A", city: "Laval", province: "QC", postalCode: "H7N 1A1" },
  keywords: [],
  phone: null,
  hours: null,
  coordinates: null,
  services: null,
  reviewsUrl: null,
  verification: unverified("test"),
  ...over,
});

describe("branch search", () => {
  const list = [
    make({ slug: "laval", address: { street: "1 boul. Saint-Martin", city: "Laval", province: "QC", postalCode: "H7N 1A1" } }),
    make({ slug: "stj", address: { street: "2 rue Principale", city: "Saint-Jérôme", province: "QC", postalCode: "J7Z 1A1" } }),
    make({ slug: "mtl", keywords: ["centre-ville"], address: { street: "5 Complexe Desjardins", city: "Montréal", province: "QC", postalCode: "H2X 2Y2" } }),
  ];

  it("classifies postal codes, FSAs and text", () => {
    expect(classifyQuery("h2x 2y2")).toEqual({ kind: "postal", value: "H2X2Y2" });
    expect(classifyQuery(" J7Z ")).toEqual({ kind: "fsa", value: "J7Z" });
    expect(classifyQuery("Ste-Thérèse").kind).toBe("text");
    expect(classifyQuery("   ").kind).toBe("empty");
  });

  it("normalizes accents and saint abbreviations", () => {
    expect(normalize("St-Jérôme")).toBe("saint jerome");
    expect(normalize("Ste-Thérèse")).toBe("sainte therese");
  });

  it("matches by city regardless of accents and abbreviations", () => {
    expect(searchBranches(list, "st-jerome")[0]).toMatchObject({ reason: "city", branch: { slug: "stj" } });
    expect(searchBranches(list, "montreal")[0].branch.slug).toBe("mtl");
  });

  it("requires every word to match", () => {
    const more = [...list, make({ slug: "ass", address: { street: "788, montée de Saint-Sulpice", city: "L'Assomption", province: "QC", postalCode: "J5W 0M6" } })];
    expect(searchBranches(more, "St-Jérôme").map((r) => r.branch.slug)).toEqual(["stj"]);
    expect(searchBranches(more, "Saint-Lambert")).toEqual([]);
  });

  it("matches keywords and street text", () => {
    expect(searchBranches(list, "centre-ville").map((r) => r.branch.slug)).toEqual(["mtl"]);
  });

  it("matches exact FSA, then the broader postal area, never distance", () => {
    expect(searchBranches(list, "H2X 1B3")).toEqual([{ branch: list[2], reason: "postal-fsa" }]);
    const area = searchBranches(list, "H7A");
    expect(area.map((r) => r.reason)).toEqual(["postal-area"]);
    expect(area[0].distanceKm).toBeUndefined();
    expect(searchBranches(list, "G1R 2B5")).toEqual([]);
  });

  it("sorts by distance and skips branches without coordinates", () => {
    const withCoords = [
      make({ slug: "a", coordinates: { lat: 45.5, lng: -73.56 } }),
      make({ slug: "b", coordinates: { lat: 46.81, lng: -71.21 } }),
      make({ slug: "c" }),
    ];
    const res = nearestBranches(withCoords, { lat: 45.51, lng: -73.55 });
    expect(res.map((r) => r.branch.slug)).toEqual(["a", "b"]);
    expect(res[0].distanceKm!).toBeLessThan(2);
  });

  it("computes plausible great-circle distances", () => {
    // Montréal to Québec City is about 233 km.
    expect(haversineKm({ lat: 45.5019, lng: -73.5674 }, { lat: 46.8139, lng: -71.208 })).toBeGreaterThan(225);
    expect(haversineKm({ lat: 45.5019, lng: -73.5674 }, { lat: 46.8139, lng: -71.208 })).toBeLessThan(240);
  });
});

describe("hours", () => {
  const week = [
    ["08:00", "18:00"], ["08:00", "18:00"], ["08:00", "18:00"], ["08:00", "18:00"], ["08:00", "21:00"],
    ["09:00", "16:00"], null,
  ] as Branch["hours"];

  it("uses Québec local time", () => {
    // 2026-10-16 is a Friday; 14:00 UTC = 10:00 EDT.
    expect(localNow(new Date("2026-10-16T14:00:00Z"))).toEqual({ day: 4, minutes: 600 });
  });

  it("reports open, closed and next opening", () => {
    expect(openState(week, new Date("2026-10-16T14:00:00Z"))).toEqual({ state: "open", closesAt: "21:00" });
    // Sunday 12:00 EDT -> closed, opens Monday 08:00.
    expect(openState(week, new Date("2026-10-18T16:00:00Z"))).toEqual({ state: "closed", opensAt: "08:00", opensDay: 0 });
    // Monday 07:00 EDT -> opens today.
    expect(openState(week, new Date("2026-10-19T11:00:00Z"))).toEqual({ state: "closed", opensAt: "08:00", opensDay: 0 });
  });

  it("never guesses on unknown days", () => {
    const partial = [...week!] as NonNullable<Branch["hours"]>;
    partial[6] = "unknown";
    expect(openState(partial, new Date("2026-10-18T16:00:00Z"))).toEqual({ state: "unknown" });
    expect(openState(null, new Date())).toEqual({ state: "unknown" });
  });

  it("formats times per locale", () => {
    expect(formatTime("08:00", "fr")).toBe("8 h");
    expect(formatTime("17:30", "fr")).toBe("17 h 30");
    expect(formatTime("17:30", "en")).toBe("5:30 p.m.");
    expect(formatTime("00:00", "en")).toBe("12:00 a.m.");
  });
});

describe("routes", () => {
  it("builds localized URLs", () => {
    expect(href("fr", "pricing")).toBe("/fr/tarifs");
    expect(href("en", "locations", "laval")).toBe("/en/locations/laval");
    expect(href("en", "home")).toBe("/en");
  });

  it("switches language while keeping sub-paths", () => {
    expect(localizePath("/fr/succursales/laval", "en")).toBe("/en/locations/laval");
    expect(localizePath("/en/eco-cleaning", "fr")).toBe("/fr/nettoyage-ecologique");
    expect(localizePath("/fr", "en")).toBe("/en");
    expect(localizePath("/fr/inconnu", "en")).toBe("/en");
  });

  it("rewrites every English slug that differs from French", () => {
    const sources = localizedRewrites().map((r) => r.source);
    for (const r of Object.values(routes)) {
      if (r.en && r.en !== r.fr) expect(sources).toContain(`/en/${r.en}`);
    }
  });
});

describe("verification gating", () => {
  it("hides unverified facts in strict mode only", () => {
    const fact = { value: 1, verification: unverified("x") };
    expect(shown(fact, "preview")).toBe(1);
    expect(shown(fact, "strict")).toBeNull();
    expect(canShow({ status: "verified", source: "x" }, "strict")).toBe(true);
  });
});

describe("consent", () => {
  it("round-trips and rejects stale versions", () => {
    const cookie = serializeConsent("granted", true).split(";")[0];
    expect(parseConsent(`a=b; ${cookie}`)).toBe("granted");
    expect(parseConsent("df_consent=0%3Agranted")).toBeNull();
    expect(parseConsent(undefined)).toBeNull();
    expect(serializeConsent("denied", true)).toContain("Secure");
  });

  it("does not send events without consent", () => {
    expect(track("faq_open", { question_id: "x", placement: "t" })).toBe(false);
  });
});

describe("contact validation", () => {
  const ok = { name: "Ana", email: "ana@example.com", topic: "general", message: "Bonjour, une question.", consent: true };

  it("accepts a valid message", () => {
    expect(contactSchema.safeParse(ok).success).toBe(true);
  });

  it("returns field error codes", () => {
    const r = contactSchema.safeParse({ ...ok, email: "nope", consent: false, phone: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toMatchObject({ email: "email_invalid", consent: "consent_required", phone: "phone_invalid" });
  });

  it("rejects the honeypot", () => {
    expect(contactSchema.safeParse({ ...ok, website: "spam.example" }).success).toBe(false);
  });
});

describe("content integrity", () => {
  it("has unique slugs and valid branch data", () => {
    expect(new Set(branches.map((b) => b.slug)).size).toBe(branches.length);
    for (const b of branches) {
      expect(b.address.postalCode).toMatch(/^[A-Z]\d[A-Z] \d[A-Z]\d$/);
      expect(b.slug).toMatch(/^[a-z0-9-]+$/);
      if (b.hours) expect(b.hours).toHaveLength(7);
      for (const s of b.services ?? []) expect(services.map((x) => x.slug)).toContain(s);
      if (b.phone) expect(b.phone.tel).toMatch(/^\+1\d{10}$/);
    }
  });

  it("cross-references services and pricing", () => {
    const slugs = services.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const cats = pricingCategories.map((c) => c.id);
    for (const s of services) for (const p of s.pricing) expect(cats).toContain(p);
    for (const c of pricingCategories) for (const s of c.services) expect(slugs).toContain(s);
  });

  it("never ships a price without its source", () => {
    for (const c of pricingCategories) if (c.price) expect(c.price.verification.source).toBeTruthy();
  });

  it("has unique FAQ ids", () => {
    expect(new Set(faq.map((f) => f.id)).size).toBe(faq.length);
  });
});
