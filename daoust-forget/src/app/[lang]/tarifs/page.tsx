import { Phone, Truck } from "lucide-react";
import Link from "next/link";
import { PricingExplorer } from "@/components/pricing-explorer";
import { buttonClass, Card, Container, PageHeader } from "@/components/ui";
import { Fact } from "@/components/verification-badge";
import { billingModel, pricingCategories } from "@/content/pricing";
import { pickupDelivery } from "@/content/site";
import { getDictionary } from "@/dictionaries";
import { visibleServices } from "@/lib/data";
import { fmt } from "@/lib/fmt";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { href } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/tarifs">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    route: "pricing",
    title: dict.pricing.title,
    description:
      lang === "fr"
        ? "Comment sont établis les prix du nettoyage chez Daoust/Forget : chemises, pantalons, complets, manteaux, robes, articles spéciaux et retouches."
        : "How Daoust/Forget cleaning prices are set: shirts, trousers, suits, coats, dresses, specialty items and alterations.",
  });
}

export default async function PricingPage({ params }: PageProps<"/[lang]/tarifs">) {
  const { lang, dict } = await resolveLang(params);
  const d = dict.pricing;
  const services = visibleServices().map((s) => ({ slug: s.slug, name: s.name[lang], some: s.availability === "some" }));
  const money = (n: number) => n.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <>
      <PageHeader title={d.title} lead={d.lead}>
        <p className="mt-4 max-w-2xl text-muted">
          <Fact fact={billingModel} dict={dict} fallback={d.varies}>
            {(v) => v[lang]}
          </Fact>
        </p>
      </PageHeader>
      <Container className="py-10 sm:py-14">
        <PricingExplorer
          lang={lang}
          dict={{ pricing: dict.pricing, services: dict.services, preview: dict.preview }}
          categories={pricingCategories}
          services={services}
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Card className="p-6">
            <Phone aria-hidden className="size-6 text-moss" />
            <h2 className="mt-4 font-sans text-lg font-semibold">{d.quoteTitle}</h2>
            <p className="mt-2 text-muted">{d.quoteBody}</p>
            <Link href={href(lang, "locations")} className={`${buttonClass("primary")} mt-5`}>
              {d.findCta}
            </Link>
          </Card>
          <Card className="p-6">
            <Truck aria-hidden className="size-6 text-moss" />
            <h2 className="mt-4 font-sans text-lg font-semibold">{d.delivery}</h2>
            <ul className="mt-2 space-y-1 text-muted">
              <li>
                <Fact fact={pickupDelivery.fee} dict={dict}>
                  {(v) => v[lang]}
                </Fact>
              </li>
              <li>
                <Fact fact={pickupDelivery.minimumOrder} dict={dict}>
                  {(v) => fmt(d.deliveryMin, { amount: money(v) })}
                </Fact>
              </li>
            </ul>
            <Link href={href(lang, "order")} className={`${buttonClass("secondary")} mt-5`}>
              {dict.how.onlineCta}
            </Link>
          </Card>
        </div>
      </Container>
    </>
  );
}
