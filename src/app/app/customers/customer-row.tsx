"use client";
import { useState, useTransition } from "react";
import { Badge, buttonClass } from "@/components/ui";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import type { SnapCustomer } from "@/lib/data/snapshot";
import { pauseCustomer30, resumeCustomer, updateCustomer } from "../actions";

export function CustomerRow({ c, owed, uiLang, today }: { c: SnapCustomer; owed: string; uiLang: "fr" | "en"; today: string }) {
  const t = (uiLang === "fr" ? fr : en).customers;
  const [pending, start] = useTransition();
  const [cc, setCc] = useState(c.ccEmail ?? "");
  const [ccState, setCcState] = useState<"idle" | "saved" | "error">("idle");
  const paused = c.pausedIndefinitely || (c.pausedUntil !== null && c.pausedUntil >= today);
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); });

  const status = c.unsubscribedAt ? <Badge tone="danger">{t.unsubscribed}</Badge>
    : c.excluded ? <Badge>{t.excluded}</Badge>
    : paused ? <Badge tone="warn">{c.pausedIndefinitely ? t.pausedForever : t.paused(new Intl.DateTimeFormat(uiLang === "fr" ? "fr-CA" : "en-CA", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${c.pausedUntil}T12:00:00Z`)))}</Badge>
    : !c.email ? <Badge tone="warn">{t.noEmail}</Badge>
    : <Badge tone="ok">{t.active}</Badge>;

  return (
    <tr className={pending ? "opacity-60" : undefined}>
      <td className="px-5 py-3">
        <p className="font-medium">{c.displayName}</p>
        <p className="text-xs text-ink-subtle">{c.email ?? "—"}</p>
      </td>
      <td className="px-5 py-3 text-right font-medium tabular-nums">{owed}</td>
      <td className="px-5 py-3">
        <select aria-label={t.columns.language} value={c.language ?? ""} disabled={pending}
          onChange={(e) => run(() => updateCustomer(c.id, { language: (e.target.value || null) as "fr" | "en" | null }))}
          className="rounded-lg border-0 bg-surface py-1.5 pl-2 pr-7 text-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand-600">
          <option value="">{t.langDefault}</option>
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </td>
      <td className="px-5 py-3">
        <form className="flex items-center gap-1.5" onSubmit={(e) => {
          e.preventDefault();
          start(async () => { const r = await updateCustomer(c.id, { ccEmail: cc }); setCcState(r.ok ? "saved" : "error"); });
        }}>
          <input type="email" value={cc} placeholder={t.ccPlaceholder} aria-label={t.cc} aria-invalid={ccState === "error"}
            onChange={(e) => { setCc(e.target.value); setCcState("idle"); }}
            className={`w-44 rounded-lg border-0 bg-surface px-2 py-1.5 text-sm ring-1 ring-inset placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-600 ${ccState === "error" ? "ring-rose-400" : "ring-line"}`} />
          {cc !== (c.ccEmail ?? "") && <button type="submit" className={buttonClass("secondary", "sm")}>{t.save}</button>}
          {ccState === "saved" && <span className="text-xs text-brand-700 dark:text-brand-300">{t.saved}</span>}
        </form>
      </td>
      <td className="px-5 py-3">
        <div className="flex flex-col items-start gap-1">
          {status}
          <div className="flex gap-3 text-xs font-medium text-ink-muted">
            {!c.excluded && (
              <button type="button" disabled={pending} className="hover:text-ink"
                onClick={() => run(() => (paused ? resumeCustomer(c.id) : pauseCustomer30(c.id)))}>
                {paused ? t.actions.resume : t.actions.pause}
              </button>
            )}
            <button type="button" disabled={pending} className="hover:text-ink"
              onClick={() => run(() => updateCustomer(c.id, { excluded: !c.excluded }))}>
              {c.excluded ? t.actions.include : t.actions.exclude}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
