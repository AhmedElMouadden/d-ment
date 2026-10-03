/** Dictionnaire français (Québec) : langue par défaut. */
export const fr = {
  meta: {
    title: "[NOM] · Relance automatique de factures pour QuickBooks",
    description:
      "Connectez QuickBooks en 2 minutes. [NOM] relance vos clients en retard, avec le bon ton, jusqu'au paiement.",
  },
  common: {
    appName: "[NOM]",
    language: "Langue",
    switchTo: "English",
    signIn: "Se connecter",
    signUp: "Essai gratuit de 14 jours",
    signOut: "Se déconnecter",
    tryDemo: "Essayer la démo",
    loading: "Chargement…",
    save: "Enregistrer",
    cancel: "Annuler",
    demoBanner: "Mode démo : données fictives, aucun courriel n'est réellement envoyé.",
    comingSoon: "Bientôt",
  },
  landing: {
    eyebrow: "Pour les PME de services québécoises sur QuickBooks Online",
    title: "Faites-vous payer plus vite, sans y penser.",
    subtitle:
      "[NOM] relance automatiquement vos clients en retard, au bon moment et avec le bon ton, jusqu'au paiement. Vous gardez la relation, on s'occupe des rappels.",
    ctaPrimary: "Commencer l'essai gratuit",
    ctaSecondary: "Voir la démo",
    noCard: "14 jours gratuits · aucune carte requise",
    stepsTitle: "Prêt en 2 minutes",
    steps: [
      { title: "Connectez QuickBooks", body: "Une connexion sécurisée en lecture seule. Vos factures et vos clients sont synchronisés chaque jour." },
      { title: "Choisissez votre séquence", body: "De J-3 au dernier avis à J+45. Délais, textes et tons modifiables en français et en anglais." },
      { title: "On s'occupe du reste", body: "Un seul courriel par client, à votre nom. Arrêt immédiat dès que la facture est payée." },
    ],
    featuresTitle: "Tout ce qu'il faut, rien de trop",
    features: [
      { title: "Arrêt au paiement", body: "Chaque facture est revérifiée dans QuickBooks juste avant l'envoi." },
      { title: "Un courriel par client", body: "Toutes ses factures en retard regroupées, jamais de pluie de rappels." },
      { title: "Bilingue", body: "Français québécois naturel ou anglais, selon chaque client." },
      { title: "Vous gardez le contrôle", body: "Exclusions, pauses, copie à un collègue et approbation avant les relances fermes." },
      { title: "Les réponses vous arrivent", body: "Les courriels partent à votre nom, avec votre adresse en réponse." },
      { title: "Données au Canada", body: "Hébergement canadien, chiffrement des accès, conforme à la Loi 25." },
    ],
    pricingTitle: "Des prix simples",
    plans: [
      { name: "Essentiel", price: "39 $", period: "/mois", limit: "Jusqu'à 50 factures actives" },
      { name: "Croissance", price: "79 $", period: "/mois", limit: "Factures actives illimitées" },
    ],
    pricingNote: "Prix en dollars canadiens, taxes en sus. Annulable en tout temps.",
    trust: "[NOM] lit vos factures et envoie des courriels. Rien d'autre : aucun accès à vos comptes bancaires, aucun paiement.",
    footerPrivacy: "Confidentialité",
  },
  auth: {
    loginTitle: "Content de vous revoir",
    loginSubtitle: "Connectez-vous à votre compte.",
    signupTitle: "Créez votre compte",
    signupSubtitle: "14 jours gratuits, sans carte de crédit.",
    email: "Courriel",
    password: "Mot de passe",
    companyName: "Nom de l'entreprise",
    fullName: "Votre nom",
    submitLogin: "Se connecter",
    submitSignup: "Créer mon compte",
    magicLink: "Recevoir un lien de connexion par courriel",
    magicLinkSent: "C'est parti ! Vérifiez votre boîte de réception pour le lien de connexion.",
    signupSent: "Compte créé. Confirmez votre adresse à l'aide du courriel que nous venons d'envoyer.",
    or: "ou",
    noAccount: "Pas encore de compte ?",
    haveAccount: "Déjà un compte ?",
    errors: {
      invalid: "Courriel ou mot de passe incorrect.",
      generic: "Une erreur est survenue. Réessayez dans un instant.",
      passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
      emailInvalid: "Adresse courriel invalide.",
      notConfigured: "La connexion n'est pas encore configurée. Utilisez la démo en attendant.",
    },
  },
  nav: {
    dashboard: "Tableau de bord",
    invoices: "Factures",
    customers: "Clients",
    sequences: "Séquences",
    approvals: "À approuver",
    activity: "Journal d'envois",
    settings: "Réglages",
    billing: "Abonnement",
  },
  app: {
    welcome: "Bonjour",
    trialDaysLeft: (n: number) => `Essai gratuit : ${n} jour${n > 1 ? "s" : ""} restant${n > 1 ? "s" : ""}`,
    upcomingStep: "Cette section arrive à une prochaine étape de construction.",
  },
};

/** Forme commune aux dictionnaires (les chaînes deviennent `string`). */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : T extends readonly (infer U)[]
      ? Widen<U>[]
      : { [K in keyof T]: Widen<T[K]> };
export type Dictionary = Widen<typeof fr>;
