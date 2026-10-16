"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Dict } from "@/dictionaries";
import {
  CONSENT_EVENT,
  OPEN_CONSENT_EVENT,
  parseConsent,
  serializeConsent,
  type ConsentChoice,
} from "@/lib/consent";
import { buttonClass } from "./ui";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
/** Ordering platforms on other domains, for GA4 cross-domain measurement. */
const LINKER = (process.env.NEXT_PUBLIC_GA_LINKER_DOMAINS ?? "").split(",").map((d) => d.trim()).filter(Boolean);

function loadGa() {
  if (!GA_ID || window.gtag) {
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    return;
  }
  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the arguments object itself, not an array.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function gtag() { window.dataLayer!.push(arguments); };
  const g = window.gtag;
  g("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  g("js", new Date());
  g("config", GA_ID, LINKER.length ? { linker: { domains: LINKER } } : {});
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

function revokeGa() {
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  // Remove GA cookies already set on this domain.
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      document.cookie = `${name}=; Max-Age=0; Path=/`;
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.${location.hostname.replace(/^www\./, "")}`;
    }
  }
}

function apply(choice: ConsentChoice | null) {
  window.__dfAnalyticsConsent = choice === "granted" && Boolean(GA_ID);
  if (choice === "granted") loadGa();
  if (choice === "denied") revokeGa();
}

const subscribe = (cb: () => void) => {
  window.addEventListener(CONSENT_EVENT, cb);
  return () => window.removeEventListener(CONSENT_EVENT, cb);
};
const readChoice = () => parseConsent(document.cookie);
/** On the server the choice is unknown; the banner renders only after hydration. */
const unknownOnServer = () => undefined;

export function ConsentManager({ dict, privacyHref, show }: { dict: Dict["consent"]; privacyHref: string; show: boolean }) {
  const choice = useSyncExternalStore(subscribe, readChoice, unknownOnServer);
  const [reopened, setReopened] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);

  // Sync the analytics tag with the stored choice (an external system).
  useEffect(() => {
    if (choice !== undefined) apply(choice);
  }, [choice]);

  useEffect(() => {
    const reopen = () => {
      setReopened(true);
      requestAnimationFrame(() => regionRef.current?.focus());
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  const decide = useCallback((c: ConsentChoice) => {
    document.cookie = serializeConsent(c, location.protocol === "https:");
    setReopened(false);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
  }, []);

  const open = reopened || (choice === null && show);
  if (!open) return null;

  // A non-modal bottom bar: it never blocks the page or hides the main actions.
  return (
    <div
      ref={regionRef}
      role="region"
      aria-labelledby="consent-title"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:gap-6 lg:px-8">
        <div className="text-sm">
          <h2 id="consent-title" className="font-sans text-base font-semibold">
            {dict.title}
          </h2>
          <p className="text-muted">
            {dict.body}{" "}
            <Link href={privacyHref} className="font-medium text-forest underline">
              {dict.more}
            </Link>
          </p>
          {choice && (
            <p className="mt-1 text-xs text-muted">
              {dict.current.replace("{choice}", choice === "granted" ? dict.granted : dict.denied)}
            </p>
          )}
        </div>
        {/* Accept and decline carry equal visual weight. */}
        <div className="flex shrink-0 gap-3">
          <button type="button" className={buttonClass("secondary")} onClick={() => decide("denied")}>
            {dict.decline}
          </button>
          <button type="button" className={buttonClass("secondary")} onClick={() => decide("granted")}>
            {dict.accept}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsentSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="text-left hover:text-white hover:underline"
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
    >
      {label}
    </button>
  );
}
