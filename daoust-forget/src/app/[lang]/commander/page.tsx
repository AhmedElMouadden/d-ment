import { Info, PackageCheck, Store } from "lucide-react";
import Link from "next/link";
import { OutboundOrderLink } from "@/components/outbound-order-link";
import { buttonClass, Card, Container, PageHeader } from "@/components/ui";
import { Fact, VerificationBadge } from "@/components/verification-badge";
import { ordering, pickupDelivery } from "@/content/site";
import { getDictionary } from "@/dictionaries";
import { hasLocale } from "@/lib/i18n";
import { resolveLang } from "@/lib/page";
import { href } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { canShow } from "@/lib/verification";

export async function generateMetadata({ params }: PageProps<"/[lang]/commander">) {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = getDictionary(lang);
  return pageMetadata({
    lang,
    route: "order",
    title: dict.order.title,
    description:
      lang === "fr"
        ? "Cueillette et livraison de vêtements avec DaoustValet : secteurs desservis, conditions et étapes de commande."
        : "Garment pickup and delivery with DaoustValet: served areas, conditions and ordering steps.",
  });
}

export default async function OrderPage({ params }: PageProps<"/[lang]/commander">) {
  const { lang, dict } = await resolveLang(params);
  const d = dict.order;
  const channels = ordering.filter((c) => canShow(c.verification));
  const [primary, ...others] = channels;
  const money = (n: number) => n.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <>
      <PageHeader title={d.title} lead={d.lead}>
        {primary && (
          <div className="mt-8">
            <OutboundOrderLink
              url={primary.url}
              host={primary.host}
              label={primary.label[lang]}
              leavingTemplate={d.leaving}
              destination={primary.id}
              placement="order_header"
            />
          </div>
        )}
      </PageHeader>

      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-10">
          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-3xl">{d.howTitle}</h2>
            <ol className="mt-6 space-y-4">
              {dict.how.onlineSteps.map((s, i) => (
                <li key={s} className="flex gap-4">
                  <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-forest text-white">
                    {i + 1}
                  </span>
                  <span className="pt-1.5 text-lg">
                    <span className="sr-only">{i + 1}. </span>
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="cond-title">
            <h2 id="cond-title" className="text-3xl">{d.conditions}</h2>
            <dl className="mt-6 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white">
              {[
                { term: d.areas, fact: pickupDelivery.areas, render: (v: { fr: string; en: string }) => v[lang] },
                { term: d.fee, fact: pickupDelivery.fee, render: (v: { fr: string; en: string }) => v[lang] },
                { term: d.turnaround, fact: pickupDelivery.turnaround, render: (v: { fr: string; en: string }) => v[lang] },
              ].map((row) => (
                <div key={row.term} className="grid gap-1 p-5 sm:grid-cols-[12rem_1fr]">
                  <dt className="font-semibold">{row.term}</dt>
                  <dd className="text-muted">
                    <Fact fact={row.fact} dict={dict} fallback={dict.timing.varies}>
                      {row.render}
                    </Fact>
                  </dd>
                </div>
              ))}
              <div className="grid gap-1 p-5 sm:grid-cols-[12rem_1fr]">
                <dt className="font-semibold">{d.minimum}</dt>
                <dd className="text-muted">
                  <Fact fact={pickupDelivery.minimumOrder} dict={dict} fallback={dict.timing.varies}>
                    {(v) => money(v)}
                  </Fact>
                </dd>
              </div>
            </dl>
            <p className="mt-4 flex gap-2 text-[0.9375rem] text-muted">
              <Info aria-hidden className="mt-1 size-4 shrink-0 text-moss" />
              {d.noConfirmation}
            </p>
          </section>
        </div>

        <aside className="space-y-5">
          {others.length > 0 && (
            <Card className="p-6">
              <h2 className="font-sans text-lg font-semibold">{d.channels}</h2>
              <ul className="mt-4 space-y-6">
                {others.map((c) => (
                  <li key={c.id}>
                    <p className="font-semibold">
                      {c.label[lang]} <VerificationBadge v={c.verification} dict={dict} />
                    </p>
                    <p className="mt-1 mb-3 text-[0.9375rem] text-muted">{c.description[lang]}</p>
                    <OutboundOrderLink
                      url={c.url}
                      host={c.host}
                      label={c.label[lang]}
                      leavingTemplate={d.leaving}
                      destination={c.id}
                      placement="order_channels"
                      variant="secondary"
                    />
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-6">
            <PackageCheck aria-hidden className="size-6 text-moss" />
            <h2 className="mt-3 font-sans text-lg font-semibold">{d.trackingTitle}</h2>
            <p className="mt-2 text-muted">{d.trackingBody}</p>
          </Card>
          <Card className="p-6">
            <Store aria-hidden className="size-6 text-moss" />
            <h2 className="mt-3 font-sans text-lg font-semibold">{d.inStoreTitle}</h2>
            <p className="mt-2 text-muted">{d.inStoreBody}</p>
            <Link href={href(lang, "locations")} className={`${buttonClass("primary")} mt-4`}>
              {dict.nav.findCta}
            </Link>
          </Card>
        </aside>
      </Container>
    </>
  );
}
