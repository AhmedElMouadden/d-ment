import type { L } from "@/lib/i18n";
import { unverified, type Sourced } from "@/lib/verification";
import { sources } from "./sources";

/**
 * Wording rules for this file (see docs/AUDIT.md §5):
 * - No "100 % écologique", "sans produits chimiques", "zéro impact" or
 *   guaranteed stain removal. Since June 2024 the Competition Act requires
 *   environmental benefit claims to be substantiated.
 * - Every comparative or quantified claim must carry its source.
 */

export const ecoSteps: { title: L; body: L }[] = [
  {
    title: { fr: "Inspection", en: "Inspection" },
    body: {
      fr: "On lit l'étiquette, on identifie la fibre, les taches et les ornements, et on choisit le traitement.",
      en: "We read the care label, identify the fibre, stains and embellishments, and choose the treatment.",
    },
  },
  {
    title: { fr: "Détachage ciblé", en: "Targeted spotting" },
    body: {
      fr: "Les taches sont prétraitées une à une, selon leur nature et le textile.",
      en: "Stains are pre-treated one by one, according to their nature and the textile.",
    },
  },
  {
    title: { fr: "Lavage à l'eau contrôlé", en: "Controlled water wash" },
    body: {
      fr: "Des machines professionnelles dosent l'eau, les détergents, la température et le mouvement selon le vêtement.",
      en: "Professional machines dose water, detergents, temperature and movement to suit the garment.",
    },
  },
  {
    title: { fr: "Séchage et finition", en: "Drying and finishing" },
    body: {
      fr: "Séchage adapté, puis pressage et mise en forme pour un vêtement prêt à porter.",
      en: "Suitable drying, then pressing and shaping so the garment is ready to wear.",
    },
  },
];

export const ecoProcessVerification = unverified(
  sources.miele,
  "Étapes génériques de l'aquanettoyage professionnel. Faire valider la description par l'équipe des opérations Daoust.",
);

export const ecoComparison: { label: L; water: L; dry: L }[] = [
  {
    label: { fr: "Milieu de nettoyage", en: "Cleaning medium" },
    water: { fr: "Eau et détergents professionnels", en: "Water and professional detergents" },
    dry: { fr: "Solvant (sans eau)", en: "Solvent (no water)" },
  },
  {
    label: { fr: "Température de lavage", en: "Wash temperature" },
    water: { fr: "Température ambiante, selon le programme", en: "Room temperature, depending on the program" },
    dry: { fr: "Solvant chauffé, selon l'équipement", en: "Heated solvent, depending on equipment" },
  },
  {
    label: { fr: "Taches à base d'eau (sueur, sucre, boissons)", en: "Water-based stains (sweat, sugar, drinks)" },
    water: { fr: "L'eau les dissout naturellement", en: "Water naturally dissolves them" },
    dry: { fr: "Souvent un prétraitement supplémentaire", en: "Often need extra pre-treatment" },
  },
];

export const ecoClaims: Sourced<L>[] = [
  {
    value: {
      fr: "Depuis 2015, Daoust développe son propre procédé de nettoyage à l'eau, l'Aquaperformance, pour remplacer graduellement le nettoyage à sec traditionnel.",
      en: "Since 2015, Daoust has been developing its own water-based cleaning process, Aquaperformance, to gradually replace traditional dry cleaning.",
    },
    verification: unverified(sources.officialAbout, "Date et objectif déclarés par l'entreprise."),
  },
  {
    value: {
      fr: "Le procédé n'utilise pas les solvants du nettoyage à sec, comme le perchloroéthylène.",
      en: "The process does not use dry-cleaning solvents such as perchloroethylene.",
    },
    verification: unverified(
      sources.laPresse,
      "Confirmer par écrit (fiche technique des détergents utilisés) avant publication. Ne pas reformuler en « sans produits chimiques ».",
    ),
  },
  {
    value: {
      fr: "Les laveuses fonctionnent à température ambiante, alors que les solvants du nettoyage à sec sont chauffés à 130–140 °C.",
      en: "The washers run at room temperature, whereas dry-cleaning solvents are heated to 130–140 °C.",
    },
    verification: unverified(sources.miele, "Chiffres cités par un fournisseur d'équipement. Faire valider ; ne pas en déduire d'économie d'énergie chiffrée sans mesure documentée."),
  },
];

export const ecoSuitable: L[] = [
  { fr: "La plupart des vêtements du quotidien : coton, lin, synthétiques", en: "Most everyday garments: cotton, linen, synthetics" },
  { fr: "Beaucoup de pièces en laine, y compris des complets", en: "Many wool pieces, including suits" },
  {
    fr: "Bien des vêtements étiquetés « nettoyage à sec », après évaluation par notre équipe",
    en: "Many garments labelled “dry clean”, after assessment by our team",
  },
];

export const ecoOther: L[] = [
  { fr: "Cuir, suède et fourrure", en: "Leather, suede and fur" },
  { fr: "Certains ornements fragiles (perles collées, paillettes)", en: "Some fragile embellishments (glued beads, sequins)" },
  { fr: "Certaines pièces très structurées ou textiles anciens", en: "Some highly structured pieces or heirloom textiles" },
];
