import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
const buttonStyles: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600 disabled:bg-brand-300",
  secondary:
    "bg-surface text-ink ring-1 ring-inset ring-line hover:bg-surface-muted focus-visible:outline-brand-600",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
};

export function buttonClass(variant: Variant = "primary", size: "sm" | "md" | "lg" = "md") {
  return clsx(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed",
    size === "sm" && "px-3 py-1.5 text-sm",
    size === "md" && "px-4 py-2.5 text-sm",
    size === "lg" && "px-6 py-3 text-base",
    buttonStyles[variant],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return <button className={clsx(buttonClass(variant, size), className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-2xl bg-surface ring-1 ring-line shadow-sm", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={clsx("block text-sm font-medium text-ink", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={clsx(
        "mt-1.5 block w-full rounded-xl border-0 bg-surface px-3.5 py-2.5 text-ink ring-1 ring-inset ring-line placeholder:text-ink-subtle focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "warn" | "danger" | "ok" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-surface-muted text-ink-muted",
        tone === "brand" && "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
        tone === "warn" && "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        tone === "danger" && "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
        tone === "ok" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      )}
    >
      {children}
    </span>
  );
}
