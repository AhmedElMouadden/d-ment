import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { TrackedLink } from "@/components/tracked-link";
import { buttonClass, Card, Container, PageHeader } from "@/components/ui";
import { VerificationBadge } from "@/components/verification-badge";
import { customerService } from "@/content/site";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { href } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { canShow } from "@/lib/verification";

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({ lang, route: "contact", title: dict.contact.title, description: dict.contact.lead });
}

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang, dict } = await resolveLang(params);
  const d = dict.contact;
  const { phone, email } = customerService;
  return (
    <>
      <PageHeader title={d.title} lead={d.lead} />
      <Container className="grid gap-8 py-12 sm:py-16 lg:grid-cols-[2fr_3fr]">
        <div className="space-y-5">
          <Card className="p-6">
            <MapPin aria-hidden className="size-6 text-moss" />
            <h2 className="mt-3 font-sans text-lg font-semibold">{d.branchTitle}</h2>
            <p className="mt-1 text-muted">{d.branchBody}</p>
            <Link href={href(lang, "locations")} className={`${buttonClass("primary")} mt-4`}>
              {dict.nav.findCta}
            </Link>
          </Card>
          {(canShow(phone.verification) || canShow(email.verification)) && (
            <Card className="p-6">
              <h2 className="font-sans text-lg font-semibold">{d.serviceTitle}</h2>
              <ul className="mt-3 space-y-2">
                {canShow(phone.verification) && (
                  <li className="flex flex-wrap items-center gap-2">
                    <Phone aria-hidden className="size-5 text-moss" />
                    <TrackedLink
                      href={`tel:${phone.value.tel}`}
                      event="phone_click"
                      params={{ branch_id: "customer_service", placement: "contact_page" }}
                      className="inline-flex min-h-11 items-center font-semibold text-forest hover:underline"
                    >
                      {phone.value.display}
                    </TrackedLink>
                    <VerificationBadge v={phone.verification} dict={dict} />
                  </li>
                )}
                {canShow(email.verification) && (
                  <li className="flex flex-wrap items-center gap-2">
                    <Mail aria-hidden className="size-5 text-moss" />
                    <a href={`mailto:${email.value}`} className="inline-flex min-h-11 items-center font-semibold text-forest hover:underline">
                      {email.value}
                    </a>
                    <VerificationBadge v={email.verification} dict={dict} />
                  </li>
                )}
              </ul>
            </Card>
          )}
        </div>
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-2xl">{d.formTitle}</h2>
          <ContactForm lang={lang} dict={d} privacyHref={href(lang, "privacy")} />
        </Card>
      </Container>
    </>
  );
}
