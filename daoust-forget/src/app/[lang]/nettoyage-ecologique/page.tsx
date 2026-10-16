import Link from "next/link";
import { EcoClaims, EcoComparison, EcoSteps, EcoSuitability, FaqSection } from "@/components/sections";
import { buttonClass, Container, PageHeader } from "@/components/ui";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { href } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/nettoyage-ecologique">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    route: "eco",
    title: dict.eco.title,
    description:
      lang === "fr"
        ? "Le nettoyage à l'eau Aquaperformance de Daoust : comment il fonctionne, ce qui le distingue du nettoyage à sec et quels vêtements il convient de traiter."
        : "Daoust's Aquaperformance wet cleaning: how it works, how it differs from dry cleaning and which garments it suits.",
  });
}

export default async function EcoPage({ params }: PageProps<"/[lang]/nettoyage-ecologique">) {
  const { lang, dict } = await resolveLang(params);
  const d = dict.eco;
  return (
    <>
      <PageHeader title={d.title} lead={d.lead} />
      <Container className="space-y-16 py-12 sm:py-16">
        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="mb-6 text-3xl">{d.stepsTitle}</h2>
          <EcoSteps lang={lang} dict={dict} />
        </section>
        <section aria-labelledby="compare-title">
          <h2 id="compare-title" className="mb-6 text-3xl">{d.compareTitle}</h2>
          <EcoComparison lang={lang} dict={dict} />
        </section>
        <section aria-labelledby="suit-title">
          <h2 id="suit-title" className="sr-only">{d.suitableTitle}</h2>
          <EcoSuitability lang={lang} dict={dict} />
        </section>
        <section aria-labelledby="claims-title">
          <h2 id="claims-title" className="mb-6 text-3xl">{d.claimsTitle}</h2>
          <EcoClaims lang={lang} dict={dict} />
        </section>
        <Link href={href(lang, "locations")} className={buttonClass("primary", "lg")}>
          {d.cta}
        </Link>
      </Container>
      <FaqSection lang={lang} dict={dict} />
    </>
  );
}
