import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { faqEntries } from "@/components/sections";
import { Container, PageHeader } from "@/components/ui";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/faq">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    route: "faq",
    title: dict.faq.title,
    description:
      lang === "fr"
        ? "Réponses aux questions fréquentes : vêtements acceptés, nettoyage à l'eau ou à sec, prix, délais, service rapide, commande en ligne et livraison."
        : "Answers to common questions: garments accepted, wet vs dry cleaning, pricing, timing, express service, online ordering and delivery.",
  });
}

export default async function FaqPage({ params }: PageProps<"/[lang]/faq">) {
  const { lang, dict } = await resolveLang(params);
  const items = faqEntries(lang);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
        }}
      />
      <PageHeader title={dict.faq.title} />
      <Container className="max-w-4xl py-12 sm:py-16">
        <FaqList items={items} placement="faq_page" />
      </Container>
    </>
  );
}
