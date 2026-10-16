"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Dict } from "@/dictionaries/fr";
import type { Locale } from "@/lib/i18n";
import { href, localizePath, type RouteKey } from "@/lib/routes";
import { buttonClass } from "./ui";
import { Wordmark } from "./wordmark";

const primary: RouteKey[] = ["services", "pricing", "locations", "eco", "contact"];
const secondary: RouteKey[] = ["business", "franchise"];

export function Header({ lang, dict }: { lang: Locale; dict: Pick<Dict, "nav" | "a11y" | "meta"> }) {
  const pathname = usePathname() ?? `/${lang}`;
  // Storing the path the menu was opened on closes it on navigation for free.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((typeof value === "function" ? value(open) : value) ? pathname : null);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const other: Locale = lang === "fr" ? "en" : "fr";
  const label = (k: RouteKey) => dict.nav[k as keyof Dict["nav"]] as string;
  const isActive = (k: RouteKey) => {
    const target = href(lang, k);
    return pathname === target || pathname.startsWith(`${target}/`);
  };

  // Close on Escape and return focus to the toggle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenOn(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/85">
      {/* Secondary audiences live in a slim utility bar, away from customer tasks. */}
      <div className="hidden border-b border-line/70 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-5 px-4 py-1.5 text-sm sm:px-6 lg:px-8">
          <nav aria-label={dict.a11y.secondaryNav} className="flex gap-5">
            {secondary.map((k) => (
              <Link key={k} href={href(lang, k)} className="text-muted hover:text-forest">
                {label(k)}
              </Link>
            ))}
          </nav>
          <Link
            href={localizePath(pathname, other)}
            hrefLang={other === "fr" ? "fr-CA" : "en-CA"}
            lang={other}
            aria-label={dict.nav.languageLabel}
            className="font-semibold text-forest hover:underline"
          >
            {dict.nav.language}
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={href(lang, "home")} className="shrink-0">
          <Wordmark lang={lang} />
        </Link>

        <nav aria-label={dict.a11y.mainNav} className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-1">
            {primary.map((k) => (
              <li key={k}>
                <Link
                  href={href(lang, k)}
                  aria-current={isActive(k) ? "page" : undefined}
                  className={clsx(
                    "whitespace-nowrap rounded-full px-3 py-2 text-[0.9375rem] font-medium hover:bg-sand",
                    isActive(k) ? "text-forest underline decoration-2 underline-offset-8" : "text-ink",
                  )}
                >
                  {label(k)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <Link href={href(lang, "order")} className={buttonClass("secondary", "md", "whitespace-nowrap max-xl:hidden")}>
            {dict.nav.order}
          </Link>
          <Link href={href(lang, "locations")} className={buttonClass("primary", "md", "whitespace-nowrap max-sm:hidden")}>
            {dict.nav.findCta}
          </Link>
          <button
            ref={buttonRef}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-sand lg:hidden"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
            <span className="sr-only">{open ? dict.a11y.closeMenu : dict.a11y.openMenu}</span>
          </button>
        </div>
      </div>

      <div id={panelId} hidden={!open} className="border-t border-line bg-paper lg:hidden">
        <nav aria-label={dict.a11y.mainNav} className="mx-auto max-w-6xl px-4 pt-2 pb-6 sm:px-6">
          <ul className="divide-y divide-line">
            {primary.map((k) => (
              <li key={k}>
                <Link
                  href={href(lang, k)}
                  aria-current={isActive(k) ? "page" : undefined}
                  className="flex min-h-12 items-center text-lg font-medium aria-[current=page]:text-forest"
                >
                  {label(k)}
                </Link>
              </li>
            ))}
            {secondary.map((k) => (
              <li key={k}>
                <Link href={href(lang, k)} className="flex min-h-12 items-center text-muted">
                  {label(k)}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={localizePath(pathname, other)}
                hrefLang={other === "fr" ? "fr-CA" : "en-CA"}
                lang={other}
                className="flex min-h-12 items-center font-semibold text-forest"
              >
                {dict.nav.language}
              </Link>
            </li>
          </ul>
          <div className="mt-4 grid gap-3">
            <Link href={href(lang, "locations")} className={buttonClass("primary", "lg")}>
              {dict.nav.findCta}
            </Link>
            <Link href={href(lang, "order")} className={buttonClass("secondary", "lg")}>
              {dict.nav.order}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
