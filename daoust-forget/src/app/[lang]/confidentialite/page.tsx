import { ConsentSettingsButton } from "@/components/consent";
import { Container, PageHeader } from "@/components/ui";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";

/**
 * DRAFT privacy policy structured on Québec's Law 25 requirements. Bracketed
 * items must be completed by the business; the whole text must be reviewed by
 * its person in charge of the protection of personal information.
 */
const content = {
  fr: [
    { h: "Responsable de la protection des renseignements personnels", p: ["[Nom, titre et coordonnées à compléter.] Vous pouvez lui écrire pour toute question, ou pour exercer vos droits d'accès, de rectification, de retrait du consentement ou de désindexation."] },
    { h: "Renseignements recueillis et pourquoi", p: [
      "Formulaire de contact : nom, courriel, téléphone (facultatif), sujet et message, uniquement pour répondre à votre demande.",
      "Recherche de succursale : le texte saisi sert à trouver des succursales. Si un service de géocodage est activé, il est transmis à ce fournisseur pour cette seule fin, sans être conservé par nous.",
      "Position de l'appareil : seulement si vous cliquez sur « Utiliser ma position » et l'autorisez. Elle est utilisée dans votre navigateur pour calculer des distances et n'est jamais transmise.",
    ] },
    { h: "Témoins et mesure d'audience", id: "temoins", p: [
      "Un témoin essentiel mémorise votre choix de consentement pendant 6 mois.",
      "Avec votre accord seulement, Google Analytics 4 mesure l'utilisation du site de façon agrégée. Aucune mesure n'est activée par défaut. Ces données peuvent être traitées hors du Québec : [évaluation des facteurs relatifs à la vie privée à documenter].",
    ] },
    { h: "Commande en ligne", p: ["Les commandes sont passées sur la plateforme DaoustValet, régie par ses propres conditions et sa politique de confidentialité."] },
    { h: "Conservation", p: ["[Durée de conservation des messages de contact à définir], puis destruction sécuritaire."] },
  ],
  en: [
    { h: "Person in charge of the protection of personal information", p: ["[Name, title and contact details to complete.] Write to them with any question, or to exercise your rights of access, rectification, withdrawal of consent or de-indexing."] },
    { h: "Information collected and why", p: [
      "Contact form: name, email, phone (optional), topic and message, only to answer your request.",
      "Branch search: the text you type is used to find branches. If a geocoding service is enabled, it is sent to that provider for this purpose only and is not kept by us.",
      "Device location: only if you click “Use my location” and allow it. It is used in your browser to compute distances and is never transmitted.",
    ] },
    { h: "Cookies and audience measurement", id: "temoins", p: [
      "One essential cookie remembers your consent choice for 6 months.",
      "Only with your consent, Google Analytics 4 measures site usage in aggregate. No measurement is enabled by default. This data may be processed outside Québec: [privacy impact assessment to document].",
    ] },
    { h: "Online ordering", p: ["Orders are placed on the DaoustValet platform, governed by its own terms and privacy policy."] },
    { h: "Retention", p: ["[Retention period for contact messages to define], then secure destruction."] },
  ],
};

export async function generateMetadata({ params }: PageProps<"/[lang]/confidentialite">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({ lang, route: "privacy", title: dict.legal.privacyTitle, description: dict.legal.privacyTitle });
}

export default async function PrivacyPage({ params }: PageProps<"/[lang]/confidentialite">) {
  const { lang, dict } = await resolveLang(params);
  return (
    <>
      <PageHeader title={dict.legal.privacyTitle} lead={dict.legal.draft} />
      <Container className="max-w-3xl space-y-10 py-12 sm:py-16">
        {content[lang].map((s) => (
          <section key={s.h} id={"id" in s ? s.id : undefined} aria-labelledby={`h-${s.h}`}>
            <h2 id={`h-${s.h}`} className="text-2xl">{s.h}</h2>
            {s.p.map((p) => (
              <p key={p} className="mt-3 text-muted">{p}</p>
            ))}
            {"id" in s && (
              <p className="mt-4 font-semibold text-forest [&_button:hover]:text-forest-deep">
                <ConsentSettingsButton label={dict.consent.settings} />
              </p>
            )}
          </section>
        ))}
      </Container>
    </>
  );
}
