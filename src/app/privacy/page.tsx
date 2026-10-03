import { Logo } from "@/components/logo";
import { getDictionary } from "@/i18n/server";

/**
 * Politique de confidentialité (modèle à faire valider). Les éléments entre
 * crochets sont à compléter par le fondateur avant le lancement.
 */
const CONTENT = {
  fr: {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 3 octobre 2026",
    sections: [
      ["Qui sommes-nous", "Dûment est un service de relance automatique des factures impayées pour les entreprises qui utilisent QuickBooks Online. Responsable de la protection des renseignements personnels : [Nom du responsable], [courriel de contact]."],
      ["Ce que nous recueillons", "Votre compte : nom, courriel, nom de l'entreprise. Depuis QuickBooks, en lecture seule : vos clients (nom, contact, courriel), vos factures (numéro, montants, dates, lien de paiement) et vos paiements. Les courriels envoyés et leurs événements (livré, ouvert, rejeté). Nous ne recueillons aucune information bancaire et n'effectuons aucun paiement."],
      ["Pourquoi", "Uniquement pour envoyer, en votre nom, des rappels de paiement à vos clients, afficher votre tableau de bord et gérer votre abonnement. Nous ne vendons ni ne louons aucune donnée, et nous ne les utilisons pas pour de la publicité."],
      ["Où et comment", "Les données sont hébergées au Canada (Supabase, région Canada Central). Le code de l'application s'exécute chez Vercel, qui peut traiter des requêtes aux États-Unis. Les accès QuickBooks sont chiffrés (AES-256) et ne sont jamais transmis au navigateur. Chaque entreprise ne voit que ses propres données."],
      ["Sous-traitants", "Supabase (base de données et authentification), Vercel (hébergement), Resend (envoi des courriels), Stripe (abonnements et paiements de l'abonnement), Intuit (QuickBooks Online, à votre demande)."],
      ["Conservation", "Tant que votre compte est actif. À la suppression du compte, toutes les données sont effacées immédiatement de notre base ; les sauvegardes sont purgées selon le cycle de notre hébergeur."],
      ["Vos droits (Loi 25)", "Vous pouvez en tout temps exporter vos données ou supprimer votre compte depuis Réglages > Vos données, ou nous écrire à [courriel de contact]. Les destinataires des rappels peuvent se désinscrire grâce au lien présent dans chaque courriel."],
      ["Incidents", "En cas d'incident de confidentialité présentant un risque de préjudice sérieux, nous aviserons les personnes concernées et la Commission d'accès à l'information du Québec."],
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Last updated: October 3, 2026",
    sections: [
      ["Who we are", "Dûment is an automated unpaid-invoice reminder service for businesses using QuickBooks Online. Person in charge of personal information: [Name], [contact email]."],
      ["What we collect", "Your account: name, email, company name. From QuickBooks, read-only: your clients (name, contact, email), your invoices (number, amounts, dates, payment link) and your payments. Emails sent and their events (delivered, opened, bounced). We collect no banking information and process no payments."],
      ["Why", "Only to send payment reminders to your clients on your behalf, show your dashboard and manage your subscription. We never sell or rent data, and never use it for advertising."],
      ["Where and how", "Data is hosted in Canada (Supabase, Canada Central region). The application code runs on Vercel, which may process requests in the United States. QuickBooks access tokens are encrypted (AES-256) and never sent to the browser. Each business only sees its own data."],
      ["Service providers", "Supabase (database and authentication), Vercel (hosting), Resend (email delivery), Stripe (subscription billing), Intuit (QuickBooks Online, at your request)."],
      ["Retention", "As long as your account is active. When you delete your account, all data is erased from our database immediately; backups are purged on our host's schedule."],
      ["Your rights (Québec Law 25)", "You can export your data or delete your account at any time from Settings > Your data, or write to [contact email]. Reminder recipients can unsubscribe with the link in every email."],
      ["Incidents", "If a confidentiality incident presents a risk of serious injury, we will notify affected people and Québec's Commission d'accès à l'information."],
    ],
  },
} as const;

export default async function PrivacyPage() {
  const { t, locale } = await getDictionary();
  const c = CONTENT[locale];
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Logo name={t.common.appName} />
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">{c.title}</h1>
      <p className="mt-2 text-sm text-ink-subtle">{c.updated}</p>
      <div className="mt-8 space-y-8">
        {c.sections.map(([h, body]) => (
          <section key={h}>
            <h2 className="font-semibold">{h}</h2>
            <p className="mt-2 leading-relaxed text-ink-muted">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
