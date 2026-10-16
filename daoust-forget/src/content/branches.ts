import type { L } from "@/lib/i18n";
import { unverified, type Verification } from "@/lib/verification";
import type { BannerId } from "./site";
import { sources } from "./sources";

/** [open, close] in local 24 h time ("08:00"), null when closed, "unknown" when not confirmed. */
export type DayHours = [string, string] | null | "unknown";
/** Monday-first, 7 entries. */
export type WeekHours = [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours];

export type Branch = {
  slug: string;
  name: L;
  banner: BannerId;
  address: { street: string; unit?: string; city: string; province: "QC"; postalCode: string };
  /** Neighbourhood or landmark words that customers might search for. */
  keywords: string[];
  phone: { display: string; tel: string } | null;
  hours: WeekHours | null;
  /**
   * Geocoded position used for distance sorting. Leave null until geocoded
   * from the verified address; never estimate by hand.
   */
  coordinates: { lat: number; lng: number } | null;
  /** Service slugs offered here, or null when not yet confirmed. */
  services: string[] | null;
  /** Branch-specific useful information. */
  notes?: L;
  /** Public review profile (e.g. Google Business Profile). */
  reviewsUrl: string | null;
  verification: Verification;
};

/**
 * Seed data only: three branches found in public directories during the
 * audit. The official locator lists many more. Replace this array with an
 * export of the verified branch database (see docs/VERIFICATION.md §2).
 */
export const branches: Branch[] = [
  {
    slug: "montreal-complexe-desjardins",
    name: { fr: "Montréal — Complexe Desjardins", en: "Montréal — Complexe Desjardins" },
    banner: "daoust-eco",
    address: { street: "5 Complexe Desjardins", city: "Montréal", province: "QC", postalCode: "H2X 2Y2" },
    keywords: ["centre-ville", "downtown", "quartier des spectacles", "place des arts", "ville-marie"],
    phone: { display: "438 387-4456", tel: "+14383874456" },
    hours: null,
    coordinates: null,
    services: null,
    reviewsUrl: null,
    verification: unverified(
      `${sources.laToileMontreal} ; ${sources.complexeDesjardins}`,
      "Adresse et téléphone issus d'un annuaire tiers ; le code postal semble différer de celui du Complexe Desjardins. Confirmer l'adresse, le local, les heures et les services.",
    ),
  },
  {
    slug: "brossard-taschereau",
    name: { fr: "Brossard — boulevard Taschereau", en: "Brossard — Taschereau Boulevard" },
    banner: "daoust-eco",
    address: { street: "8200, boulevard Taschereau", unit: "1265", city: "Brossard", province: "QC", postalCode: "J4X 1C2" },
    keywords: ["rive-sud", "south shore", "taschereau"],
    phone: { display: "450 465-3009", tel: "+14504653009" },
    hours: null,
    coordinates: null,
    services: null,
    reviewsUrl: null,
    verification: unverified(sources.laToileBrossard, "Annuaire tiers. Confirmer l'adresse, les heures et les services."),
  },
  {
    slug: "l-assomption",
    name: { fr: "L'Assomption", en: "L'Assomption" },
    banner: "daoust-eco",
    address: { street: "788, montée de Saint-Sulpice", city: "L'Assomption", province: "QC", postalCode: "J5W 0M6" },
    keywords: ["lanaudière", "lanaudiere"],
    phone: null,
    hours: [
      ["08:00", "18:00"],
      ["08:00", "18:00"],
      ["08:00", "18:00"],
      ["08:00", "18:00"],
      ["08:00", "18:00"],
      ["09:00", "16:00"],
      "unknown",
    ],
    coordinates: null,
    services: null,
    reviewsUrl: null,
    verification: unverified(
      sources.premierePageAssomption,
      "Annuaire tiers, heures mises à jour il y a environ 9 mois. Le dimanche n'était pas indiqué. Confirmer heures, téléphone et services.",
    ),
  },
];

export const getBranch = (slug: string) => branches.find((b) => b.slug === slug);
