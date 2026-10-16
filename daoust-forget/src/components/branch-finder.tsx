"use client";

import clsx from "clsx";
import { AlertCircle, LoaderCircle, LocateFixed, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Branch } from "@/content/branches";
import { track } from "@/lib/analytics";
import {
  branchesMissingCoordinates,
  classifyQuery,
  nearestBranches,
  searchBranches,
  type BranchResult,
} from "@/lib/branch-search";
import { fmt } from "@/lib/fmt";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { isPreview } from "@/lib/verification";
import { BranchCard, type BranchCardDict } from "./branch-card";
import { buttonClass } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; label: string }
  | { kind: "results"; results: BranchResult[]; note?: string; query: string }
  | { kind: "error"; message: string };

type Props = {
  lang: Locale;
  dict: BranchCardDict;
  branches: Branch[];
  /** True when a server-side geocoder is configured (see /api/geocode). */
  geocoding: boolean;
  placement: "home" | "locations";
  /** Show every branch before the first search (locations page). */
  listAll?: boolean;
  /** Keep the query in the URL (?q=) so results can be shared. */
  syncUrl?: boolean;
};

export function BranchFinder({ lang, dict, branches, geocoding, placement, listAll, syncUrl }: Props) {
  const d = dict.finder;
  const inputId = useId();
  const errorId = useId();
  const noteId = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = (results: BranchResult[], q: string, queryType: "postal" | "fsa" | "text" | "geolocation", note?: string) => {
    setStatus({ kind: "results", results, note, query: q });
    if (results.length) track("branch_search", { query_type: queryType, results_count: results.length, placement });
    else track("branch_search_no_results", { query_type: queryType, placement });
    requestAnimationFrame(() => resultsRef.current?.focus());
  };

  async function run(raw: string) {
    const { kind } = classifyQuery(raw);
    if (kind === "empty") {
      setStatus({ kind: "error", message: d.errorEmpty });
      inputRef.current?.focus();
      return;
    }
    if (syncUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("q", raw.trim());
      window.history.replaceState(null, "", url);
    }
    const textResults = searchBranches(branches, raw);
    // A geocoder only helps once branches have real coordinates.
    if (geocoding && branchesMissingCoordinates(branches) < branches.length) {
      setStatus({ kind: "loading", label: d.searching });
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(raw.trim())}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { lat: number; lng: number } | { found: false };
        if ("lat" in data) {
          const near = nearestBranches(branches, data);
          return finish(near.length ? near : textResults, raw, kind);
        }
        return finish(textResults, raw, kind);
      } catch {
        return finish(textResults, raw, kind, d.geocodeError);
      }
    }
    finish(textResults, raw, kind);
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      track("geolocation_result", { outcome: "unavailable" });
      setStatus({ kind: "error", message: d.geoUnavailable });
      return;
    }
    setStatus({ kind: "loading", label: d.locating });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        track("geolocation_result", { outcome: "granted" });
        const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const near = nearestBranches(branches, origin);
        if (!near.length) {
          setStatus({ kind: "error", message: d.geoNoCoords });
          return;
        }
        finish(near, "", "geolocation");
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        track("geolocation_result", { outcome: denied ? "denied" : "error" });
        setStatus({ kind: "error", message: denied ? d.geoDenied : d.geoError });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  // Restore a shared search (?q=) on the locations page.
  useEffect(() => {
    if (!syncUrl) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      // One-time restore from the URL after hydration (the page is static).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(q);
      void run(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isError = status.kind === "error";
  const shown = status.kind === "results" ? status.results : listAll && status.kind !== "loading" ? branches.map((branch) => ({ branch, reason: undefined, distanceKm: undefined })) : [];

  // No verified branch yet (strict mode before the data is confirmed).
  if (branches.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-6">
        <p>{d.noneConfigured}</p>
        <Link href={href(lang, "contact")} className={clsx(buttonClass("primary"), "mt-4")}>
          {d.noneContact}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <form
        role="search"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-sm sm:p-5"
      >
        <label htmlFor={inputId} className="block font-semibold">
          {d.label}
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <div className="relative grow">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              inputMode="search"
              autoComplete="postal-code"
              enterKeyHint="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (isError) setStatus({ kind: "idle" });
              }}
              placeholder={d.placeholder}
              aria-invalid={isError || undefined}
              aria-describedby={clsx(isError && errorId, noteId)}
              className={clsx(
                "min-h-12 w-full rounded-full border bg-paper py-3 pr-4 pl-12 text-base placeholder:text-muted/80",
                isError ? "border-danger" : "border-line",
              )}
            />
          </div>
          <button type="submit" className={buttonClass("primary", "lg")} disabled={status.kind === "loading"}>
            {d.submit}
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={locate}
            className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-forest hover:underline"
            disabled={status.kind === "loading"}
          >
            <LocateFixed aria-hidden className="size-5" />
            {d.locate}
          </button>
          <p id={noteId} className="text-sm text-muted">
            {d.locateNote}
          </p>
        </div>
        {isError && (
          <p id={errorId} role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft p-3 text-sm text-danger">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {status.message}
          </p>
        )}
      </form>

      {isPreview && !geocoding && <p className="mt-3 text-sm text-clay">{d.integrationNote}</p>}

      <div aria-live="polite" className="mt-8">
        {status.kind === "loading" && (
          <p className="flex items-center gap-2 text-muted">
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
            {status.label}
          </p>
        )}
        {status.kind === "results" && (
          <h2 ref={resultsRef} tabIndex={-1} className="font-sans text-lg font-semibold">
            {status.results.length === 1 ? d.resultsOne : fmt(d.resultsMany, { count: status.results.length })}
          </h2>
        )}
        {status.kind === "results" && status.note && <p className="mt-1 text-sm text-muted">{status.note}</p>}
        {status.kind === "results" && status.results.length === 0 && (
          <div className="mt-4 rounded-[var(--radius-card)] border border-dashed border-line bg-white p-6">
            <p className="font-semibold">{fmt(d.emptyTitle, { query: status.query })}</p>
            <p className="mt-1 text-muted">{d.emptyBody}</p>
            {!listAll && (
              <Link href={href(lang, "locations")} className={clsx(buttonClass("secondary"), "mt-4")}>
                {d.emptyAll}
              </Link>
            )}
          </div>
        )}
      </div>

      {status.kind !== "results" && listAll && shown.length > 0 && (
        <h2 className="mt-2 font-sans text-lg font-semibold">{d.allTitle}</h2>
      )}
      {shown.length > 0 && (
        <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <li key={r.branch.slug}>
              <BranchCard
                branch={r.branch}
                lang={lang}
                dict={dict}
                placement={placement}
                reason={r.reason}
                distanceKm={r.distanceKm}
              />
            </li>
          ))}
        </ul>
      )}
      {status.kind === "results" && status.results.length === 0 && listAll && (
        <>
          <h2 className="mt-10 font-sans text-lg font-semibold">{d.allTitle}</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((b) => (
              <li key={b.slug}>
                <BranchCard branch={b} lang={lang} dict={dict} placement={placement} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
