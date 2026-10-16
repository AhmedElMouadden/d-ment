import type { L } from "@/lib/i18n";
import type { RouteKey } from "@/lib/routes";

export type FaqItem = {
  id: string;
  q: L;
  a: L;
  link?: { route: RouteKey; label: L };
  /** Shown on the homepage FAQ (the full list lives on /faq). */
  home?: boolean;
};

export const faq: FaqItem[] = [
  {
    id: "garments",
    home: true,
    q: { fr: "Quels types de vêtements nettoyez-vous ?", en: "What kinds of garments do you clean?" },
    a: {
      fr: "Les vêtements du quotidien (chemises, pantalons, jupes), les complets et vestons, les robes, les manteaux et plusieurs articles spéciaux. Les pièces délicates, en cuir ou avec garnitures sont évaluées au comptoir avant d'être acceptées.",
      en: "Everyday clothing (shirts, trousers, skirts), suits and jackets, dresses, coats and several specialty items. Delicate, leather or trimmed pieces are assessed at the counter before being accepted.",
    },
    link: { route: "services", label: { fr: "Voir les services", en: "See services" } },
  },
  {
    id: "wet-vs-dry",
    home: true,
    q: { fr: "Quelle est la différence entre le nettoyage à sec et le nettoyage à l'eau ?", en: "What is the difference between dry cleaning and wet cleaning?" },
    a: {
      fr: "Le nettoyage à sec utilise un solvant au lieu de l'eau. Le nettoyage à l'eau professionnel (notre procédé Aquaperformance) utilise de l'eau, des détergents professionnels et des machines qui contrôlent précisément le lavage et le séchage selon le textile.",
      en: "Dry cleaning uses a solvent instead of water. Professional wet cleaning (our Aquaperformance process) uses water, professional detergents and machines that precisely control washing and drying for each textile.",
    },
    link: { route: "eco", label: { fr: "Comprendre le procédé", en: "Understand the process" } },
  },
  {
    id: "eco-suitable",
    q: { fr: "Le nettoyage écologique convient-il à mon vêtement ?", en: "Is eco cleaning right for my garment?" },
    a: {
      fr: "Il convient à une grande partie des vêtements, y compris bien des pièces étiquetées « nettoyage à sec ». Le cuir, la fourrure et certains ornements fragiles demandent un autre traitement. Apportez la pièce : notre équipe vous conseille avant tout nettoyage.",
      en: "It suits much of a wardrobe, including many pieces labelled “dry clean”. Leather, fur and some fragile embellishments need another treatment. Bring the piece in: our team advises you before any cleaning.",
    },
    link: { route: "eco", label: { fr: "Vêtements compatibles", en: "Suitable garments" } },
  },
  {
    id: "price",
    home: true,
    q: { fr: "Combien coûte le nettoyage ?", en: "How much does cleaning cost?" },
    a: {
      fr: "Le prix est établi à l'article et dépend du vêtement, de la matière et du traitement. Les tarifs peuvent varier d'une succursale à l'autre : votre succursale vous confirme le prix avant le nettoyage.",
      en: "Pricing is per item and depends on the garment, material and treatment. Rates can vary between branches: your branch confirms the price before cleaning.",
    },
    link: { route: "pricing", label: { fr: "Consulter les tarifs", en: "View pricing" } },
  },
  {
    id: "turnaround",
    home: true,
    q: { fr: "Combien de temps faut-il ?", en: "How long does it take?" },
    a: {
      fr: "Le délai dépend du vêtement et de la succursale. La date à laquelle vos vêtements seront prêts vous est confirmée au moment du dépôt ; avant cela, tout délai affiché est une estimation.",
      en: "Timing depends on the garment and branch. The ready date is confirmed when you drop off; before that, any timing shown is an estimate.",
    },
  },
  {
    id: "express",
    q: { fr: "Offrez-vous un service rapide ?", en: "Do you offer express service?" },
    a: {
      fr: "Oui, dans certaines succursales. Les conditions (heure limite de dépôt, jours offerts, supplément éventuel) varient : vérifiez auprès de votre succursale avant de vous déplacer.",
      en: "Yes, at some branches. Conditions (drop-off cut-off, days offered, any surcharge) vary: check with your branch before you go.",
    },
    link: { route: "locations", label: { fr: "Trouver une succursale", en: "Find a branch" } },
  },
  {
    id: "find-branch",
    q: { fr: "Comment trouver une succursale ?", en: "How do I find a branch?" },
    a: {
      fr: "Entrez votre code postal, votre ville ou une adresse dans l'outil de recherche. Vous pouvez aussi utiliser votre position, si vous l'autorisez : elle sert seulement à calculer les distances dans votre navigateur.",
      en: "Enter your postal code, city or an address in the search tool. You can also use your location if you allow it: it is only used to compute distances in your browser.",
    },
    link: { route: "locations", label: { fr: "Trouver mon nettoyeur", en: "Find my cleaner" } },
  },
  {
    id: "online",
    home: true,
    q: { fr: "Puis-je commander en ligne ?", en: "Can I order online?" },
    a: {
      fr: "Oui, avec DaoustValet, notre service de cueillette et de livraison, dans les secteurs desservis. La commande se fait sur la plateforme DaoustValet. Pour un dépôt en succursale, aucune commande en ligne n'est nécessaire.",
      en: "Yes, with DaoustValet, our pickup and delivery service, in served areas. Ordering happens on the DaoustValet platform. For in-branch drop-off, no online order is needed.",
    },
    link: { route: "order", label: { fr: "Options de commande", en: "Ordering options" } },
  },
  {
    id: "delivery-area",
    q: { fr: "La cueillette et la livraison sont-elles offertes dans mon secteur ?", en: "Is pickup and delivery available in my area?" },
    a: {
      fr: "DaoustValet dessert des secteurs de Montréal et de ses environs. La plateforme DaoustValet confirme si votre adresse est desservie lorsque vous planifiez une cueillette.",
      en: "DaoustValet serves areas of Montréal and surroundings. The DaoustValet platform confirms whether your address is served when you schedule a pickup.",
    },
    link: { route: "order", label: { fr: "Secteurs et conditions", en: "Areas and conditions" } },
  },
  {
    id: "delicate",
    q: { fr: "Comment faire traiter une pièce délicate ou spéciale ?", en: "How do I get a delicate or specialty item cleaned?" },
    a: {
      fr: "Apportez-la en succursale. Nous l'examinons avec vous, vous expliquons le traitement possible, son prix et son délai, et vous décidez avant que le travail commence.",
      en: "Bring it to a branch. We examine it with you, explain the possible treatment, its price and timing, and you decide before any work begins.",
    },
  },
  {
    id: "order-question",
    q: { fr: "J'ai une question sur ma commande. Qui contacter ?", en: "I have a question about my order. Who do I contact?" },
    a: {
      fr: "Pour un dépôt en succursale, appelez directement votre succursale (numéro sur votre reçu et sur la page de la succursale). Pour une commande DaoustValet, communiquez avec le service DaoustValet.",
      en: "For an in-branch drop-off, call your branch directly (number on your receipt and on the branch page). For a DaoustValet order, contact DaoustValet customer service.",
    },
    link: { route: "contact", label: { fr: "Nous joindre", en: "Contact us" } },
  },
];
