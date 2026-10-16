import { Check, ExternalLink, Info } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { buttonClass, Card, Container, PageHeader } from "@/components/ui";
import { VerificationBadge } from "@/components/verification-badge";
import { franchiseSite } from "@/content/site";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { href } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { canShow } from "@/lib/verification";

export async function generateMetadata({ params }: PageProps<"/[lang]/franchise">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({ lang, route: "franchise", title: dict.franchise.title, description: dict.franchise.lead });
}

export default async function FranchisePage({ params }: PageProps<"/[lang]/franchise">) {
  const { lang, dict } = await resolveLang(params);
  const d = dict.franchise;
  return (
    <>
      <PageHeader title={d.title} lead={d.lead} />
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[2fr_3fr]">
        <section aria-labelledby="model-title" className="space-y-6">
          <h2 id="model-title" className="text-3xl">{d.whyTitle}</h2>
          <ul className="space-y-4">
            {d.why.map((o) => (
              <li key={o} className="flex gap-3 text-lg">
                <Check aria-hidden className="mt-1.5 size-5 shrink-0 text-moss" />
                {o}
              </li>
            ))}
          </ul>
          <p className="flex gap-2 rounded-2xl bg-linen p-4 text-[0.9375rem] text-muted">
            <Info aria-hidden className="mt-1 size-4 shrink-0 text-moss" />
            {d.figuresNote}
          </p>
          {canShow(franchiseSite.verification) && (
            <p>
              <a href={franchiseSite.url} rel="noopener" className={buttonClass("secondary")}>
                {d.site}
                <ExternalLink aria-hidden className="size-4" />
              </a>{" "}
              <VerificationBadge v={franchiseSite.verification} dict={dict} />
            </p>
          )}
        </section>
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-2xl">{d.formTitle}</h2>
          <ContactForm lang={lang} dict={dict.contact} privacyHref={href(lang, "privacy")} defaultTopic="franchise" />
        </Card>
      </Container>
    </>
  );
}
