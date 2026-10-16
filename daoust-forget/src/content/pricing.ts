import type { L } from "@/lib/i18n";
import { unverified, type Sourced } from "@/lib/verification";
import { sources } from "./sources";

/**
 * A verified price. Leave `price` null until a price list has been confirmed
 * for a given scope (network-wide or a specific branch). Never invent one.
 */
export type Price = {
  /** Amount in CAD before taxes. */
  amount: number;
  /** "from" = starting price; "each" = fixed per item. */
  kind: "from" | "each";
  /** "network" or a branch slug the price applies to. */
  scope: "network" | string;
};

export type PricingCategory = {
  id: string;
  icon: "shirt" | "pants" | "suit" | "coat" | "dress" | "gem" | "scissors";
  name: L;
  examples: L;
  /** What makes the price vary for this category. */
  factors: L[];
  /** True when a counter assessment is required before quoting. */
  assessment: boolean;
  price: Sourced<Price> | null;
  /** Services (slugs) that apply to this category. */
  services: string[];
};

export const billingModel: Sourced<L> = {
  value: {
    fr: "La facturation se fait à l'article. Les prix peuvent varier d'une succursale à l'autre.",
    en: "Billing is per item. Prices can vary from one branch to another.",
  },
  verification: unverified(sources.circulaireEco, "Confirmer la facturation à l'article et si une grille commune existe pour le réseau."),
};

export const pricingCategories: PricingCategory[] = [
  {
    id: "shirts",
    icon: "shirt",
    name: { fr: "Chemises et chemisiers", en: "Shirts and blouses" },
    examples: { fr: "Chemise de travail, chemisier, polo", en: "Work shirt, blouse, polo" },
    factors: [
      { fr: "Lavage à l'eau ou nettoyage selon l'étiquette", en: "Laundered or cleaned depending on the care label" },
      { fr: "Finition sur cintre ou pliée", en: "Finished on a hanger or folded" },
      { fr: "Lin, soie ou ornements", en: "Linen, silk or embellishments" },
    ],
    assessment: false,
    price: null,
    services: ["lavage-de-chemises", "nettoyage-ecoperformant", "service-rapide", "cueillette-et-livraison"],
  },
  {
    id: "pants",
    icon: "pants",
    name: { fr: "Pantalons et jupes", en: "Trousers and skirts" },
    examples: { fr: "Pantalon de ville, jupe droite, jean", en: "Dress trousers, straight skirt, jeans" },
    factors: [
      { fr: "Plis, doublure", en: "Pleats, lining" },
      { fr: "Matière (laine, lin, synthétique)", en: "Material (wool, linen, synthetic)" },
    ],
    assessment: false,
    price: null,
    services: ["nettoyage-et-pressage", "nettoyage-ecoperformant", "retouches"],
  },
  {
    id: "suits",
    icon: "suit",
    name: { fr: "Complets et vestons", en: "Suits and jackets" },
    examples: { fr: "Complet deux pièces, veston, smoking", en: "Two-piece suit, blazer, tuxedo" },
    factors: [
      { fr: "Nombre de pièces", en: "Number of pieces" },
      { fr: "Structure et entoilage", en: "Structure and canvassing" },
      { fr: "Procédé choisi (à l'eau ou à sec)", en: "Process chosen (water-based or dry)" },
    ],
    assessment: false,
    price: null,
    services: ["nettoyage-ecoperformant", "nettoyage-a-sec", "nettoyage-et-pressage", "service-rapide"],
  },
  {
    id: "coats",
    icon: "coat",
    name: { fr: "Manteaux", en: "Coats" },
    examples: { fr: "Manteau de laine, parka, manteau en duvet", en: "Wool coat, parka, down coat" },
    factors: [
      { fr: "Longueur et garnissage (duvet, synthétique)", en: "Length and fill (down, synthetic)" },
      { fr: "Garnitures de fourrure ou de cuir", en: "Fur or leather trims" },
      { fr: "Imperméabilisation en option", en: "Optional waterproofing" },
    ],
    assessment: true,
    price: null,
    services: ["vetements-d-hiver", "nettoyage-ecoperformant"],
  },
  {
    id: "dresses",
    icon: "dress",
    name: { fr: "Robes", en: "Dresses" },
    examples: { fr: "Robe de jour, robe de soirée", en: "Day dress, evening gown" },
    factors: [
      { fr: "Longueur, plissés, doublures", en: "Length, pleating, linings" },
      { fr: "Perles, paillettes et ornements", en: "Beads, sequins and embellishments" },
    ],
    assessment: true,
    price: null,
    services: ["nettoyage-ecoperformant", "nettoyage-a-sec", "retouches"],
  },
  {
    id: "specialty",
    icon: "gem",
    name: { fr: "Articles spéciaux", en: "Specialty items" },
    examples: { fr: "Robe de mariée, costume de scène, textile ancien", en: "Wedding gown, stage costume, heirloom textile" },
    factors: [
      { fr: "Évaluation au comptoir obligatoire", en: "Counter assessment required" },
      { fr: "Matières et ornements fragiles", en: "Fragile materials and embellishments" },
    ],
    assessment: true,
    price: null,
    services: ["nettoyage-a-sec", "nettoyage-ecoperformant"],
  },
  {
    id: "alterations",
    icon: "scissors",
    name: { fr: "Retouches", en: "Alterations" },
    examples: { fr: "Ourlet, ajustement de taille, fermeture éclair", en: "Hem, waist adjustment, zipper" },
    factors: [{ fr: "Nature et complexité du travail", en: "Type and complexity of the work" }],
    assessment: true,
    price: null,
    services: ["retouches"],
  },
];
