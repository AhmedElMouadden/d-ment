import type { L } from "@/lib/i18n";
import { unverified, type Sourced } from "@/lib/verification";
import { sources } from "./sources";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const brand = {
  /** Text wordmark only. Replace with the official logo files (public/brand/). */
  name: "Daoust/Forget",
  legalName: "Groupe Daoust Forget inc.",
  tagline: { fr: "Nettoyeurs", en: "Cleaners" } satisfies L,
};

/** Trust indicator shown in the hero. Sources disagree; see docs/AUDIT.md §3. */
export const since: Sourced<number> = {
  value: 1980,
  verification: unverified(
    sources.expressFranchise,
    "« Fondé en 1980 » (fiche franchise). Le site officiel date la fusion Daoust + Michel Forget au 1er avril 1992 (La Presse : 1991). D'autres pages parlent de « 35 ans » et « 45 ans ». Confirmer quelle date et quelle formulation utiliser.",
  ),
};

export const customerService = {
  phone: {
    value: { display: "1 800 668-9080", tel: "+18006689080" },
    verification: unverified(
      sources.daoustValetFacebook,
      "Numéro affiché sur la page Facebook DaoustValet. Confirmer s'il dessert aussi les clients en succursale.",
    ),
  } satisfies Sourced<{ display: string; tel: string }>,
  email: {
    value: "service@daoustvalet.com",
    verification: unverified(sources.daoustValetFacebook, "Adresse du service DaoustValet. Confirmer l'adresse générale."),
  } satisfies Sourced<string>,
};

export type OrderingChannel = {
  id: "daoust-valet-web" | "daoust-valet-ios" | "customer-account";
  label: L;
  description: L;
  url: string;
  /** Host shown in the "you are leaving this site" notice. */
  host: string;
  verification: ReturnType<typeof unverified>;
};

/**
 * Existing ordering platforms. We link to them rather than rebuilding
 * ordering or payment. Order completion happens on those hosts; see
 * docs/ANALYTICS.md for cross-domain measurement.
 */
export const ordering: OrderingChannel[] = [
  {
    id: "daoust-valet-web",
    label: { fr: "Commander sur DaoustValet", en: "Order on DaoustValet" },
    description: {
      fr: "Cueillette et livraison à domicile ou au bureau, dans les secteurs desservis.",
      en: "Pickup and delivery at home or at work, in served areas.",
    },
    url: "https://daoustvalet.com/en/order/",
    host: "daoustvalet.com",
    verification: unverified(
      sources.daoustValetOrder,
      "Confirmer l'URL de commande actuelle (version française ?) et que la plateforme est toujours active.",
    ),
  },
  {
    id: "daoust-valet-ios",
    label: { fr: "Application DaoustValet (iPhone)", en: "DaoustValet app (iPhone)" },
    description: {
      fr: "Passer une commande et suivre son état, avec alertes par courriel et texto.",
      en: "Place an order and follow its status, with email and text alerts.",
    },
    url: "https://apps.apple.com/ca/app/daoust-valet/id1374330456",
    host: "apps.apple.com",
    verification: unverified(sources.daoustValetApp, "Confirmer que l'application est maintenue. Existe-t-il une version Android ?"),
  },
  {
    id: "customer-account",
    label: { fr: "Mon compte client", en: "My customer account" },
    description: {
      fr: "Portail de compte client Daoust.",
      en: "Daoust customer account portal.",
    },
    url: "https://myaccount.daousteco.com/",
    host: "myaccount.daousteco.com",
    verification: unverified(
      sources.accountTerms,
      "Seules les conditions d'utilisation de ce portail ont été repérées. Confirmer son rôle (commande ? suivi ? fidélité ?) avant de le mettre en avant.",
    ),
  },
];

export const pickupDelivery = {
  areas: {
    value: {
      fr: "Montréal (dont le Plateau-Mont-Royal, Outremont et Westmount), Laval, la Rive-Sud, Mascouche et Terrebonne",
      en: "Montréal (including Plateau-Mont-Royal, Outremont and Westmount), Laval, the South Shore, Mascouche and Terrebonne",
    } satisfies L,
    verification: unverified(sources.daoustValetFranchisePage, "Liste issue de pages DaoustValet anciennes. Obtenir la carte ou la liste de codes postaux à jour."),
  } satisfies Sourced<L>,
  fee: {
    value: { fr: "Cueillette et livraison gratuites", en: "Free pickup and delivery" } satisfies L,
    verification: unverified(sources.daoustValetFranchisePage, "Annoncé sur une page ancienne. Confirmer les frais actuels."),
  } satisfies Sourced<L>,
  minimumOrder: {
    value: 30,
    verification: unverified(sources.daoustValetFranchisePage, "Commande minimale de 30 $ annoncée sur une page ancienne. Confirmer."),
  } satisfies Sourced<number>,
  turnaround: {
    value: { fr: "Retour des vêtements en 48 heures environ", en: "Garments returned in about 48 hours" } satisfies L,
    verification: unverified(sources.daoustValetOrder, "Délai publié par DaoustValet. Confirmer s'il s'agit d'un engagement ou d'une estimation."),
  } satisfies Sourced<L>,
};

export const social = [
  {
    id: "facebook-daoustvalet",
    label: "Facebook — DaoustValet",
    url: "https://www.facebook.com/daoustvalet/",
    verification: unverified(sources.daoustValetFacebook, "Confirmer que c'est la page officielle à afficher."),
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/daoustnettoyeursecoperformants",
    verification: unverified("https://www.linkedin.com/company/daoustnettoyeursecoperformants"),
  },
];

export const franchiseSite = {
  url: "https://www.franchise.daousteco.com/",
  verification: unverified(sources.daoustValetFranchisePage, "Confirmer l'adresse du site franchise et la personne-ressource."),
};

/** Brand family explainer, to reduce confusion between banners. */
export const banners = [
  {
    id: "daoust-forget",
    name: "Daoust/Forget",
    description: {
      fr: "Bannière née en 1992 de la fusion des nettoyeurs Daoust et Michel Forget.",
      en: "Banner formed in 1992 by the merger of the Daoust and Michel Forget cleaners.",
    },
    verification: unverified(sources.officialAbout, "La Presse indique 1991. Confirmer la date."),
  },
  {
    id: "daoust-eco",
    name: "Daoust Nettoyeurs Écoperformants",
    description: {
      fr: "Bannière des succursales qui utilisent le procédé de nettoyage à l'eau Aquaperformance.",
      en: "Banner for branches using the Aquaperformance water-based cleaning process.",
    },
    verification: unverified(sources.daoustValetHistory),
  },
  {
    id: "daoust-valet",
    name: "DaoustValet",
    description: {
      fr: "Service de cueillette et de livraison du Groupe Daoust Forget.",
      en: "Groupe Daoust Forget's pickup and delivery service.",
    },
    verification: unverified(sources.daoustValetFacebook),
  },
] as const;

export type BannerId = (typeof banners)[number]["id"];
