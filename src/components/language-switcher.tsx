"use client";
import { Languages } from "lucide-react";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { buttonClass } from "./ui";

export function LanguageSwitcher({ locale, label, className }: { locale: "fr" | "en"; label: string; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setLocale(locale === "fr" ? "en" : "fr"))}
      className={`${buttonClass("ghost", "sm")} ${className ?? ""}`}
      lang={locale === "fr" ? "en" : "fr"}
    >
      <Languages className="size-4" aria-hidden />
      {label}
    </button>
  );
}
