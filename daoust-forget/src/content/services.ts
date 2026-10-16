import type { L } from "@/lib/i18n";
import { unverified, type Verification } from "@/lib/verification";
import { sources } from "./sources";

/** Customer needs, used to group services (not internal departments). */
export const needs = [
  { id: "everyday", label: { fr: "Au quotidien", en: "Everyday wear" } },
  { id: "delicate", label: { fr: "Pièces délicates et habillées", en: "Delicate and formal pieces" } },
  { id: "winter", label: { fr: "Manteaux et hiver", en: "Coats and winter wear" } },
  { id: "fit", label: { fr: "Ajustements et réparations", en: "Fit and repairs" } },
  { id: "convenience", label: { fr: "Rapidité et commodité", en: "Speed and convenience" } },
] as const satisfies { id: string; label: L }[];

export type NeedId = (typeof needs)[number]["id"];
export type ServiceIcon = "shirt" | "droplets" | "sparkles" | "snowflake" | "scissors" | "timer" | "truck" | "washing";

export type Service = {
  slug: string;
  need: NeedId;
  icon: ServiceIcon;
  name: L;
  short: L;
  benefit: L;
  details: L[];
  /** "all": every branch; "some": only some branches (shown explicitly). */
  availability: "all" | "some";
  /** Pricing categories this service relates to (see pricing.ts). */
  pricing: string[];
  /** Remote ordering possible (via DaoustValet) vs branch visit required. */
  remote: boolean;
  verification: Verification;
};

export const services: Service[] = [
  {
    slug: "nettoyage-ecoperformant",
    need: "delicate",
    icon: "droplets",
    name: { fr: "Nettoyage écoperformant (à l'eau)", en: "Eco-performance cleaning (water-based)" },
    short: {
      fr: "Le procédé Aquaperformance : un nettoyage professionnel à l'eau, contrôlé selon le textile.",
      en: "The Aquaperformance process: professional water-based cleaning, controlled for each textile.",
    },
    benefit: {
      fr: "Une solution sans solvant de nettoyage à sec pour une grande partie de votre garde-robe.",
      en: "A dry-cleaning-solvent-free option for much of your wardrobe.",
    },
    details: [
      {
        fr: "Chaque vêtement est inspecté, puis lavé à l'eau dans des machines professionnelles dont l'action mécanique, la température et le séchage sont ajustés au textile. Il est ensuite fini et pressé.",
        en: "Each garment is inspected, then washed in professional machines whose mechanical action, temperature and drying are adjusted to the textile. It is then finished and pressed.",
      },
      {
        fr: "Certaines pièces peuvent demander un autre traitement. Notre équipe vous le dira au comptoir, avant tout nettoyage.",
        en: "Some pieces may need a different treatment. Our team will tell you at the counter, before any cleaning.",
      },
    ],
    availability: "some",
    pricing: ["shirts", "pants", "suits", "dresses", "coats"],
    remote: true,
    verification: unverified(
      sources.officialAbout,
      "Procédé Aquaperformance lancé en 2015 selon l'entreprise. Confirmer la liste des succursales équipées et la description des étapes avec l'équipe des opérations.",
    ),
  },
  {
    slug: "nettoyage-a-sec",
    need: "delicate",
    icon: "sparkles",
    name: { fr: "Nettoyage à sec", en: "Dry cleaning" },
    short: {
      fr: "Le nettoyage professionnel traditionnel, pour les pièces qui le demandent.",
      en: "Traditional professional cleaning, for pieces that call for it.",
    },
    benefit: {
      fr: "Une option éprouvée pour certains tissus et vêtements structurés.",
      en: "A proven option for some fabrics and structured garments.",
    },
    details: [
      {
        fr: "Offert dans les succursales qui disposent de l'équipement. Demandez au comptoir quel procédé convient à votre vêtement.",
        en: "Offered at branches with the equipment. Ask at the counter which process suits your garment.",
      },
    ],
    availability: "some",
    pricing: ["suits", "dresses", "coats", "specialty"],
    remote: false,
    verification: unverified(
      sources.circulaireForget,
      "Annuaire : « Nettoyage à sec de vêtements sur place » pour la bannière Daoust/Forget. L'entreprise vise à éliminer graduellement le nettoyage à sec : confirmer quelles succursales l'offrent encore.",
    ),
  },
  {
    slug: "lavage-de-chemises",
    need: "everyday",
    icon: "shirt",
    name: { fr: "Lavage de chemises", en: "Shirt laundering" },
    short: {
      fr: "Chemises et chemisiers lavés et pressés, prêts à porter.",
      en: "Shirts and blouses washed and pressed, ready to wear.",
    },
    benefit: {
      fr: "Gagnez du temps chaque semaine sur l'essentiel de votre tenue de travail.",
      en: "Save time every week on the core of your work wardrobe.",
    },
    details: [
      {
        fr: "Indiquez au comptoir vos préférences, par exemple sur cintre ou plié, si la succursale offre le choix.",
        en: "Tell the counter your preferences, such as on a hanger or folded, if the branch offers the choice.",
      },
    ],
    availability: "all",
    pricing: ["shirts"],
    remote: true,
    verification: unverified(sources.circulaireForget, "Confirmer que toutes les succursales offrent ce service et les options de finition."),
  },
  {
    slug: "nettoyage-et-pressage",
    need: "everyday",
    icon: "washing",
    name: { fr: "Nettoyage et pressage", en: "Cleaning and pressing" },
    short: {
      fr: "Pantalons, jupes, vestons et vêtements du quotidien, nettoyés et pressés à l'article.",
      en: "Trousers, skirts, jackets and everyday clothing, cleaned and pressed per item.",
    },
    benefit: {
      fr: "Des vêtements nets et bien présentés, sans y passer votre soirée.",
      en: "Crisp, well-presented clothes without spending your evening on them.",
    },
    details: [
      {
        fr: "La facturation se fait à l'article. Le délai vous est confirmé au moment du dépôt.",
        en: "Billing is per item. The ready date is confirmed when you drop off.",
      },
    ],
    availability: "all",
    pricing: ["pants", "suits", "dresses"],
    remote: true,
    verification: unverified(sources.circulaireEco, "Confirmer la facturation à l'article et la liste d'articles."),
  },
  {
    slug: "vetements-d-hiver",
    need: "winter",
    icon: "snowflake",
    name: { fr: "Manteaux et vêtements chauds", en: "Coats and warm clothing" },
    short: {
      fr: "Entretien des manteaux, y compris les articles en duvet, et imperméabilisation.",
      en: "Care for coats, including down items, and waterproofing.",
    },
    benefit: {
      fr: "Prolongez la vie de vos pièces d'hiver, qui coûtent le plus cher à remplacer.",
      en: "Extend the life of your winter pieces, the most expensive to replace.",
    },
    details: [
      {
        fr: "Les manteaux à garnitures (fourrure, cuir) demandent une évaluation en succursale avant d'être acceptés.",
        en: "Coats with trims (fur, leather) need an in-branch assessment before being accepted.",
      },
    ],
    availability: "some",
    pricing: ["coats", "specialty"],
    remote: false,
    verification: unverified(
      sources.circulaireEco,
      "Annuaire : « entretien des vêtements chauds (imperméabilisation, plumes, fourrure) ». Confirmer les services réellement offerts et la politique pour fourrure et cuir.",
    ),
  },
  {
    slug: "retouches",
    need: "fit",
    icon: "scissors",
    name: { fr: "Retouches et réparations", en: "Alterations and repairs" },
    short: {
      fr: "Ourlets, ajustements, fermetures éclair et petites réparations.",
      en: "Hems, adjustments, zippers and small repairs.",
    },
    benefit: {
      fr: "Un seul arrêt pour nettoyer et ajuster vos vêtements.",
      en: "One stop to clean and adjust your clothes.",
    },
    details: [
      {
        fr: "Le prix et le délai d'une retouche dépendent du travail : ils vous sont confirmés en succursale.",
        en: "The price and timing of an alteration depend on the work and are confirmed in branch.",
      },
    ],
    availability: "some",
    pricing: ["alterations"],
    remote: false,
    verification: unverified(sources.circulaireForget, "Confirmer les succursales qui offrent les retouches et les types de travaux acceptés."),
  },
  {
    slug: "service-rapide",
    need: "convenience",
    icon: "timer",
    name: { fr: "Service rapide", en: "Express service" },
    short: {
      fr: "Dans certaines succursales, vos vêtements peuvent être prêts en quelques heures.",
      en: "At some branches, your garments can be ready within a few hours.",
    },
    benefit: {
      fr: "Pour l'entrevue, le mariage ou le voyage de demain.",
      en: "For tomorrow's interview, wedding or trip.",
    },
    details: [
      {
        fr: "Le service rapide dépend de la succursale, de l'heure du dépôt et du vêtement. Vérifiez auprès de votre succursale avant de vous déplacer.",
        en: "Express service depends on the branch, drop-off time and garment. Check with your branch before you go.",
      },
    ],
    availability: "some",
    pricing: ["shirts", "pants", "suits", "dresses"],
    remote: false,
    verification: unverified(
      sources.circulaireForget,
      "Annuaires : « Service de 3 heures (même le samedi) » et « 3 heures ou 5 heures ». Une succursale listée est fermée le samedi. Confirmer les succursales, les heures limites de dépôt et les suppléments.",
    ),
  },
  {
    slug: "cueillette-et-livraison",
    need: "convenience",
    icon: "truck",
    name: { fr: "Cueillette et livraison", en: "Pickup and delivery" },
    short: {
      fr: "Avec DaoustValet, vos vêtements sont récupérés et rapportés chez vous ou au bureau.",
      en: "With DaoustValet, your garments are collected and returned to your home or office.",
    },
    benefit: {
      fr: "Aucun déplacement : commandez en ligne, on s'occupe du reste.",
      en: "No trip needed: order online and we handle the rest.",
    },
    details: [
      {
        fr: "Offert dans les secteurs desservis par DaoustValet. Vous créez un compte, choisissez la date et le lieu de cueillette et déposez vos vêtements dans un sac.",
        en: "Available in areas served by DaoustValet. You create an account, choose the pickup date and place, and put your garments in a bag.",
      },
    ],
    availability: "some",
    pricing: ["shirts", "pants", "suits", "dresses", "coats"],
    remote: true,
    verification: unverified(sources.daoustValetOrder, "Confirmer les étapes, les secteurs et les frais actuels."),
  },
  {
    slug: "buanderie",
    need: "everyday",
    icon: "washing",
    name: { fr: "Buanderie", en: "Laundry service" },
    short: {
      fr: "Lavage de linge du quotidien, dans quelques succursales seulement.",
      en: "Everyday laundry washing, at a few branches only.",
    },
    benefit: {
      fr: "Déléguez la lessive de la semaine.",
      en: "Hand off the week's laundry.",
    },
    details: [
      {
        fr: "Ce service n'est pas offert partout. Consultez la page de votre succursale.",
        en: "This service is not available everywhere. Check your branch page.",
      },
    ],
    availability: "some",
    pricing: [],
    remote: false,
    verification: unverified(
      sources.circulaireForget,
      "Annuaire : buanderie offerte « seulement à certaines succursales », dont LaSalle, Montréal, Côte-des-Neiges et Mont-Tremblant. Confirmer.",
    ),
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
