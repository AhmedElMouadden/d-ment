import { MapPin, Navigation, Phone } from "lucide-react";
import Link from "next/link";
import type { Branch } from "@/content/branches";
import { banners } from "@/content/site";
import type { Dict } from "@/dictionaries";
import { fmt } from "@/lib/fmt";
import { directionsUrl, type MatchReason } from "@/lib/branch-search";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { OpenNow } from "./open-now";
import { TrackedLink } from "./tracked-link";
import { buttonClass, Chip } from "./ui";
import { VerificationBadge } from "./verification-badge";

export type BranchCardDict = Pick<Dict, "branch" | "finder" | "preview" | "a11y">;

const reasonKey: Record<MatchReason, keyof Dict["finder"] | null> = {
  distance: null,
  "postal-fsa": "reasonFsa",
  "postal-area": "reasonArea",
  city: "reasonCity",
  text: "reasonText",
};

export function formatAddress(b: Branch, lang: Locale) {
  const a = b.address;
  const unit = a.unit ? (lang === "fr" ? `, local ${a.unit}` : `, unit ${a.unit}`) : "";
  const line2 = lang === "fr" ? `${a.city} (${a.province}) ${a.postalCode}` : `${a.city}, ${a.province} ${a.postalCode}`;
  return { line1: `${a.street}${unit}`, line2 };
}

export function BranchCard({
  branch,
  lang,
  dict,
  placement,
  reason,
  distanceKm,
  headingLevel = 3,
}: {
  branch: Branch;
  lang: Locale;
  dict: BranchCardDict;
  placement: string;
  reason?: MatchReason;
  distanceKm?: number;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const addr = formatAddress(branch, lang);
  const banner = banners.find((x) => x.id === branch.banner);
  const page = href(lang, "locations", branch.slug);
  const reasonLabel = reason ? reasonKey[reason] : null;

  return (
    <article className="flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        {banner && <Chip tone="forest">{banner.name}</Chip>}
        {reasonLabel && <Chip>{dict.finder[reasonLabel] as string}</Chip>}
        {distanceKm !== undefined && (
          <Chip>{fmt(dict.finder.km, { km: distanceKm.toLocaleString(lang === "fr" ? "fr-CA" : "en-CA", { maximumFractionDigits: 1 }) })}</Chip>
        )}
        <VerificationBadge v={branch.verification} dict={dict} />
      </div>
      <H className="mt-3 font-display text-xl">
        <TrackedLink
          href={page}
          event="branch_select"
          params={{ branch_id: branch.slug, placement }}
          className="hover:text-forest hover:underline"
        >
          {branch.name[lang]}
        </TrackedLink>
      </H>
      <p className="mt-2 flex gap-2 text-[0.9375rem] text-muted">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-moss" />
        <span>
          {addr.line1}
          <br />
          {addr.line2}
        </span>
      </p>
      <div className="mt-2 text-[0.9375rem]">
        <OpenNow hours={branch.hours} lang={lang} dict={dict.branch} />
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <TrackedLink
          href={directionsUrl(branch)}
          event="directions_click"
          params={{ branch_id: branch.slug, placement }}
          target="_blank"
          rel="noopener"
          className={buttonClass("primary")}
        >
          <Navigation aria-hidden className="size-4" />
          {dict.branch.directions}
          <span className="sr-only"> {dict.a11y.newTab}</span>
        </TrackedLink>
        {branch.phone && (
          <TrackedLink
            href={`tel:${branch.phone.tel}`}
            event="phone_click"
            params={{ branch_id: branch.slug, placement }}
            className={buttonClass("secondary")}
          >
            <Phone aria-hidden className="size-4" />
            <span>
              {dict.branch.call}
              <span className="sr-only"> {branch.phone.display}</span>
            </span>
          </TrackedLink>
        )}
        <Link href={page} className={buttonClass("quiet", "md", "min-h-11!")}>
          {dict.branch.details}
          <span className="sr-only"> : {branch.name[lang]}</span>
        </Link>
      </div>
    </article>
  );
}
