import { ServicesByNeed } from "@/components/sections";
import { Container, PageHeader } from "@/components/ui";
import { getDictionary } from "@/dictionaries";
import { visibleServices } from "@/lib/data";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/services">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    route: "services",
    title: dict.services.title,
    description:
      lang === "fr"
        ? "Nettoyage à l'eau Aquaperformance, nettoyage à sec, lavage de chemises, manteaux, retouches, service rapide et cueillette à domicile."
        : "Aquaperformance wet cleaning, dry cleaning, shirt laundering, coats, alterations, express service and home pickup.",
  });
}

export default async function ServicesPage({ params }: PageProps<"/[lang]/services">) {
  const { lang, dict } = await resolveLang(params);
  return (
    <>
      <PageHeader title={dict.services.title} lead={dict.services.lead} />
      <Container className="py-12 sm:py-16">
        <ServicesByNeed lang={lang} dict={dict} services={visibleServices()} headingLevel={2} />
      </Container>
    </>
  );
}
