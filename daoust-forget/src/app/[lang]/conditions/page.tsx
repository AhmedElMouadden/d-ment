import { Container, PageHeader } from "@/components/ui";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";

const content = {
  fr: [
    "Ce site présente les services, succursales et tarifs du réseau Daoust/Forget à titre informatif. Les prix, heures et délais applicables sont ceux confirmés par la succursale au moment du dépôt.",
    "Les commandes en ligne sont passées et confirmées uniquement sur la plateforme DaoustValet, selon ses propres conditions.",
    "[Politique de satisfaction, de responsabilité pour les vêtements et de réclamation à compléter avec les conditions en vigueur en succursale.]",
  ],
  en: [
    "This site presents the services, branches and prices of the Daoust/Forget network for information. Applicable prices, hours and timing are those confirmed by the branch at drop-off.",
    "Online orders are placed and confirmed only on the DaoustValet platform, under its own terms.",
    "[Satisfaction, garment liability and claims policy to complete with the terms in force in branches.]",
  ],
};

export async function generateMetadata({ params }: PageProps<"/[lang]/conditions">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({ lang, route: "terms", title: dict.legal.termsTitle, description: dict.legal.termsTitle });
}

export default async function TermsPage({ params }: PageProps<"/[lang]/conditions">) {
  const { lang, dict } = await resolveLang(params);
  return (
    <>
      <PageHeader title={dict.legal.termsTitle} lead={dict.legal.draft} />
      <Container className="max-w-3xl space-y-4 py-12 sm:py-16">
        {content[lang].map((p) => (
          <p key={p} className="text-muted">{p}</p>
        ))}
      </Container>
    </>
  );
}
