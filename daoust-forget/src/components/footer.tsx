import Link from "next/link";
import { banners, brand, customerService, social } from "@/content/site";
import type { Dict } from "@/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href, type RouteKey } from "@/lib/routes";
import { canShow } from "@/lib/verification";
import { ConsentSettingsButton } from "./consent";
import { Container } from "./ui";
import { VerificationBadge } from "./verification-badge";
import { Wordmark } from "./wordmark";

export function Footer({ lang, dict }: { lang: Locale; dict: Dict }) {
  const link = (k: RouteKey, label: string) => (
    <li key={k}>
      <Link href={href(lang, k)} className="hover:text-white hover:underline">
        {label}
      </Link>
    </li>
  );
  const phone = canShow(customerService.phone.verification) ? customerService.phone : null;

  return (
    <footer className="on-dark bg-forest-deep text-sand">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Wordmark lang={lang} tone="light" />
          {phone && (
            <p className="mt-6 text-sm">
              {dict.contact.serviceTitle}
              <br />
              <a href={`tel:${phone.value.tel}`} className="text-lg font-semibold text-white hover:underline">
                {phone.value.display}
              </a>{" "}
              <VerificationBadge v={phone.verification} dict={dict} />
            </p>
          )}
        </div>

        <nav aria-label={dict.footer.customers}>
          <h2 className="font-sans text-sm font-semibold tracking-wide text-white uppercase">{dict.footer.customers}</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
            {link("locations", dict.nav.locations)}
            {link("services", dict.nav.services)}
            {link("pricing", dict.nav.pricing)}
            {link("eco", dict.nav.eco)}
            {link("order", dict.nav.order)}
            {link("faq", dict.nav.faq)}
            {link("contact", dict.nav.contact)}
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-sm font-semibold tracking-wide text-white uppercase">{dict.footer.company}</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
            {link("business", dict.nav.business)}
            {link("franchise", dict.nav.franchise)}
          </ul>
          <h2 className="mt-8 font-sans text-sm font-semibold tracking-wide text-white uppercase">{dict.footer.brands}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {banners.filter((b) => canShow(b.verification)).map((b) => (
              <li key={b.id}>
                <span className="font-semibold text-white">{b.name}</span> — {b.description[lang]}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-sans text-sm font-semibold tracking-wide text-white uppercase">{dict.footer.legal}</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
            {link("privacy", dict.footer.privacy)}
            {link("terms", dict.footer.terms)}
            <li>
              <ConsentSettingsButton label={dict.consent.settings} />
            </li>
          </ul>
          {social.some((s) => canShow(s.verification)) && (
            <>
              <h2 className="mt-8 font-sans text-sm font-semibold tracking-wide text-white uppercase">{dict.footer.social}</h2>
              <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
                {social.filter((s) => canShow(s.verification)).map((s) => (
                  <li key={s.id}>
                    <a href={s.url} rel="noopener" className="hover:text-white hover:underline">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-6 text-sm sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {brand.legalName}. {dict.footer.rights}
          </p>
          <Link href={href(lang === "fr" ? "en" : "fr", "home")} lang={lang === "fr" ? "en" : "fr"} className="hover:text-white hover:underline">
            {dict.nav.language}
          </Link>
        </Container>
      </div>
    </footer>
  );
}
