import { Check } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { Card, Container, PageHeader } from "@/components/ui";
import { VerificationBadge } from "@/components/verification-badge";
import { sources } from "@/content/sources";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { href } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { unverified } from "@/lib/verification";

const businessVerification = unverified(sources.daoustValetFacebook, "« Service aux entreprises et aux particuliers » (DaoustValet). Confirmer l'offre entreprises actuelle et la personne-ressource.");

export async function generateMetadata({ params }: PageProps<"/[lang]/entreprises">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({ lang, route: "business", title: dict.business.title, description: dict.business.lead });
}

export default async function BusinessPage({ params }: PageProps<"/[lang]/entreprises">) {
  const { lang, dict } = await resolveLang(params);
  const d = dict.business;
  return (
    <>
      <PageHeader title={d.title} lead={d.lead} />
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[2fr_3fr]">
        <section aria-labelledby="offer-title">
          <h2 id="offer-title" className="text-3xl">
            {d.offerTitle} <VerificationBadge v={businessVerification} dict={dict} />
          </h2>
          <ul className="mt-6 space-y-4">
            {d.offer.map((o) => (
              <li key={o} className="flex gap-3 text-lg">
                <Check aria-hidden className="mt-1.5 size-5 shrink-0 text-moss" />
                {o}
              </li>
            ))}
          </ul>
        </section>
        <Card className="p-6 sm:p-8">
          <h2 className="text-2xl">{d.formTitle}</h2>
          <p className="mt-2 mb-6 text-muted">{d.formLead}</p>
          <ContactForm lang={lang} dict={dict.contact} privacyHref={href(lang, "privacy")} defaultTopic="business" showCompany />
        </Card>
      </Container>
    </>
  );
}
