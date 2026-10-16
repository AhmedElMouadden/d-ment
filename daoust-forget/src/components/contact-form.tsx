"use client";

import clsx from "clsx";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { Dict } from "@/dictionaries/fr";
import { track } from "@/lib/analytics";
import { contactSchema, contactTopics, fieldErrors, type ContactTopic } from "@/lib/contact";
import type { Locale } from "@/lib/i18n";
import { buttonClass } from "./ui";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string; fields: Record<string, string> };

const fieldOrder = ["name", "email", "phone", "company", "topic", "branch", "message", "consent"];

export function ContactForm({
  lang,
  dict,
  privacyHref,
  defaultTopic = "general",
  showCompany = false,
}: {
  lang: Locale;
  dict: Dict["contact"];
  privacyHref: string;
  defaultTopic?: ContactTopic;
  showCompany?: boolean;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const fields = state.kind === "error" ? state.fields : {};
  const err = (k: string) => (fields[k] ? dict.errors[fields[k] as keyof Dict["contact"]["errors"]] ?? dict.invalid : null);
  const id = (k: string) => `${uid}-${k}`;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = { ...Object.fromEntries(fd), consent: fd.get("consent") === "on", lang };
    const parsed = contactSchema.safeParse(payload);
    if (!parsed.success) {
      const f = fieldErrors(parsed.error);
      setState({ kind: "error", message: dict.invalid, fields: f });
      track("contact_submit", { topic: String(fd.get("topic") ?? ""), outcome: "invalid" });
      const first = fieldOrder.find((k) => f[k]);
      requestAnimationFrame(() => (first ? document.getElementById(id(first))?.focus() : summaryRef.current?.focus()));
      return;
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (res.ok) {
        setState({ kind: "success" });
        formRef.current?.reset();
        track("contact_submit", { topic: parsed.data.topic, outcome: "success" });
      } else if (body.error === "not_configured") {
        setState({ kind: "error", message: dict.notConfigured, fields: {} });
        track("contact_submit", { topic: parsed.data.topic, outcome: "not_configured" });
      } else if (body.error === "invalid" && body.fields) {
        setState({ kind: "error", message: dict.invalid, fields: body.fields });
        track("contact_submit", { topic: parsed.data.topic, outcome: "invalid" });
      } else {
        throw new Error(String(res.status));
      }
    } catch {
      setState({ kind: "error", message: dict.serverError, fields: {} });
      track("contact_submit", { topic: parsed.data.topic, outcome: "error" });
    }
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  const input = "mt-1.5 block min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-base";
  const describedBy = (k: string, extra?: string) => clsx(err(k) && `${id(k)}-err`, extra) || undefined;
  const fieldError = (k: string) =>
    err(k) ? (
      <p id={`${id(k)}-err`} className="mt-1.5 flex items-center gap-1.5 text-sm text-danger">
        <AlertCircle aria-hidden className="size-4 shrink-0" />
        {err(k)}
      </p>
    ) : null;
  const req = (
    <span className="text-danger" aria-hidden>
      {" "}
      *
    </span>
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <div ref={summaryRef} tabIndex={-1} aria-live="polite">
        {state.kind === "success" && (
          <p role="status" className="flex gap-2 rounded-xl bg-forest-soft p-4 text-forest-deep">
            <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
            {dict.success}
          </p>
        )}
        {state.kind === "error" && (
          <p role="alert" className="flex gap-2 rounded-xl bg-danger-soft p-4 text-danger">
            <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
            {state.message}
          </p>
        )}
      </div>

      <p className="text-sm text-muted">
        <span className="text-danger" aria-hidden>
          *
        </span>{" "}
        {dict.required}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={id("name")} className="font-semibold">
            {dict.name}
            {req}
          </label>
          <input id={id("name")} name="name" autoComplete="name" required aria-required aria-invalid={!!err("name") || undefined} aria-describedby={describedBy("name")} className={clsx(input, err("name") ? "border-danger" : "border-line")} />
          {fieldError("name")}
        </div>
        <div>
          <label htmlFor={id("email")} className="font-semibold">
            {dict.email}
            {req}
          </label>
          <input id={id("email")} name="email" type="email" autoComplete="email" inputMode="email" required aria-required aria-invalid={!!err("email") || undefined} aria-describedby={describedBy("email")} className={clsx(input, err("email") ? "border-danger" : "border-line")} />
          {fieldError("email")}
        </div>
        <div>
          <label htmlFor={id("phone")} className="font-semibold">
            {dict.phone}
          </label>
          <input id={id("phone")} name="phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={!!err("phone") || undefined} aria-describedby={describedBy("phone")} className={clsx(input, err("phone") ? "border-danger" : "border-line")} />
          {fieldError("phone")}
        </div>
        {showCompany ? (
          <div>
            <label htmlFor={id("company")} className="font-semibold">
              {dict.company}
            </label>
            <input id={id("company")} name="company" autoComplete="organization" className={clsx(input, "border-line")} />
          </div>
        ) : (
          <div>
            <label htmlFor={id("branch")} className="font-semibold">
              {dict.branchField}
            </label>
            <input id={id("branch")} name="branch" className={clsx(input, "border-line")} />
          </div>
        )}
      </div>

      <div>
        <label htmlFor={id("topic")} className="font-semibold">
          {dict.topic}
          {req}
        </label>
        <select id={id("topic")} name="topic" defaultValue={defaultTopic} required aria-required aria-invalid={!!err("topic") || undefined} aria-describedby={describedBy("topic")} className={clsx(input, "border-line")}>
          {contactTopics.map((t) => (
            <option key={t} value={t}>
              {dict.topics[t]}
            </option>
          ))}
        </select>
        {fieldError("topic")}
      </div>

      <div>
        <label htmlFor={id("message")} className="font-semibold">
          {dict.message}
          {req}
        </label>
        <textarea id={id("message")} name="message" rows={6} required aria-required aria-invalid={!!err("message") || undefined} aria-describedby={describedBy("message")} className={clsx(input, "min-h-36", err("message") ? "border-danger" : "border-line")} />
        {fieldError("message")}
      </div>

      {/* Honeypot, hidden from people and assistive technology. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Website</label>
        <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <div className="flex gap-3">
          <input id={id("consent")} name="consent" type="checkbox" required aria-required aria-invalid={!!err("consent") || undefined} aria-describedby={describedBy("consent")} className="mt-1 size-5 shrink-0 accent-forest" />
          <label htmlFor={id("consent")} className="text-[0.9375rem]">
            {dict.consent}
            {req}{" "}
            <Link href={privacyHref} className="font-medium text-forest underline">
              {dict.privacyLink}
            </Link>
          </label>
        </div>
        {fieldError("consent")}
      </div>

      <button type="submit" className={buttonClass("primary", "lg")} disabled={state.kind === "sending"}>
        {state.kind === "sending" ? (
          <>
            <LoaderCircle aria-hidden className="size-5 animate-spin" />
            {dict.sending}
          </>
        ) : (
          dict.submit
        )}
      </button>
    </form>
  );
}
