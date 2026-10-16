"use client";

import clsx from "clsx";
import { Info } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { PricingCategory } from "@/content/pricing";
import type { Dict } from "@/dictionaries/fr";
import { track } from "@/lib/analytics";
import { fmt } from "@/lib/fmt";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { canShow } from "@/lib/verification";
import { pricingIcons } from "./icons";
import { buttonClass, Chip } from "./ui";
import { VerificationBadge } from "./verification-badge";

type ServiceRef = { slug: string; name: string; some: boolean };

/**
 * Accessible tabs (WAI-ARIA APG pattern): arrow keys move between garment
 * types, and the panel shows how that garment is priced.
 */
export function PricingExplorer({
  lang,
  dict,
  categories,
  services,
}: {
  lang: Locale;
  dict: Pick<Dict, "pricing" | "services" | "preview">;
  categories: PricingCategory[];
  services: ServiceRef[];
}) {
  const [active, setActive] = useState(0);
  const base = useId();
  const d = dict.pricing;
  const cat = categories[active];
  const price = cat.price && canShow(cat.price.verification) ? cat.price : null;
  const money = (n: number) => n.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD" });

  // Deep links such as /fr/tarifs#coats open the matching garment type.
  useEffect(() => {
    const fromHash = () => {
      const i = categories.findIndex((c) => c.id === window.location.hash.slice(1));
      if (i >= 0) setActive(i);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [categories]);

  const select = (i: number, focus = false) => {
    setActive(i);
    window.history.replaceState(null, "", `#${categories[i].id}`);
    track("pricing_category_select", { category: categories[i].id });
    if (focus) document.getElementById(`${base}-tab-${i}`)?.focus();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <div
        role="tablist"
        aria-label={d.pick}
        aria-orientation="vertical"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
        onKeyDown={(e) => {
          const n = categories.length;
          const keys: Record<string, number> = {
            ArrowDown: (active + 1) % n,
            ArrowRight: (active + 1) % n,
            ArrowUp: (active - 1 + n) % n,
            ArrowLeft: (active - 1 + n) % n,
            Home: 0,
            End: n - 1,
          };
          if (e.key in keys) {
            e.preventDefault();
            select(keys[e.key], true);
          }
        }}
      >
        {categories.map((c, i) => {
          const Icon = pricingIcons[c.icon];
          const selected = i === active;
          return (
            <button
              key={c.id}
              id={`${base}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              className={clsx(
                "flex min-h-12 shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left font-medium transition-colors",
                selected ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest/40",
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" />
              <span className="whitespace-nowrap lg:whitespace-normal">{c.name[lang]}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${active}`}
        tabIndex={0}
        className="rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8"
      >
        <h3 className="text-2xl">{cat.name[lang]}</h3>
        <p className="mt-1 text-muted">{cat.examples[lang]}</p>

        <div className="mt-6 rounded-2xl bg-linen p-5">
          <p className="text-sm font-semibold text-muted">{d.priceLabel}</p>
          {price ? (
            <p className="mt-1 font-display text-3xl">
              {fmt(price.value.kind === "from" ? d.from : d.each, { amount: money(price.value.amount) })}{" "}
              <VerificationBadge v={price.verification} dict={dict} />
              <span className="mt-1 block font-sans text-sm text-muted">{d.taxes}</span>
            </p>
          ) : (
            <>
              <p className="mt-1 font-display text-2xl">{d.noPrice}</p>
              <p className="mt-1 text-[0.9375rem] text-muted">{d.noPriceBody}</p>
            </>
          )}
        </div>

        {cat.assessment && (
          <p className="mt-4 flex gap-3 rounded-2xl border border-clay/30 bg-clay-soft/50 p-4 text-[0.9375rem]">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-clay" />
            <span>
              <strong>{d.assessment}.</strong> {d.assessmentBody}
            </span>
          </p>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h4 className="font-semibold">{d.factors}</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem] text-muted">
              {cat.factors.map((f) => (
                <li key={f.fr}>{f[lang]}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">{d.services}</h4>
            <ul className="mt-2 space-y-2">
              {cat.services
                .map((slug) => services.find((s) => s.slug === slug))
                .filter((s): s is ServiceRef => Boolean(s))
                .map((s) => (
                  <li key={s.slug} className="flex flex-wrap items-center gap-2">
                    <Link href={href(lang, "services", s.slug)} className="font-medium text-forest underline-offset-4 hover:underline">
                      {s.name}
                    </Link>
                    {s.some && <Chip>{dict.services.some}</Chip>}
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted">{d.varies}</p>
        <Link href={href(lang, "locations")} className={clsx(buttonClass("primary"), "mt-6")}>
          {d.findCta}
        </Link>
      </div>
    </div>
  );
}
